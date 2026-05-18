import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestHarness } from '$lib/db/test-utils';
import { SettingsRepository } from './repo';
import { SETTINGS_KEYS } from './types';

describe('SettingsRepository', () => {
	let harness: TestHarness;
	let repo: SettingsRepository;

	beforeEach(async () => {
		harness = await createTestDb();
		repo = new SettingsRepository(harness.db);
	});

	afterEach(async () => {
		await harness.close();
	});

	it('returns default values when no settings are stored', async () => {
		const settings = await repo.loadAll();
		expect(settings).toEqual({ deviceName: null, lastSyncedAt: null, turnEntryMode: 'total' });
	});

	it('round-trips a typed value through set/get', async () => {
		await repo.set(SETTINGS_KEYS.deviceName, 'Kitchen tablet');
		const value = await repo.get<string>(SETTINGS_KEYS.deviceName);
		expect(value).toBe('Kitchen tablet');
	});

	it('delete() removes a key and falls back to default', async () => {
		await repo.set(SETTINGS_KEYS.deviceName, 'Phone');
		await repo.delete(SETTINGS_KEYS.deviceName);
		const settings = await repo.loadAll();
		expect(settings.deviceName).toBeNull();
	});
});
