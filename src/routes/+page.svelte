<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
</script>

<section class="flex flex-col items-center gap-6 pt-10 text-center">
	<h1 class="text-4xl font-bold">Dartist</h1>
	<p class="max-w-md text-board-100/70">
		Local-first scoring app for X01 matches. Works offline, your data stays on your device.
	</p>
	<Button size="lg" onclick={() => goto(resolve('/play'))}>Start a match</Button>
	<div class="flex gap-3">
		<Button variant="secondary" onclick={() => goto(resolve('/players'))}>Manage players</Button>
		<Button variant="ghost" onclick={() => goto(resolve('/history'))}>History</Button>
	</div>
</section>
