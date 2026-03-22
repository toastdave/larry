<script lang="ts">
import { starterTranscript } from '@larry/ai'
import { inferLeague, requiresFreshSearch } from '@larry/search'
import type { PageData } from './$types'

const { data } = $props<{ data: PageData }>()

// biome-ignore lint/style/useConst: bind:value requires a mutable binding
let draft = $state('Who is the biggest fraud contender in the NBA right now?')

const sampleSignals = [
	'Auto-search live scores, standings, odds, injuries, and trades',
	'Show citations when Larry uses fresh facts',
	'Track search and inference usage for hybrid billing later',
]

const derivedLeague = $derived(inferLeague(draft))
const shouldSearch = $derived(requiresFreshSearch(draft))
</script>

<svelte:head>
	<title>Chat | Larry</title>
</svelte:head>

<section class="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
	<div class="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
		<div class="rounded-[2rem] border border-white/70 bg-white/76 p-6 shadow-[0_32px_120px_-48px_rgba(8,23,17,0.45)] backdrop-blur">
			<p class="font-display text-sm uppercase tracking-[0.3em] text-field-500">Chat shell</p>
			<h1 class="mt-4 font-display text-4xl leading-none text-ink-950">Ready for game-day chaos, {data.user.name}.</h1>
			<p class="mt-4 text-sm leading-7 text-ink-700">
				This scaffold is wired for auth, conversations, citations, and usage tracking. The live tool
				orchestration comes next.
			</p>

			<ul class="mt-6 space-y-3 text-sm leading-7 text-ink-700">
				{#each sampleSignals as signal}
					<li>{signal}</li>
				{/each}
			</ul>

			<div class="mt-6 rounded-2xl bg-cream-100/85 p-4">
				<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Draft analysis</p>
				<p class="mt-3 text-sm text-ink-950">League guess: {derivedLeague ?? 'Unknown'}</p>
				<p class="mt-2 text-sm text-ink-950">Fresh search needed: {shouldSearch ? 'Yes' : 'Probably not'}</p>
			</div>
		</div>

		<div class="rounded-[2rem] border border-ink-950/10 bg-white/84 p-6 shadow-[0_24px_90px_-54px_rgba(8,23,17,0.55)] backdrop-blur">
			<div class="space-y-4">
				{#each starterTranscript as turn, index}
					<div class={`max-w-3xl rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${index % 2 === 0 ? 'ml-auto bg-ink-950 text-cream-100' : 'border border-ink-950/10 bg-cream-100/80 text-ink-900'}`}>
						<p class="text-xs uppercase tracking-[0.24em] opacity-70">{turn.role}</p>
						<p class="mt-2">{turn.content}</p>
					</div>
				{/each}
			</div>

			<div class="mt-8 rounded-[1.5rem] border border-ink-950/10 bg-white p-4">
				<label class="text-xs uppercase tracking-[0.24em] text-ink-700/70" for="draft">Try a prompt</label>
				<textarea bind:value={draft} class="mt-3 min-h-28 w-full rounded-2xl border border-ink-950/10 bg-cream-100/45 px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-redline-500" id="draft"></textarea>
				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<p class="text-sm text-ink-700">Streaming endpoint and tool execution are next up in the roadmap.</p>
					<button class="rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold text-cream-100" disabled type="button">
						Send soon
					</button>
				</div>
			</div>
		</div>
	</div>
</section>
