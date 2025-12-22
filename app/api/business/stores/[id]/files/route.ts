import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 매장 파일 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view store files')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인
    const { data: store } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // 파일 조회
    const { data: files, error } = await supabase
      .from('store_files')
      .select('*')
      .eq('store_id', params.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch files: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: files || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 매장 파일 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can manage store files')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인
    const { data: store } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    const body = await request.json()
    const { doc_type, file_url, file_name, file_size } = body

    if (!doc_type || !file_url || !file_name) {
      throw new Error('doc_type, file_url, and file_name are required')
    }

    // RLS 정책 문제로 인해 서비스 역할 키 필수 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Service role key or URL missing:', {
        hasServiceRoleKey: !!serviceRoleKey,
        hasSupabaseUrl: !!supabaseUrl,
      })
      throw new Error('Server configuration error: Service role key is required. Please check your environment variables.')
    }

    // 서비스 역할 키로 RLS 우회
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log('Inserting store file:', {
      store_id: params.id,
      company_id: user.company_id,
      doc_type,
      file_name,
    })

    const { data: newFile, error } = await adminSupabase
      .from('store_files')
      .insert({
        store_id: params.id,
        company_id: user.company_id,
        doc_type,
        file_url,
        file_name,
        file_size: file_size || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Store file insert error:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      throw new Error(`Failed to create file: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: newFile,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 매장 파일 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can delete store files')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인
    const { data: store } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    const body = await request.json()
    const { file_id } = body

    if (!file_id) {
      throw new Error('file_id is required')
    }

    // 파일이 해당 매장에 속해있는지 확인
    const { data: file } = await supabase
      .from('store_files')
      .select('id, store_id, company_id')
      .eq('id', file_id)
      .eq('store_id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!file) {
      throw new ForbiddenError('File not found or access denied')
    }

    // RLS 정책 문제로 인해 서비스 역할 키 필수 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error: Service role key is required')
    }

    // 서비스 역할 키로 RLS 우회
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Soft delete
    const { error } = await adminSupabase
      .from('store_files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', file_id)

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`)
    }

    return Response.json({
      success: true,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

