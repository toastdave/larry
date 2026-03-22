import { env } from '$env/dynamic/private'
import { createDb } from '@larry/db'

const globalForDb = globalThis as typeof globalThis & {
	__larryDb?: ReturnType<typeof createDb>
}

export const db =
	globalForDb.__larryDb ??
	createDb(env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/larry')

if (!globalForDb.__larryDb) {
	globalForDb.__larryDb = db
}
