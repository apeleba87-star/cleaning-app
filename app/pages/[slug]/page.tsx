import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = await createServerSupabaseClient()

  const { data: page } = await supabase
    .from('custom_pages')
    .select('title, meta_title, meta_description')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .eq('is_active', true)
    .single()

  if (!page) {
    return {
      title: '페이지를 찾을 수 없습니다',
    }
  }

  return {
    title: page.meta_title || page.title,
    description: page.meta_description || '',
  }
}

export default async function CustomPage({ params }: { params: { slug: string } }) {
  const supabase = await createServerSupabaseClient()

  const { data: page, error } = await supabase
    .from('custom_pages')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .eq('is_active', true)
    .single()

  if (error || !page) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content?.html || '' }}
        />
      </div>
    </div>
  )
}
