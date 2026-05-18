<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import { SettingsRepository } from '$lib/settings/repo';
	import { SETTINGS_KEYS } from '$lib/settings/types';
	import { getSyncStore } from '$lib/sync/sync-store.svelte';
	import { onMount } from 'svelte';

	const repo = new SettingsRepository();
	const sync = getSyncStore();

	let deviceName = $state('');
	let saved = $state<string | null>(null);
	let lastSyncedAt = $state<string | null>(null);
	let ready = $state(false);

	onMount(async () => {
		const settings = await repo.loadAll();
		deviceName = settings.deviceName ?? '';
		saved = settings.deviceName;
		lastSyncedAt = settings.lastSyncedAt;
		ready = true;
	});

	async function saveDeviceName(event: SubmitEvent) {
		event.preventDefault();
		const cleaned = deviceName.trim();
		if (cleaned) {
			await repo.set(SETTINGS_KEYS.deviceName, cleaned);
		} else {
			await repo.delete(SETTINGS_KEYS.deviceName);
		}
		saved = cleaned || null;
	}

	async function syncNow() {
		try {
			await sync.syncNow();
			const refreshed = await repo.loadAll();
			lastSyncedAt = refreshed.lastSyncedAt;
		} catch {
			// sync.error rendered below
		}
	}
</script>

<section class="flex flex-col gap-6">
	<header>
		<h1 class="text-2xl font-bold">Settings</h1>
		<p class="text-sm text-board-100/70">Local preferences for this device.</p>
	</header>

	{#if !ready}
		<p class="text-sm text-board-100/60">Loading…</p>
	{:else}
		<form class="flex flex-col gap-2" onsubmit={saveDeviceName}>
			<label
				class="text-sm font-semibold tracking-wider text-board-100/70 uppercase"
				for="device-name"
			>
				Device name
			</label>
			<div class="flex gap-2">
				<input
					id="device-name"
					type="text"
					bind:value={deviceName}
					placeholder="Kitchen tablet, Phone…"
					class="flex-1 rounded-lg border border-board-700 bg-board-800 px-3 py-2 text-board-50 placeholder:text-board-100/40 focus:border-accent-500 focus:outline-none"
					maxlength="32"
				/>
				<Button type="submit">Save</Button>
			</div>
			{#if saved}
				<p class="text-xs text-board-100/50">
					Saved as <span class="text-board-50">{saved}</span>.
				</p>
			{/if}
		</form>

		<section class="flex flex-col gap-3 rounded-lg border border-board-700 bg-board-800 p-4">
			<h2 class="text-sm font-semibold tracking-wider text-board-100/70 uppercase">Sync</h2>
			<p class="text-sm text-board-100/70">
				Push local players, matches and turns to the server, then pull anything updated on another
				device. The server identifies you via your reverse-proxy auth header.
			</p>
			<div class="flex items-center justify-between text-sm">
				<span class="text-board-100/60">
					Last synced: {#if lastSyncedAt}
						<span class="text-board-100">{new Date(lastSyncedAt).toLocaleString()}</span>
					{:else}
						<span class="text-board-100">never</span>
					{/if}
				</span>
				<Button onclick={syncNow} disabled={sync.busy}>
					{sync.busy ? 'Syncing…' : 'Sync now'}
				</Button>
			</div>
			{#if sync.lastResult}
				<p class="text-xs text-board-100/60">
					Last run: pushed {sync.lastResult.pushedCount}, pulled {sync.lastResult.pulledCount}.
				</p>
			{/if}
			{#if sync.error}
				<p class="text-sm text-danger-500" role="alert">{sync.error}</p>
			{/if}
		</section>

		<section class="rounded-lg border border-board-700 bg-board-800 p-4 text-sm text-board-100/70">
			<h2 class="mb-2 text-sm font-semibold tracking-wider text-board-100/70 uppercase">
				Access control
			</h2>
			<p>
				This app does not handle authentication itself. When served behind an authenticating reverse
				proxy (e.g. PocketID via Ingress forward-auth), the proxy gates access and the sync
				endpoints read the identity header to scope data per user.
			</p>
		</section>
	{/if}
</section>
