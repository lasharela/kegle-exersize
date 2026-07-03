import { ID, Permission, Role, Query } from 'appwrite'
import { databases, DATABASE_ID, WEIGHTLOGS_COLLECTION } from './appwrite'
import type { WeightLog } from './types'
import { localDateISO } from './date'

// Upsert today's (or the given day's) weight — one entry per user per day.
export async function logWeight(userId: string, kg: number, date = localDateISO()): Promise<void> {
  const existing = await databases.listDocuments(DATABASE_ID, WEIGHTLOGS_COLLECTION, [
    Query.equal('userId', userId),
    Query.equal('date', date),
    Query.limit(1),
  ])
  if (existing.documents.length > 0) {
    await databases.updateDocument(DATABASE_ID, WEIGHTLOGS_COLLECTION, existing.documents[0].$id, { kg })
    return
  }
  await databases.createDocument(
    DATABASE_ID, WEIGHTLOGS_COLLECTION, ID.unique(),
    { userId, date, kg },
    [Permission.read(Role.user(userId)), Permission.update(Role.user(userId))],
  )
}

// Most recent first.
export async function listWeights(userId: string, limit = 180): Promise<WeightLog[]> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, WEIGHTLOGS_COLLECTION, [
      Query.equal('userId', userId),
      Query.orderDesc('date'),
      Query.limit(limit),
    ])
    return res.documents as unknown as WeightLog[]
  } catch (e) {
    console.error('listWeights failed:', e)
    return []
  }
}

// Trailing moving average over date-ascending entries.
export function movingAverage(
  entries: { date: string; kg: number }[],
  window = 7,
): { date: string; kg: number }[] {
  return entries.map((entry, i) => {
    const slice = entries.slice(Math.max(0, i - window + 1), i + 1)
    const avg = slice.reduce((sum, p) => sum + p.kg, 0) / slice.length
    return { date: entry.date, kg: avg }
  })
}
