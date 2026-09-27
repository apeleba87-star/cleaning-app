import { getFieldStorageSigner } from './supabase'

// Storage provider 교체 지점. DB에는 bucket + storage_path만 있고, URL은 여기서만 만든다.

export const PROJECT_MEDIA_BUCKET = 'project-media'
export const SIGNED_URL_TTL_SECONDS = 60 * 60

/** 경로 목록을 한 번의 batch 요청으로 서명한다. 실패한 경로는 결과에서 빠진다. */
export async function signMediaPaths(paths: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)))
  const result = new Map<string, string>()
  if (unique.length === 0) return result

  const { data, error } = await getFieldStorageSigner()
    .storage.from(PROJECT_MEDIA_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS)

  if (error) throw new Error(`sign_failed: ${error.message}`)

  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) result.set(item.path, item.signedUrl)
  }
  return result
}
