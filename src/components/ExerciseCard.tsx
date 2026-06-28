import type { StrengthExercise } from '../lib/program'
import { mediaUrl } from '../lib/exercise-media'

interface Props {
  exercise: StrengthExercise
  setIndex: number
  totalSets: number
  reps: number
}

export default function ExerciseCard({ exercise, setIndex, totalSets, reps }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <img
        src={mediaUrl(exercise.mediaKey)}
        onError={(e) => { e.currentTarget.src = '/icon-192.png' }}
        alt={exercise.name}
        className="w-full rounded-2xl object-contain bg-surface"
        style={{ maxHeight: '40vh' }}
      />
      <h2 className="text-text font-bold text-2xl text-center">{exercise.name}</h2>
      <p className="text-text-dim text-sm">Set {setIndex} of {totalSets}</p>
      <p className="text-primary font-bold text-5xl">
        {exercise.perSide ? `${reps} / side` : `${reps} reps`}
      </p>
    </div>
  )
}
