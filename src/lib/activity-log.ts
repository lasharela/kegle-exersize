import { ID, Permission, Role, Query } from 'appwrite'
import { databases, DATABASE_ID, ACTIVITYLOGS_COLLECTION } from './appwrite'
import type { ActivityLog } from './types'
import type { ActivityType } from './program'

export async function logActivity(p: {
  userId: string; type: ActivityType; completed: boolean; durationSec: number; payload?: object
}): Promise<void> {
  try {
    await databases.createDocument(
      DATABASE_ID, ACTIVITYLOGS_COLLECTION, ID.unique(),
      {
        userId: p.userId,
        date: new Date().toISOString().split('T')[0],
        type: p.type,
        completed: p.completed,
        durationSec: p.durationSec,
        payload: p.payload ? JSON.stringify(p.payload) : undefined,
      },
      [Permission.read(Role.user(p.userId)), Permission.update(Role.user(p.userId))]
    )
  } catch (e) {
    console.error('logActivity failed (collection may not exist yet):', e)
  }
}

export async function listActivityLogs(userId: string, limit = 100): Promise<ActivityLog[]> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, ACTIVITYLOGS_COLLECTION, [
      Query.equal('userId', userId),
      Query.orderDesc('date'),
      Query.limit(limit),
    ])
    return res.documents as unknown as ActivityLog[]
  } catch (e) {
    console.error('listActivityLogs failed (collection may not exist yet):', e)
    return []
  }
}
