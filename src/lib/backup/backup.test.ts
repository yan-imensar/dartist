import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestHarness } from '$lib/db/test-utils';
import { defaultX01Settings } from '$lib/game/x01';
import { MatchSession } from '$lib/match/session';
import { BackupService } from './backup';
import { BACKUP_SCHEMA_VERSION } from './types';

describe('BackupService', () => {
	let harness: TestHarness;
	let service: BackupService;

	beforeEach(async () => {
		harness = await createTestDb();
		service = new BackupService(harness.db);
	});

	afterEach(async () => {
		await harness.close();
	});

	it('export returns every table plus the schema version', async () => {
		const player = await harness.repos.players.create({ name: 'Alice' });
		const session = await MatchSession.start(harness.repos, {
			mode: 'x01',
			playerIds: [player.id],
			settings: defaultX01Settings(40)
		});
		await session.playTurn({
			scoreEntered: 40,
			darts: [{ segment: 20, multiplier: 2, score: 40 }]
		});

		const backup = await service.export();
		expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
		expect(backup.players).toHaveLength(1);
		expect(backup.matches).toHaveLength(1);
		expect(backup.matchPlayers).toHaveLength(1);
		expect(backup.legs).toHaveLength(1);
		expect(backup.turns).toHaveLength(1);
	});

	it('parse rejects an unsupported schemaVersion', () => {
		expect(() => service.parse('{"schemaVersion":99}')).toThrow(/schemaVersion/);
	});

	it('parse rejects invalid JSON', () => {
		expect(() => service.parse('not json')).toThrow(/JSON/);
	});

	it('parse rejects payloads missing required arrays', () => {
		expect(() =>
			service.parse(JSON.stringify({ schemaVersion: 1, exportedAt: '', players: [] }))
		).toThrow(/matches/);
	});

	it('import restores data into an empty database', async () => {
		const player = await harness.repos.players.create({ name: 'Alice' });
		const session = await MatchSession.start(harness.repos, {
			mode: 'x01',
			playerIds: [player.id],
			settings: defaultX01Settings(40)
		});
		await session.playTurn({
			scoreEntered: 40,
			darts: [{ segment: 20, multiplier: 2, score: 40 }]
		});

		const backup = await service.export();

		const restoreHarness = await createTestDb();
		const restoreService = new BackupService(restoreHarness.db);
		const result = await restoreService.import(backup);
		expect(result.counts.players).toBe(1);
		expect(result.counts.turns).toBe(1);

		const players = await restoreHarness.db.players.toArray();
		const turns = await restoreHarness.db.turns.toArray();
		expect(players[0].name).toBe('Alice');
		expect(turns[0].isCheckout).toBe(true);
		await restoreHarness.close();
	});
});
