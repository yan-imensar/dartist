<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { children } = $props();

	const tabs = [
		{ href: resolve('/play'), label: 'Play' },
		{ href: resolve('/players'), label: 'Players' },
		{ href: resolve('/history'), label: 'History' },
		{ href: resolve('/settings'), label: 'Settings' }
	];

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Darts</title>
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<main class="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-24">
		{@render children()}
	</main>

	<nav
		class="fixed inset-x-0 bottom-0 z-10 border-t border-board-700 bg-board-900/95 backdrop-blur"
		aria-label="Main navigation"
	>
		<ul class="mx-auto flex max-w-2xl">
			{#each tabs as tab (tab.href)}
				{@const active = isActive(tab.href)}
				<li class="flex-1">
					<a
						href={tab.href}
						class="block px-2 py-3 text-center text-sm font-medium transition {active
							? 'text-accent-500'
							: 'text-board-100/70 hover:text-board-50'}"
						aria-current={active ? 'page' : undefined}
					>
						{tab.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>
