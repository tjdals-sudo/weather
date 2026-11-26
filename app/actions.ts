'use server'

import { redirect } from 'next/navigation'
import { adminClient, emailOf, sessionClient, setting } from '@/lib/supabase'
import { CHARACTERS } from '@/components/Character'
import { applyXp } from '@/lib/level'
import { KIND_NAMES, score, statChange, type Kind } from '@/lib/xp'

const ADMIN_USERNAME = 'john'

const fail = (path: string, msg: string): never => redirect(`${path}?error=${encodeURIComponent(msg)}`)

function credentials(form: FormData, path: string) {
  const username = String(form.get('username') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  if (!/^[a-z0-9_]{3,20}$/.test(username)) fail(path, '아이디는 영문 소문자·숫자·밑줄 3~20자입니다')
  if (password.length < 8 || password.length > 72) fail(path, '비밀번호는 8~72자입니다')
  return { username, password }
}

function profileInput(form: FormData, path: string) {
  const nickname = String(form.get('nickname') ?? '').trim()
  const character = String(form.get('character') ?? '')
  if (nickname.length < 1 || nickname.length > 12) fail(path, '닉네임은 1~12자입니다')
  if (!CHARACTERS.some((c) => c.id === character)) fail(path, '캐릭터를 골라 주세요')
  return { nickname, character }
}

export async function signIn(form: FormData) {
  const { username, password } = credentials(form, '/login')
  const supabase = await sessionClient()
  const { error } = await supabase.auth.signInWithPassword({ email: emailOf(username), password })
  if (error) fail('/login', '아이디 또는 비밀번호가 틀렸습니다')
  redirect('/')
}

export async function signUp(form: FormData) {
  const { username, password } = credentials(form, '/signup')
  if (password !== String(form.get('confirm') ?? '')) fail('/signup', '비밀번호 확인이 일치하지 않습니다')
  const profile = profileInput(form, '/signup')
  // shortcut: 틀린 횟수 제한이 없다. 지인끼리 쓰는 동안은 충분하고, 주소가 널리 퍼지면 횟수 제한을 붙인다
  const invite = await setting('invite_code')
  if (invite === null) fail('/signup', '가입 설정을 읽지 못했습니다. 관리자에게 알려 주세요')
  if (invite && String(form.get('invite') ?? '').trim() !== invite) fail('/signup', '초대 코드가 틀렸습니다')
  const admin = adminClient()
  // 관리자 API로 만들면 확인 메일 없이 바로 가입된다. 비밀번호 해시는 Supabase가 처리한다
  const { data, error } = await admin.auth.admin.createUser({
    email: emailOf(username),
    password,
    email_confirm: true,
  })
  if (error || !data.user)
    return fail('/signup', error?.code === 'email_exists' ? '이미 있는 아이디입니다' : `가입 실패: ${error?.message}`)
  // 프로필 저장이 실패해도 계정은 남는다. 그 경우 로그인하면 캐릭터 생성 화면이 뜬다
  // 정해 둔 아이디로 가입하면 관리자가 된다. 그 밖의 사람은 관리자 화면에서 권한을 받는다
  await admin.from('profiles').insert({ id: data.user.id, username, ...profile, is_admin: username === ADMIN_USERNAME })
  const supabase = await sessionClient()
  const { error: loginError } = await supabase.auth.signInWithPassword({ email: emailOf(username), password })
  if (loginError) fail('/login', '가입은 됐습니다. 로그인해 주세요')
  redirect('/')
}

export async function signOut() {
  const supabase = await sessionClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function createProfile(form: FormData) {
  const supabase = await sessionClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/login')
  const profile = profileInput(form, '/')
  // insert만 한다: 이미 프로필이 있으면 기본 키 충돌로 실패하므로 레벨이 초기화되지 않는다
  const { error } = await adminClient()
    .from('profiles')
    .insert({ id: data.user.id, username: data.user.email!.split('@')[0], ...profile })
  if (error && error.code !== '23505') fail('/', `저장 실패: ${error.message}`)
  redirect('/')
}

const CHANGE_EVERY = 3 * 24 * 60 * 60 * 1000

// 캐릭터 그림만 바꾼다. 레벨·경험치·능력치는 같은 프로필에 있으므로 그대로 남는다
export async function changeCharacter(form: FormData) {
  const supabase = await sessionClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/login')
  const character = String(form.get('character') ?? '')
  if (!CHARACTERS.some((c) => c.id === character)) fail('/', '캐릭터를 골라 주세요')
  const admin = adminClient()
  const { data: now, error } = await admin.from('profiles').select('character, character_changed_at').eq('id', data.user.id).single()
  if (error) fail('/', `캐릭터를 바꾸지 못했습니다: ${error.message}`)
  if (now!.character === character) fail('/', '지금 쓰고 있는 캐릭터입니다')
  const cutoff = new Date(Date.now() - CHANGE_EVERY).toISOString()
  // 조건을 수정문에 넣어 한 번에 처리한다: 두 번 연달아 눌러도 한 번만 바뀐다
  const { data: changed, error: saveError } = await admin
    .from('profiles')
    .update({ character, character_changed_at: new Date().toISOString() })
    .eq('id', data.user.id)
    .or(`character_changed_at.is.null,character_changed_at.lt.${cutoff}`)
    .select('id')
  if (saveError) fail('/', `캐릭터를 바꾸지 못했습니다: ${saveError.message}`)
  if (!changed?.length) {
    const next = new Date(new Date(now!.character_changed_at).getTime() + CHANGE_EVERY)
    fail('/', `캐릭터는 3일에 한 번 바꿀 수 있습니다. ${next.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' })} 이후에 다시 해 주세요`)
  }
  redirect('/')
}

// 경험치와 능력치를 옮긴다. 실패하면 null
// shortcut: 읽고 나서 쓰므로 같은 사람이 동시에 두 번 기록하면 하나가 덮일 수 있다. 사용자가 늘면 DB 함수 하나로 묶는다
async function shift(userId: string, kind: Kind, xp: number, maxDown: number) {
  const admin = adminClient()
  const { data: p } = await admin.from('profiles').select('level, xp, focus, memory, mood, energy').eq('id', userId).single()
  if (!p) return null
  const next: Record<string, number> = applyXp(p.level, p.xp, xp, maxDown)
  for (const [stat, d] of Object.entries(statChange(kind, xp))) next[stat] = Math.max(0, Math.min(100, p[stat as 'focus'] + d))
  const { error } = await admin.from('profiles').update(next).eq('id', userId)
  return error ? null : { from: p.level, to: next.level }
}

export async function addLog(form: FormData) {
  const supabase = await sessionClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/login')
  const kind = String(form.get('kind') ?? '')
  const result = score(kind, (name) => String(form.get(name) ?? ''))
  if (typeof result === 'string') return fail('/', result)
  const admin = adminClient()
  const { data: log, error } = await admin.from('logs').insert({ user_id: data.user.id, kind, ...result }).select('id').single()
  if (error) return fail('/', `기록하지 못했습니다: ${error.message}`)
  const moved = await shift(data.user.id, kind as Kind, result.xp, 1)
  if (!moved) {
    // 경험치가 안 바뀌었으면 기록도 남기지 않는다
    await admin.from('logs').delete().eq('id', log.id)
    return fail('/', '기록하지 못했습니다. 다시 해 주세요')
  }
  const level = moved.to === moved.from ? '' : ` · LV ${moved.from} → ${moved.to}`
  redirect(`/?done=${encodeURIComponent(`${KIND_NAMES[kind as Kind]} ${result.xp > 0 ? '+' : ''}${result.xp} XP${level}`)}`)
}

// 기록을 지우고 그 기록이 바꾼 경험치를 되돌린다. 본인 것만, 관리자는 누구 것이든
export async function removeLog(form: FormData) {
  const supabase = await sessionClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/login')
  const path = form.get('back') === 'admin' ? '/admin' : '/'
  const id = Number(form.get('id'))
  if (!Number.isSafeInteger(id)) fail(path, '잘못된 요청입니다')
  const admin = adminClient()
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', data.user.id).maybeSingle()
  let gone = admin.from('logs').delete().eq('id', id)
  if (!me?.is_admin) gone = gone.eq('user_id', data.user.id)
  // 지워진 줄을 돌려받아 처리한다: 두 번 연달아 눌러도 한 번만 되돌린다
  const { data: rows } = await gone.select('user_id, kind, xp')
  if (!rows?.length) return fail(path, '이미 지워졌거나 없는 기록입니다')
  const moved = await shift(rows[0].user_id, rows[0].kind, -rows[0].xp, Infinity)
  if (!moved) return fail(path, '기록은 지웠지만 경험치를 되돌리지 못했습니다. 관리자에게 알려 주세요')
  redirect(`${path}?done=${encodeURIComponent('기록을 취소하고 경험치를 되돌렸습니다')}`)
}
