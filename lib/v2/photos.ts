'use client'

export type V2PhotoKind = 'before' | 'after' | 'issue' | 'extra'

export async function compressV2Photo(file: File, maxSize = 1600, quality = 0.78): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const imageUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = imageUrl
    })

    const ratio = Math.min(1, maxSize / Math.max(img.width, img.height))
    const width = Math.max(1, Math.round(img.width * ratio))
    const height = Math.max(1, Math.round(img.height * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })
    if (!blob) return file

    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

export async function uploadV2Photo(input: {
  file: File
  storeId: string
  kind: V2PhotoKind
  memo?: string
  issueId?: string
}) {
  const compressed = await compressV2Photo(input.file)
  const form = new FormData()
  form.append('file', compressed)
  form.append('store_id', input.storeId)
  form.append('kind', input.kind)
  form.append('client_created_at', new Date().toISOString())
  if (input.memo) form.append('memo', input.memo)
  if (input.issueId) form.append('issue_id', input.issueId)

  const res = await fetch('/api/v2/photos', {
    method: 'POST',
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '사진 업로드 실패')
  return data.photo
}
