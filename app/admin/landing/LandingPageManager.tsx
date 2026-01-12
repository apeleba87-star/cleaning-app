'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface HeroImage {
  id: string
  image_url: string
  display_order: number
  is_active: boolean
  created_at: string
}

interface HeroSettings {
  tagline: string
  headline1: string
  headline2: string
  brandName: string
  subtitle: string
  fontSize?: {
    headline1?: string
    headline2?: string
    brandName?: string
    subtitle?: string
  }
  fontSizeNumbers?: {
    headline1?: { mobile?: number; desktop?: number }
    headline2?: { mobile?: number; desktop?: number }
    brandName?: { mobile?: number; desktop?: number }
    subtitle?: { mobile?: number; desktop?: number }
  }
  ctaButton1: {
    text: string
    link: string
    visible: boolean
  }
  ctaButton2: {
    text: string
    link: string
    visible: boolean
  }
  sliderInterval: number
}

// 픽셀 크기를 Tailwind CSS 클래스로 변환
const pxToTailwind = (px: number): string => {
  const sizeMap: Record<number, string> = {
    12: 'text-xs',
    14: 'text-sm',
    16: 'text-base',
    18: 'text-lg',
    20: 'text-xl',
    24: 'text-2xl',
    30: 'text-3xl',
    36: 'text-4xl',
    48: 'text-5xl',
    60: 'text-6xl',
    72: 'text-7xl',
    96: 'text-8xl',
    128: 'text-9xl',
  }
  return sizeMap[px] || `text-[${px}px]`
}

// 숫자 크기를 Tailwind CSS 클래스 문자열로 변환
const numbersToTailwind = (mobile?: number, desktop?: number): string => {
  if (!mobile && !desktop) return ''
  const mobileClass = mobile ? pxToTailwind(mobile) : ''
  const desktopClass = desktop ? pxToTailwind(desktop) : ''
  
  if (mobile && desktop) {
    return `${mobileClass} sm:${desktopClass}`
  } else if (mobile) {
    return mobileClass
  } else if (desktop) {
    return desktopClass
  }
  return ''
}

