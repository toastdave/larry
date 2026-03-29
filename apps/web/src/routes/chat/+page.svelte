<script lang="ts">
import { goto } from '$app/navigation'
import { defaultConversationStarters, starterTranscript } from '@larry/ai'
import { inferLeague, requiresFreshSearch } from '@larry/search'
import type { PageData } from './$types'

const { data } = $props<{ data: PageData }>()
type ConversationEntry = NonNullable<PageData['activeConversation']>
type ChatMessage = PageData['messages'][number]

let draft = $state('Who is the biggest fraud contender in the NBA right now?')
let activeConversation = $state<PageData['activeConversation']>(null)
let conversations = $state<PageData['conversations']>([])
let errorMessage = $state('')
let isSending = $state(false)
let messages = $state<PageData['messages']>([])

const sampleSignals = [
	'Auto-search live scores, standings, odds, injuries, and trades',
	'Show citations when Larry uses fresh facts',
	'Track search and inference usage for hybrid billing later',
]

const derivedLeague = $derived(inferLeague(draft))
const promptSuggestions = defaultConversationStarters
const shouldSearch = $derived(requiresFreshSearch(draft))

$effect(() => {
	activeConversation = data.activeConversation
	conversations = data.conversations
	messages = data.messages
})

function formatUpdatedAt(value: string | Date | null | undefined) {
	if (!value) {
		return 'Just opened'
	}

	return new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value))
}

function upsertConversation(nextConversation: ConversationEntry) {
	conversations = [
		nextConversation,
		...conversations.filter(
			(conversation: ConversationEntry) => conversation.id !== nextConversation.id
		),
	]
	activeConversation = nextConversation
}

function resetComposer(nextDraft = '') {
	draft = nextDraft
	errorMessage = ''
}

