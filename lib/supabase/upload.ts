'use client'

import { createClient } from '@/lib/supabase/client'
import { getStorageBucket, generateFilePath } from './storage'
import { resizeImageToFile } from '@/lib/utils/image-resize'

export async function uploadPhoto(
  file: File,
  storeId: string,
  entity: 'cleaning' | 'issue' | 'supply' | 'selfie' | 'checklist' | 'checklist_before' | 'checklist_after' | 'product' | 'request',
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

  // 이미지 리사이징 (500KB 이하로 압축)
  let fileToUpload = file
  if (file.type.startsWith('image/')) {
    try {
      const originalSizeKB = file.size / 1024
      console.log(`📸 원본 이미지 크기: ${originalSizeKB.toFixed(2)}KB`)
      
      // 항상 리사이징 적용 (500KB 이하로 최적화)
      // 원본이 작아도 최적화를 통해 일관된 품질 유지 및 저장 공간 절약
      fileToUpload = await resizeImageToFile(file, 500)
      const resizedSizeKB = fileToUpload.size / 1024
      
      if (originalSizeKB > 500) {
        console.log(`✅ 리사이징 완료: ${resizedSizeKB.toFixed(2)}KB (${((1 - resizedSizeKB / originalSizeKB) * 100).toFixed(1)}% 감소)`)
      } else {
        console.log(`✅ 이미지 최적화 완료: ${resizedSizeKB.toFixed(2)}KB (원본: ${originalSizeKB.toFixed(2)}KB)`)
      }
    } catch (error) {
      console.error('⚠️ 이미지 리사이징 실패, 원본 파일 사용:', error)
      // 리사이징 실패 시 원본 파일 사용
      fileToUpload = file
    }
  }

  // 파일 업로드
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileToUpload, {
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

