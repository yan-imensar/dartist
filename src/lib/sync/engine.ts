import type { DartistDb } from '$lib/db/client';
import { getDb } from '$lib/db/client';
import { SettingsRepository } from '$lib/settings/repo';
import { SETTINGS_KEYS } from '$lib/settings/types';
import { SyncLocalRepository } from './local-repo';
import type { SyncPullResponse, SyncPushBody, SyncPushResponse } from './types';

export type SyncResult = {
	pushedCount: number;
	pulledCount: number;
	syncedAt: string;
};

export type SyncFetch = typeof fetch;

const EPOCH = '1970-01-01T00:00:00.000Z';

export class SyncEngine {
	constructor(
		private readonly local: SyncLocalRepository,
		private readonly settings: SettingsRepository,
		private readonly fetchFn: SyncFetch = fetch,
		private readonly basePath = '/api/sync'
	) {}

	static create(db: DartistDb = getDb(), fetchFn: SyncFetch = fetch): SyncEngine {
		return new SyncEngine(new SyncLocalRepository(db), new SettingsRepository(db), fetchFn);
	}

	async syncNow(): Promise<SyncResult> {
		const pending = await this.local.collectPending();
		const pushedCount = this.local.totals(pending);
		if (pushedCount > 0) {
			await this.push(pending);
			await this.local.markSynced(pending);
		}

		const since = (await this.settings.get<string>(SETTINGS_KEYS.lastSyncedAt)) ?? EPOCH;
		const pullResponse = await this.pull(since);
		await this.local.applyPull(pullResponse);
		const pulledCount = this.local.totals(pullResponse);

		await this.settings.set(SETTINGS_KEYS.lastSyncedAt, pullResponse.syncedAt);

		return { pushedCount, pulledCount, syncedAt: pullResponse.syncedAt };
	}

	private async push(body: SyncPushBody): Promise<SyncPushResponse> {
		const res = await this.fetchFn(`${this.basePath}/push`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(body)
		});
		if (!res.ok) throw new Error(`push failed: ${res.status} ${await safeText(res)}`);
		return (await res.json()) as SyncPushResponse;
	}

	private async pull(since: string): Promise<SyncPullResponse> {
		const res = await this.fetchFn(`${this.basePath}/pull?since=${encodeURIComponent(since)}`, {
			credentials: 'include'
		});
		if (!res.ok) throw new Error(`pull failed: ${res.status} ${await safeText(res)}`);
		return (await res.json()) as SyncPullResponse;
	}
}

async function safeText(res: Response): Promise<string> {
	try {
		return await res.text();
	} catch {
		return '';
	}
}
