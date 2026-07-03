import { useEffect, useState, type CSSProperties } from 'react'
import { mediaUrl, hasVideo, imageFrames } from '../lib/exercise-media'

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

// Renders an exercise demo as a looping muted inline <video> (reliable on iOS
// standalone PWAs, unlike GIFs which freeze on the first frame). Exercises
// without a video alternate two photo frames; unknown keys fall back to the icon.
export default function ExerciseMedia({ mediaKey, name, className, style }: Props) {
  if (!hasVideo(mediaKey)) {
    const frames = imageFrames(mediaKey)
    if (frames) return <FrameLoop frames={frames} name={name} className={className} style={style} />
    return <img src={mediaUrl(mediaKey)} alt={name} className={className} style={style} />
  }
  return (
    <video
      src={mediaUrl(mediaKey)}
      autoPlay
      loop
      muted
      playsInline
      aria-label={name}
      className={className}
      style={style}
    />
  )
}
