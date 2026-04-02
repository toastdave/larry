<script lang="ts">
import { goto } from '$app/navigation'
import { formatPlanPrice } from '$lib/billing'
import { formatCitationReferenceLabel, splitMessageForCitations } from '$lib/chat/citation-text'
import { filterConversations, summarizeConversationFilters } from '$lib/chat/conversation-history'
import {
	type SportsPersona,
	type SportsPersonaSlug,
	defaultPersonaSlug,
	getConversationStarters,
	getPersonaBySlug,
	getStarterTranscript,
	sportsPersonas,
} from '@larry/ai'
import { inferLeague, requiresFreshSearch } from '@larry/search'
import type { PageData } from './$types'

const { data }: { data: PageData } = $props()
type ConversationEntry = NonNullable<PageData['activeConversation']>
type ChatMessage = PageData['messages'][number]

let draft = $state('Who is the biggest fraud contender in the NBA right now?')
let activeConversation = $state<PageData['activeConversation']>(null)
let conversations = $state<PageData['conversations']>([])
let errorMessage = $state('')
const historyFilters = $state({
	personaSlug: 'all' as 'all' | SportsPersonaSlug,
	search: '',
})
let isSending = $state(false)
let messages = $state<PageData['messages']>([])
let selectedPersonaSlug = $state<SportsPersonaSlug>(defaultPersonaSlug)

const currentPersona = $derived(
	getPersonaBySlug(activeConversation?.personaSlug ?? selectedPersonaSlug)
)
const derivedLeague = $derived(inferLeague(draft))
const promptSuggestions = $derived(getConversationStarters(currentPersona.slug))
const shouldSearch = $derived(requiresFreshSearch(draft))
const starterTranscript = $derived(getStarterTranscript(currentPersona.slug))
const filteredConversations = $derived(
	filterConversations(conversations, {
		personaSlug: historyFilters.personaSlug === 'all' ? null : historyFilters.personaSlug,
		search: historyFilters.search,
	})
)
const historyFilterSummary = $derived(
	summarizeConversationFilters({
		personaName:
			historyFilters.personaSlug === 'all'
				? null
				: getPersonaBySlug(historyFilters.personaSlug).name,
		resultCount: filteredConversations.length,
		search: historyFilters.search,
	})
)
const billingTone = $derived(
	data.billing.usage.messages.warningLevel === 'limit' ||
		data.billing.usage.searches.warningLevel === 'limit'
		? 'limit'
		: data.billing.usage.messages.warningLevel === 'watch' ||
				data.billing.usage.searches.warningLevel === 'watch'
			? 'watch'
			: 'healthy'
)

$effect(() => {
	activeConversation = data.activeConversation
	conversations = data.conversations
	messages = data.messages
	selectedPersonaSlug = getPersonaBySlug(
		data.activeConversation?.personaSlug ?? data.initialPersonaSlug ?? defaultPersonaSlug
	).slug
})

function buildSampleSignals(persona: SportsPersona) {
	return [
		`${persona.name} changes the voice while the live-data rules stay strict.`,
		'Auto-search live scores, standings, odds, injuries, and trades.',
		`${persona.name} cites fresh facts when the provider comes through.`,
	]
}

function formatUpdatedAt(value: string | Date | null | undefined) {
	if (!value) {
		return 'Just opened'
	}

	return new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value))
}

function getPersonaDetails(personaSlug: string | null | undefined) {
	return getPersonaBySlug(personaSlug)
}

function getMessageLabel(message: ChatMessage) {
	return message.role === 'assistant' ? currentPersona.name : 'You'
}

function getMessageContentParts(message: ChatMessage) {
	return splitMessageForCitations(message.contentText, message.citations)
}

function upsertConversation(nextConversation: ConversationEntry) {
	conversations = [
		nextConversation,
		...conversations.filter(
			(conversation: ConversationEntry) => conversation.id !== nextConversation.id
		),
	]
	activeConversation = nextConversation
	selectedPersonaSlug = getPersonaBySlug(nextConversation.personaSlug).slug
}

function resetComposer(nextDraft = '') {
	draft = nextDraft
	errorMessage = ''
}

async function startFreshWithPersona(personaSlug: SportsPersonaSlug) {
	if (isSending) {
		return
	}

	if (!activeConversation && messages.length === 0) {
		selectedPersonaSlug = personaSlug
		return
	}

	await goto(`/chat?new=1&persona=${personaSlug}`, {
		invalidateAll: true,
		keepFocus: true,
		noScroll: true,
	})
}

