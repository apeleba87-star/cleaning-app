import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// 히어로 이미지 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // 공개 조회이므로 인증 불필요
    const { data: images, error } = await supabase
      .from('hero_images')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching hero images:', error)
      return NextResponse.json(
        { error: '이미지 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: images || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/landing/hero-images:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

// 히어로 이미지 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('id')

    if (!imageId) {
      return NextResponse.json(
        { error: '이미지 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 이미지 정보 조회
    const { data: image, error: fetchError } = await supabase
      .from('hero_images')
      .select('image_url')
      .eq('id', imageId)
      .single()

    if (fetchError || !image) {
      return NextResponse.json(
        { error: '이미지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Storage에서 파일 삭제
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (serviceRoleKey && supabaseUrl) {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      // URL에서 파일 경로 추출
      const urlParts = image.image_url.split('/')
      const filePath = urlParts.slice(urlParts.indexOf('hero-images')).join('/')

      await adminSupabase.storage
        .from('cleaning-photos')
        .remove([filePath])
    }

    // DB에서 삭제 (soft delete: is_active = false)
    const { error: deleteError } = await supabase
      .from('hero_images')
      .update({ is_active: false })
      .eq('id', imageId)

    if (deleteError) {
      console.error('DB delete error:', deleteError)
      return NextResponse.json(
        { error: '이미지 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '이미지가 삭제되었습니다.',
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/landing/hero-images:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

// 히어로 이미지 순서 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { images } = body // [{ id, display_order }, ...]

    if (!Array.isArray(images)) {
      return NextResponse.json(
        { error: '이미지 배열이 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 각 이미지의 순서 업데이트
    const updatePromises = images.map((img: { id: string; display_order: number }) =>
      supabase
        .from('hero_images')
        .update({ display_order: img.display_order })
        .eq('id', img.id)
    )

    const results = await Promise.all(updatePromises)
    const errors = results.filter((r) => r.error)

    if (errors.length > 0) {
      console.error('Update errors:', errors)
      return NextResponse.json(
        { error: '일부 이미지 순서 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '이미지 순서가 업데이트되었습니다.',
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/landing/hero-images:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