export default function LandingPageManager() {
  const [activeTab, setActiveTab] = useState<'hero' | 'images' | 'pages' | 'features'>('hero')
  const [heroImages, setHeroImages] = useState<HeroImage[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  // 히어로 설정 상태
  const [heroSettings, setHeroSettings] = useState<HeroSettings>({
    tagline: '[ 현장을 늘리기보다, 지켜내는 운영 관리 ]',
    headline1: '무인 플레이스',
    headline2: '청소 운영 구조',
    brandName: '무플',
    subtitle: '무인 플레이스 청소 관리 솔루션',
    fontSizeNumbers: {
      headline1: { mobile: 48, desktop: 96 },
      headline2: { mobile: 48, desktop: 96 },
      brandName: { mobile: 24, desktop: 36 },
      subtitle: { mobile: 18, desktop: 24 },
    },
    ctaButton1: {
      text: '운영 구조 상담받기',
      link: '/login',
      visible: true,
    },
    ctaButton2: {
      text: '가볍게 상담 받기',
      link: '/login',
      visible: true,
    },
    sliderInterval: 5000,
  })

  // 히어로 이미지 목록 불러오기
  const loadHeroImages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/landing/hero-images')
      const result = await response.json()
      if (result.success) {
        setHeroImages(result.data || [])
      }
    } catch (error) {
      console.error('Error loading hero images:', error)
      alert('이미지 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 히어로 설정 불러오기
  const loadHeroSettings = async () => {
    try {
      const response = await fetch('/api/admin/landing/settings?section=hero')
      const result = await response.json()
      if (result.success && result.data) {
        const settings = result.data
        // fontSizeNumbers가 없으면 기본값 설정
        if (!settings.fontSizeNumbers) {
          settings.fontSizeNumbers = {
            headline1: { mobile: 48, desktop: 96 },
            headline2: { mobile: 48, desktop: 96 },
            brandName: { mobile: 24, desktop: 36 },
            subtitle: { mobile: 18, desktop: 24 },
          }
        }
        setHeroSettings(settings)
      }
    } catch (error) {
      console.error('Error loading hero settings:', error)
    }
  }

  useEffect(() => {
    loadHeroImages()
    loadHeroSettings()
  }, [])

  // 이미지 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일만 허용
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/landing/hero-images/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed:', errorText)
        throw new Error(`업로드 실패: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        // 목록 새로고침
        await loadHeroImages()
        if (result.warning) {
          alert(`경고: ${result.warning}`)
        } else {
          alert('이미지가 업로드되었습니다.')
        }
      } else {
        alert(result.error || '이미지 업로드에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Error uploading image:', error)
      alert(`이미지 업로드 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setUploading(false)
      // input 초기화 (같은 파일을 다시 선택할 수 있도록)
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  // 이미지 삭제
  const handleDeleteImage = async (id: string) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/landing/hero-images?id=${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        await loadHeroImages()
        alert('이미지가 삭제되었습니다.')
      } else {
        alert(result.error || '이미지 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('이미지 삭제 중 오류가 발생했습니다.')
    }
  }

  // 이미지 순서 업데이트
  const handleUpdateOrder = async (newOrder: HeroImage[]) => {
    try {
      const images = newOrder.map((img, index) => ({
        id: img.id,
        display_order: index,
      }))

      const response = await fetch('/api/admin/landing/hero-images', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images }),
      })

      const result = await response.json()

      if (result.success) {
        setHeroImages(newOrder)
      } else {
        alert(result.error || '순서 업데이트에 실패했습니다.')
        await loadHeroImages() // 실패 시 원래대로 복구
      }
    } catch (error) {
      console.error('Error updating order:', error)
      alert('순서 업데이트 중 오류가 발생했습니다.')
      await loadHeroImages()
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return

    const newImages = [...heroImages]
    const draggedItem = newImages[dragIndex]
    newImages.splice(dragIndex, 1)
    newImages.splice(index, 0, draggedItem)
    setHeroImages(newImages)
    setDragIndex(index)
  }

  const handleDragEnd = () => {
    if (dragIndex !== null) {
      handleUpdateOrder(heroImages)
      setDragIndex(null)
    }
  }

  // 히어로 설정 저장
  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/landing/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: 'hero',
          settings: heroSettings,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert('설정이 저장되었습니다.')
      } else {
        alert(result.error || '설정 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('hero')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'hero'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            히어로 섹션 설정
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'images'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            이미지 관리
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pages'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            페이지 관리
          </button>
            <a
              href="/admin/landing/features"
              className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            >
              기능 관리
            </a>
            <a
              href="/admin/landing/case-studies"
              className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            >
              관리 사례
            </a>
        </nav>
      </div>

      <div className="p-6">
        {/* 히어로 섹션 설정 */}
        {activeTab === 'hero' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                태그라인
              </label>
              <input
                type="text"
                value={heroSettings.tagline}
                onChange={(e) =>
                  setHeroSettings({ ...heroSettings, tagline: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="[ 현장을 늘리기보다, 지켜내는 운영 관리 ]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                헤드라인 1
              </label>
              <input
                type="text"
                value={heroSettings.headline1}
                onChange={(e) =>
                  setHeroSettings({ ...heroSettings, headline1: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-2"
                placeholder="무인 플레이스"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">모바일 크기 (px)</label>
                  <select
                    value={heroSettings.fontSizeNumbers?.headline1?.mobile || 48}
                    onChange={(e) => {
                      const mobile = parseInt(e.target.value)
                      const desktop = heroSettings.fontSizeNumbers?.headline1?.desktop || 96
                      const tailwindClass = numbersToTailwind(mobile, desktop)
                      setHeroSettings({
                        ...heroSettings,
                        fontSizeNumbers: {
                          ...heroSettings.fontSizeNumbers,
                          headline1: { mobile, desktop },
                        },
                        fontSize: {
                          ...heroSettings.fontSize,
                          headline1: tailwindClass,
                        },
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={24}>24px</option>
                    <option value={30}>30px</option>
                    <option value={36}>36px</option>
                    <option value={48}>48px</option>
                    <option value={60}>60px</option>
                    <option value={72}>72px</option>
                    <option value={96}>96px</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">데스크톱 크기 (px)</label>
                  <select
                    value={heroSettings.fontSizeNumbers?.headline1?.desktop || 96}
                    onChange={(e) => {
                      const mobile = heroSettings.fontSizeNumbers?.headline1?.mobile || 48
                      const desktop = parseInt(e.target.value)
                      const tailwindClass = numbersToTailwind(mobile, desktop)
                      setHeroSettings({
                        ...heroSettings,
                        fontSizeNumbers: {
                          ...heroSettings.fontSizeNumbers,
                          headline1: { mobile, desktop },
                        },
                        fontSize: {
                          ...heroSettings.fontSize,
                          headline1: tailwindClass,
                        },
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={48}>48px</option>
                    <option value={60}>60px</option>
                    <option value={72}>72px</option>
                    <option value={96}>96px</option>
                    <option value={128}>128px</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                헤드라인 2
              </label>
              <input
                type="text"
                value={heroSettings.headline2}
                onChange={(e) =>
                  setHeroSettings({ ...heroSettings, headline2: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-2"
                placeholder="청소 운영 구조"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">모바일 크기 (px)</label>
                  <select
                    value={heroSettings.fontSizeNumbers?.headline2?.mobile || 48}
                    onChange={(e) => {
                      const mobile = parseInt(e.target.value)
                      const desktop = heroSettings.fontSizeNumbers?.headline2?.desktop || 96
                      const tailwindClass = numbersToTailwind(mobile, desktop)
                      setHeroSettings({
                        ...heroSettings,
                        fontSizeNumbers: {
                          ...heroSettings.fontSizeNumbers,
                          headline2: { mobile, desktop },
                        },
                        fontSize: {
                          ...heroSettings.fontSize,
                          headline2: tailwindClass,
                        },
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={24}>24px</option>
                    <option value={30}>30px</option>
                    <option value={36}>36px</option>
                    <option value={48}>48px</option>
                    <option value={60}>60px</option>
                    <option value={72}>72px</option>
                    <option value={96}>96px</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">데스크톱 크기 (px)</label>
                  <select
                    value={heroSettings.fontSizeNumbers?.headline2?.desktop || 96}
                    onChange={(e) => {
                      const mobile = heroSettings.fontSizeNumbers?.headline2?.mobile || 48
                      const desktop = parseInt(e.target.value)
                      const tailwindClass = numbersToTailwind(mobile, desktop)
                      setHeroSettings({
                        ...heroSettings,
                        fontSizeNumbers: {
                          ...heroSettings.fontSizeNumbers,
                          headline2: { mobile, desktop },
                        },
                        fontSize: {
                          ...heroSettings.fontSize,
                          headline2: tailwindClass,
                        },
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={48}>48px</option>
                    <option value={60}>60px</option>
                    <option value={72}>72px</option>
                    <option value={96}>96px</option>
                    <option value={128}>128px</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                브랜드명
              </label>
              <input
                type="text"
                value={heroSettings.brandName}
                onChange={(e) =>
                  setHeroSettings({ ...heroSettings, brandName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-2"
                placeholder="무플"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">모바일 크기 (px)</label>
                  <select
                    value={heroSettings.fontSizeNumbers?.brandName?.mobile || 24}
                    onChange={(e) => {
                      const mobile = parseInt(e.target.value)
                      const desktop = heroSettings.fontSizeNumbers?.brandName?.desktop || 36
                      const tailwindClass = numbersToTailwind(mobile, desktop)
                      setHeroSettings({
                        ...heroSettings,
                        fontSizeNumbers: {
                          ...heroSettings.fontSizeNumbers,
                          brandName: { mobile, desktop },
                        },
                        fontSize: {
                          ...heroSettings.fontSize,
                          brandName: tailwindClass,
                        },
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={18}>18px</option>
                    <option value={20}>20px</option>
                    <option value={24}>24px</option>
                    <option value={30}>30px</option>
                    <option value={36}>36px</option>
                    <option value={48}>48px</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">데스크톱 크기 (px)</label>
                  <select
                    value={heroSettings.fontSizeNumbers?.brandName?.desktop || 36}
                    onChange={(e) => {
                      const mobile = heroSettings.fontSizeNumbers?.brandName?.mobile || 24
                      const desktop = parseInt(e.target.value)
                      const tailwindClass = numbersToTailwind(mobile, desktop)
                      setHeroSettings({
                        ...heroSettings,
                        fontSizeNumbers: {
                          ...heroSettings.fontSizeNumbers,
                          brandName: { mobile, desktop },
                        },
                        fontSize: {
                          ...heroSettings.fontSize,
                          brandName: tailwindClass,
                        },
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={24}>24px</option>
                    <option value={30}>30px</option>
                    <option value={36}>36px</option>
                    <option value={48}>48px</option>
                    <option value={60}>60px</option>
                    <option value={72}>72px</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                서브 타이틀
              </label>
              <input
                type="text"
                value={heroSettings.subtitle}
                onChange={(e) =>
                  setHeroSettings({ ...heroSettings, subtitle: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-2"
                placeholder="무인 플레이스 청소 관리 솔루션"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">모바일 크기 (px)</label>
                  <select
                    value={heroSettings.fontSizeNumbers?.subtitle?.mobile || 18}
                    onChange={(e) => {
                      const mobile = parseInt(e.target.value)
                      const desktop = heroSettings.fontSizeNumbers?.subtitle?.desktop || 24
                      const tailwindClass = numbersToTailwind(mobile, desktop)
                      setHeroSettings({
                        ...heroSettings,
                        fontSizeNumbers: {
                          ...heroSettings.fontSizeNumbers,
                          subtitle: { mobile, desktop },
                        },
                        fontSize: {
                          ...heroSettings.fontSize,
                          subtitle: tailwindClass,
                        },
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={14}>14px</option>
                    <option value={16}>16px</option>
                    <option value={18}>18px</option>
                    <option value={20}>20px</option>
                    <option value={24}>24px</option>
                    <option value={30}>30px</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">데스크톱 크기 (px)</label>
                  <select
                    value={heroSettings.fontSizeNumbers?.subtitle?.desktop || 24}
                    onChange={(e) => {
                      const mobile = heroSettings.fontSizeNumbers?.subtitle?.mobile || 18
                      const desktop = parseInt(e.target.value)
                      const tailwindClass = numbersToTailwind(mobile, desktop)
                      setHeroSettings({
                        ...heroSettings,
                        fontSizeNumbers: {
                          ...heroSettings.fontSizeNumbers,
                          subtitle: { mobile, desktop },
                        },
                        fontSize: {
                          ...heroSettings.fontSize,
                          subtitle: tailwindClass,
                        },
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={18}>18px</option>
                    <option value={20}>20px</option>
                    <option value={24}>24px</option>
                    <option value={30}>30px</option>
                    <option value={36}>36px</option>
                    <option value={48}>48px</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CTA 버튼 1 텍스트
                </label>
                <input
                  type="text"
                  value={heroSettings.ctaButton1.text}
                  onChange={(e) =>
                    setHeroSettings({
                      ...heroSettings,
                      ctaButton1: { ...heroSettings.ctaButton1, text: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="운영 구조 상담받기"
                />
                <input
                  type="text"
                  value={heroSettings.ctaButton1.link}
                  onChange={(e) =>
                    setHeroSettings({
                      ...heroSettings,
                      ctaButton1: { ...heroSettings.ctaButton1, link: e.target.value },
                    })
                  }
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="/login"
                />
                <label className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    checked={heroSettings.ctaButton1.visible}
                    onChange={(e) =>
                      setHeroSettings({
                        ...heroSettings,
                        ctaButton1: { ...heroSettings.ctaButton1, visible: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">표시</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CTA 버튼 2 텍스트
                </label>
                <input
                  type="text"
                  value={heroSettings.ctaButton2.text}
                  onChange={(e) =>
                    setHeroSettings({
                      ...heroSettings,
                      ctaButton2: { ...heroSettings.ctaButton2, text: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="가볍게 상담 받기"
                />
                <input
                  type="text"
                  value={heroSettings.ctaButton2.link}
                  onChange={(e) =>
                    setHeroSettings({
                      ...heroSettings,
                      ctaButton2: { ...heroSettings.ctaButton2, link: e.target.value },
                    })
                  }
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="/login"
                />
                <label className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    checked={heroSettings.ctaButton2.visible}
                    onChange={(e) =>
                      setHeroSettings({
                        ...heroSettings,
                        ctaButton2: { ...heroSettings.ctaButton2, visible: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">표시</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                슬라이더 간격 (밀리초)
              </label>
              <input
                type="number"
                value={heroSettings.sliderInterval}
                onChange={(e) =>
                  setHeroSettings({
                    ...heroSettings,
                    sliderInterval: parseInt(e.target.value) || 5000,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="1000"
                step="1000"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '저장 중...' : '설정 저장'}
              </button>
            </div>
          </div>
        )}

        {/* 이미지 관리 */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            {/* 이미지 업로드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이미지 업로드
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-3 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4h4m-4-4v12m0 0l-4-4m4 4l4-4"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex flex-col items-center gap-2">
                    <label
                      htmlFor="file-upload"
                      className="relative inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      이미지 파일 선택
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                    <p className="text-sm text-gray-600">또는 드래그 앤 드롭</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF 최대 10MB</p>
                </div>
              </div>
              {uploading && (
                <p className="mt-2 text-sm text-gray-500 text-center">업로드 중...</p>
              )}
            </div>

            {/* 이미지 목록 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                업로드된 이미지 ({heroImages.length}개)
              </label>
              {loading ? (
                <p className="text-center text-gray-500 py-8">로딩 중...</p>
              ) : heroImages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">업로드된 이미지가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {heroImages.map((image, index) => (
                    <div
                      key={image.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative group border-2 rounded-lg overflow-hidden ${
                        dragIndex === index ? 'border-blue-500 opacity-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="aspect-video relative bg-gray-100">
                        <img
                          src={image.image_url}
                          alt={`Hero image ${index + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition-colors"
                          title="삭제"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="p-2 bg-white">
                        <p className="text-xs text-gray-500">순서: {index + 1}</p>
                        <p className="text-xs text-gray-400 truncate">{image.image_url}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 페이지 관리 */}
        {activeTab === 'pages' && (
          <PagesManager />
        )}
      </div>
    </div>
  )
}

// 페이지 관리 컴포넌트
function PagesManager() {
  const [pages, setPages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPage, setEditingPage] = useState<any>(null)
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    meta_title: '',
    meta_description: '',
    is_published: false,
  })

  // 페이지 목록 불러오기
  const loadPages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/landing/pages')
      const result = await response.json()
      if (result.success) {
        setPages(result.data || [])
      }
    } catch (error) {
      console.error('Error loading pages:', error)
      alert('페이지 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPages()
  }, [])

  // 페이지 생성/수정
  const handleSavePage = async () => {
    try {
      if (!formData.slug || !formData.title) {
        alert('슬러그와 제목은 필수입니다.')
        return
      }

      const url = editingPage
        ? `/api/admin/landing/pages/${editingPage.id}`
        : '/api/admin/landing/pages'

      const method = editingPage ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          content: { html: formData.content }, // 간단한 HTML 콘텐츠
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(editingPage ? '페이지가 수정되었습니다.' : '페이지가 생성되었습니다.')
        setShowCreateModal(false)
        setEditingPage(null)
        setFormData({
          slug: '',
          title: '',
          content: '',
          meta_title: '',
          meta_description: '',
          is_published: false,
        })
        loadPages()
      } else {
        alert(result.error || '페이지 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error saving page:', error)
      alert('페이지 저장 중 오류가 발생했습니다.')
    }
  }

  // 페이지 삭제
  const handleDeletePage = async (id: string) => {
    if (!confirm('이 페이지를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/landing/pages/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        alert('페이지가 삭제되었습니다.')
        loadPages()
      } else {
        alert(result.error || '페이지 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      alert('페이지 삭제 중 오류가 발생했습니다.')
    }
  }

  // 편집 모달 열기
  const handleEdit = (page: any) => {
    setEditingPage(page)
    setFormData({
      slug: page.slug,
      title: page.title,
      content: page.content?.html || '',
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || '',
      is_published: page.is_published || false,
    })
    setShowCreateModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">커스텀 페이지 관리</h3>
        <button
          onClick={() => {
            setEditingPage(null)
            setFormData({
              slug: '',
              title: '',
              content: '',
              meta_title: '',
              meta_description: '',
              is_published: false,
            })
            setShowCreateModal(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          새 페이지 생성
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">로딩 중...</p>
      ) : pages.length === 0 ? (
        <p className="text-center text-gray-500 py-8">생성된 페이지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <div
              key={page.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{page.title}</h4>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    page.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {page.is_published ? '발행됨' : '임시저장'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">/{page.slug}</p>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                {page.meta_description || '설명 없음'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(page)}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDeletePage(page.id)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 생성/수정 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingPage ? '페이지 수정' : '새 페이지 생성'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  슬러그 (URL 경로) *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="about"
                  disabled={!!editingPage}
                />
                <p className="mt-1 text-xs text-gray-500">영문 소문자, 숫자, 하이픈만 사용 가능</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="페이지 제목"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  콘텐츠 (HTML)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={10}
                  placeholder="<p>페이지 내용을 HTML로 작성하세요</p>"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메타 제목 (SEO)
                </label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="SEO 제목"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메타 설명 (SEO)
                </label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="SEO 설명"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">발행하기</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingPage(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSavePage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
