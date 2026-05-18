<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
	type Size = 'sm' | 'md' | 'lg';

	type Props = HTMLButtonAttributes & {
		variant?: Variant;
		size?: Size;
		children: Snippet;
	};

	let {
		variant = 'primary',
		size = 'md',
		class: extraClass = '',
		children,
		...rest
	}: Props = $props();

	const variantClass: Record<Variant, string> = {
		primary: 'bg-accent-500 text-board-900 hover:bg-accent-600 focus-visible:ring-accent-500',
		secondary:
			'bg-board-700 text-board-50 hover:bg-board-800 focus-visible:ring-board-100 border border-board-700',
		danger: 'bg-danger-500 text-board-50 hover:bg-danger-600 focus-visible:ring-danger-500',
		ghost: 'bg-transparent text-board-50 hover:bg-board-700 focus-visible:ring-board-100'
	};

	const sizeClass: Record<Size, string> = {
		sm: 'px-3 py-2 text-sm rounded-md',
		md: 'px-4 py-3 text-base rounded-lg',
		lg: 'px-6 py-4 text-lg rounded-xl'
	};
</script>

<button
	{...rest}
	class="inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-board-900 disabled:cursor-not-allowed disabled:opacity-50 {variantClass[
		variant
	]} {sizeClass[size]} {extraClass}"
>
	{@render children()}
</button>
