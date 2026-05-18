<script lang="ts">
	type Props = {
		disabled?: boolean;
		onsubmit: (value: number) => void;
		onmiss: () => void;
		onundo: () => void;
	};

	let { disabled = false, onsubmit, onmiss, onundo }: Props = $props();

	let value = $state('');
	let error = $state<string | null>(null);

	function append(digit: string) {
		if (disabled) return;
		if (value.length >= 3) return;
		value = value + digit;
		error = null;
	}

	function clear() {
		value = '';
		error = null;
	}

	function submit() {
		if (disabled) return;
		const parsed = Number(value);
		if (!Number.isInteger(parsed) || parsed < 0 || parsed > 180) {
			error = 'enter a value between 0 and 180';
			return;
		}
		onsubmit(parsed);
		value = '';
	}
</script>

<div class="flex flex-col gap-3">
	<div
		class="rounded-2xl border border-board-700 bg-board-800 px-6 py-4 text-right text-5xl font-bold tabular-nums"
		aria-live="polite"
	>
		{value || '0'}
	</div>
	{#if error}
		<p class="text-sm text-danger-500" role="alert">{error}</p>
	{/if}

	<div class="grid grid-cols-3 gap-2">
		{#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as digit (digit)}
			<button
				type="button"
				class="rounded-xl bg-board-700 py-4 text-2xl font-semibold text-board-50 transition active:scale-95 disabled:opacity-50"
				onclick={() => append(digit)}
				{disabled}
			>
				{digit}
			</button>
		{/each}
		<button
			type="button"
			class="rounded-xl bg-board-700 py-4 text-sm font-semibold text-board-50 transition active:scale-95 disabled:opacity-50"
			onclick={clear}
			{disabled}
		>
			CLR
		</button>
		<button
			type="button"
			class="rounded-xl bg-board-700 py-4 text-2xl font-semibold text-board-50 transition active:scale-95 disabled:opacity-50"
			onclick={() => append('0')}
			{disabled}
		>
			0
		</button>
		<button
			type="button"
			class="rounded-xl bg-accent-500 py-4 text-lg font-bold text-board-900 transition active:scale-95 disabled:opacity-50"
			onclick={submit}
			{disabled}
		>
			OK
		</button>
	</div>

	<div class="grid grid-cols-2 gap-2">
		<button
			type="button"
			class="rounded-xl border border-board-700 bg-board-800 py-3 text-sm font-semibold text-board-50 transition active:scale-95 disabled:opacity-50"
			onclick={onmiss}
			{disabled}
		>
			Miss (0)
		</button>
		<button
			type="button"
			class="rounded-xl border border-board-700 bg-board-800 py-3 text-sm font-semibold text-board-50 transition active:scale-95 disabled:opacity-50"
			onclick={onundo}
			{disabled}
		>
			Undo
		</button>
	</div>
</div>
