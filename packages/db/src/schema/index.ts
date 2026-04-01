import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'

export const conversationStatusEnum = pgEnum('conversation_status', ['active', 'archived'])

export const messageRoleEnum = pgEnum('message_role', ['system', 'user', 'assistant', 'tool'])

export const messagePartTypeEnum = pgEnum('message_part_type', [
	'text',
	'citation',
	'tool_call',
	'tool_result',
])

export const toolCallStatusEnum = pgEnum('tool_call_status', ['pending', 'succeeded', 'failed'])

export const citationKindEnum = pgEnum('citation_kind', [
	'article',
	'score',
	'odds',
	'injury',
	'standings',
])

export const entitlementStatusEnum = pgEnum('entitlement_status', [
	'free',
	'trialing',
	'active',
	'past_due',
	'cancelled',
])

export const usageEntryTypeEnum = pgEnum('usage_entry_type', [
	'grant',
	'subscription',
	'inference',
	'search',
	'overage',
	'adjustment',
	'refund',
])

export const teamAffinityEnum = pgEnum('team_affinity', ['favorite', 'rival', 'follow'])

export const providerKindEnum = pgEnum('provider_kind', [
	'search',
	'sports_data',
	'model',
	'billing',
])

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
	},
	(table) => [uniqueIndex('session_token_idx').on(table.token)]
)

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('account_user_idx').on(table.userId),
		uniqueIndex('account_provider_account_idx').on(table.providerId, table.accountId),
	]
)

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [uniqueIndex('verification_identifier_value_idx').on(table.identifier, table.value)]
)

export const personaProfile = pgTable('persona_profile', {
	id: text('id').primaryKey(),
	slug: varchar('slug', { length: 64 }).notNull().unique(),
	name: varchar('name', { length: 80 }).notNull(),
	systemPrompt: text('system_prompt').notNull(),
	temperatureTenth: integer('temperature_tenth').notNull().default(7),
	isDefault: boolean('is_default').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const conversation = pgTable(
	'conversation',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		ownerUserId: text('owner_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		personaSlug: varchar('persona_slug', { length: 64 }).notNull().default('larry'),
		slug: varchar('slug', { length: 96 }).notNull().unique(),
		title: varchar('title', { length: 160 }).notNull(),
		favoriteTeam: varchar('favorite_team', { length: 80 }),
		seasonContext: varchar('season_context', { length: 80 }),
		status: conversationStatusEnum('status').notNull().default('active'),
		lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('conversation_owner_idx').on(table.ownerUserId),
		index('conversation_status_idx').on(table.status),
	]
)

export const message = pgTable(
	'message',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => conversation.id, { onDelete: 'cascade' }),
		role: messageRoleEnum('role').notNull(),
		model: varchar('model', { length: 120 }),
		toolName: varchar('tool_name', { length: 80 }),
		contentText: text('content_text'),
		searchRequired: boolean('search_required').notNull().default(false),
		citationCount: integer('citation_count').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('message_conversation_idx').on(table.conversationId),
		index('message_role_idx').on(table.role),
	]
)

export const messagePart = pgTable(
	'message_part',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		messageId: uuid('message_id')
			.notNull()
			.references(() => message.id, { onDelete: 'cascade' }),
		type: messagePartTypeEnum('type').notNull(),
		partOrder: integer('part_order').notNull().default(0),
		textValue: text('text_value'),
		payload: jsonb('payload').notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('message_part_message_idx').on(table.messageId)]
)

export const toolCall = pgTable(
	'tool_call',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		messageId: uuid('message_id')
			.notNull()
			.references(() => message.id, { onDelete: 'cascade' }),
		toolName: varchar('tool_name', { length: 80 }).notNull(),
		provider: varchar('provider', { length: 80 }).notNull(),
		status: toolCallStatusEnum('status').notNull().default('pending'),
		input: jsonb('input').notNull().default({}),
		output: jsonb('output').default({}),
		errorMessage: text('error_message'),
		startedAt: timestamp('started_at', { withTimezone: true }),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('tool_call_message_idx').on(table.messageId)]
)

export const searchQuery = pgTable(
	'search_query',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		conversationId: uuid('conversation_id').references(() => conversation.id, {
			onDelete: 'set null',
		}),
		toolCallId: uuid('tool_call_id').references(() => toolCall.id, { onDelete: 'set null' }),
		provider: varchar('provider', { length: 80 }).notNull(),
		queryText: text('query_text').notNull(),
		sport: varchar('sport', { length: 40 }),
		league: varchar('league', { length: 40 }),
		freshness: varchar('freshness', { length: 24 }),
		requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('search_query_conversation_idx').on(table.conversationId)]
)

