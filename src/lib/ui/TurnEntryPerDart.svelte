<script lang="ts">
	import Button from './Button.svelte';
	import DartPad from './DartPad.svelte';
	import type { DartThrow } from '$lib/game/types';

	type Props = {
		disabled?: boolean;
		maxDarts?: number;
		onsubmit: (darts: DartThrow[]) => void;
		onmiss: () => void;
		onundo: () => void;
	};

	let { disabled = false, maxDarts = 3, onsubmit, onmiss, onundo }: Props = $props();

	let darts = $state<DartThrow[]>([]);

	const total = $derived(darts.reduce((sum, d) => sum + d.score, 0));
	const canThrow = $derived(darts.length < maxDarts);

	function label(d: DartThrow): string {
		if (d.segment === 0) return 'Miss';
		const prefix = d.multiplier === 1 ? 'S' : d.multiplier === 2 ? 'D' : 'T';
		const seg = d.segment === 25 ? 'Bull' : `${d.segment}`;
		return `${prefix}${seg}`;
	}

	function addDart(d: DartThrow) {
		if (!canThrow) return;
		darts = [...darts, d];
	}

	function undoDart() {
		if (darts.length === 0) return;
		darts = darts.slice(0, -1);
	}

	function submit() {
		if (darts.length === 0) return;
		const payload = $state.snapshot(darts) as DartThrow[];
		darts = [];
		onsubmit(payload);
	}

	function miss() {
		darts = [];
		onmiss();
	}
</script>

<div class="flex flex-col gap-3">
	<div class="grid grid-cols-3 gap-2">
		{#each Array(maxDarts), i (i)}
			{@const d = darts[i]}
			<div
				class="flex flex-col items-center rounded-xl border px-3 py-3 text-center {d
					? 'border-accent-500 bg-board-800'
					: 'border-board-700 bg-board-800/40'}"
			>
				{#if d}
					<span class="text-base font-bold">{label(d)}</span>
					<span class="text-xs text-board-100/60 tabular-nums">{d.score}</span>
				{:else}
					<span class="text-base text-board-100/30">·</span>
					<span class="text-xs text-board-100/30 tabular-nums">0</span>
				{/if}
			</div>
		{/each}
	</div>

	<div class="flex items-center justify-between rounded-lg bg-board-800/40 px-3 py-2 text-sm">
		<span class="text-board-100/60">Turn total</span>
		<span class="font-bold tabular-nums">{total}</span>
	</div>

	<DartPad onDart={addDart} disabled={disabled || !canThrow} />

	<div class="grid grid-cols-3 gap-2">
		<button
			type="button"
			class="rounded-xl border border-board-700 bg-board-800 py-3 text-sm font-semibold transition active:scale-95 disabled:opacity-50"
			onclick={undoDart}
			disabled={disabled || darts.length === 0}
		>
			Undo dart
		</button>
		<Button variant="secondary" onclick={miss} {disabled}>Miss turn</Button>
		<Button onclick={submit} disabled={disabled || darts.length === 0}>Submit</Button>
	</div>

	<Button variant="ghost" size="sm" onclick={onundo} {disabled}>Undo last turn</Button>
</div>
