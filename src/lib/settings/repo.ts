import type { DartistDb } from '$lib/db/client';
import { getDb } from '$lib/db/client';
import {
	DEFAULT_SETTINGS,
	SETTINGS_KEYS,
	type AppSettings,
	type SettingsKey,
	type TurnEntryMode
} from './types';

export class SettingsRepository {
	constructor(private readonly db: DartistDb = getDb()) {}

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
			deviceName:
				(map.get(SETTINGS_KEYS.deviceName) as string | undefined) ?? DEFAULT_SETTINGS.deviceName,
			lastSyncedAt:
				(map.get(SETTINGS_KEYS.lastSyncedAt) as string | undefined) ??
				DEFAULT_SETTINGS.lastSyncedAt,
			turnEntryMode:
				(map.get(SETTINGS_KEYS.turnEntryMode) as TurnEntryMode | undefined) ??
				DEFAULT_SETTINGS.turnEntryMode
		};
	}
}
