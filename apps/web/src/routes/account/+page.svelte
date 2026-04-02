<script lang="ts">
import { goto, invalidateAll } from '$app/navigation'
import { authClient } from '$lib/auth-client'
import { formatPlanPrice, humanizeFeatureFlag } from '$lib/billing'
import type { ActionData, PageData } from './$types'

const { data, form } = $props<{ data: PageData; form: ActionData | null }>()

let errorMessage = $state('')
let isSigningOut = $state(false)

const profileForm = $derived(form?.profile ?? null)
const preferencesForm = $derived(form?.preferences ?? null)
const accountName = $derived(profileForm?.values?.displayName ?? data.user.name)
const displayName = $derived(profileForm?.values?.displayName ?? data.user.name)
const avatarUrl = $derived(profileForm?.values?.imageUrl ?? data.user.image ?? '')
const favoriteLeague = $derived(
	preferencesForm?.values?.favoriteLeague ?? data.preferences.favorite?.league ?? ''
)
const favoriteTeam = $derived(
	preferencesForm?.values?.favoriteTeam ?? data.preferences.favorite?.teamName ?? ''
)
const rivalLeague = $derived(
	preferencesForm?.values?.rivalLeague ?? data.preferences.rival?.league ?? ''
)
const rivalTeam = $derived(
	preferencesForm?.values?.rivalTeam ?? data.preferences.rival?.teamName ?? ''
)

const accountReadiness = [
	'Auth and protected routes',
	'Hybrid billing tables and seeded plans',
	'Hard chat and live-lookup enforcement in chat',
	'Favorite and rival team preference controls',
	'Usage ledger for inference and search cost tracking',
]

function getCheckoutLink(planSlug: string) {
	if (planSlug === 'pro') {
		return data.checkoutLinks.pro
	}

	if (planSlug === 'pulse') {
		return data.checkoutLinks.pulse
	}

	return null
}

async function signOut() {
	isSigningOut = true
	errorMessage = ''

	const result = await authClient.signOut()

	isSigningOut = false

	if (result.error) {
		errorMessage = result.error.message ?? 'Unable to sign out right now.'
		return
	}

	await invalidateAll()
	await goto('/')
}
</script>

<svelte:head>
	<title>Account | Larry</title>
</svelte:head>