async function sendPrompt(promptOverride?: string) {
	const prompt = (promptOverride ?? draft).trim()
	const personaSlug = activeConversation?.personaSlug ?? selectedPersonaSlug
	const persona = getPersonaBySlug(personaSlug)

	if (!prompt || isSending) {
		return
	}

	errorMessage = ''
	isSending = true

	const optimisticUserMessage = {
		citations: [],
		contentText: prompt,
		createdAt: new Date(),
		id: `optimistic-user-${crypto.randomUUID()}`,
		role: 'user' as const,
		searchRequired: shouldSearch,
	}

	const optimisticAssistantMessage = {
		citations: [],
		contentText: '',
		createdAt: new Date(),
		id: `optimistic-assistant-${crypto.randomUUID()}`,
		role: 'assistant' as const,
		searchRequired: false,
	}

	messages = [...messages, optimisticUserMessage, optimisticAssistantMessage]
	resetComposer('')

	try {
		const response = await fetch('/api/chat', {
			body: JSON.stringify({
				conversationSlug: activeConversation?.slug ?? null,
				personaSlug,
				prompt,
			}),
			headers: {
				'content-type': 'application/json',
			},
			method: 'POST',
		})

		if (!response.ok || !response.body) {
			throw new Error(`Unable to get a response from ${persona.name} right now.`)
		}

		const reader = response.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''

		function applyPayload(payload: {
			assistantMessage?: ChatMessage
			conversation?: NonNullable<typeof activeConversation>
			type: 'chunk' | 'done' | 'meta'
			userMessage?: ChatMessage
			value?: string
		}) {
			if (payload.type === 'meta' && payload.conversation) {
				upsertConversation(payload.conversation)
				return
			}

			if (payload.type === 'chunk' && payload.value) {
				messages = messages.map((message: ChatMessage, index: number) =>
					index === messages.length - 1
						? { ...message, contentText: `${message.contentText ?? ''}${payload.value}` }
						: message
				)
				return
			}

			if (
				payload.type === 'done' &&
				payload.assistantMessage &&
				payload.conversation &&
				payload.userMessage
			) {
				messages = [...messages.slice(0, -2), payload.userMessage, payload.assistantMessage]
				upsertConversation(payload.conversation)
			}
		}

		while (true) {
			const { done, value } = await reader.read()

			if (done) {
				buffer += decoder.decode()
				break
			}

			buffer += decoder.decode(value, { stream: true })

			let newlineIndex = buffer.indexOf('\n')

			while (newlineIndex >= 0) {
				const line = buffer.slice(0, newlineIndex).trim()
				buffer = buffer.slice(newlineIndex + 1)

				if (line) {
					applyPayload(JSON.parse(line))
				}

				newlineIndex = buffer.indexOf('\n')
			}
		}

		const trailingLine = buffer.trim()

		if (trailingLine) {
			applyPayload(JSON.parse(trailingLine))
		}

		if (activeConversation?.slug) {
			await goto(`/chat?conversation=${activeConversation.slug}`, {
				invalidateAll: true,
				keepFocus: true,
				noScroll: true,
				replaceState: true,
			})
		}
	} catch (error) {
		messages = messages.slice(0, -2)
		errorMessage =
			error instanceof Error ? error.message : `${persona.name} lost the thread on that one.`
		draft = prompt
	} finally {
		isSending = false
	}
}

async function usePromptSuggestion(prompt: string) {
	draft = prompt
	await sendPrompt(prompt)
}

function handleSubmit(event: SubmitEvent) {
	event.preventDefault()
	void sendPrompt()
}
</script>

<svelte:head>
	<title>Chat | Larry</title>
</svelte:head>

