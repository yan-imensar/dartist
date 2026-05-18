import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Match, Player, Turn } from '$lib/db/schema';
import { ServerSyncRepository } from './sync-repo';

const DDL = `
CREATE TABLE players (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	name TEXT NOT NULL,
	color TEXT,
	avatarUrl TEXT,
	createdAt TEXT NOT NULL,
	updatedAt TEXT NOT NULL,
	deletedAt TEXT,
	PRIMARY KEY (owner, id)
);
CREATE TABLE matches (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	mode TEXT NOT NULL,
	status TEXT NOT NULL,
	createdAt TEXT NOT NULL,
	startedAt TEXT,
	finishedAt TEXT,
	updatedAt TEXT NOT NULL,
	settings TEXT NOT NULL,
	winnerPlayerId TEXT,
	PRIMARY KEY (owner, id)
);
CREATE TABLE matchPlayers (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	matchId TEXT NOT NULL,
	playerId TEXT NOT NULL,
	position INTEGER NOT NULL,
	startingScore INTEGER NOT NULL,
	finalRank INTEGER,
	updatedAt TEXT NOT NULL,
	PRIMARY KEY (owner, id)
);
CREATE TABLE legs (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	matchId TEXT NOT NULL,
	legIndex INTEGER NOT NULL,
	status TEXT NOT NULL,
	startedAt TEXT NOT NULL,
	finishedAt TEXT,
	winnerPlayerId TEXT,
	updatedAt TEXT NOT NULL,
	PRIMARY KEY (owner, id)
);
CREATE TABLE turns (
	owner TEXT NOT NULL,
	id TEXT NOT NULL,
	matchId TEXT NOT NULL,
	playerId TEXT NOT NULL,
	legId TEXT,
	legIndex INTEGER NOT NULL,
	turnIndex INTEGER NOT NULL,
	createdAt TEXT NOT NULL,
	enteredAt TEXT NOT NULL,
	scoreBefore INTEGER NOT NULL,
	scoreEntered INTEGER NOT NULL,
	scoreApplied INTEGER NOT NULL,
	scoreAfter INTEGER NOT NULL,
	isBust INTEGER NOT NULL,
	isCheckout INTEGER NOT NULL,
	darts TEXT NOT NULL,
	correctionOfTurnId TEXT,
	revertedAt TEXT,
	updatedAt TEXT NOT NULL,
	PRIMARY KEY (owner, id)
);
`;

function buildPlayer(overrides: Partial<Player>): Player {
	return {
		id: 'p-1',
		name: 'Alice',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		deletedAt: null,
		syncState: 'pending',
		remoteId: null,
		...overrides
	};
}

function buildMatch(overrides: Partial<Match>): Match {
	return {
		id: 'm-1',
		mode: 'x01',
		status: 'finished',
		createdAt: '2026-01-01T00:00:00.000Z',
		startedAt: '2026-01-01T00:00:00.000Z',
		finishedAt: '2026-01-01T00:10:00.000Z',
		updatedAt: '2026-01-01T00:10:00.000Z',
		settings: {
			startingScore: 501,
			doubleOut: true,
			straightIn: true,
			maxDartsPerTurn: 3,
			bestOfLegs: 1
		},
		winnerPlayerId: 'p-1',
		syncState: 'pending',
		remoteId: null,
		...overrides
	};
}

function buildTurn(overrides: Partial<Turn>): Turn {
	return {
		id: 't-1',
		matchId: 'm-1',
		playerId: 'p-1',
		legId: 'leg-1',
		legIndex: 0,
		turnIndex: 0,
		createdAt: '2026-01-01T00:00:00.000Z',
		enteredAt: '2026-01-01T00:00:00.000Z',
		scoreBefore: 501,
		scoreEntered: 60,
		scoreApplied: 60,
		scoreAfter: 441,
		isBust: false,
		isCheckout: false,
		darts: [{ segment: 20, multiplier: 3, score: 60 }],
		correctionOfTurnId: null,
		revertedAt: null,
		syncState: 'pending',
		remoteId: null,
		...overrides
	};
}

describe('ServerSyncRepository', () => {
	let db: Database.Database;
	let repo: ServerSyncRepository;

	beforeEach(() => {
		db = new Database(':memory:');
		db.exec(DDL);
		repo = new ServerSyncRepository(db);
	});

	afterEach(() => {
		db.close();
	});

	it('upserts players and lists deltas since a timestamp', () => {
		repo.upsertPlayers('owner-a', [buildPlayer({})]);
		const rows = repo.listPlayersSince('owner-a', '2025-12-31T00:00:00.000Z');
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe('Alice');
	});

	it('player upsert is idempotent and obeys updatedAt monotonicity', () => {
		repo.upsertPlayers('owner-a', [buildPlayer({ name: 'Alice' })]);
		repo.upsertPlayers('owner-a', [
			buildPlayer({ name: 'Alice 2', updatedAt: '2026-02-01T00:00:00.000Z' })
		]);
		const rows = repo.listPlayersSince('owner-a', '1970-01-01T00:00:00.000Z');
		expect(rows[0].name).toBe('Alice 2');

		// older update should not overwrite
		repo.upsertPlayers('owner-a', [
			buildPlayer({ name: 'Old', updatedAt: '2025-01-01T00:00:00.000Z' })
		]);
		const afterStale = repo.listPlayersSince('owner-a', '1970-01-01T00:00:00.000Z');
		expect(afterStale[0].name).toBe('Alice 2');
	});

	it('scopes data per owner', () => {
		repo.upsertPlayers('owner-a', [buildPlayer({})]);
		repo.upsertPlayers('owner-b', [buildPlayer({ id: 'p-2', name: 'Bob' })]);

		const aRows = repo.listPlayersSince('owner-a', '1970-01-01T00:00:00.000Z');
		const bRows = repo.listPlayersSince('owner-b', '1970-01-01T00:00:00.000Z');
		expect(aRows.map((r) => r.id)).toEqual(['p-1']);
		expect(bRows.map((r) => r.id)).toEqual(['p-2']);
	});

	it('upserts matches and lists since timestamp', () => {
		repo.upsertMatches('owner-a', [buildMatch({})]);
		const rows = repo.listMatchesSince('owner-a', '1970-01-01T00:00:00.000Z');
		expect(rows).toHaveLength(1);
		expect(rows[0].winnerPlayerId).toBe('p-1');
	});

	it('round-trips a turn including darts JSON', () => {
		repo.upsertTurns('owner-a', [buildTurn({})]);
		const rows = repo.listTurnsSince('owner-a', '1970-01-01T00:00:00.000Z');
		expect(rows).toHaveLength(1);
		expect(rows[0].darts).toEqual([{ segment: 20, multiplier: 3, score: 60 }]);
		expect(rows[0].isBust).toBe(false);
	});

	it('listSince filters by timestamp', () => {
		repo.upsertPlayers('owner-a', [
			buildPlayer({ id: 'p-1', updatedAt: '2026-01-01T00:00:00.000Z' }),
			buildPlayer({ id: 'p-2', updatedAt: '2026-02-01T00:00:00.000Z' })
		]);
		const rows = repo.listPlayersSince('owner-a', '2026-01-15T00:00:00.000Z');
		expect(rows.map((r) => r.id)).toEqual(['p-2']);
	});
});
