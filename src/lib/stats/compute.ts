import { isImpossibleCheckout, MAX_CHECKOUT } from '$lib/game/checkouts';
import type { Leg, Match, MatchPlayer, Turn } from '$lib/db/schema';
import type { PlayerStats, StatsSummary } from './types';

export type ComputeStatsInput = {
	matches: Match[];
	matchPlayers: MatchPlayer[];
	legs: Leg[];
	turns: Turn[];
};

export type ComputePlayerStatsInput = ComputeStatsInput & {
	playerId: string;
};

function isCheckoutAttempt(scoreBefore: number): boolean {
	if (scoreBefore < 2 || scoreBefore > MAX_CHECKOUT) return false;
	return !isImpossibleCheckout(scoreBefore);
}

function emptyStats(playerId: string): PlayerStats {
	return {
		playerId,
		matchesPlayed: 0,
		matchesWon: 0,
		legsWon: 0,
		turnsPlayed: 0,
		averageTurnScore: 0,
		highestTurn: 0,
		checkoutCount: 0,
		checkoutAttempts: 0,
		checkoutPercentage: null
	};
}

export function computePlayerStats(input: ComputePlayerStatsInput): PlayerStats {
	const { playerId, matches, matchPlayers, legs, turns } = input;
	const stats = emptyStats(playerId);

	const playerMatchIds = new Set(
		matchPlayers.filter((mp) => mp.playerId === playerId).map((mp) => mp.matchId)
	);
	const finishedMatches = matches.filter(
		(m) => m.status === 'finished' && playerMatchIds.has(m.id)
	);

	stats.matchesPlayed = finishedMatches.length;
	stats.matchesWon = finishedMatches.filter((m) => m.winnerPlayerId === playerId).length;
	stats.legsWon = legs.filter((l) => l.winnerPlayerId === playerId).length;

	const playerTurns = turns.filter(
		(t) => t.playerId === playerId && t.revertedAt === null && playerMatchIds.has(t.matchId)
	);
	stats.turnsPlayed = playerTurns.length;

	if (playerTurns.length > 0) {
		const totalApplied = playerTurns.reduce((sum, t) => sum + t.scoreApplied, 0);
		stats.averageTurnScore = totalApplied / playerTurns.length;
		stats.highestTurn = playerTurns.reduce(
			(max, t) => (t.scoreEntered > max ? t.scoreEntered : max),
			0
		);
	}

	stats.checkoutCount = playerTurns.filter((t) => t.isCheckout).length;
	stats.checkoutAttempts = playerTurns.filter((t) => isCheckoutAttempt(t.scoreBefore)).length;
	stats.checkoutPercentage =
		stats.checkoutAttempts === 0 ? null : (stats.checkoutCount / stats.checkoutAttempts) * 100;

	return stats;
}

export function computeAllStats(input: ComputeStatsInput): StatsSummary {
	const playerIds = Array.from(new Set(input.matchPlayers.map((mp) => mp.playerId)));
	const perPlayer = playerIds.map((playerId) => computePlayerStats({ ...input, playerId }));

	return {
		matchesPlayed: input.matches.filter((m) => m.status === 'finished').length,
		totalTurns: input.turns.filter((t) => t.revertedAt === null).length,
		perPlayer
	};
}