async function sendPrompt(promptOverride?: string) {
	const prompt = (promptOverride ?? draft).trim()

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
				prompt,
			}),
			headers: {
				'content-type': 'application/json',
			},
			method: 'POST',
		})

		if (!response.ok || !response.body) {
			throw new Error('Unable to get a response from Larry right now.')
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
			error instanceof Error ? error.message : 'Larry spilled the wings and missed the take.'
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
			<p class="font-display text-sm uppercase tracking-[0.3em] text-field-500">Chat shell</p>
			<h1 class="mt-4 font-display text-4xl leading-none text-ink-950">
				Ready for game-day chaos, {data.user.name}.
			</h1>
			<p class="mt-4 text-sm leading-7 text-ink-700">
				Conversations now persist, history is saved, and Larry answers through the AI SDK with
				environment-based provider routing. Live sports questions now trigger retrieval before the
				answer lands, and citation rendering is live in the transcript.
			</p>

			<ul class="mt-6 space-y-3 text-sm leading-7 text-ink-700">
				{#each sampleSignals as signal}
					<li>{signal}</li>
				{/each}
			</ul>

			<div class="rounded-[1.5rem] border border-ink-950/10 bg-white/85 p-4">
				<div class="flex items-center justify-between gap-3">
					<p class="text-sm font-semibold text-ink-950">Saved debates</p>
					<a class="rounded-full border border-ink-950/10 bg-cream-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-900" href="/chat">
						New chat
					</a>
				</div>

				{#if conversations.length === 0}
					<p class="mt-4 text-sm leading-7 text-ink-700">
						No saved debates yet. Fire the opening take and Larry will start keeping score.
					</p>
				{:else}
					<div class="mt-4 space-y-3">
						{#each conversations as conversation}
							<a class={`block rounded-2xl border px-4 py-3 text-sm transition ${activeConversation?.id === conversation.id ? 'border-ink-950 bg-ink-950 text-cream-100' : 'border-ink-950/10 bg-cream-100/75 text-ink-900 hover:border-redline-500/40 hover:bg-white'}`} href={`/chat?conversation=${conversation.slug}`}>
								<p class="font-semibold">{conversation.title}</p>
								<p class={`mt-2 text-xs ${activeConversation?.id === conversation.id ? 'text-cream-100/70' : 'text-ink-700/70'}`}>
									Updated {formatUpdatedAt(conversation.updatedAt)}
								</p>
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<div class="mt-6 rounded-2xl bg-cream-100/85 p-4">
				<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Draft analysis</p>
				<p class="mt-3 text-sm text-ink-950">League guess: {derivedLeague ?? 'Unknown'}</p>
				<p class="mt-2 text-sm text-ink-950">Fresh search needed: {shouldSearch ? 'Yes' : 'Probably not'}</p>
			</div>
		</div>

		<div class="rounded-[2rem] border border-ink-950/10 bg-white/84 p-6 shadow-[0_24px_90px_-54px_rgba(8,23,17,0.55)] backdrop-blur">
			<div class="space-y-4">
				{#if messages.length > 0}
					{#each messages as message, index}
						<div class={`max-w-3xl rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${message.role === 'user' ? 'ml-auto bg-ink-950 text-cream-100' : 'border border-ink-950/10 bg-cream-100/80 text-ink-900'}`}>
							<p class="text-xs uppercase tracking-[0.24em] opacity-70">
								{message.role} · {formatUpdatedAt(message.createdAt)}
							</p>
							<p class="mt-2 whitespace-pre-wrap">{message.contentText}</p>
							{#if message.role === 'assistant' && message.citations.length > 0}
								<div class="mt-4 rounded-2xl border border-ink-950/10 bg-white/65 p-4 text-xs text-ink-700">
									<p class="uppercase tracking-[0.24em] text-ink-700/65">Citations</p>
									<div class="mt-3 flex flex-wrap gap-2">
										{#each message.citations as citation}
											<a class="rounded-full border border-ink-950/10 bg-cream-100 px-3 py-2 transition hover:border-redline-500/40 hover:bg-white" href={citation.url} rel="noreferrer" target="_blank">
												{citation.label}
											</a>
										{/each}
									</div>
								</div>
							{/if}
							{#if index === messages.length - 1 && isSending && message.role === 'assistant'}
								<p class="mt-3 text-xs uppercase tracking-[0.22em] opacity-60">Larry is cooking...</p>
							{/if}
						</div>
					{/each}
				{:else}
					{#each starterTranscript as turn, index}
						<div class={`max-w-3xl rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${index % 2 === 0 ? 'ml-auto bg-ink-950 text-cream-100' : 'border border-ink-950/10 bg-cream-100/80 text-ink-900'}`}>
							<p class="text-xs uppercase tracking-[0.24em] opacity-70">{turn.role}</p>
							<p class="mt-2">{turn.content}</p>
						</div>
					{/each}

					<div class="rounded-[1.5rem] border border-dashed border-ink-950/15 bg-white/80 p-5">
						<p class="text-sm font-semibold text-ink-950">Jump-start the first debate</p>
						<div class="mt-4 flex flex-wrap gap-3">
							{#each promptSuggestions as prompt}
								<button class="rounded-full border border-ink-950/10 bg-cream-100 px-4 py-2 text-left text-sm text-ink-900 transition hover:border-redline-500/40 hover:bg-white" onclick={() => usePromptSuggestion(prompt)} type="button">
									{prompt}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<form class="mt-8 rounded-[1.5rem] border border-ink-950/10 bg-white p-4" onsubmit={handleSubmit}>
				<label class="text-xs uppercase tracking-[0.24em] text-ink-700/70" for="draft">Try a prompt</label>
				<textarea bind:value={draft} class="mt-3 min-h-28 w-full rounded-2xl border border-ink-950/10 bg-cream-100/45 px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-redline-500" id="draft"></textarea>

				{#if errorMessage}
					<p class="mt-4 rounded-2xl border border-redline-500/20 bg-redline-500/10 px-4 py-3 text-sm text-redline-500">
						{errorMessage}
					</p>
				{/if}

				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<p class="text-sm text-ink-700">
						{shouldSearch
							? 'This prompt wants live data, so Larry will search first and attach sources when the provider comes through.'
							: 'Larry can answer this now, and the live retrieval layer stays on standby unless the question needs it.'}
					</p>
					<button class="rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold text-cream-100 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSending || !draft.trim()} type="submit">
						{isSending ? 'Sending...' : 'Send'}
					</button>
				</div>
			</form>
		</div>
	</div>
</section>
