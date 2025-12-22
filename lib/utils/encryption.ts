/**
 * 민감 정보 암호화/복호화 유틸리티
 * 주민등록번호 등 개인정보 보호를 위한 AES-256-GCM 암호화
 */

import crypto from 'crypto'

// 환경 변수에서 암호화 키 가져오기 (32바이트 = 256비트)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')

// 키가 환경 변수에 없으면 경고
if (!process.env.ENCRYPTION_KEY) {
  console.warn('⚠️ ENCRYPTION_KEY 환경 변수가 설정되지 않았습니다. 임시 키를 사용합니다. 프로덕션에서는 반드시 환경 변수를 설정하세요.')
}

// 암호화 키를 버퍼로 변환 (32바이트)
function getKey(): Buffer {
  // 환경 변수가 hex 문자열이면 변환, 아니면 해시 사용
  if (ENCRYPTION_KEY.length === 64) {
    // hex 문자열 (64자 = 32바이트)
    return Buffer.from(ENCRYPTION_KEY, 'hex')
  } else {
    // 다른 형식이면 SHA-256 해시 사용
    return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
  }
}

/**
 * 데이터 암호화
 * @param text 암호화할 평문 데이터
 * @returns 암호화된 데이터 (iv:tag:ciphertext 형식의 hex 문자열)
 */
export function encrypt(text: string): string {
  if (!text) {
    throw new Error('암호화할 데이터가 없습니다.')
  }

  try {
    const key = getKey()
    const iv = crypto.randomBytes(16) // 128비트 IV
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // IV:AuthTag:EncryptedData 형식으로 반환
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('암호화 오류:', error)
    throw new Error('데이터 암호화에 실패했습니다.')
  }
}

/**
 * 데이터 복호화
 * @param encryptedData 암호화된 데이터 (iv:tag:ciphertext 형식)
 * @returns 복호화된 평문 데이터
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('복호화할 데이터가 없습니다.')
  }

  try {
    const key = getKey()
    const parts = encryptedData.split(':')

    if (parts.length !== 3) {
      throw new Error('잘못된 암호화 데이터 형식입니다.')
    }

    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('복호화 오류:', error)
    throw new Error('데이터 복호화에 실패했습니다. 데이터가 손상되었거나 키가 일치하지 않습니다.')
  }
}

/**
 * 주민등록번호 마스킹 (표시용)
 * @param rrn 주민등록번호 (암호화된 데이터 또는 평문)
 * @param isEncrypted 암호화된 데이터인지 여부
 * @returns 마스킹된 주민등록번호 (예: 900101-1******)
 */
export function maskResidentRegistrationNumber(rrn: string, isEncrypted: boolean = false): string {
  if (!rrn) return ''

  try {
    // 암호화된 데이터면 복호화 시도 (실패하면 그대로 반환)
    let plainText = rrn
    if (isEncrypted) {
      try {
        plainText = decrypt(rrn)
      } catch {
        // 복호화 실패하면 원본 반환
        return '******-*******'
      }
    }

    // 주민등록번호 형식 검증 (YYYYMMDD-GXXXXXX)
    if (plainText.length === 14 && plainText.includes('-')) {
      const [datePart, codePart] = plainText.split('-')
      if (datePart.length === 6 && codePart.length === 7) {
        return `${datePart}-${codePart[0]}******`
      }
    } else if (plainText.length === 13 && !plainText.includes('-')) {
      // 하이픈 없는 형식 (YYYYMMDDGXXXXXX)
      return `${plainText.substring(0, 6)}-${plainText[6]}******`
    }

    // 형식이 맞지 않으면 전체 마스킹
    return '******-*******'
  } catch {
    return '******-*******'
  }
}

