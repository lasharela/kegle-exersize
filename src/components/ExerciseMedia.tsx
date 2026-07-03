import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { mediaUrl, hasVideo, imageFrames, gifUrl, videoBlobUrl } from '../lib/exercise-media'

interface Props {
  mediaKey: string
  name: string
  className?: string
  style?: CSSProperties
}

// Alternates an exercise's start/end photo frames to suggest the movement.
function FrameLoop({ frames, name, className, style }: { frames: [string, string] } & Omit<Props, 'mediaKey'>) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1200)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="relative block">
      {/* Both frames stay mounted so the swap never flashes while loading */}
      <img src={frames[0]} alt={name} className={className} style={{ ...style, opacity: frame === 0 ? 1 : 0, transition: 'opacity 0.25s' }} />
      <img src={frames[1]} alt="" aria-hidden className={`${className ?? ''} absolute inset-0`} style={{ ...style, opacity: frame === 1 ? 1 : 0, transition: 'opacity 0.25s' }} />
    </span>
  )
}

// Plays the demo mp4 from a blob URL (the static hosting ignores Range
// requests, which iOS <video> needs for direct URLs). If the video errors or
// hasn't produced a frame within the grace period, swaps to the animated GIF.
function BlobVideo({ mediaKey, name, className, style }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [useGif, setUseGif] = useState(false)

  useEffect(() => {
    let cancelled = false
    videoBlobUrl(mediaKey).then((url) => {
      if (cancelled) return
      if (url) setSrc(url)
      else setUseGif(true)
    })
    return () => { cancelled = true }
  }, [mediaKey])

  // Watchdog: no decoded frame shortly after the src is set → GIF.
  useEffect(() => {
    if (!src || useGif) return
    const id = setTimeout(() => {
      const v = videoRef.current
      if (!v || v.readyState < 2 /* HAVE_CURRENT_DATA */) setUseGif(true)
    }, 3000)
    return () => clearTimeout(id)
  }, [src, useGif])

  if (useGif) return <img src={gifUrl(mediaKey)} alt={name} className={className} style={style} />
  if (!src) return <div className={className} style={style} aria-label={name} />
  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      aria-label={name}
      className={className}
      style={style}
      onError={() => setUseGif(true)}
    />
  )
}

// Renders an exercise demo: blob-backed looping <video> with GIF fallback for
// program exercises, alternating photo frames for the newer moves, app icon
// for unknown keys.
export default function ExerciseMedia({ mediaKey, name, className, style }: Props) {
  if (hasVideo(mediaKey)) {
    return <BlobVideo mediaKey={mediaKey} name={name} className={className} style={style} />
  }
  const frames = imageFrames(mediaKey)
  if (frames) return <FrameLoop frames={frames} name={name} className={className} style={style} />
  return <img src={mediaUrl(mediaKey)} alt={name} className={className} style={style} />
}
