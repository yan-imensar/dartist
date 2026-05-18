import type { DartsDb } from '$lib/db/client';
import { getDb } from '$lib/db/client';
import { DEFAULT_SETTINGS, SETTINGS_KEYS, type AppSettings, type SettingsKey } from './types';

export class SettingsRepository {
	constructor(private readonly db: DartsDb = getDb()) {}

	async get<T>(key: SettingsKey): Promise<T | undefined> {
		const row = await this.db.settings.get(key);
		return row?.value as T | undefined;
	}

	async set<T>(key: SettingsKey, value: T): Promise<void> {
		await this.db.settings.put({ key, value });
	}

	async delete(key: SettingsKey): Promise<void> {
		await this.db.settings.delete(key);
	}

	async loadAll(): Promise<AppSettings> {
		const rows = await this.db.settings.toArray();
		const map = new Map(rows.map((r) => [r.key, r.value]));
		return {
			pocketbaseUrl:
				(map.get(SETTINGS_KEYS.pocketbaseUrl) as string) ?? DEFAULT_SETTINGS.pocketbaseUrl,
			oauthProvider:
				(map.get(SETTINGS_KEYS.oauthProvider) as string) ?? DEFAULT_SETTINGS.oauthProvider,
			lastSyncedAt: (map.get(SETTINGS_KEYS.lastSyncedAt) as string) ?? DEFAULT_SETTINGS.lastSyncedAt
		};
	}
}
