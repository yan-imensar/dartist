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
