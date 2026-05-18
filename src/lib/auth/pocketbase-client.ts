import PocketBase, { type AuthRecord, type OAuth2AuthConfig } from 'pocketbase';

export type AuthSnapshot = {
	configured: boolean;
	authenticated: boolean;
	user: AuthRecord | null;
	url: string | null;
};

export type AuthChangeListener = (snapshot: AuthSnapshot) => void;

export class PocketBaseClient {
	private pb: PocketBase | null = null;
	private url: string | null = null;
	private listeners = new Set<AuthChangeListener>();
	private unsubscribe: (() => void) | null = null;

	configure(url: string | null): void {
		const trimmed = url?.trim() || null;
		if (trimmed === this.url) return;
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.pb = trimmed ? new PocketBase(trimmed) : null;
		this.url = trimmed;
		if (this.pb) {
			this.unsubscribe = this.pb.authStore.onChange(() => this.emit(), false);
		}
		this.emit();
	}

	get instance(): PocketBase | null {
		return this.pb;
	}

	get snapshot(): AuthSnapshot {
		return {
			configured: !!this.pb,
			authenticated: this.pb?.authStore.isValid ?? false,
			user: this.pb?.authStore.record ?? null,
			url: this.url
		};
	}

	subscribe(listener: AuthChangeListener): () => void {
		this.listeners.add(listener);
		listener(this.snapshot);
		return () => this.listeners.delete(listener);
	}

	async loginWithOAuth(provider: string, opts?: Partial<OAuth2AuthConfig>): Promise<AuthRecord> {
		if (!this.pb) throw new Error('PocketBase URL not configured');
		const result = await this.pb.collection('users').authWithOAuth2({ provider, ...opts });
		return result.record;
	}

	logout(): void {
		this.pb?.authStore.clear();
	}

	private emit(): void {
		const snap = this.snapshot;
		for (const fn of this.listeners) fn(snap);
	}
}

let singleton: PocketBaseClient | null = null;

export function getPocketBaseClient(): PocketBaseClient {
	if (!singleton) singleton = new PocketBaseClient();
	return singleton;
}
