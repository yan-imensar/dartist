import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestHarness } from '$lib/db/test-utils';
import { defaultX01Settings } from '$lib/game/x01';
import { MatchSession } from './session';

describe('MatchSession', () => {
	let harness: TestHarness;

	beforeEach(async () => {
		harness = await createTestDb();
	});

	afterEach(async () => {
		await harness.close();
	});

	async function setup(opts: { startingScore?: number; playerNames?: string[] } = {}) {
		const names = opts.playerNames ?? ['Alice', 'Bob'];
		const players = await Promise.all(names.map((n) => harness.repos.players.create({ name: n })));
		const session = await MatchSession.start(harness.repos, {
			mode: 'x01',
			playerIds: players.map((p) => p.id),
			settings: defaultX01Settings(opts.startingScore ?? 501)
		});
		return { players, session };
	}

	it('starts a session and exposes initial state', async () => {
		const { session } = await setup();
		expect(session.state.status).toBe('active');
		expect(session.state.players).toHaveLength(2);
		expect(session.state.currentPlayerIndex).toBe(0);
	});

	it('persists a turn through the repository', async () => {
		const { session } = await setup();
		await session.playTurn({ scoreEntered: 60 });
		const persisted = await harness.repos.turns.listForMatch(session.state.matchId);
		expect(persisted).toHaveLength(1);
		expect(persisted[0].scoreAfter).toBe(441);
		expect(persisted[0].isBust).toBe(false);
	});

	it('finishes the match in DB on checkout', async () => {
		const { session } = await setup({ startingScore: 40, playerNames: ['Solo'] });
		await session.playTurn({
			scoreEntered: 40,
			darts: [{ segment: 20, multiplier: 2, score: 40 }]
		});
		expect(session.state.status).toBe('finished');
		const dbMatch = await harness.repos.matches.get(session.state.matchId);
		expect(dbMatch?.status).toBe('finished');
		expect(dbMatch?.winnerPlayerId).toBe(session.state.winnerPlayerId);
	});

	it('undoLast reverts the persisted turn and reopens the state', async () => {
		const { session } = await setup({ startingScore: 40, playerNames: ['Solo'] });
		await session.playTurn({
			scoreEntered: 40,
			darts: [{ segment: 20, multiplier: 2, score: 40 }]
		});
		await session.undoLast();
		expect(session.state.status).toBe('active');
		expect(session.state.scores[session.currentPlayerId]).toBe(40);
		const turns = await harness.repos.turns.listForMatch(session.state.matchId);
		expect(turns[0].revertedAt).not.toBeNull();
	});
});

describe('MatchSession.load', () => {
	let harness: TestHarness;

	beforeEach(async () => {
		harness = await createTestDb();
	});

	afterEach(async () => {
		await harness.close();
	});

	it('rebuilds a multi-turn active match from persisted rows', async () => {
		const a = await harness.repos.players.create({ name: 'Alice' });
		const b = await harness.repos.players.create({ name: 'Bob' });
		const original = await MatchSession.start(harness.repos, {
			mode: 'x01',
			playerIds: [a.id, b.id],
			settings: defaultX01Settings(501)
		});
		await original.playTurn({ scoreEntered: 60 });
		await original.playTurn({ scoreEntered: 100 });
		await original.playTurn({ scoreEntered: 45 });

		const reloaded = await MatchSession.load(harness.repos, original.state.matchId);
		expect(reloaded.state.turns).toHaveLength(3);
		expect(reloaded.state.scores).toEqual({ [a.id]: 396, [b.id]: 401 });
		expect(reloaded.state.currentPlayerIndex).toBe(1);
		expect(reloaded.state.status).toBe('active');
	});

	it('rebuilds a finished match with the original winner', async () => {
		const solo = await harness.repos.players.create({ name: 'Solo' });
		const original = await MatchSession.start(harness.repos, {
			mode: 'x01',
			playerIds: [solo.id],
			settings: defaultX01Settings(40)
		});
		await original.playTurn({
			scoreEntered: 40,
			darts: [{ segment: 20, multiplier: 2, score: 40 }]
		});

		const reloaded = await MatchSession.load(harness.repos, original.state.matchId);
		expect(reloaded.state.status).toBe('finished');
		expect(reloaded.state.winnerPlayerId).toBe(solo.id);
		expect(reloaded.state.scores[solo.id]).toBe(0);
	});

	it('ignores reverted turns when rebuilding', async () => {
		const solo = await harness.repos.players.create({ name: 'Solo' });
		const original = await MatchSession.start(harness.repos, {
			mode: 'x01',
			playerIds: [solo.id],
			settings: defaultX01Settings(501)
		});
		await original.playTurn({ scoreEntered: 60 });
		await original.playTurn({ scoreEntered: 180 });
		await original.undoLast();

		const reloaded = await MatchSession.load(harness.repos, original.state.matchId);
		expect(reloaded.state.turns).toHaveLength(1);
		expect(reloaded.state.scores[solo.id]).toBe(441);
	});

	it('throws when the match does not exist', async () => {
		await expect(MatchSession.load(harness.repos, 'missing')).rejects.toThrow(/missing/);
	});
});

