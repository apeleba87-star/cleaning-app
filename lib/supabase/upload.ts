'use client'

import { createClient } from '@/lib/supabase/client'
import { getStorageBucket, generateFilePath } from './storage'

export async function uploadPhoto(
  file: File,
  storeId: string,
  entity: 'cleaning' | 'issue' | 'supply' | 'selfie' | 'checklist' | 'checklist_before' | 'checklist_after' | 'product',
  userId?: string
): Promise<string> {
  const supabase = createClient()
  
  // 세션에서 userId 가져오기
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error('Not authenticated')
  }

  const actualUserId = userId || session.user.id
  const bucket = getStorageBucket(entity)
  const filePath = generateFilePath(storeId, entity, actualUserId)

  // 파일 업로드
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  console.log('📤 Upload result:', {
    bucket,
    filePath,
    data,
  })

  // bucket이 private인 경우 signed URL 사용, public인 경우 public URL 사용
  try {
    // 먼저 bucket이 public인지 확인
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketInfo = buckets?.find(b => b.id === bucket)
    const isPublicBucket = bucketInfo?.public || false

    console.log('Bucket info:', { bucket, isPublic: isPublicBucket })

    if (isPublicBucket) {
      // Public bucket: Public URL 사용
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath)
      
      if (!publicUrl) {
        throw new Error('Failed to get public URL')
      }
      
      console.log('✅ Using public URL:', publicUrl)
      return publicUrl
    } else {
      // Private bucket: Signed URL 사용 (1년 유효 - 실제로는 재생성 필요 시 재요청)
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600 * 24 * 365)

      if (signedError) {
        console.error('❌ Signed URL creation error:', signedError)
        throw new Error(`Failed to create signed URL: ${signedError.message}`)
      }

      if (!signedData?.signedUrl) {
        throw new Error('Failed to get signed URL')
      }

      console.log('✅ Using signed URL:', signedData.signedUrl)
      return signedData.signedUrl
    }
  } catch (urlError) {
    console.error('❌ URL generation error:', urlError)
    // Fallback: Public URL 시도
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath)
    if (publicUrl) {
      console.log('✅ Fallback: Using public URL:', publicUrl)
      return publicUrl
    }
    throw urlError
  }
}

