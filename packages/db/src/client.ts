import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index'

export type DatabaseSchema = typeof schema

export function createDb(
	databaseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/larry'
) {
	const client = postgres(databaseUrl, {
		max: 10,
	})

	return drizzle(client, { schema })
}
