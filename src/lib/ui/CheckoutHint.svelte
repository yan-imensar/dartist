<script lang="ts">
	import { suggestCheckout } from '$lib/game/checkouts';

	type Props = {
		score: number;
	};

	let { score }: Props = $props();

	const suggestion = $derived(suggestCheckout(score));
</script>

{#if suggestion}
	<p class="rounded-lg border border-accent-500/40 bg-accent-500/10 px-3 py-2 text-sm">
		<span class="text-board-100/70">Checkout:</span>
		<span class="font-semibold text-accent-500">{suggestion}</span>
	</p>
{/if}
