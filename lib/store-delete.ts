/**
 * 매장 삭제 시 해당 매장 관련 Storage 파일 및 DB 데이터 정리.
 * 모든 작업은 검증된 storeId 하나만 사용하여 다른 매장 데이터가 삭제되지 않도록 함.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL_PATTERN = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/

/** Supabase Storage URL에서 bucket과 path 추출. 우리 프로젝트 URL이 아니면 null */
function parseStorageUrl(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url || typeof url !== 'string' || url.trim() === '') return null
  const match = url.match(SUPABASE_URL_PATTERN)
  if (!match) return null
  const bucket = match[1]
  const path = decodeURIComponent(match[2])
  return { bucket, path }
}

/** URL 목록에서 우리 Storage 객체만 추출 (중복 제거) */
function collectStoragePaths(
  urls: (string | null | undefined)[],
  storeId: string
): { bucket: string; path: string }[] {
  const seen = new Set<string>()
  const result: { bucket: string; path: string }[] = []
  for (const url of urls) {
    const parsed = parseStorageUrl(url)
    if (!parsed) continue
    const key = `${parsed.bucket}/${parsed.path}`
    if (seen.has(key)) continue
    // 삭제 대상이 해당 매장 것인지 경로에 storeId 포함 여부로 한 번 더 검증 (선택적 보안)
    if (!parsed.path.includes(storeId)) continue
    seen.add(key)
    result.push(parsed)
  }
  return result
}

/** JSONB 배열에서 URL 문자열만 추출 */
function urlsFromJsonbArray(photoUrls: unknown): string[] {
  if (!Array.isArray(photoUrls)) return []
  return photoUrls.filter((u): u is string => typeof u === 'string' && u.trim() !== '')
}

export interface StoreDeletePreview {
  store_id: string
  store_name?: string
  dryRun: true
  db: { table: string; store_id_column: string; count: number; sample_ids?: string[] }[]
  storage: { bucket: string; path: string }[]
  storageByBucket: Record<string, number>
}

export interface StoreDeleteResult {
  success: boolean
  dryRun?: boolean
  preview?: StoreDeletePreview
  error?: string
}

/**
 * 매장 삭제 실행 또는 Dry-run.
 * @param adminSupabase 서비스 역할 클라이언트 (RLS 우회)
 * @param storeId 삭제할 매장 ID (이미 권한 검증된 값만 전달)
 * @param dryRun true면 실제 삭제 없이 삭제 대상만 수집하여 반환
 */
