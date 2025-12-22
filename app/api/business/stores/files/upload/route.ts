import { NextRequest } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 파일 업로드 (Storage에 업로드 후 DB에 저장)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can upload files')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    // FormData에서 파일과 메타데이터 추출
    const formData = await request.formData()
    const file = formData.get('file') as File
    const storeId = formData.get('storeId') as string | null
    const docType = formData.get('docType') as string
    const entity = formData.get('entity') as string

    if (!file || !docType || !entity) {
      throw new Error('file, docType, and entity are required')
    }

    // 서비스 역할 키로 Storage 업로드
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error: Service role key is required')
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 파일 경로 생성
    const fileExt = file.name.split('.').pop()
    const fileName = `${entity}-${docType}-${Date.now()}.${fileExt}`
    const filePath = storeId
      ? `stores/${storeId}/${docType}/${fileName}`
      : `stores/temp/${docType}/${Date.now()}-${fileName}`

    // Storage에 업로드
    const bucket = 'cleaning-photos' // documents 버킷이 없으면 cleaning-photos 사용
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // Public URL 가져오기
    const { data: urlData } = adminSupabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get file URL')
    }

    // storeId가 있으면 DB에 저장
    if (storeId) {
      const { data: newFile, error: dbError } = await adminSupabase
        .from('store_files')
        .insert({
          store_id: storeId,
          company_id: user.company_id,
          doc_type: docType,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
        })
        .select()
        .single()

      if (dbError) {
        // DB 저장 실패해도 Storage URL은 반환 (나중에 수동으로 연결 가능)
        console.error('Failed to save file to DB:', dbError)
        return Response.json({
          success: true,
          data: {
            id: `temp-${Date.now()}`,
            file_url: urlData.publicUrl,
            file_name: file.name,
            doc_type: docType,
            store_id: storeId,
          },
          warning: 'File uploaded but not saved to database',
        })
      }

      return Response.json({
        success: true,
        data: newFile,
      })
    }

    // storeId가 없으면 URL만 반환 (임시 저장)
    return Response.json({
      success: true,
      data: {
        id: `temp-${Date.now()}`,
        file_url: urlData.publicUrl,
        file_name: file.name,
        doc_type: docType,
        store_id: null,
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