<section class="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
	<div class="grid gap-6 lg:grid-cols-[1fr_1fr]">
		<div class="rounded-[2rem] border border-white/70 bg-white/76 p-8 shadow-[0_32px_120px_-48px_rgba(8,23,17,0.45)] backdrop-blur">
			<p class="font-display text-sm uppercase tracking-[0.3em] text-field-500">Account</p>
			<h1 class="mt-4 font-display text-4xl leading-none text-ink-950">Good to see you, {accountName}.</h1>
			<p class="mt-4 max-w-xl text-base leading-8 text-ink-700">
				Your account foundation is live and ready for saved chats, billing controls, and fandom
				preferences that make Larry more personal and more dangerous.
			</p>

			<div class="mt-8 grid gap-4 sm:grid-cols-2">
				<div class="rounded-2xl border border-ink-950/8 bg-cream-100/80 px-4 py-4">
					<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Display name</p>
					<p class="mt-2 text-sm font-semibold text-ink-950">{accountName}</p>
				</div>
				<div class="rounded-2xl border border-ink-950/8 bg-cream-100/80 px-4 py-4">
					<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Email</p>
					<p class="mt-2 text-sm font-semibold text-ink-950">{data.user.email}</p>
				</div>
				<div class="rounded-2xl border border-ink-950/8 bg-cream-100/80 px-4 py-4">
					<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Email verified</p>
					<p class="mt-2 text-sm font-semibold text-ink-950">{data.user.emailVerified ? 'Verified' : 'Not yet verified'}</p>
				</div>
				<div class="rounded-2xl border border-ink-950/8 bg-cream-100/80 px-4 py-4 sm:col-span-2">
					<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Session ID</p>
					<p class="mt-2 break-all text-sm font-semibold text-ink-950">{data.session.id}</p>
				</div>
				<div class="rounded-2xl border border-ink-950/8 bg-cream-100/80 px-4 py-4 sm:col-span-2">
					<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Session expires</p>
					<p class="mt-2 text-sm font-semibold text-ink-950">{new Date(data.session.expiresAt).toLocaleString()}</p>
				</div>
			</div>

			<form action="?/saveProfile" class="mt-8 rounded-[1.75rem] border border-ink-950/10 bg-white/75 p-5" method="POST">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Profile card</p>
						<h2 class="mt-2 text-xl font-semibold text-ink-950">Give Larry the right name to put on the scouting report.</h2>
						<p class="mt-2 max-w-2xl text-sm leading-7 text-ink-700">
							Keep the public-facing account basics tight while the rest of the profile surface keeps growing.
						</p>
					</div>
					<button class="rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold text-cream-100" type="submit">
						Save profile
					</button>
				</div>

				<label class="mt-6 block text-xs uppercase tracking-[0.22em] text-ink-700/70" for="displayName">
					Display name
				</label>
				<input class="mt-2 w-full rounded-2xl border border-ink-950/10 bg-cream-100/45 px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-redline-500" id="displayName" name="displayName" placeholder="Larry Legend" value={displayName} />
				<p class="mt-3 text-xs leading-6 text-ink-700/70">This is the name Larry uses across account and chat surfaces.</p>
				{#if profileForm?.fieldErrors?.displayName}
					<p class="mt-3 rounded-2xl border border-redline-500/20 bg-redline-500/10 px-4 py-3 text-sm text-redline-500">
						{profileForm.fieldErrors.displayName}
					</p>
				{/if}

				<label class="mt-6 block text-xs uppercase tracking-[0.22em] text-ink-700/70" for="imageUrl">
					Avatar image URL
				</label>
				<input class="mt-2 w-full rounded-2xl border border-ink-950/10 bg-cream-100/45 px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-redline-500" id="imageUrl" name="imageUrl" placeholder="https://example.com/avatar.png" value={avatarUrl} />
				<p class="mt-3 text-xs leading-6 text-ink-700/70">Optional. Use an http or https image URL if you want an avatar in the account header.</p>
				{#if avatarUrl}
					<div class="mt-4 flex items-center gap-4 rounded-2xl border border-ink-950/8 bg-cream-100/80 px-4 py-4">
						<img alt={`Avatar preview for ${accountName}`} class="h-14 w-14 rounded-full object-cover" src={avatarUrl} />
						<div>
							<p class="text-xs uppercase tracking-[0.22em] text-ink-700/70">Preview</p>
							<p class="mt-1 text-sm font-semibold text-ink-950">{accountName}</p>
						</div>
					</div>
				{/if}
				{#if profileForm?.fieldErrors?.imageUrl}
					<p class="mt-3 rounded-2xl border border-redline-500/20 bg-redline-500/10 px-4 py-3 text-sm text-redline-500">
						{profileForm.fieldErrors.imageUrl}
					</p>
				{/if}
				{#if profileForm?.message}
					<p class={`mt-4 rounded-2xl px-4 py-3 text-sm ${profileForm.fieldErrors?.displayName || profileForm.fieldErrors?.imageUrl ? 'border border-redline-500/20 bg-redline-500/10 text-redline-500' : 'border border-field-500/20 bg-field-500/10 text-field-700'}`}>
						{profileForm.message}
					</p>
				{/if}
			</form>

			<form action="?/savePreferences" class="mt-8 rounded-[1.75rem] border border-ink-950/10 bg-cream-100/70 p-5" method="POST">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Fandom wiring</p>
						<h2 class="mt-2 text-xl font-semibold text-ink-950">Tell Larry who gets the heart and who gets the smoke.</h2>
						<p class="mt-2 max-w-2xl text-sm leading-7 text-ink-700">
							These preferences feed the live prompt path for Larry, Scout, and Vega so the app knows your side of the rivalry before it starts talking.
						</p>
					</div>
					<button class="rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold text-cream-100" type="submit">
						Save preferences
					</button>
				</div>

				<div class="mt-6 grid gap-4 lg:grid-cols-2">
					<div class="rounded-[1.5rem] border border-ink-950/8 bg-white/80 p-4">
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Favorite team</p>
						<label class="mt-4 block text-xs uppercase tracking-[0.22em] text-ink-700/70" for="favoriteLeague">
							League
						</label>
						<select class="mt-2 w-full rounded-2xl border border-ink-950/10 bg-cream-100/45 px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-redline-500" id="favoriteLeague" name="favoriteLeague">
							<option selected={favoriteLeague === ''} value="">Pick a league</option>
							{#each data.leagueOptions as league (league)}
								<option selected={favoriteLeague === league} value={league}>{league}</option>
							{/each}
						</select>
						<label class="mt-4 block text-xs uppercase tracking-[0.22em] text-ink-700/70" for="favoriteTeam">
							Team name
						</label>
						<input class="mt-2 w-full rounded-2xl border border-ink-950/10 bg-cream-100/45 px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-redline-500" id="favoriteTeam" name="favoriteTeam" placeholder="New York Knicks" value={favoriteTeam} />
						<p class="mt-3 text-xs leading-6 text-ink-700/70">Leave both fields blank if you want Larry neutral on your side.</p>
						{#if preferencesForm?.fieldErrors?.favorite}
							<p class="mt-3 rounded-2xl border border-redline-500/20 bg-redline-500/10 px-4 py-3 text-sm text-redline-500">
								{preferencesForm.fieldErrors.favorite}
							</p>
						{/if}
					</div>

					<div class="rounded-[1.5rem] border border-ink-950/8 bg-white/80 p-4">
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Rival team</p>
						<label class="mt-4 block text-xs uppercase tracking-[0.22em] text-ink-700/70" for="rivalLeague">
							League
						</label>
						<select class="mt-2 w-full rounded-2xl border border-ink-950/10 bg-cream-100/45 px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-redline-500" id="rivalLeague" name="rivalLeague">
							<option selected={rivalLeague === ''} value="">Pick a league</option>
							{#each data.leagueOptions as league (league)}
								<option selected={rivalLeague === league} value={league}>{league}</option>
							{/each}
						</select>
						<label class="mt-4 block text-xs uppercase tracking-[0.22em] text-ink-700/70" for="rivalTeam">
							Team name
						</label>
						<input class="mt-2 w-full rounded-2xl border border-ink-950/10 bg-cream-100/45 px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-redline-500" id="rivalTeam" name="rivalTeam" placeholder="Boston Celtics" value={rivalTeam} />
						<p class="mt-3 text-xs leading-6 text-ink-700/70">Give Larry a rivalry target and Scout or Vega will still keep the facts clean.</p>
						{#if preferencesForm?.fieldErrors?.rival}
							<p class="mt-3 rounded-2xl border border-redline-500/20 bg-redline-500/10 px-4 py-3 text-sm text-redline-500">
								{preferencesForm.fieldErrors.rival}
							</p>
						{/if}
					</div>
				</div>

				{#if preferencesForm?.message}
					<p class={`mt-4 rounded-2xl px-4 py-3 text-sm ${preferencesForm.fieldErrors?.favorite || preferencesForm.fieldErrors?.rival ? 'border border-redline-500/20 bg-redline-500/10 text-redline-500' : 'border border-field-500/20 bg-field-500/10 text-field-700'}`}>
						{preferencesForm.message}
					</p>
				{/if}
			</form>
		</div>

		<div class="rounded-[2rem] border border-ink-950/10 bg-white/85 p-8 shadow-[0_24px_90px_-54px_rgba(8,23,17,0.55)] backdrop-blur">
			<p class="text-sm uppercase tracking-[0.28em] text-redline-500">What is ready now</p>
			<ul class="mt-5 space-y-3 text-sm leading-7 text-ink-700">
				{#each accountReadiness as item (item)}
					<li>{item}</li>
				{/each}
			</ul>

			{#if data.checkoutNotice}
				<p class={`mt-5 rounded-2xl px-4 py-4 text-sm leading-7 ${data.checkoutNotice.tone === 'success' ? 'border border-field-500/20 bg-field-500/10 text-field-700' : data.checkoutNotice.tone === 'warning' ? 'border border-gold-400/30 bg-gold-400/10 text-ink-900' : 'border border-redline-500/20 bg-redline-500/10 text-redline-500'}`}>
					{data.checkoutNotice.message}
				</p>
			{/if}

			<div class="mt-8 rounded-2xl bg-cream-100/80 p-5" id="billing">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p class="text-sm font-semibold text-ink-950">Hybrid billing plan</p>
						<p class="mt-2 text-sm leading-7 text-ink-700">
							Subscriptions handle predictable access while usage records keep overages and future credit packs honest.
						</p>
					</div>
					<span class="rounded-full border border-ink-950/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink-700">
						{data.billing.entitlementStatus}
					</span>
				</div>

				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					<div class="rounded-2xl border border-ink-950/8 bg-white/80 px-4 py-4">
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Current plan</p>
						<p class="mt-2 text-lg font-semibold text-ink-950">
							{data.billing.currentPlan.name} · {formatPlanPrice(data.billing.currentPlan.monthlyPriceCents)}
						</p>
					</div>
					<div class="rounded-2xl border border-ink-950/8 bg-white/80 px-4 py-4">
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Billing window</p>
						<p class="mt-2 text-lg font-semibold text-ink-950">{data.billing.usage.windowLabel}</p>
					</div>
				</div>

				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					<div class="rounded-2xl border border-ink-950/8 bg-white/80 px-4 py-4">
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Messages</p>
						<p class="mt-2 text-lg font-semibold text-ink-950">
							{data.billing.usage.messages.used}/{data.billing.usage.messages.included}
						</p>
						<p class="mt-2 text-sm text-ink-700">
							{data.billing.usage.messages.remaining} left this month
						</p>
					</div>
					<div class="rounded-2xl border border-ink-950/8 bg-white/80 px-4 py-4">
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Live lookups</p>
						<p class="mt-2 text-lg font-semibold text-ink-950">
							{data.billing.usage.searches.used}/{data.billing.usage.searches.included}
						</p>
						<p class="mt-2 text-sm text-ink-700">
							{data.billing.usage.searches.remaining} left this month
						</p>
					</div>
				</div>

				{#if data.billing.nextPlan}
					{@const nextPlanCheckoutLink = getCheckoutLink(data.billing.nextPlan.slug)}
					<div class="mt-4 rounded-2xl border border-field-500/20 bg-field-500/10 px-4 py-4 text-sm text-field-700">
						<p class="font-semibold text-ink-950">Upgrade prompt</p>
						<p class="mt-2 leading-7">
							If you are leaning on live game-day chat, {data.billing.nextPlan.name} gives you {data.billing.nextPlan.monthlyIncludedMessages} messages and {data.billing.nextPlan.monthlyIncludedSearches} live lookups per month. Sandbox checkout and hard limit enforcement are both live now.
						</p>
						{#if nextPlanCheckoutLink}
							<a class="mt-3 inline-flex rounded-full bg-ink-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cream-100" href={nextPlanCheckoutLink}>
								Start sandbox checkout
							</a>
						{/if}
					</div>
				{/if}
			</div>

			<div class="mt-5 rounded-2xl bg-white/80 p-5">
				<p class="text-sm font-semibold text-ink-950">Plan lineup</p>
				<div class="mt-4 grid gap-3 lg:grid-cols-3">
					{#each data.billing.plans as planOption (planOption.id)}
						{@const checkoutLink = getCheckoutLink(planOption.slug)}
						<div class={`rounded-2xl border px-4 py-4 ${planOption.id === data.billing.currentPlan.id ? 'border-ink-950 bg-ink-950 text-cream-100' : 'border-ink-950/8 bg-cream-100/75 text-ink-950'}`}>
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class="text-sm font-semibold">{planOption.name}</p>
									<p class={`mt-1 text-xs uppercase tracking-[0.24em] ${planOption.id === data.billing.currentPlan.id ? 'text-cream-100/70' : 'text-ink-700/70'}`}>
										{formatPlanPrice(planOption.monthlyPriceCents)}
									</p>
								</div>
								{#if planOption.id === data.billing.currentPlan.id}
									<span class="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-cream-100/80">
										Current
									</span>
								{/if}
							</div>
							<p class={`mt-3 text-sm leading-7 ${planOption.id === data.billing.currentPlan.id ? 'text-cream-100/80' : 'text-ink-700'}`}>
								{planOption.monthlyIncludedMessages} messages · {planOption.monthlyIncludedSearches} live lookups each month
							</p>
							<div class="mt-3 flex flex-wrap gap-2">
								{#each Object.entries(planOption.featureFlags).filter(([, enabled]) => Boolean(enabled)).slice(0, 4) as [flag] (flag)}
									<span class={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${planOption.id === data.billing.currentPlan.id ? 'bg-white/10 text-cream-100/70' : 'border border-ink-950/10 bg-white text-ink-700'}`}>
										{humanizeFeatureFlag(flag)}
									</span>
								{/each}
							</div>
							{#if planOption.id !== data.billing.currentPlan.id}
								{#if checkoutLink}
									<a class="mt-4 inline-flex rounded-full bg-ink-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cream-100" href={checkoutLink}>
										Start sandbox checkout
									</a>
								{:else if data.polarCheckoutEnabled}
									<p class={`mt-4 text-xs uppercase tracking-[0.22em] ${planOption.id === data.billing.currentPlan.id ? 'text-cream-100/70' : 'text-ink-700/70'}`}>
										No Polar product mapped yet
									</p>
								{:else}
									<p class={`mt-4 text-xs uppercase tracking-[0.22em] ${planOption.id === data.billing.currentPlan.id ? 'text-cream-100/70' : 'text-ink-700/70'}`}>
										Polar sandbox not configured
									</p>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="mt-5 rounded-2xl bg-white/80 p-5">
				<p class="text-sm font-semibold text-ink-950">Current fandom settings</p>
				<div class="mt-3 grid gap-3 sm:grid-cols-2">
					<div class="rounded-2xl border border-ink-950/8 bg-cream-100/75 px-4 py-4">
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Favorite</p>
						<p class="mt-2 text-sm font-semibold text-ink-950">
							{data.preferences.favorite ? `${data.preferences.favorite.teamName} (${data.preferences.favorite.league})` : 'Not set'}
						</p>
					</div>
					<div class="rounded-2xl border border-ink-950/8 bg-cream-100/75 px-4 py-4">
						<p class="text-xs uppercase tracking-[0.24em] text-ink-700/70">Rival</p>
						<p class="mt-2 text-sm font-semibold text-ink-950">
							{data.preferences.rival ? `${data.preferences.rival.teamName} (${data.preferences.rival.league})` : 'Not set'}
						</p>
					</div>
				</div>
			</div>

			<div class="mt-8 flex flex-wrap gap-3">
				<a class="rounded-full border border-ink-950/10 bg-white px-5 py-3 text-sm font-semibold text-ink-900" href="/chat">
					Open chat
				</a>
				<button class="rounded-full bg-ink-950 px-5 py-3 text-sm font-semibold text-cream-100 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSigningOut} onclick={signOut} type="button">
					{isSigningOut ? 'Signing out...' : 'Sign out'}
				</button>
			</div>

			{#if errorMessage}
				<p class="mt-5 rounded-2xl border border-redline-500/20 bg-redline-500/10 px-4 py-3 text-sm text-redline-500">
					{errorMessage}
				</p>
			{/if}
		</div>
	</div>
</section>
