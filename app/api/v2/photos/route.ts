import { v2WorkDateForStore } from '@/lib/v2/work-date'
import {
  assertV2StoreAccess,
  getV2AdminClient,
  getV2User,
  v2ErrorResponse,
  v2Json,
  V2ApiError,
  V2UnauthorizedError,
} from '@/lib/v2/server'

const PHOTO_BUCKET = 'v2-photos'
const PHOTO_KINDS = new Set(['before', 'after', 'issue', 'extra'])

export async function GET(request: Request) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const url = new URL(request.url)
    const storeId = url.searchParams.get('store_id')
    const workDate = url.searchParams.get('work_date')
    const issueId = url.searchParams.get('issue_id')
    if (!storeId && !issueId) throw new V2ApiError('store_id 또는 issue_id가 필요합니다.')

    const client = getV2AdminClient()
    let q = client
      .from('v2_photo_assets')
      .select('id, store_id, issue_id, user_id, work_date, kind, storage_path, thumb_path, size_bytes, memo, upload_status, client_created_at, created_at')
      .order('created_at', { ascending: false })
      .limit(120)

    if (storeId) {
      await assertV2StoreAccess(user, storeId)
      q = q.eq('store_id', storeId)
    }
    if (workDate) q = q.eq('work_date', workDate)
    if (issueId) q = q.eq('issue_id', issueId)

    let { data, error }: { data: any[] | null; error: any } = await q

    if ((error as any)?.code === '42703') {
      let legacyQ = client
        .from('v2_photo_assets')
        .select('id, store_id, issue_id, kind, storage_path, thumb_path, size_bytes, created_at')
        .order('created_at', { ascending: false })
        .limit(120)
      if (storeId) legacyQ = legacyQ.eq('store_id', storeId)
      if (issueId) legacyQ = legacyQ.eq('issue_id', issueId)
      const retry = await legacyQ
      data = retry.data
      error = retry.error
    }

    if (error) throw error

    const photos = await Promise.all(
      (data || []).map(async (photo: any) => {
        const { data: signed } = await client.storage
          .from(PHOTO_BUCKET)
          .createSignedUrl(photo.storage_path, 60 * 60)
        return { ...photo, url: signed?.signedUrl || null }
      })
    )

    return v2Json({ photos })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()

    const form = await request.formData()
    const file = form.get('file')
    const storeId = String(form.get('store_id') || '')
    const kind = String(form.get('kind') || 'after')
    const memo = String(form.get('memo') || '')
    const issueId = String(form.get('issue_id') || '')
    const clientCreatedAt = String(form.get('client_created_at') || '')

    if (!storeId) throw new V2ApiError('store_id가 필요합니다.')
    if (!PHOTO_KINDS.has(kind)) throw new V2ApiError('사진 종류가 올바르지 않습니다.')
    if (!(file instanceof File)) throw new V2ApiError('사진 파일이 필요합니다.')
    if (!file.type.startsWith('image/')) throw new V2ApiError('이미지 파일만 업로드할 수 있습니다.')

    const { company_id } = await assertV2StoreAccess(user, storeId)
    const client = getV2AdminClient()
    const { data: store } = await client
      .from('v2_stores')
      .select('is_night_shift, work_start_hour, work_end_hour')
      .eq('id', storeId)
      .single()
    if (!store) throw new V2ApiError('매장을 찾을 수 없습니다.', 404)

    const workDate = v2WorkDateForStore(store)
    const safeType = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const storagePath = [
      company_id,
      storeId,
      workDate,
      user.id,
      `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeType}`,
    ].join('/')

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await client.storage
      .from(PHOTO_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })
    if (uploadError) throw new V2ApiError(uploadError.message, 500)

    const payload = {
      store_id: storeId,
      issue_id: issueId || null,
      user_id: user.id,
      work_date: workDate,
      kind,
      storage_path: storagePath,
      size_bytes: file.size,
      memo: memo.trim() || null,
      upload_status: 'uploaded',
      client_created_at: clientCreatedAt || new Date().toISOString(),
    }

    let { data, error } = await client
      .from('v2_photo_assets')
      .insert(payload)
      .select()
      .single()

    if ((error as any)?.code === '42703') {
      const retry = await client
        .from('v2_photo_assets')
        .insert({
          store_id: storeId,
          issue_id: issueId || null,
          kind,
          storage_path: storagePath,
          size_bytes: file.size,
        })
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) throw error

    const { data: signed } = await client.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(storagePath, 60 * 60)

    return v2Json({ photo: { ...data, url: signed?.signedUrl || null } })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
