import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // FormData에서 파일 추출
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
        { status: 400 }
      )
    }

    // 이미지 파일만 허용
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '이미지 파일만 업로드 가능합니다.' },
        { status: 400 }
      )
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 10MB 이하여야 합니다.' },
        { status: 400 }
      )
    }

    // 서비스 역할 키로 Storage 업로드
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 파일 경로 생성
    const fileExt = file.name.split('.').pop()
    const fileName = `hero-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `hero-images/${fileName}`

    // Storage 버킷 (cleaning-photos 사용)
    const bucket = 'cleaning-photos'

    // Storage에 업로드
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '31536000', // 1년 캐싱
        upsert: false,
        contentType: file.type || 'image/jpeg',
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { 
          error: `파일 업로드 실패: ${uploadError.message}`,
          details: uploadError
        },
        { status: 500 }
      )
    }

    if (!uploadData) {
      return NextResponse.json(
        { error: '파일 업로드 데이터를 받을 수 없습니다.' },
        { status: 500 }
      )
    }

    // Signed URL 생성 (버킷이 private이므로)
    const uploadedPath = uploadData.path
    
    // 1년 유효한 Signed URL 생성
    const { data: signedData, error: signedError } = await adminSupabase.storage
      .from(bucket)
      .createSignedUrl(uploadedPath, 3600 * 24 * 365) // 1년

    if (signedError || !signedData?.signedUrl) {
      console.error('Failed to create signed URL:', signedError)
      // Fallback: Public URL 시도
      const { data: urlData } = adminSupabase.storage
        .from(bucket)
        .getPublicUrl(uploadedPath)
      
      if (!urlData?.publicUrl) {
        return NextResponse.json(
          { error: '파일 URL을 가져올 수 없습니다.' },
          { status: 500 }
        )
      }
      
      // Public URL 사용
      var imageUrl = urlData.publicUrl
    } else {
      // Signed URL 사용
      var imageUrl = signedData.signedUrl
    }

    // 기존 이미지 개수 확인하여 display_order 설정
    const { count } = await adminSupabase
      .from('hero_images')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // DB에 이미지 정보 저장
    const { data: heroImage, error: dbError } = await adminSupabase
      .from('hero_images')
      .insert({
        image_url: imageUrl,
        display_order: count || 0, // 기존 이미지 개수로 순서 설정
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB insert error:', dbError)
      // Storage는 업로드되었지만 DB 저장 실패
      return NextResponse.json(
        {
          success: true,
          warning: '이미지는 업로드되었지만 데이터베이스 저장에 실패했습니다.',
          data: {
            id: `temp-${Date.now()}`,
            image_url: imageUrl,
            file_name: file.name,
          },
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      data: heroImage,
    })
  } catch (error: any) {
    console.error('Error in POST /api/admin/landing/hero-images/upload:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