export async function deleteStoreData(
  adminSupabase: SupabaseClient,
  storeId: string,
  dryRun: boolean
): Promise<StoreDeleteResult> {
  const dbRows: StoreDeletePreview['db'] = []
  const storagePaths: { bucket: string; path: string }[] = []

  const addCount = async (
    table: string,
    storeIdColumn: string,
    getUrls?: (row: Record<string, unknown>) => (string | null | undefined)[]
  ) => {
    const { data, count, error } = await adminSupabase
      .from(table)
      .select(getUrls ? '*' : 'id', { count: 'exact', head: false })
      .eq(storeIdColumn, storeId)

    if (error) {
      if (error.code === '42P01') return // 테이블 없음 스킵
      throw new Error(`${table}: ${error.message}`)
    }
    const rows = (data || []) as Record<string, unknown>[]
    const n = count ?? rows.length
    if (getUrls && rows.length > 0) {
      for (const row of rows) {
        const urls = getUrls(row)
        storagePaths.push(...collectStoragePaths(urls, storeId))
      }
    }
    if (n > 0) {
      dbRows.push({
        table,
        store_id_column: storeIdColumn,
        count: n,
        sample_ids: rows.slice(0, 3).map((r) => r.id as string),
      })
    }
  }

  // Store name for preview
  let storeName: string | undefined
  const { data: storeRow } = await adminSupabase
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .single()
  if (storeRow?.name) storeName = storeRow.name as string

  // 1) DB에서 삭제될 행 수 집계 + 사진 URL 수집 (store_id 컬럼 있는 테이블)
  await addCount('store_assign', 'store_id')
  await addCount('attendance', 'store_id')
  await addCount('supply_requests', 'store_id', (r) => [
    r.photo_url as string,
    r.completion_photo_url as string,
    r.rejection_photo_url as string,
  ])
  await addCount('requests', 'store_id', (r) => [
    r.photo_url as string,
    r.completion_photo_url as string,
    r.rejection_photo_url as string,
  ])
  await addCount('problem_reports', 'store_id', (r) => [r.photo_url as string])
  await addCount('lost_items', 'store_id', (r) => [r.photo_url as string])
  await addCount('issues', 'store_id', (r) => {
    const urls: string[] = [r.photo_url as string].filter(Boolean)
    urls.push(...urlsFromJsonbArray(r.photo_urls))
    return urls
  })
  await addCount('checklist', 'store_id', (r) => {
    const items = (r.items as Array<{ before_photo_url?: string; after_photo_url?: string }>) || []
    return items.flatMap((i) => [i.before_photo_url, i.after_photo_url])
  })
  await addCount('cleaning_photos', 'store_id', (r) => [r.photo_url as string])
  await addCount('product_photos', 'store_id', (r) => urlsFromJsonbArray(r.photo_urls))
  await addCount('inventory_photos', 'store_id', (r) => [r.photo_url as string])
  await addCount('store_files', 'store_id', (r) => [r.file_url as string])
  await addCount('store_contacts', 'store_id')
  // receipts는 revenue_id로 revenues 참조 → revenues 삭제 전에 삭제 필요
  const { data: revenueIds } = await adminSupabase
    .from('revenues')
    .select('id')
    .eq('store_id', storeId)
  const revIds = (revenueIds || []).map((r) => r.id as string)
  if (revIds.length > 0) {
    const { count: receiptsCount } = await adminSupabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .in('revenue_id', revIds)
    if (receiptsCount && receiptsCount > 0) {
      dbRows.push({
        table: 'receipts',
        store_id_column: 'revenue_id (via revenues)',
        count: receiptsCount,
        sample_ids: undefined,
      })
    }
  }
  await addCount('revenues', 'store_id')
  await addCount('expenses', 'store_id')
  await addCount('recurring_expenses', 'store_id')
  await addCount('store_product_locations', 'store_id')
  await addCount('store_name_mappings', 'system_store_id')

  // Storage 경로는 위에서 DB URL로만 수집 (다른 매장 경로가 섞이지 않도록)

  // 중복 제거 (같은 bucket/path)
  const storageUnique = Array.from(
    new Map(storagePaths.map((s) => [`${s.bucket}/${s.path}`, s])).values()
  )
  const storageByBucket: Record<string, number> = {}
  for (const s of storageUnique) {
    storageByBucket[s.bucket] = (storageByBucket[s.bucket] || 0) + 1
  }

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      preview: {
        store_id: storeId,
        store_name: storeName,
        dryRun: true,
        db: dbRows,
        storage: storageUnique,
        storageByBucket,
      },
    }
  }

  // 2) 실제 삭제: Storage 먼저
  for (const { bucket, path } of storageUnique) {
    await adminSupabase.storage.from(bucket).remove([path])
  }

  // 3) DB 행 삭제 (순서: 자식부터. receipts → revenues 순서 필수)
  const tables: [string, string][] = [
    ['store_assign', 'store_id'],
    ['attendance', 'store_id'],
    ['supply_requests', 'store_id'],
    ['requests', 'store_id'],
    ['problem_reports', 'store_id'],
    ['lost_items', 'store_id'],
    ['issues', 'store_id'],
    ['checklist', 'store_id'],
    ['cleaning_photos', 'store_id'],
    ['product_photos', 'store_id'],
    ['inventory_photos', 'store_id'],
    ['store_files', 'store_id'],
    ['store_contacts', 'store_id'],
    ['expenses', 'store_id'],
    ['recurring_expenses', 'store_id'],
    ['store_product_locations', 'store_id'],
    ['store_name_mappings', 'system_store_id'],
  ]
  for (const [table, col] of tables) {
    const { error } = await adminSupabase.from(table).delete().eq(col, storeId)
    if (error && error.code !== '42P01') throw new Error(`${table} delete: ${error.message}`)
  }
  // receipts는 revenue_id 참조이므로, 해당 매장 revenues의 receipts 먼저 삭제 후 revenues 삭제
  const { data: revIdsToDelete } = await adminSupabase
    .from('revenues')
    .select('id')
    .eq('store_id', storeId)
  const revenueIdsList = (revIdsToDelete || []).map((r) => r.id as string)
  if (revenueIdsList.length > 0) {
    const { error: receiptsErr } = await adminSupabase
      .from('receipts')
      .delete()
      .in('revenue_id', revenueIdsList)
    if (receiptsErr && receiptsErr.code !== '42P01') throw new Error(`receipts delete: ${receiptsErr.message}`)
  }
  const { error: revenuesErr } = await adminSupabase.from('revenues').delete().eq('store_id', storeId)
  if (revenuesErr && revenuesErr.code !== '42P01') throw new Error(`revenues delete: ${revenuesErr.message}`)

  // 4) stores 소프트 삭제
  const { error: storeError } = await adminSupabase
    .from('stores')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId)

  if (storeError) throw new Error(`stores soft delete: ${storeError.message}`)

  return { success: true }
}
