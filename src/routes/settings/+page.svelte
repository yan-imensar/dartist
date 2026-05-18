<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import { SettingsRepository } from '$lib/settings/repo';
	import { SETTINGS_KEYS } from '$lib/settings/types';
	import { onMount } from 'svelte';

	const repo = new SettingsRepository();

	let deviceName = $state('');
	let saved = $state<string | null>(null);
	let ready = $state(false);

	onMount(async () => {
		const settings = await repo.loadAll();
		deviceName = settings.deviceName ?? '';
		saved = settings.deviceName;
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

		<section class="rounded-lg border border-board-700 bg-board-800 p-4 text-sm text-board-100/70">
			<h2 class="mb-2 text-sm font-semibold tracking-wider text-board-100/70 uppercase">
				Sync &amp; access
			</h2>
			<p>
				This app is local-first. Matches and stats stay on this device in your browser's storage.
				Cross-device sync is not yet implemented.
			</p>
			<p class="mt-2">
				If the app is served behind an authenticating reverse proxy (e.g. PocketID via Ingress
				forward-auth), access control is handled there — the app itself does not require login.
			</p>
		</section>
	{/if}
</section>
