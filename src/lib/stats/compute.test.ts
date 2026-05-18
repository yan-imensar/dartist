import { describe, expect, it } from 'vitest';
import { computeAllStats, computePlayerStats } from './compute';
import type { Leg, Match, MatchPlayer, Turn } from '$lib/db/schema';

const baseMatch: Omit<Match, 'id' | 'status' | 'winnerPlayerId'> = {
	mode: 'x01',
	createdAt: '2025-01-01T00:00:00.000Z',
	startedAt: '2025-01-01T00:00:00.000Z',
	finishedAt: '2025-01-01T00:30:00.000Z',
	updatedAt: '2025-01-01T00:30:00.000Z',
	settings: { startingScore: 501, doubleOut: true, straightIn: true, maxDartsPerTurn: 3 },
	syncState: 'local',
	remoteId: null
};

function match(id: string, winnerPlayerId: string | null): Match {
	return { ...baseMatch, id, status: 'finished', winnerPlayerId };
}

function matchPlayer(matchId: string, playerId: string, position = 0): MatchPlayer {
	return {
		id: `mp-${matchId}-${playerId}`,
		matchId,
		playerId,
		position,
		startingScore: 501,
		finalRank: null
	};
}

function leg(matchId: string, winnerPlayerId: string | null): Leg {
	return {
		id: `leg-${matchId}`,
		matchId,
		legIndex: 0,
		status: 'finished',
		startedAt: '2025-01-01T00:00:00.000Z',
		finishedAt: '2025-01-01T00:30:00.000Z',
		winnerPlayerId
	};
}

function turn(
	overrides: Partial<Turn> & {
		matchId: string;
		playerId: string;
		turnIndex: number;
		scoreBefore: number;
		scoreEntered: number;
	}
): Turn {
	const scoreApplied = overrides.scoreApplied ?? (overrides.isBust ? 0 : overrides.scoreEntered);
	const scoreAfter = overrides.scoreAfter ?? overrides.scoreBefore - scoreApplied;
	return {
		id: `${overrides.matchId}-${overrides.playerId}-${overrides.turnIndex}`,
		matchId: overrides.matchId,
		playerId: overrides.playerId,
		legId: overrides.legId ?? `leg-${overrides.matchId}`,
		legIndex: overrides.legIndex ?? 0,
		turnIndex: overrides.turnIndex,
		createdAt: '2025-01-01T00:00:00.000Z',
		enteredAt: '2025-01-01T00:00:00.000Z',
		scoreBefore: overrides.scoreBefore,
		scoreEntered: overrides.scoreEntered,
		scoreApplied,
		scoreAfter,
		isBust: overrides.isBust ?? false,
		isCheckout: overrides.isCheckout ?? false,
		darts: overrides.darts ?? [],
		correctionOfTurnId: overrides.correctionOfTurnId ?? null,
		revertedAt: overrides.revertedAt ?? null,
		syncState: overrides.syncState ?? 'local',
		remoteId: overrides.remoteId ?? null
	};
}

