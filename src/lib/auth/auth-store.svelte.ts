import { env } from '$env/dynamic/public';
import { SettingsRepository } from '$lib/settings/repo';
import { DEFAULT_OAUTH_PROVIDER, SETTINGS_KEYS } from '$lib/settings/types';
import { getPocketBaseClient, type AuthSnapshot, type PocketBaseClient } from './pocketbase-client';

const initialSnapshot: AuthSnapshot = {
	configured: false,
	authenticated: false,
	user: null,
	url: null
};

export class AuthStore {
	#snapshot = $state<AuthSnapshot>(initialSnapshot);
	#provider = $state(DEFAULT_OAUTH_PROVIDER);
	#busy = $state(false);
	#error = $state<string | null>(null);
	#hydrated = false;

	constructor(
		private readonly client: PocketBaseClient = getPocketBaseClient(),
		private readonly settings: SettingsRepository = new SettingsRepository()
	) {
		this.client.subscribe((snap) => {
			this.#snapshot = snap;
		});
	}

	get snapshot(): AuthSnapshot {
		return this.#snapshot;
	}

	get provider(): string {
		return this.#provider;
	}

	get busy(): boolean {
		return this.#busy;
	}

	get error(): string | null {
		return this.#error;
	}

	async hydrate(): Promise<void> {
		if (this.#hydrated) return;
		const persisted = await this.settings.loadAll();
		const url = persisted.pocketbaseUrl ?? env.PUBLIC_DEFAULT_POCKETBASE_URL ?? null;
		this.#provider = persisted.oauthProvider || env.PUBLIC_OAUTH_PROVIDER || DEFAULT_OAUTH_PROVIDER;
		this.client.configure(url);
		this.#hydrated = true;
	}

	async setUrl(url: string | null): Promise<void> {
		const cleaned = url?.trim() || null;
		await this.#run(async () => {
			if (cleaned) {
				await this.settings.set(SETTINGS_KEYS.pocketbaseUrl, cleaned);
			} else {
				await this.settings.delete(SETTINGS_KEYS.pocketbaseUrl);
			}
			this.client.configure(cleaned);
		});
	}

	async setProvider(provider: string): Promise<void> {
		const cleaned = provider.trim() || DEFAULT_OAUTH_PROVIDER;
		await this.#run(async () => {
			await this.settings.set(SETTINGS_KEYS.oauthProvider, cleaned);
			this.#provider = cleaned;
		});
	}

	async login(): Promise<void> {
		await this.#run(async () => {
			await this.client.loginWithOAuth(this.#provider);
		});
	}

	logout(): void {
		this.client.logout();
	}

	async #run(op: () => Promise<void>): Promise<void> {
		this.#busy = true;
		this.#error = null;
		try {
			await op();
		} catch (err) {
			this.#error = err instanceof Error ? err.message : String(err);
			throw err;
		} finally {
			this.#busy = false;
		}
	}
}

let singleton: AuthStore | null = null;

export function getAuthStore(): AuthStore {
	if (!singleton) singleton = new AuthStore();
	return singleton;
}
