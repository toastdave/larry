<script lang="ts">
import { siteConfig } from '$lib/config/site'
import { defaultConversationStarters } from '@larry/ai'
import { supportedLeagues } from '@larry/search'
import type { PageData } from './$types'

const { data } = $props<{ data: PageData }>()

const pillars = [
	'Opinionated sports-fan voice with fresh live data when facts matter',
	'Chat-first product with citations, conversation history, and team preferences',
	'Hybrid billing foundation for subscriptions plus overage or credit packs',
	'Ad posture built around sponsorship surfaces, not chat interruption',
]

const layers = [
	'Live web search and sports data adapters',
	'Tool-aware AI orchestration and persona controls',
	'Drizzle schema for chat, citations, usage, and billing',
	'Operational tracing for search, models, and provider failures',
]

const planCards = [
	{ name: 'Free', detail: 'Try the voice, capped live lookups, and core citations.' },
	{ name: 'Pro', detail: 'Higher limits, faster answers, and deeper live context.' },
	{ name: 'Pulse', detail: 'Premium plan for daily diehards and power users.' },
]
</script>

<svelte:head>
	<title>Larry</title>
	<meta name="description" content={siteConfig.description} />
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 sm:px-8 lg:px-10">
	<header class="grid gap-8 rounded-[2rem] border border-white/70 bg-white/76 p-8 shadow-[0_32px_120px_-48px_rgba(8,23,17,0.45)] backdrop-blur lg:grid-cols-[1.18fr_0.82fr] lg:items-end lg:p-10">
		<div class="space-y-6">
			<div class="flex flex-wrap items-center gap-3 text-sm font-medium text-ink-700">
				<span class="rounded-full bg-ink-950 px-3 py-1 text-cream-100">AI sports chat</span>
				<span class="rounded-full border border-ink-950/10 px-3 py-1">Live citations</span>
				<span class="rounded-full border border-ink-950/10 px-3 py-1">Hybrid billing</span>
			</div>
			<p class="font-display text-sm uppercase tracking-[0.3em] text-redline-500">{siteConfig.tagline}</p>
			<h1 class="max-w-4xl font-display text-5xl leading-none tracking-tight text-ink-950 sm:text-6xl">
				An AI sports fan that talks trash, checks the tape, and keeps the receipts.
			</h1>
			<p class="max-w-2xl text-lg leading-8 text-ink-700">
				Larry is built to argue like your smartest and loudest friend at the bar, while still
				pulling fresh scores, standings, odds, headlines, and injury context when the stakes are
				real.
			</p>
			<div class="flex flex-wrap gap-3">
				<a class="rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold text-cream-100" href={data.user ? '/chat' : '/auth/sign-up?redirectTo=/chat'}>
					{data.user ? 'Open chat' : 'Create an account'}
				</a>
				<a class="rounded-full border border-ink-950/10 bg-white/80 px-5 py-3 text-sm font-semibold text-ink-700" href="/chat">
					Preview the chat shell
				</a>
			</div>
		</div>

		<div class="rounded-[1.5rem] border border-ink-950/10 bg-ink-950 p-6 text-cream-100">
			<p class="text-sm uppercase tracking-[0.28em] text-gold-400">What Larry should always do</p>
			<ul class="mt-4 space-y-3 text-sm leading-7 text-cream-100/90">
				{#each pillars as pillar}
					<li>{pillar}</li>
				{/each}
			</ul>
		</div>
	</header>

	<section class="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
		<div class="rounded-[1.75rem] border border-ink-950/10 bg-white/82 p-7 shadow-[0_24px_80px_-56px_rgba(8,23,17,0.6)] backdrop-blur">
			<p class="text-sm uppercase tracking-[0.28em] text-field-500">Stack direction</p>
			<div class="mt-5 grid gap-3 text-sm text-ink-900 sm:grid-cols-2">
				{#each layers as layer}
					<div class="rounded-2xl border border-ink-950/8 bg-cream-100/80 px-4 py-3">{layer}</div>
				{/each}
			</div>
		</div>

		<div class="rounded-[1.75rem] border border-ink-950/10 bg-white/82 p-7 shadow-[0_24px_80px_-56px_rgba(8,23,17,0.6)] backdrop-blur">
			<p class="text-sm uppercase tracking-[0.28em] text-redline-500">Launch sports</p>
			<div class="mt-5 flex flex-wrap gap-3 text-sm text-ink-900">
				{#each supportedLeagues as league}
					<span class="rounded-full border border-ink-950/10 bg-white px-4 py-2 font-medium">{league}</span>
				{/each}
			</div>
			<p class="mt-5 text-sm leading-7 text-ink-700">
				The first pass is optimized for the sports where opinion, live data, and year-round fan
				obsession overlap the most.
			</p>
		</div>
	</section>

	<section class="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
		<div class="rounded-[1.75rem] border border-dashed border-ink-950/15 bg-white/70 p-7 backdrop-blur">
			<p class="font-display text-2xl text-ink-950">Starter prompts</p>
			<div class="mt-4 grid gap-3">
				{#each defaultConversationStarters as starter}
					<div class="rounded-2xl border border-ink-950/8 bg-white px-4 py-4 text-sm leading-7 text-ink-700">
						{starter}
					</div>
				{/each}
			</div>
		</div>

		<div class="rounded-[1.75rem] border border-ink-950/10 bg-white/76 p-7 shadow-[0_24px_80px_-56px_rgba(8,23,17,0.6)] backdrop-blur">
			<p class="font-display text-2xl text-ink-950">Monetization posture</p>
			<div class="mt-4 grid gap-4 md:grid-cols-3">
				{#each planCards as plan}
					<div class="rounded-2xl bg-cream-100/80 p-5">
						<p class="font-semibold text-ink-950">{plan.name}</p>
						<p class="mt-2 text-sm leading-7 text-ink-700">{plan.detail}</p>
					</div>
				{/each}
			</div>
			<p class="mt-5 text-sm leading-7 text-ink-700">
				Ads can exist later, but not as a tax on the main conversation. Sponsorship belongs on
				discovery and recap surfaces, not in the middle of an answer about a fourth-quarter
				collapse.
			</p>
		</div>
	</section>
</div>
