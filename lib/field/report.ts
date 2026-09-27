import { signMediaPaths } from './media-storage'
import { getFieldAnonClient } from './supabase'

export const REPORT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
export const REPORT_FIRST_PAGE_PAIRS = 12
export const REPORT_PAGE_PAIRS = 24

type RawPhoto = { path: string; thumb_path: string; width: number | null; height: number | null } | null

type RawPair = {
  id: string
  area_id: string
  caption: string | null
  before: RawPhoto
  after: RawPhoto
}

type RawReport = {
  company_name: string
  title: string
  service_type: string
  region: string | null
  work_date: string | null
  status: 'in_progress' | 'completed'
  areas: { id: string; name: string }[]
  total_pairs: number
  pairs: RawPair[]
}

export type ReportPhoto = {
  thumbUrl: string
  fullUrl: string
  width: number | null
  height: number | null
}

export type ReportPair = {
  id: string
  areaId: string
  caption: string | null
  before: ReportPhoto | null
  after: ReportPhoto | null
}

export type Report = {
  companyName: string
  title: string
  serviceType: string
  region: string | null
  workDate: string | null
  completed: boolean
  areas: { id: string; name: string }[]
  totalPairs: number
  pairs: ReportPair[]
}

export function isValidReportToken(token: string) {
  return REPORT_TOKEN_PATTERN.test(token)
}

async function signPairs(pairs: RawPair[]): Promise<ReportPair[]> {
  const paths: string[] = []
  for (const pair of pairs) {
    for (const photo of [pair.before, pair.after]) {
      if (photo) paths.push(photo.thumb_path, photo.path)
    }
  }
  const urls = await signMediaPaths(paths)

  const toPhoto = (photo: RawPhoto): ReportPhoto | null => {
    if (!photo) return null
    const thumbUrl = urls.get(photo.thumb_path)
    const fullUrl = urls.get(photo.path)
    if (!thumbUrl || !fullUrl) return null
    return { thumbUrl, fullUrl, width: photo.width, height: photo.height }
  }

  return pairs.map((pair) => ({
    id: pair.id,
    areaId: pair.area_id,
    caption: pair.caption,
    before: toPhoto(pair.before),
    after: toPhoto(pair.after),
  }))
}

/** 유효하지 않거나 폐기/만료된 링크면 null. */
export async function getReport(token: string): Promise<Report | null> {
  if (!isValidReportToken(token)) return null

  const { data, error } = await getFieldAnonClient().rpc('get_report', { p_token: token })
  if (error) throw new Error(`report_load_failed: ${error.code ?? 'unknown'}`)
  if (!data) return null

  const raw = data as RawReport
  return {
    companyName: raw.company_name,
    title: raw.title,
    serviceType: raw.service_type,
    region: raw.region,
    workDate: raw.work_date,
    completed: raw.status === 'completed',
    areas: raw.areas,
    totalPairs: raw.total_pairs,
    pairs: await signPairs(raw.pairs),
  }
}

export async function getReportPairs(token: string, offset: number): Promise<ReportPair[] | null> {
  if (!isValidReportToken(token)) return null

  const { data, error } = await getFieldAnonClient().rpc('get_report_media', {
    p_token: token,
    p_offset: offset,
    p_limit: REPORT_PAGE_PAIRS,
  })
  if (error) throw new Error(`report_media_load_failed: ${error.code ?? 'unknown'}`)
  if (!data) return null

  return signPairs(data as RawPair[])
}
