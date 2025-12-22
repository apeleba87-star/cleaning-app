import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

// 직원 파일 조회
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
      throw new ForbiddenError('Only business owners can view user files')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 직원이 회사에 속해있는지 확인
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .single()

    if (!targetUser) {
      throw new ForbiddenError('User not found or access denied')
    }

    // 파일 조회
    const { data: files, error } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', params.id)
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

// 직원 파일 생성
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
      throw new ForbiddenError('Only business owners can manage user files')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 직원이 회사에 속해있는지 확인
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .single()

    if (!targetUser) {
      throw new ForbiddenError('User not found or access denied')
    }

    const body = await request.json()
    const { doc_type, file_url, file_name, file_size } = body

    if (!doc_type || !file_url || !file_name) {
      throw new Error('doc_type, file_url, and file_name are required')
    }

    // Service role key를 사용하여 RLS 우회 (RLS 정책 문제 방지)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      throw new Error('Server configuration error: Service role key is required')
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Server configuration error: Supabase URL is required')
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: newFile, error } = await adminSupabase
      .from('user_files')
      .insert({
        user_id: params.id,
        company_id: user.company_id,
        doc_type,
        file_url,
        file_name,
        file_size: file_size || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create user file:', error)
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