<section class="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
	<div class="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
		<div class="space-y-6 rounded-[2rem] border border-white/70 bg-white/76 p-6 shadow-[0_32px_120px_-48px_rgba(8,23,17,0.45)] backdrop-blur">
			<p class="font-display text-sm uppercase tracking-[0.3em] text-field-500">Multi-persona chat</p>
			<h1 class="mt-4 font-display text-4xl leading-none text-ink-950">
				Pick the voice, keep the receipts, {data.user.name}.
			</h1>
			<p class="mt-4 text-sm leading-7 text-ink-700">
				Larry brings the barstool energy, Scout brings the scouting report, and Vega
				tracks the market without faking stale odds. Every conversation keeps its own
				persona, history, and live-data expectations.
			</p>

			<ul class="mt-6 space-y-3 text-sm leading-7 text-ink-700">
				{#each buildSampleSignals(currentPersona) as signal (signal)}
					<li>{signal}</li>
				{/each}
			</ul>

			<div class="rounded-[1.5rem] border border-ink-950/10 bg-white/85 p-4">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-sm font-semibold text-ink-950">Choose the booth</p>
						<p class="mt-1 text-xs leading-6 text-ink-700">
							{#if activeConversation}
								This conversation is locked to {currentPersona.name}. Switching personas starts a
								fresh thread.
							{:else}
								Your next conversation will start with {currentPersona.name}.
							{/if}
						</p>
					</div>
					<a
						class="rounded-full border border-ink-950/10 bg-cream-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-900"
						href={`/chat?new=1&persona=${currentPersona.slug}`}
					>
						New chat
					</a>
				</div>

				<div class="mt-4 grid gap-3">
					{#each sportsPersonas as persona (persona.slug)}
						<button
							class={`rounded-[1.35rem] border px-4 py-4 text-left transition ${currentPersona.slug === persona.slug ? 'border-ink-950 bg-ink-950 text-cream-100' : 'border-ink-950/10 bg-cream-100/80 text-ink-900 hover:border-redline-500/40 hover:bg-white'}`}
							onclick={() => void startFreshWithPersona(persona.slug)}
							type="button"
						>
							<div class="flex items-center justify-between gap-3">
								<p class="font-semibold">{persona.name}</p>
								<span
									class={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] ${currentPersona.slug === persona.slug ? 'bg-white/10 text-cream-100/80' : 'bg-white text-ink-700'}`}
								>
									{persona.slug}
								</span>
							</div>
							<p class={`mt-2 text-sm leading-6 ${currentPersona.slug === persona.slug ? 'text-cream-100/80' : 'text-ink-700'}`}>
								{persona.tagline}
							</p>
						</button>
					{/each}
				</div>
			</div>

			<div class="rounded-[1.5rem] border border-ink-950/10 bg-cream-100/85 p-4">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Current persona</p>
						<p class="mt-2 text-lg font-semibold text-ink-950">{currentPersona.name}</p>
					</div>
					<span class="rounded-full border border-ink-950/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700">
						{currentPersona.slug}
					</span>
				</div>
				<p class="mt-3 text-sm leading-7 text-ink-700">{currentPersona.description}</p>
				<p class="mt-4 text-sm text-ink-950">League guess: {derivedLeague ?? 'Unknown'}</p>
				<p class="mt-2 text-sm text-ink-950">Fresh search needed: {shouldSearch ? 'Yes' : 'Probably not'}</p>
			</div>

			<div class="rounded-[1.5rem] border border-ink-950/10 bg-white/85 p-4">
				<div class="flex items-center justify-between gap-3">
					<p class="text-sm font-semibold text-ink-950">Saved debates</p>
					<a
						class="rounded-full border border-ink-950/10 bg-cream-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-900"
						href={`/chat?new=1&persona=${currentPersona.slug}`}
					>
						Fresh thread
					</a>
				</div>

				<div class="mt-4 space-y-3 rounded-[1.25rem] border border-ink-950/8 bg-cream-100/70 p-3">
					<label class="block" for="history-search">
						<span class="text-[11px] uppercase tracking-[0.24em] text-ink-700/70">History search</span>
						<input
							bind:value={historyFilters.search}
							class="mt-2 w-full rounded-2xl border border-ink-950/10 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-redline-500"
							id="history-search"
							placeholder="Search saved debate titles"
						/>
					</label>

					<div class="flex flex-wrap gap-2">
						{#each [{ label: 'All booths', slug: 'all' }, ...sportsPersonas.map((persona) => ({ label: persona.name, slug: persona.slug }))] as filterOption (filterOption.slug)}
							<button
								class={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${historyFilters.personaSlug === filterOption.slug ? 'bg-ink-950 text-cream-100' : 'border border-ink-950/10 bg-white text-ink-700 hover:border-redline-500/40'}`}
								onclick={() => {
									historyFilters.personaSlug = filterOption.slug as 'all' | SportsPersonaSlug
								}}
								type="button"
							>
								{filterOption.label}
							</button>
						{/each}
					</div>

					<p class="text-xs uppercase tracking-[0.22em] text-ink-700/65">{historyFilterSummary}</p>
				</div>

				{#if conversations.length === 0}
					<p class="mt-4 text-sm leading-7 text-ink-700">
						No saved debates yet. Pick a booth, fire the opening take, and the transcript will
						start keeping score.
					</p>
				{:else if filteredConversations.length === 0}
					<p class="mt-4 rounded-2xl border border-dashed border-ink-950/12 bg-white/70 px-4 py-4 text-sm leading-7 text-ink-700">
						Nothing matches this history search yet. Try a different title keyword or switch booths.
					</p>
				{:else}
					<div class="mt-4 space-y-3">
						{#each filteredConversations as conversation (conversation.id)}
							{@const persona = getPersonaDetails(conversation.personaSlug)}
							<a
								class={`block rounded-2xl border px-4 py-3 text-sm transition ${activeConversation?.id === conversation.id ? 'border-ink-950 bg-ink-950 text-cream-100' : 'border-ink-950/10 bg-cream-100/75 text-ink-900 hover:border-redline-500/40 hover:bg-white'}`}
								href={`/chat?conversation=${conversation.slug}`}
							>
								<div class="flex items-start justify-between gap-3">
									<p class="font-semibold">{conversation.title}</p>
									<span
										class={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] ${activeConversation?.id === conversation.id ? 'bg-white/10 text-cream-100/80' : 'bg-white text-ink-700'}`}
									>
										{persona.name}
									</span>
								</div>
								<p class={`mt-2 text-xs ${activeConversation?.id === conversation.id ? 'text-cream-100/70' : 'text-ink-700/70'}`}>
									Updated {formatUpdatedAt(conversation.updatedAt)}
								</p>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="rounded-[2rem] border border-ink-950/10 bg-white/84 p-6 shadow-[0_24px_90px_-54px_rgba(8,23,17,0.55)] backdrop-blur">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-950/10 pb-5">
				<div>
					<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Active booth</p>
					<h2 class="mt-2 font-display text-3xl text-ink-950">{currentPersona.name}</h2>
					<p class="mt-2 max-w-2xl text-sm leading-7 text-ink-700">{currentPersona.tagline}</p>
				</div>
				<a
					class="rounded-full border border-ink-950/10 bg-cream-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-900"
					href={`/chat?new=1&persona=${currentPersona.slug}`}
				>
					Start fresh
				</a>
			</div>

			<div class="space-y-4 pt-5">
				<div class={`rounded-[1.35rem] border px-4 py-4 text-sm leading-7 ${billingTone === 'limit' ? 'border-redline-500/20 bg-redline-500/10 text-redline-600' : billingTone === 'watch' ? 'border-gold-400/30 bg-gold-400/10 text-ink-900' : 'border-field-500/20 bg-field-500/10 text-field-700'}`}>
					<p class="text-xs uppercase tracking-[0.24em] opacity-70">Plan pulse</p>
					<p class="mt-2 font-semibold text-ink-950">
						{data.billing.currentPlan.name} · {formatPlanPrice(data.billing.currentPlan.monthlyPriceCents)}
					</p>
					<p class="mt-2">
						{data.billing.usage.messages.used}/{data.billing.usage.messages.included} messages and {data.billing.usage.searches.used}/{data.billing.usage.searches.included} live lookups used in {data.billing.usage.windowLabel}.
					</p>
					{#if data.billing.nextPlan}
						<p class="mt-2">
							Need more runway? {data.billing.nextPlan.name} steps up to {data.billing.nextPlan.monthlyIncludedMessages} messages and {data.billing.nextPlan.monthlyIncludedSearches} live lookups. <a class="font-semibold underline underline-offset-3" href={data.billingUpgradePath ?? '/account#billing'}>{data.billingUpgradePath ? 'Open sandbox checkout' : 'See upgrade details'}</a>.
						</p>
					{/if}
				</div>

				{#if messages.length > 0}
					{#each messages as message, index (message.id)}
						{@const contentParts = getMessageContentParts(message)}
						<div class={`max-w-3xl rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${message.role === 'user' ? 'ml-auto bg-ink-950 text-cream-100' : 'border border-ink-950/10 bg-cream-100/80 text-ink-900'}`}>
							<p class="text-xs uppercase tracking-[0.24em] opacity-70">
								{getMessageLabel(message)} · {formatUpdatedAt(message.createdAt)}
							</p>
							<p class="mt-2 whitespace-pre-wrap break-words">
								{#each contentParts as part (part.id)}
									{#if part.type === 'citation'}
										<a
											aria-label={part.label}
											class="font-semibold text-redline-500 underline decoration-redline-500/35 underline-offset-3 transition hover:text-redline-600"
											href={part.url}
											rel="noreferrer"
											target="_blank"
										>
											[{part.number}]
										</a>
									{:else}
										<span>{part.value}</span>
									{/if}
								{/each}
							</p>
							{#if message.role === 'assistant' && message.citations.length > 0}
								<div class="mt-4 rounded-2xl border border-ink-950/10 bg-white/65 p-4 text-xs text-ink-700">
									<p class="uppercase tracking-[0.24em] text-ink-700/65">Citations</p>
									<div class="mt-3 grid gap-2 sm:grid-cols-2">
										{#each message.citations as citation, citationIndex (citation.id)}
											<a class="flex items-start gap-3 rounded-[1.1rem] border border-ink-950/10 bg-cream-100 px-3 py-3 transition hover:border-redline-500/40 hover:bg-white" href={citation.url} rel="noreferrer" target="_blank">
												<span class="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink-950 text-[10px] font-semibold uppercase tracking-[0.2em] text-cream-100">
													{citationIndex + 1}
												</span>
												<span class="leading-5">
													<span class="block font-semibold text-ink-900">
														{formatCitationReferenceLabel(citationIndex, citation)}
													</span>
													<span class="mt-1 block text-[11px] uppercase tracking-[0.2em] text-ink-700/70">
														{citation.sourceName}
													</span>
												</span>
											</a>
										{/each}
									</div>
								</div>
							{/if}
							{#if index === messages.length - 1 && isSending && message.role === 'assistant'}
								<p class="mt-3 text-xs uppercase tracking-[0.22em] opacity-60">
									{currentPersona.loadingMessage}
								</p>
							{/if}
						</div>
					{/each}
				{:else}
					{#each starterTranscript as turn, index (`${turn.role}-${turn.content}`)}
						<div class={`max-w-3xl rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${index % 2 === 0 ? 'ml-auto bg-ink-950 text-cream-100' : 'border border-ink-950/10 bg-cream-100/80 text-ink-900'}`}>
							<p class="text-xs uppercase tracking-[0.24em] opacity-70">
								{turn.role === 'assistant' ? currentPersona.name : 'You'}
							</p>
							<p class="mt-2 whitespace-pre-wrap">{turn.content}</p>
						</div>
					{/each}

					<div class="rounded-[1.5rem] border border-dashed border-ink-950/15 bg-white/80 p-5">
						<p class="text-sm font-semibold text-ink-950">Jump-start the first debate</p>
						<p class="mt-2 text-sm leading-7 text-ink-700">
							Start with {currentPersona.name} and let the conversation keep that voice all the
							way through the thread.
						</p>
						<div class="mt-4 flex flex-wrap gap-3">
							{#each promptSuggestions as prompt (prompt)}
								<button class="rounded-full border border-ink-950/10 bg-cream-100 px-4 py-2 text-left text-sm text-ink-900 transition hover:border-redline-500/40 hover:bg-white" onclick={() => usePromptSuggestion(prompt)} type="button">
									{prompt}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<form class="mt-8 rounded-[1.5rem] border border-ink-950/10 bg-white p-4" onsubmit={handleSubmit}>
				<label class="text-xs uppercase tracking-[0.24em] text-ink-700/70" for="draft">
					Try a prompt for {currentPersona.name}
				</label>
				<textarea bind:value={draft} class="mt-3 min-h-28 w-full rounded-2xl border border-ink-950/10 bg-cream-100/45 px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-redline-500" id="draft"></textarea>

				{#if errorMessage}
					<p class="mt-4 rounded-2xl border border-redline-500/20 bg-redline-500/10 px-4 py-3 text-sm text-redline-500">
						{errorMessage}
					</p>
				{/if}

				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<p class="text-sm text-ink-700">
						{shouldSearch
							? `This prompt wants live data, so ${currentPersona.name} will search first and attach sources when the provider comes through.`
							: `${currentPersona.name} can answer this now, and the live retrieval layer stays on standby unless the question needs it.`}
					</p>
					<button class="rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold text-cream-100 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSending || !draft.trim()} type="submit">
						{isSending ? 'Sending...' : `Send to ${currentPersona.name}`}
					</button>
				</div>
			</form>
		</div>
	</div>
</section>
