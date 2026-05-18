<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import { getAuthStore } from '$lib/auth/auth-store.svelte';
	import { onMount } from 'svelte';

	const auth = getAuthStore();

	let urlDraft = $state('');
	let providerDraft = $state('');
	let ready = $state(false);

	onMount(async () => {
		await auth.hydrate();
		urlDraft = auth.snapshot.url ?? '';
		providerDraft = auth.provider;
		ready = true;
	});

	async function saveUrl(event: SubmitEvent) {
		event.preventDefault();
		await auth.setUrl(urlDraft);
	}

	async function saveProvider() {
		if (!providerDraft.trim()) return;
		await auth.setProvider(providerDraft);
	}

	async function login() {
		try {
			await auth.login();
		} catch {
			// auth.error is rendered below
		}
	}

	function logout() {
		auth.logout();
	}

	function userLabel(): string {
		const u = auth.snapshot.user;
		if (!u) return '';
		return (
			(u.name as string | undefined) ??
			(u.email as string | undefined) ??
			(u.username as string | undefined) ??
			u.id
		);
	}
</script>

<section class="flex flex-col gap-6">
	<header>
		<h1 class="text-2xl font-bold">Settings</h1>
		<p class="text-sm text-board-100/70">Configure your PocketBase backend and sign in.</p>
	</header>

	{#if !ready}
		<p class="text-sm text-board-100/60">Loading…</p>
	{:else}
		<form class="flex flex-col gap-2" onsubmit={saveUrl}>
			<label class="text-sm font-semibold tracking-wider text-board-100/70 uppercase" for="pb-url">
				PocketBase URL
			</label>
			<div class="flex gap-2">
				<input
					id="pb-url"
					type="url"
					bind:value={urlDraft}
					placeholder="https://darts.example.com"
					class="flex-1 rounded-lg border border-board-700 bg-board-800 px-3 py-2 text-board-50 placeholder:text-board-100/40 focus:border-accent-500 focus:outline-none"
					autocomplete="url"
				/>
				<Button type="submit" disabled={auth.busy}>Save</Button>
			</div>
			<p class="text-xs text-board-100/50">
				Leave empty to disable sync. Your local matches stay on this device regardless.
			</p>
		</form>

		<form class="flex flex-col gap-2" onsubmit={(e) => (e.preventDefault(), saveProvider())}>
			<label
				class="text-sm font-semibold tracking-wider text-board-100/70 uppercase"
				for="oauth-provider"
			>
				OAuth2 provider name
			</label>
			<div class="flex gap-2">
				<input
					id="oauth-provider"
					type="text"
					bind:value={providerDraft}
					placeholder="oidc"
					class="flex-1 rounded-lg border border-board-700 bg-board-800 px-3 py-2 text-board-50 placeholder:text-board-100/40 focus:border-accent-500 focus:outline-none"
				/>
				<Button type="submit" variant="secondary" disabled={auth.busy}>Save</Button>
			</div>
			<p class="text-xs text-board-100/50">
				Matches the provider configured in PocketBase admin (Auth providers → OIDC).
			</p>
		</form>

		<section class="flex flex-col gap-2 rounded-lg border border-board-700 bg-board-800 p-4">
			<h2 class="text-sm font-semibold tracking-wider text-board-100/70 uppercase">Account</h2>
			{#if !auth.snapshot.configured}
				<p class="text-sm text-board-100/60">Set a PocketBase URL above to enable login.</p>
			{:else if auth.snapshot.authenticated}
				<p class="text-sm">
					Signed in as <span class="font-semibold text-accent-500">{userLabel()}</span>
				</p>
				<Button variant="secondary" onclick={logout}>Sign out</Button>
			{:else}
				<p class="text-sm text-board-100/70">Sign in with PocketID to enable sync (coming next).</p>
				<Button onclick={login} disabled={auth.busy}>
					{auth.busy ? 'Opening sign-in…' : 'Sign in with PocketID'}
				</Button>
			{/if}
			{#if auth.error}
				<p class="text-sm text-danger-500" role="alert">{auth.error}</p>
			{/if}
		</section>
	{/if}
</section>
