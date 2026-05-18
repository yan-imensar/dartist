<script lang="ts">
	import type { DartMultiplier, DartThrow } from '$lib/game/types';

	type Props = {
		onDart: (dart: DartThrow) => void;
		disabled?: boolean;
	};

	let { onDart, disabled = false }: Props = $props();
	let multiplier = $state<DartMultiplier>(1);

	function throwDart(segment: number, m: DartMultiplier = multiplier) {
		if (disabled) return;
		onDart({ segment, multiplier: m, score: segment * m });
	}

	const segments = Array.from({ length: 20 }, (_, i) => i + 1);
</script>

<div class="flex flex-col gap-3">
	<div class="grid grid-cols-3 gap-2" role="group" aria-label="Multiplier">
		{#each [1, 2, 3] as m (m)}
			<button
				type="button"
				class="rounded-xl py-3 text-lg font-bold transition active:scale-95 disabled:opacity-50 {multiplier ===
				m
					? 'bg-accent-500 text-board-900'
					: 'bg-board-700 text-board-50'}"
				onclick={() => (multiplier = m as DartMultiplier)}
				{disabled}
				aria-pressed={multiplier === m}
			>
				{m === 1 ? 'Single' : m === 2 ? 'Double' : 'Triple'}
			</button>
		{/each}
	</div>

	<div class="grid grid-cols-5 gap-1.5">
		{#each segments as seg (seg)}
			<button
				type="button"
				class="rounded-lg bg-board-700 py-3 text-base font-semibold text-board-50 transition active:scale-95 disabled:opacity-50"
				onclick={() => throwDart(seg)}
				{disabled}
			>
				{seg}
			</button>
		{/each}
	</div>

	<div class="grid grid-cols-3 gap-2">
		<button
			type="button"
			class="rounded-xl bg-board-700 py-3 text-sm font-semibold text-board-50 transition active:scale-95 disabled:opacity-50"
			onclick={() => throwDart(0, 1)}
			{disabled}
		>
			Miss
		</button>
		<button
			type="button"
			class="rounded-xl bg-board-700 py-3 text-sm font-semibold text-board-50 transition active:scale-95 disabled:opacity-50"
			onclick={() => throwDart(25, 1)}
			{disabled}
		>
			Bull 25
		</button>
		<button
			type="button"
			class="rounded-xl bg-board-700 py-3 text-sm font-semibold text-board-50 transition active:scale-95 disabled:opacity-50"
			onclick={() => throwDart(25, 2)}
			{disabled}
		>
			D-Bull 50
		</button>
	</div>
</div>
