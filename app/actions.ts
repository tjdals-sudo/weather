'use server'

import { redirect } from 'next/navigation'
import { adminClient, emailOf, sessionClient, setting } from '@/lib/supabase'
import { CHARACTERS } from '@/components/Character'

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