describe('MatchSession — best-of-X legs', () => {
	let harness: TestHarness;

	beforeEach(async () => {
		harness = await createTestDb();
	});

	afterEach(async () => {
		await harness.close();
	});

	async function startBestOf3() {
		const a = await harness.repos.players.create({ name: 'Alice' });
		const b = await harness.repos.players.create({ name: 'Bob' });
		const session = await MatchSession.start(harness.repos, {
			mode: 'x01',
			playerIds: [a.id, b.id],
			settings: { ...defaultX01Settings(40), bestOfLegs: 3 }
		});
		return { a, b, session };
	}

	const checkout = [{ segment: 20, multiplier: 2, score: 40 }] as const;

	it('creates a new Leg row when the match advances to the next leg', async () => {
		const { session } = await startBestOf3();
		await session.playTurn({ scoreEntered: 40, darts: [...checkout] });
		const legs = await harness.repos.matches.listLegs(session.state.matchId);
		expect(legs.map((l) => l.legIndex)).toEqual([0, 1]);
		expect(legs[0].status).toBe('finished');
		expect(legs[1].status).toBe('active');
	});

	it('finishes the match (and final leg) when a player reaches majority', async () => {
		const { a, session } = await startBestOf3();
		await session.playTurn({ scoreEntered: 40, darts: [...checkout] });
		await session.playTurn({ scoreEntered: 0 });
		await session.playTurn({ scoreEntered: 40, darts: [...checkout] });

		expect(session.state.status).toBe('finished');
		expect(session.state.winnerPlayerId).toBe(a.id);

		const match = await harness.repos.matches.get(session.state.matchId);
		expect(match?.status).toBe('finished');
		const legs = await harness.repos.matches.listLegs(session.state.matchId);
		expect(legs).toHaveLength(2);
		expect(legs.every((l) => l.status === 'finished')).toBe(true);
	});

	it('undo rolls back a leg transition, removing the newer Leg row', async () => {
		const { session } = await startBestOf3();
		await session.playTurn({ scoreEntered: 40, darts: [...checkout] });
		expect((await harness.repos.matches.listLegs(session.state.matchId)).length).toBe(2);

		await session.undoLast();
		const legs = await harness.repos.matches.listLegs(session.state.matchId);
		expect(legs).toHaveLength(1);
		expect(legs[0].status).toBe('active');
		expect(session.state.legIndex).toBe(0);
	});

	it('rehydration via load() preserves legs map and supports playing the next turn', async () => {
		const { a, session } = await startBestOf3();
		await session.playTurn({ scoreEntered: 40, darts: [...checkout] });

		const reloaded = await MatchSession.load(harness.repos, session.state.matchId);
		expect(reloaded.state.legIndex).toBe(1);
		expect(reloaded.state.legsWon[a.id]).toBe(1);

		await reloaded.playTurn({ scoreEntered: 0 });
		const turns = await harness.repos.turns.listForMatch(session.state.matchId);
		const lastTurn = turns[turns.length - 1];
		expect(lastTurn.legIndex).toBe(1);
		expect(lastTurn.legId).toBeTruthy();
	});
});
