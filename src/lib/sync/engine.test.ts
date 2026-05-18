import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestHarness } from '$lib/db/test-utils';
import { ServerSyncRepository } from '$lib/server/sync-repo';
import { SettingsRepository } from '$lib/settings/repo';
import { SETTINGS_KEYS } from '$lib/settings/types';
import { defaultX01Settings } from '$lib/game/x01';
import { MatchSession } from '$lib/match/session';
import { SyncLocalRepository } from './local-repo';
import { SyncEngine } from './engine';
import type { SyncPullResponse, SyncPushBody } from './types';

const DDL = `
CREATE TABLE players (
	owner TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, color TEXT, avatarUrl TEXT,
	createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT,
	PRIMARY KEY (owner, id)
);
CREATE TABLE matches (
	owner TEXT NOT NULL, id TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL,
	createdAt TEXT NOT NULL, startedAt TEXT, finishedAt TEXT, updatedAt TEXT NOT NULL,
	settings TEXT NOT NULL, winnerPlayerId TEXT,
	PRIMARY KEY (owner, id)
);
CREATE TABLE matchPlayers (
	owner TEXT NOT NULL, id TEXT NOT NULL, matchId TEXT NOT NULL, playerId TEXT NOT NULL,
	position INTEGER NOT NULL, startingScore INTEGER NOT NULL, finalRank INTEGER,
	updatedAt TEXT NOT NULL,
	PRIMARY KEY (owner, id)
);
CREATE TABLE legs (
	owner TEXT NOT NULL, id TEXT NOT NULL, matchId TEXT NOT NULL, legIndex INTEGER NOT NULL,
	status TEXT NOT NULL, startedAt TEXT NOT NULL, finishedAt TEXT, winnerPlayerId TEXT,
	updatedAt TEXT NOT NULL,
	PRIMARY KEY (owner, id)
);
CREATE TABLE turns (
	owner TEXT NOT NULL, id TEXT NOT NULL, matchId TEXT NOT NULL, playerId TEXT NOT NULL,
	legId TEXT, legIndex INTEGER NOT NULL, turnIndex INTEGER NOT NULL,
	createdAt TEXT NOT NULL, enteredAt TEXT NOT NULL,
	scoreBefore INTEGER NOT NULL, scoreEntered INTEGER NOT NULL,
	scoreApplied INTEGER NOT NULL, scoreAfter INTEGER NOT NULL,
	isBust INTEGER NOT NULL, isCheckout INTEGER NOT NULL, darts TEXT NOT NULL,
	correctionOfTurnId TEXT, revertedAt TEXT, updatedAt TEXT NOT NULL,
	PRIMARY KEY (owner, id)
);
`;

function makeFetch(repo: ServerSyncRepository, owner: string) {
	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const path = url.replace(/^.*\/api\/sync\//, '');

		if (path === 'push') {
			const body = JSON.parse(String(init?.body ?? '{}')) as SyncPushBody;
			const accepted = {
				players: body.players ? repo.upsertPlayers(owner, body.players) : 0,
				matches: body.matches ? repo.upsertMatches(owner, body.matches) : 0,
				matchPlayers: body.matchPlayers ? repo.upsertMatchPlayers(owner, body.matchPlayers) : 0,
				legs: body.legs ? repo.upsertLegs(owner, body.legs) : 0,
				turns: body.turns ? repo.upsertTurns(owner, body.turns) : 0
			};
			return new Response(JSON.stringify({ syncedAt: new Date().toISOString(), accepted }), {
				status: 200
			});
		}

		if (path.startsWith('pull')) {
			const sinceMatch = path.match(/since=([^&]+)/);
			const since = sinceMatch ? decodeURIComponent(sinceMatch[1]) : '1970-01-01T00:00:00.000Z';
			const response: SyncPullResponse = {
				syncedAt: new Date().toISOString(),
				players: repo.listPlayersSince(owner, since),
				matches: repo.listMatchesSince(owner, since),
				matchPlayers: repo.listMatchPlayersSince(owner, since),
				legs: repo.listLegsSince(owner, since),
				turns: repo.listTurnsSince(owner, since)
			};
			return new Response(JSON.stringify(response), { status: 200 });
		}

		return new Response('not found', { status: 404 });
	};
}

describe('SyncEngine round-trip', () => {
	let server: Database.Database;
	let serverRepo: ServerSyncRepository;
	let harnessA: TestHarness;
	let harnessB: TestHarness;

	beforeEach(async () => {
		server = new Database(':memory:');
		server.exec(DDL);
		serverRepo = new ServerSyncRepository(server);
		harnessA = await createTestDb();
		harnessB = await createTestDb();
	});

	afterEach(async () => {
		await harnessA.close();
		await harnessB.close();
		server.close();
	});

	function engineFor(harness: TestHarness, owner = 'owner-1'): SyncEngine {
		const fetchFn = makeFetch(serverRepo, owner) as typeof fetch;
		return new SyncEngine(
			new SyncLocalRepository(harness.db),
			new SettingsRepository(harness.db),
			fetchFn
		);
	}

	it('pushes a locally created match end-to-end and another device can pull it', async () => {
		const player = await harnessA.repos.players.create({ name: 'Alice' });
		const session = await MatchSession.start(harnessA.repos, {
			mode: 'x01',
			playerIds: [player.id],
			settings: defaultX01Settings(40)
		});
		await session.playTurn({
			scoreEntered: 40,
			darts: [{ segment: 20, multiplier: 2, score: 40 }]
		});

		const engineA = engineFor(harnessA);
		const resultA = await engineA.syncNow();
		expect(resultA.pushedCount).toBeGreaterThan(0);

		const engineB = engineFor(harnessB);
		const resultB = await engineB.syncNow();
		expect(resultB.pulledCount).toBeGreaterThan(0);

		const playersOnB = await harnessB.db.players.toArray();
		const matchesOnB = await harnessB.db.matches.toArray();
		const turnsOnB = await harnessB.db.turns.toArray();
		expect(playersOnB[0]?.name).toBe('Alice');
		expect(matchesOnB[0]?.winnerPlayerId).toBe(player.id);
		expect(turnsOnB[0]?.isCheckout).toBe(true);
	});

	it('marks local rows as synced after a successful push', async () => {
		await harnessA.repos.players.create({ name: 'Bob' });
		const engineA = engineFor(harnessA);
		await engineA.syncNow();
		const players = await harnessA.db.players.toArray();
		expect(players.every((p) => p.syncState === 'synced')).toBe(true);
		expect(players[0].remoteId).toBe(players[0].id);
	});

	it('stores lastSyncedAt after a sync so the next pull is incremental', async () => {
		await harnessA.repos.players.create({ name: 'Carol' });
		const engineA = engineFor(harnessA);
		await engineA.syncNow();
		const settings = new SettingsRepository(harnessA.db);
		const lastSync = await settings.get<string>(SETTINGS_KEYS.lastSyncedAt);
		expect(lastSync).toBeTruthy();
	});
});