export const searchResult = pgTable(
	'search_result',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		searchQueryId: uuid('search_query_id')
			.notNull()
			.references(() => searchQuery.id, { onDelete: 'cascade' }),
		providerResultId: text('provider_result_id'),
		title: text('title').notNull(),
		url: text('url').notNull(),
		sourceName: varchar('source_name', { length: 120 }).notNull(),
		snippet: text('snippet'),
		resultType: varchar('result_type', { length: 24 }).notNull().default('article'),
		ranking: integer('ranking').notNull().default(0),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		metadata: jsonb('metadata').notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('search_result_query_idx').on(table.searchQueryId)]
)

export const citation = pgTable(
	'citation',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		messageId: uuid('message_id')
			.notNull()
			.references(() => message.id, { onDelete: 'cascade' }),
		searchResultId: uuid('search_result_id').references(() => searchResult.id, {
			onDelete: 'set null',
		}),
		kind: citationKindEnum('kind').notNull().default('article'),
		label: varchar('label', { length: 160 }).notNull(),
		url: text('url').notNull(),
		sourceName: varchar('source_name', { length: 120 }).notNull(),
		citedText: text('cited_text'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('citation_message_idx').on(table.messageId)]
)

export const plan = pgTable('plan', {
	id: text('id').primaryKey(),
	slug: varchar('slug', { length: 48 }).notNull().unique(),
	name: varchar('name', { length: 80 }).notNull(),
	monthlyPriceCents: integer('monthly_price_cents').notNull(),
	annualPriceCents: integer('annual_price_cents'),
	monthlyIncludedMessages: integer('monthly_included_messages').notNull().default(0),
	monthlyIncludedSearches: integer('monthly_included_searches').notNull().default(0),
	featureFlags: jsonb('feature_flags').notNull().default({}),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userEntitlement = pgTable(
	'user_entitlement',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		planId: text('plan_id')
			.notNull()
			.references(() => plan.id),
		status: entitlementStatusEnum('status').notNull().default('free'),
		polarCustomerId: text('polar_customer_id'),
		polarSubscriptionId: text('polar_subscription_id'),
		startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
		endsAt: timestamp('ends_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('user_entitlement_user_idx').on(table.userId)]
)

export const usageLedger = pgTable(
	'usage_ledger',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		conversationId: uuid('conversation_id').references(() => conversation.id, {
			onDelete: 'set null',
		}),
		messageId: uuid('message_id').references(() => message.id, { onDelete: 'set null' }),
		entryType: usageEntryTypeEnum('entry_type').notNull(),
		provider: varchar('provider', { length: 80 }),
		model: varchar('model', { length: 120 }),
		units: integer('units').notNull().default(0),
		costInCents: integer('cost_in_cents').notNull().default(0),
		balanceAfter: integer('balance_after'),
		description: varchar('description', { length: 160 }),
		metadata: jsonb('metadata').notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('usage_ledger_user_idx').on(table.userId)]
)

export const billingEvent = pgTable('billing_event', {
	id: uuid('id').defaultRandom().primaryKey(),
	providerEventId: text('provider_event_id').notNull().unique(),
	eventName: varchar('event_name', { length: 120 }).notNull(),
	payload: jsonb('payload').notNull(),
	processedAt: timestamp('processed_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const providerEvent = pgTable(
	'provider_event',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		providerKind: providerKindEnum('provider_kind').notNull(),
		providerName: varchar('provider_name', { length: 80 }).notNull(),
		referenceId: varchar('reference_id', { length: 120 }),
		payload: jsonb('payload').notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('provider_event_kind_idx').on(table.providerKind)]
)

export const userTeamPreference = pgTable(
	'user_team_preference',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		league: varchar('league', { length: 40 }).notNull(),
		teamName: varchar('team_name', { length: 120 }).notNull(),
		teamSlug: varchar('team_slug', { length: 120 }).notNull(),
		affinity: teamAffinityEnum('affinity').notNull().default('favorite'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('user_team_preference_user_idx').on(table.userId),
		uniqueIndex('user_team_preference_slug_idx').on(table.userId, table.teamSlug, table.affinity),
	]
)
