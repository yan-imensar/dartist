import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestHarness } from '$lib/db/test-utils';
import { SettingsRepository } from './repo';
import { DEFAULT_OAUTH_PROVIDER, SETTINGS_KEYS } from './types';

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
		expect(settings).toEqual({
			pocketbaseUrl: null,
			oauthProvider: DEFAULT_OAUTH_PROVIDER,
			lastSyncedAt: null
		});
	});

	it('round-trips a typed value through set/get', async () => {
		await repo.set(SETTINGS_KEYS.pocketbaseUrl, 'https://darts.example.com');
		const value = await repo.get<string>(SETTINGS_KEYS.pocketbaseUrl);
		expect(value).toBe('https://darts.example.com');
	});

	it('exposes merged settings in loadAll()', async () => {
		await repo.set(SETTINGS_KEYS.pocketbaseUrl, 'https://darts.example.com');
		await repo.set(SETTINGS_KEYS.oauthProvider, 'oidc2');
		const settings = await repo.loadAll();
		expect(settings.pocketbaseUrl).toBe('https://darts.example.com');
		expect(settings.oauthProvider).toBe('oidc2');
		expect(settings.lastSyncedAt).toBeNull();
	});

	it('delete() removes a key and falls back to default', async () => {
		await repo.set(SETTINGS_KEYS.pocketbaseUrl, 'https://x');
		await repo.delete(SETTINGS_KEYS.pocketbaseUrl);
		const settings = await repo.loadAll();
		expect(settings.pocketbaseUrl).toBeNull();
	});
});
