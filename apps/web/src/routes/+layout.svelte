<script lang="ts">
import './layout.css'
import favicon from '$lib/assets/favicon.svg'
import { siteConfig } from '$lib/config/site'
import type { LayoutData } from './$types'

const { children, data } = $props<{ data: LayoutData; children: import('svelte').Snippet }>()
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="relative min-h-screen overflow-x-clip">
	<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(200,155,60,0.16),transparent_24%),radial-gradient(circle_at_82%_12%,rgba(209,93,50,0.14),transparent_24%),linear-gradient(180deg,transparent_0%,rgba(8,23,17,0.04)_100%)]"></div>

	<div class="relative mx-auto flex max-w-7xl items-center justify-between px-6 pt-6 sm:px-8 lg:px-10">
		<a class="flex items-center gap-3 text-ink-950" href="/">
			<span class="rounded-full bg-ink-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cream-100">
				{siteConfig.name}
			</span>
			<span class="hidden text-sm text-ink-700 sm:inline">{siteConfig.tagline}</span>
		</a>

		<nav class="flex items-center gap-3 text-sm">
			<a class="hidden rounded-full border border-ink-950/10 bg-white/70 px-4 py-2 text-ink-700 backdrop-blur sm:inline-flex" href="/chat">
				Chat
			</a>
			{#if data.user}
				<a class="flex items-center gap-2 rounded-full border border-ink-950/10 bg-white/70 px-4 py-2 text-ink-700 backdrop-blur" href="/account">
					{#if data.user.image}
						<img alt={data.user.name} class="h-7 w-7 rounded-full object-cover" src={data.user.image} />
					{/if}
					{data.user.name}
				</a>
			{:else}
				<a class="rounded-full border border-ink-950/10 bg-white/70 px-4 py-2 text-ink-700 backdrop-blur" href="/auth/sign-in">
					Sign in
				</a>
				<a class="rounded-full bg-ink-950 px-4 py-2 font-medium text-cream-100" href="/auth/sign-up">
					Create account
				</a>
			{/if}
		</nav>
	</div>

	{@render children()}
</div>
