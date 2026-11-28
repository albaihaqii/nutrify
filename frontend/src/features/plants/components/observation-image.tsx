import { useState } from 'react'
import { id } from '@/locales/id'
import { useAuthStore } from '@/stores/auth-store'
import {
  observationImageUrl,
  type ObservationView,
} from '@/lib/observation-image-url'
import { cn } from '@/lib/utils'

interface ObservationImageProps {
  /** Null when no snapshot was stored with the result. */
  observationId: number | null
  view: ObservationView
  /** Accessible name of the picture. */
  label: string
  className?: string
}

/** The hole of a stored result; a note instead when the snapshot is gone. */
export function ObservationImage({
  observationId,
  view,
  label,
  className,
}: ObservationImageProps) {
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const [failedId, setFailedId] = useState<number | null>(null)

  if (!accessToken || observationId === null || failedId === observationId) {
    return (
      <span className='px-3 text-center text-xs text-white/70'>
        {id.plants.noPhoto}
      </span>
    )
  }

  return (
    <img
      src={observationImageUrl(observationId, view, accessToken)}
      alt={label}
      className={cn('object-contain', className)}
      onError={() => setFailedId(observationId)}
    />
  )
}
