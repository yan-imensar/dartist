import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestHarness } from '../test-utils';

describe('TurnsRepository', () => {
	let harness: TestHarness;

	beforeEach(async () => {
		harness = await createTestDb();
	});

	afterEach(async () => {
		await harness.close();
	});

	async function setup() {
		const player = await harness.repos.players.create({ name: 'Alice' });
		const { match, leg } = await harness.repos.matches.start({
			mode: 'x01',
			playerIds: [player.id]
		});
		return { player, match, leg };
	}

	it('records a turn with append-only semantics', async () => {
		const { player, match, leg } = await setup();
		const turn = await harness.repos.turns.record({
			matchId: match.id,
			playerId: player.id,
			legId: leg.id,
			turnIndex: 0,
			scoreBefore: 501,
			scoreEntered: 60,
			scoreApplied: 60,
			scoreAfter: 441,
			isBust: false,
			isCheckout: false
		});
		expect(turn.id).toBeDefined();
		expect(turn.revertedAt).toBeNull();
		expect(turn.scoreAfter).toBe(441);

		const all = await harness.repos.turns.listForMatch(match.id);
		expect(all).toHaveLength(1);
	});

	it('lists turns for a match in turnIndex order', async () => {
		const { player, match, leg } = await setup();
		const ctx = { matchId: match.id, playerId: player.id, legId: leg.id };
		await harness.repos.turns.record({
			...ctx,
			turnIndex: 1,
			scoreBefore: 441,
			scoreEntered: 100,
			scoreApplied: 100,
			scoreAfter: 341,
			isBust: false,
			isCheckout: false
		});
		await harness.repos.turns.record({
			...ctx,
			turnIndex: 0,
			scoreBefore: 501,
			scoreEntered: 60,
			scoreApplied: 60,
			scoreAfter: 441,
			isBust: false,
			isCheckout: false
		});
		const turns = await harness.repos.turns.listForMatch(match.id);
		expect(turns.map((t) => t.turnIndex)).toEqual([0, 1]);
	});

	it('revertLast marks the most recent active turn as reverted', async () => {
		const { player, match, leg } = await setup();
		const ctx = { matchId: match.id, playerId: player.id, legId: leg.id };
		const t0 = await harness.repos.turns.record({
			...ctx,
			turnIndex: 0,
			scoreBefore: 501,
			scoreEntered: 60,
			scoreApplied: 60,
			scoreAfter: 441,
			isBust: false,
			isCheckout: false
		});
		const t1 = await harness.repos.turns.record({
			...ctx,
			turnIndex: 1,
			scoreBefore: 441,
			scoreEntered: 100,
			scoreApplied: 100,
			scoreAfter: 341,
			isBust: false,
			isCheckout: false
		});
		const reverted = await harness.repos.turns.revertLast(match.id);
		expect(reverted?.id).toBe(t1.id);
		expect(reverted?.revertedAt).not.toBeNull();

		const next = await harness.repos.turns.lastActive(match.id);
		expect(next?.id).toBe(t0.id);
	});

	it('correct() reverts original and inserts a correction linked via correctionOfTurnId', async () => {
		const { player, match, leg } = await setup();
		const ctx = { matchId: match.id, playerId: player.id, legId: leg.id };
		const original = await harness.repos.turns.record({
			...ctx,
			turnIndex: 0,
			scoreBefore: 501,
			scoreEntered: 60,
			scoreApplied: 60,
			scoreAfter: 441,
			isBust: false,
			isCheckout: false
		});
		const correction = await harness.repos.turns.correct(original.id, {
			...ctx,
			turnIndex: 0,
			scoreBefore: 501,
			scoreEntered: 45,
			scoreApplied: 45,
			scoreAfter: 456,
			isBust: false,
			isCheckout: false
		});
		expect(correction.correctionOfTurnId).toBe(original.id);

		const reread = await harness.db.turns.get(original.id);
		expect(reread?.revertedAt).not.toBeNull();
	});
});
