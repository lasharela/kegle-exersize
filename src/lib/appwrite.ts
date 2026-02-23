import { Client, Account, Databases } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT)

export const account = new Account(client)
export const databases = new Databases(client)

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE
export const PROFILES_COLLECTION = import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION
export const EXERCISES_COLLECTION = import.meta.env.VITE_APPWRITE_EXERCISES_COLLECTION
