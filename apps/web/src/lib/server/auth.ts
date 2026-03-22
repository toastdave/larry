import { getRequestEvent } from '$app/server'
import { env } from '$env/dynamic/private'
import { getSocialProviderConfig } from '$lib/server/auth-providers'
import { db } from '$lib/server/db'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import * as schema from '@larry/db/schema'
import { betterAuth } from 'better-auth'
import { sveltekitCookies } from 'better-auth/svelte-kit'

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL ?? 'http://localhost:5173',
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [sveltekitCookies(getRequestEvent)],
	secret: env.BETTER_AUTH_SECRET ?? 'larry-development-secret',
	socialProviders: getSocialProviderConfig(),
})
