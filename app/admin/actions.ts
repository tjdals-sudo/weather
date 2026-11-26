'use server'

import { redirect } from 'next/navigation'
import { MAX_LEVEL, xpToNext } from '@/lib/level'
import { adminClient, sessionClient } from '@/lib/supabase'

const back = (key: 'done' | 'error', msg: string): never => redirect(`/admin?${key}=${encodeURIComponent(msg)}`)

// 모든 관리 동작은 매번 서버에서 권한을 다시 확인한다 (화면을 숨기는 것만으로는 막을 수 없다)
export async function currentAdmin() {
  const supabase = await sessionClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { data: me } = await supabase.from('profiles').select('id, is_admin').eq('id', data.user.id).maybeSingle()
  return me?.is_admin ? me : null
}

async function target(form: FormData) {
  const me = await currentAdmin()
  if (!me) redirect('/')
  const id = String(form.get('id') ?? '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) back('error', '잘못된 요청입니다')
  return { id, self: id === me!.id }
}

export async function resetPassword(form: FormData) {
  const { id } = await target(form)
  const password = String(form.get('password') ?? '')
  if (password.length < 8 || password.length > 72) back('error', '비밀번호는 8~72자입니다')
  const { error } = await adminClient().auth.admin.updateUserById(id, { password })
  if (error) back('error', `비밀번호 변경 실패: ${error.message}`)
  back('done', '비밀번호를 바꿨습니다. 새 비밀번호를 본인에게 알려 주세요')
}

export async function updateProfile(form: FormData) {
  const { id, self } = await target(form)
  const nickname = String(form.get('nickname') ?? '').trim()
  const level = Number(form.get('level')), xp = Number(form.get('xp'))
  if (nickname.length < 1 || nickname.length > 12) back('error', '닉네임은 1~12자입니다')
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) back('error', `레벨은 1~${MAX_LEVEL}입니다`)
  if (!Number.isInteger(xp) || xp < 0 || (level < MAX_LEVEL && xp >= xpToNext(level))) back('error', `이 레벨의 경험치는 0~${xpToNext(level) - 1}입니다`)
  const is_admin = form.get('is_admin') === 'on'
  if (self && !is_admin) back('error', '자기 자신의 관리자 권한은 뺄 수 없습니다')
  const { error } = await adminClient().from('profiles').update({ nickname, level, xp, is_admin }).eq('id', id)
  if (error) back('error', `저장 실패: ${error.message}`)
  back('done', '저장했습니다')
}

export async function deleteUser(form: FormData) {
  const { id, self } = await target(form)
  if (self) back('error', '자기 자신은 삭제할 수 없습니다')
  if (form.get('confirm') !== 'on') back('error', '삭제 확인에 체크해 주세요')
  // 계정을 지우면 프로필과 기록도 함께 지워진다 (DB의 on delete cascade)
  const { error } = await adminClient().auth.admin.deleteUser(id)
  if (error) back('error', `삭제 실패: ${error.message}`)
  back('done', '계정을 삭제했습니다')
}