describe('computePlayerStats', () => {
	it('reports zeros for a player with no data', () => {
		const stats = computePlayerStats({
			playerId: 'p-1',
			matches: [],
			matchPlayers: [],
			legs: [],
			turns: []
		});
		expect(stats.matchesPlayed).toBe(0);
		expect(stats.averageTurnScore).toBe(0);
		expect(stats.highestTurn).toBe(0);
		expect(stats.checkoutPercentage).toBeNull();
	});

	it('counts matches played, won and legs won', () => {
		const matches = [match('m1', 'p-1'), match('m2', 'p-2'), match('m3', 'p-1')];
		const matchPlayers = [
			matchPlayer('m1', 'p-1'),
			matchPlayer('m1', 'p-2', 1),
			matchPlayer('m2', 'p-1'),
			matchPlayer('m2', 'p-2', 1),
			matchPlayer('m3', 'p-1')
		];
		const legs = [leg('m1', 'p-1'), leg('m2', 'p-2'), leg('m3', 'p-1')];
		const stats = computePlayerStats({
			playerId: 'p-1',
			matches,
			matchPlayers,
			legs,
			turns: []
		});
		expect(stats.matchesPlayed).toBe(3);
		expect(stats.matchesWon).toBe(2);
		expect(stats.legsWon).toBe(2);
	});

	it('computes average and highest turn from applied scores, ignoring reverted turns', () => {
		const matches = [match('m1', 'p-1')];
		const mps = [matchPlayer('m1', 'p-1')];
		const turns: Turn[] = [
			turn({ matchId: 'm1', playerId: 'p-1', turnIndex: 0, scoreBefore: 501, scoreEntered: 60 }),
			turn({
				matchId: 'm1',
				playerId: 'p-1',
				turnIndex: 1,
				scoreBefore: 441,
				scoreEntered: 100
			}),
			turn({
				matchId: 'm1',
				playerId: 'p-1',
				turnIndex: 2,
				scoreBefore: 341,
				scoreEntered: 41,
				isBust: true
			}),
			turn({
				matchId: 'm1',
				playerId: 'p-1',
				turnIndex: 3,
				scoreBefore: 341,
				scoreEntered: 180,
				revertedAt: '2025-01-01T00:10:00.000Z'
			})
		];
		const stats = computePlayerStats({
			playerId: 'p-1',
			matches,
			matchPlayers: mps,
			legs: [],
			turns
		});
		expect(stats.turnsPlayed).toBe(3);
		expect(stats.averageTurnScore).toBeCloseTo((60 + 100 + 0) / 3);
		expect(stats.highestTurn).toBe(100);
	});

	it('computes checkout count, attempts and percentage', () => {
		const matches = [match('m1', 'p-1')];
		const mps = [matchPlayer('m1', 'p-1')];
		const turns: Turn[] = [
			turn({ matchId: 'm1', playerId: 'p-1', turnIndex: 0, scoreBefore: 501, scoreEntered: 60 }),
			turn({ matchId: 'm1', playerId: 'p-1', turnIndex: 1, scoreBefore: 170, scoreEntered: 0 }),
			turn({
				matchId: 'm1',
				playerId: 'p-1',
				turnIndex: 2,
				scoreBefore: 170,
				scoreEntered: 40,
				isBust: true
			}),
			turn({
				matchId: 'm1',
				playerId: 'p-1',
				turnIndex: 3,
				scoreBefore: 40,
				scoreEntered: 40,
				isCheckout: true,
				scoreApplied: 40,
				scoreAfter: 0
			})
		];
		const stats = computePlayerStats({
			playerId: 'p-1',
			matches,
			matchPlayers: mps,
			legs: [],
			turns
		});
		expect(stats.checkoutAttempts).toBe(3);
		expect(stats.checkoutCount).toBe(1);
		expect(stats.checkoutPercentage).toBeCloseTo((1 / 3) * 100);
	});

	it('skips impossible-checkout scores from attempt count', () => {
		const matches = [match('m1', 'p-1')];
		const mps = [matchPlayer('m1', 'p-1')];
		const turns: Turn[] = [
			turn({
				matchId: 'm1',
				playerId: 'p-1',
				turnIndex: 0,
				scoreBefore: 169,
				scoreEntered: 0
			})
		];
		const stats = computePlayerStats({
			playerId: 'p-1',
			matches,
			matchPlayers: mps,
			legs: [],
			turns
		});
		expect(stats.checkoutAttempts).toBe(0);
		expect(stats.checkoutPercentage).toBeNull();
	});
});

describe('computeAllStats', () => {
	it('aggregates per-player stats across the dataset', () => {
		const matches = [match('m1', 'p-1'), match('m2', 'p-2')];
		const mps = [
			matchPlayer('m1', 'p-1'),
			matchPlayer('m1', 'p-2', 1),
			matchPlayer('m2', 'p-1'),
			matchPlayer('m2', 'p-2', 1)
		];
		const legs = [leg('m1', 'p-1'), leg('m2', 'p-2')];
		const summary = computeAllStats({ matches, matchPlayers: mps, legs, turns: [] });
		expect(summary.matchesPlayed).toBe(2);
		expect(summary.perPlayer).toHaveLength(2);
		const p1 = summary.perPlayer.find((s) => s.playerId === 'p-1');
		expect(p1?.matchesWon).toBe(1);
	});
});
