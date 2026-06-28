import { useNavigate } from 'react-router-dom'

export default function Warmup() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4 px-4">
      <h1 className="text-text font-bold text-2xl">Warm-up</h1>
      <p className="text-text-dim text-sm">Coming soon</p>
      <button
        onClick={() => navigate('/')}
        className="mt-4 bg-surface border border-border text-text-dim text-sm font-semibold px-5 py-2 rounded-lg active:scale-95 transition-transform"
      >
        Back
      </button>
    </div>
  )
}
