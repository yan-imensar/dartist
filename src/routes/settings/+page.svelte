<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import { BackupService } from '$lib/backup/backup';
	import { SettingsRepository } from '$lib/settings/repo';
	import { SETTINGS_KEYS } from '$lib/settings/types';
	import { getSyncStore } from '$lib/sync/sync-store.svelte';
	import { onMount } from 'svelte';

	const repo = new SettingsRepository();
	const backup = new BackupService();
	const sync = getSyncStore();

	let deviceName = $state('');
	let saved = $state<string | null>(null);
	let lastSyncedAt = $state<string | null>(null);
	let ready = $state(false);
	let backupBusy = $state(false);
	let backupError = $state<string | null>(null);
	let backupResult = $state<Record<string, number> | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

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

	async function exportBackup() {
		backupBusy = true;
		backupError = null;
		try {
			const data = await backup.export();
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `dartist-backup-${new Date().toISOString().slice(0, 10)}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			backupError = err instanceof Error ? err.message : String(err);
		} finally {
			backupBusy = false;
		}
	}

	async function importBackup(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		backupBusy = true;
		backupError = null;
		backupResult = null;
		try {
			const text = await file.text();
			const parsed = backup.parse(text);
			const result = await backup.import(parsed);
			backupResult = result.counts;
		} catch (err) {
			backupError = err instanceof Error ? err.message : String(err);
		} finally {
			backupBusy = false;
			input.value = '';
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
				device. All your devices share a single data namespace; gate network access at the
				reverse-proxy layer.
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

		<section class="flex flex-col gap-3 rounded-lg border border-board-700 bg-board-800 p-4">
			<h2 class="text-sm font-semibold tracking-wider text-board-100/70 uppercase">Backup</h2>
			<p class="text-sm text-board-100/70">
				Export every local table to a JSON file you can keep aside. Import merges a backup file back
				into this device's database.
			</p>
			<div class="flex gap-2">
				<Button onclick={exportBackup} disabled={backupBusy}>Export backup</Button>
				<Button variant="secondary" onclick={() => fileInput?.click()} disabled={backupBusy}>
					Import…
				</Button>
				<input
					bind:this={fileInput}
					type="file"
					accept="application/json,.json"
					class="hidden"
					onchange={importBackup}
				/>
			</div>
			{#if backupResult}
				<p class="text-xs text-board-100/60">
					Imported: {backupResult.players} players · {backupResult.matches} matches · {backupResult.turns}
					turns.
				</p>
			{/if}
			{#if backupError}
				<p class="text-sm text-danger-500" role="alert">{backupError}</p>
			{/if}
		</section>

		<section class="rounded-lg border border-board-700 bg-board-800 p-4 text-sm text-board-100/70">
			<h2 class="mb-2 text-sm font-semibold tracking-wider text-board-100/70 uppercase">
				Access control
			</h2>
			<p>
				This app does not handle authentication itself. Run it behind an authenticating reverse
				proxy (e.g. PocketID via Ingress forward-auth) if you want to gate access. The sync database
				is single-tenant — all clients share the same namespace.
			</p>
		</section>
	{/if}
</section>
