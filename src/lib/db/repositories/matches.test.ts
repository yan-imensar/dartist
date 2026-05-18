import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultX01Settings } from '$lib/game/x01';
import { createTestDb, type TestHarness } from '../test-utils';

describe('MatchesRepository', () => {
	let harness: TestHarness;

	beforeEach(async () => {
		harness = await createTestDb();
	});

	afterEach(async () => {
		await harness.close();
	});

	async function makePlayers(names: string[]) {
		return Promise.all(names.map((name) => harness.repos.players.create({ name })));
	}

	it('starts a 501 match with players ordered by position', async () => {
		const [a, b] = await makePlayers(['Alice', 'Bob']);
		const { match, matchPlayers, leg } = await harness.repos.matches.start({
			mode: 'x01',
			playerIds: [a.id, b.id],
			settings: defaultX01Settings(501)
		});
		expect(match.status).toBe('active');
		expect(match.startedAt).not.toBeNull();
		expect(matchPlayers.map((mp) => mp.position)).toEqual([0, 1]);
		expect(matchPlayers.every((mp) => mp.startingScore === 501)).toBe(true);
		expect(leg.status).toBe('active');
		expect(leg.legIndex).toBe(0);
	});

	it('rejects starting a match with no players', async () => {
		await expect(harness.repos.matches.start({ mode: 'x01', playerIds: [] })).rejects.toThrow(
			/player/
		);
	});

	it('persists match-players and leg in the DB', async () => {
		const [a] = await makePlayers(['Solo']);
		const { match } = await harness.repos.matches.start({
			mode: 'x01',
			playerIds: [a.id]
		});
		const mps = await harness.repos.matches.getMatchPlayers(match.id);
		expect(mps).toHaveLength(1);
		const leg = await harness.repos.matches.getActiveLeg(match.id);
		expect(leg?.matchId).toBe(match.id);
	});

	it('finishes a match: status finished, winner set, active leg finished', async () => {
		const [a, b] = await makePlayers(['Alice', 'Bob']);
		const { match } = await harness.repos.matches.start({
			mode: 'x01',
			playerIds: [a.id, b.id]
		});
		await harness.repos.matches.finish(match.id, a.id);
		const finished = await harness.repos.matches.get(match.id);
		expect(finished?.status).toBe('finished');
		expect(finished?.winnerPlayerId).toBe(a.id);
		expect(finished?.finishedAt).not.toBeNull();
		const leg = await harness.db.legs.where('matchId').equals(match.id).first();
		expect(leg?.status).toBe('finished');
		expect(leg?.winnerPlayerId).toBe(a.id);
	});

	it('listFinished returns finished matches newest first', async () => {
		const [a] = await makePlayers(['Solo']);
		const { match: m1 } = await harness.repos.matches.start({
			mode: 'x01',
			playerIds: [a.id]
		});
		await harness.repos.matches.finish(m1.id, a.id);
		await new Promise((r) => setTimeout(r, 5));
		const { match: m2 } = await harness.repos.matches.start({
			mode: 'x01',
			playerIds: [a.id]
		});
		await harness.repos.matches.finish(m2.id, a.id);
		const finished = await harness.repos.matches.listFinished();
		expect(finished.map((m) => m.id)).toEqual([m2.id, m1.id]);
	});
});
