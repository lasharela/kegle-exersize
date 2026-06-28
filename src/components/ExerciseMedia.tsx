import type { CSSProperties } from 'react'
import { mediaUrl, hasVideo } from '../lib/exercise-media'

interface Props {
  mediaKey: string
  name: string
  className?: string
  style?: CSSProperties
}

// Renders an exercise demo as a looping muted inline <video> (reliable on iOS
// standalone PWAs, unlike GIFs which freeze on the first frame). Falls back to
// the app icon when there's no media for the key.
export default function ExerciseMedia({ mediaKey, name, className, style }: Props) {
  if (!hasVideo(mediaKey)) {
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
