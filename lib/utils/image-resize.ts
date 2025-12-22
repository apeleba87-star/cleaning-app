/**
 * 이미지를 최대 500KB 이하로 리사이징하는 함수
 * @param file 원본 이미지 파일
 * @param maxSizeKB 최대 파일 크기 (KB, 기본값: 500)
 * @param maxWidth 최대 너비 (기본값: 1920)
 * @param maxHeight 최대 높이 (기본값: 1920)
 * @returns 리사이징된 Blob
 */
export async function resizeImage(
  file: File,
  maxSizeKB: number = 500,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // 원본 이미지 크기
        let width = img.width
        let height = img.height
        
        // 최대 크기로 리사이징 (비율 유지)
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        
        // Canvas 생성
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Canvas context를 가져올 수 없습니다.'))
          return
        }
        
        // 이미지 그리기 (고품질, 부드러운 리사이징)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)
        
        // 품질 조정하여 500KB 이하로 압축 (이진 탐색 방식으로 효율성 향상)
        let minQuality = 0.1
        let maxQuality = 0.9
        let bestBlob: Blob | null = null
        
        const tryCompress = (quality: number): void => {
          canvas.toBlob(
            (compressedBlob) => {
              if (!compressedBlob) {
                // 실패하면 이전 blob 반환
                resolve(bestBlob || new Blob())
                return
              }
              
              const sizeKB = compressedBlob.size / 1024
              
              // 목표 크기 이하면 완료
              if (sizeKB <= maxSizeKB) {
                resolve(compressedBlob)
                return
              }
              
              // 아직 크면 품질을 낮춰서 다시 시도
              if (quality > minQuality) {
                const newQuality = Math.max(minQuality, quality - 0.1)
                bestBlob = compressedBlob // 현재까지 가장 작은 blob 저장
                tryCompress(newQuality)
              } else {
                // 최소 품질까지 시도했으면 현재 blob 반환
                resolve(compressedBlob)
              }
            },
            'image/jpeg',
            quality
          )
        }
        
        // 초기 품질 0.7로 시작 (더 빠른 압축)
        tryCompress(0.7)
      }
      
      img.onerror = () => {
        reject(new Error('이미지를 로드할 수 없습니다.'))
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * 이미지 파일을 리사이징하여 File 객체로 반환
 * @param file 원본 이미지 파일
 * @param maxSizeKB 최대 파일 크기 (KB, 기본값: 500)
 * @returns 리사이징된 File 객체
 */
export async function resizeImageToFile(
  file: File,
  maxSizeKB: number = 500
): Promise<File> {
  const blob = await resizeImage(file, maxSizeKB)
  
  // 원본 파일명 유지 (확장자는 jpeg로 변경)
  const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
  
  return new File([blob], fileName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

