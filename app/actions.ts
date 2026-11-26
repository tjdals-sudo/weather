'use server'

import { redirect } from 'next/navigation'
import { adminClient, emailOf, sessionClient } from '@/lib/supabase'
import { CHARACTERS } from '@/components/Character'

const fail = (path: string, msg: string): never => redirect(`${path}?error=${encodeURIComponent(msg)}`)

function credentials(form: FormData) {
  const username = String(form.get('username') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  if (!/^[a-z0-9_]{3,20}$/.test(username)) fail('/login', '아이디는 영문 소문자·숫자·밑줄 3~20자입니다')
  if (password.length < 8 || password.length > 72) fail('/login', '비밀번호는 8~72자입니다')
  return { username, password }
}

export async function signIn(form: FormData) {
  const { username, password } = credentials(form)
  const supabase = await sessionClient()
  const { error } = await supabase.auth.signInWithPassword({ email: emailOf(username), password })
  if (error) fail('/login', '아이디 또는 비밀번호가 틀렸습니다')
  redirect('/')
}

export async function signUp(form: FormData) {
  const { username, password } = credentials(form)
  // 관리자 API로 만들면 확인 메일 없이 바로 가입된다. 비밀번호 해시는 Supabase가 처리한다
  const { error } = await adminClient().auth.admin.createUser({
    email: emailOf(username),
    password,
    email_confirm: true,
  })
  if (error) fail('/login', error.code === 'email_exists' ? '이미 있는 아이디입니다' : `가입 실패: ${error.message}`)
  const supabase = await sessionClient()
  const { error: loginError } = await supabase.auth.signInWithPassword({ email: emailOf(username), password })
  if (loginError) fail('/login', '가입은 됐지만 로그인에 실패했습니다. 다시 로그인해 주세요')
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
  const nickname = String(form.get('nickname') ?? '').trim()
  const character = String(form.get('character') ?? '')
  if (nickname.length < 1 || nickname.length > 12) fail('/', '닉네임은 1~12자입니다')
  if (!CHARACTERS.some((c) => c.ready && c.id === character)) fail('/', '캐릭터를 골라 주세요')
  // insert만 한다: 이미 프로필이 있으면 기본 키 충돌로 실패하므로 레벨이 초기화되지 않는다
  const { error } = await adminClient()
    .from('profiles')
    .insert({ id: data.user.id, username: data.user.email!.split('@')[0], nickname, character })
  if (error && error.code !== '23505') fail('/', `저장 실패: ${error.message}`)
  redirect('/')
}
