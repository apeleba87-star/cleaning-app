'use client'

import { useEffect, useState, useCallback } from 'react'
import type { V2AdPayload } from '@/types/v2'

type AdSlotProps = {
  slot: string
  className?: string
  /** 무료버전: 출근 전 등 의도적 딜레이(초) */
  forcedDelaySeconds?: number
}

export default function V2AdSlot({ slot, className = '', forcedDelaySeconds = 0 }: AdSlotProps) {
  const [ad, setAd] = useState<V2AdPayload | null>(null)
  const [ready, setReady] = useState(forcedDelaySeconds === 0)
  const [countdown, setCountdown] = useState(forcedDelaySeconds)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/v2/ads?slot=${encodeURIComponent(slot)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setAd(d.ad || null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [slot])

  useEffect(() => {
    if (forcedDelaySeconds <= 0) {
      setReady(true)
      return
    }
    setCountdown(forcedDelaySeconds)
    setReady(false)
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t)
          setReady(true)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [forcedDelaySeconds, slot])

  const onClick = useCallback(() => {
    if (!ad?.link_url || !ad.campaign_id) return
    fetch('/api/v2/ads/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: ad.campaign_id, slot }),
    }).catch(() => {})
    window.open(ad.link_url, '_blank', 'noopener,noreferrer')
  }, [ad, slot])

  if (!ad) return null

  if (!ready) {
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 text-center ${className}`}>
        <p className="text-sm text-amber-800 font-medium">무료 버전 — 파트너 안내</p>
        {ad.image_url && (
          <img src={ad.image_url} alt="" className="mx-auto mt-2 max-h-24 object-contain opacity-80" />
        )}
        <p className="text-xs text-amber-600 mt-2">{countdown}초 후 계속</p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 text-right">광고</div>
      {ad.image_url && (
        <img src={ad.image_url} alt={ad.title || '광고'} className="w-full h-28 object-cover" />
      )}
      <div className="p-3">
        {ad.title && <p className="font-semibold text-sm text-gray-900">{ad.title}</p>}
        {ad.body && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ad.body}</p>}
      </div>
    </div>
  )
}
