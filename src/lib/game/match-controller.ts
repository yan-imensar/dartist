import type { DartThrow, X01Settings } from './types';
import { applyX01Turn } from './x01';

export type ActiveMatchPlayer = {
	id: string;
	name: string;
	startingScore: number;
};

export type ActiveTurn = {
	playerId: string;
	turnIndex: number;
	scoreBefore: number;
	scoreEntered: number;
	scoreApplied: number;
	scoreAfter: number;
	isBust: boolean;
	isCheckout: boolean;
	darts: DartThrow[];
};

export type ActiveMatchState = {
	matchId: string;
	mode: 'x01';
	settings: X01Settings;
	players: ActiveMatchPlayer[];
	currentPlayerIndex: number;
	scores: Record<string, number>;
	turns: ActiveTurn[];
	status: 'active' | 'finished';
	winnerPlayerId: string | null;
};

export type PlayTurnInput = {
	scoreEntered: number;
	darts?: DartThrow[];
	confirmDoubleFinish?: boolean;
};

export type PlayTurnOutcome = {
	state: ActiveMatchState;
	turn: ActiveTurn;
};

export function createMatchState(input: {
	matchId: string;
	settings: X01Settings;
	players: ActiveMatchPlayer[];
}): ActiveMatchState {
	if (input.players.length === 0) throw new Error('match needs at least one player');
	const scores: Record<string, number> = {};
	for (const p of input.players) scores[p.id] = p.startingScore;
	return {
		matchId: input.matchId,
		mode: 'x01',
		settings: input.settings,
		players: input.players,
		currentPlayerIndex: 0,
		scores,
		turns: [],
		status: 'active',
		winnerPlayerId: null
	};
}

export function currentPlayer(state: ActiveMatchState): ActiveMatchPlayer {
	return state.players[state.currentPlayerIndex];
}

export function playTurn(state: ActiveMatchState, input: PlayTurnInput): PlayTurnOutcome {
	if (state.status !== 'active') throw new Error('match is not active');

	const player = currentPlayer(state);
	const scoreBefore = state.scores[player.id];
	const result = applyX01Turn({
		scoreBefore,
		scoreEntered: input.scoreEntered,
		darts: input.darts,
		confirmDoubleFinish: input.confirmDoubleFinish,
		settings: state.settings
	});

	const turn: ActiveTurn = {
		playerId: player.id,
		turnIndex: state.turns.length,
		scoreBefore,
		scoreEntered: input.scoreEntered,
		scoreApplied: result.scoreApplied,
		scoreAfter: result.scoreAfter,
		isBust: result.isBust,
		isCheckout: result.isCheckout,
		darts: input.darts ?? []
	};

	const nextScores = { ...state.scores, [player.id]: result.scoreAfter };
	const nextTurns = [...state.turns, turn];

	if (result.isCheckout) {
		return {
			turn,
			state: {
				...state,
				scores: nextScores,
				turns: nextTurns,
				status: 'finished',
				winnerPlayerId: player.id
			}
		};
	}

	return {
		turn,
		state: {
			...state,
			scores: nextScores,
			turns: nextTurns,
			currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length
		}
	};
}

export function undoLastTurn(state: ActiveMatchState): ActiveMatchState {
	if (state.turns.length === 0) return state;
	const removed = state.turns[state.turns.length - 1];
	const remainingTurns = state.turns.slice(0, -1);
	const scores = recomputeScores(state.players, remainingTurns);
	const playerIdx = state.players.findIndex((p) => p.id === removed.playerId);
	return {
		...state,
		turns: remainingTurns,
		scores,
		currentPlayerIndex: playerIdx >= 0 ? playerIdx : state.currentPlayerIndex,
		status: 'active',
		winnerPlayerId: null
	};
}

function recomputeScores(
	players: ActiveMatchPlayer[],
	turns: ActiveTurn[]
): Record<string, number> {
	const scores: Record<string, number> = {};
	for (const p of players) scores[p.id] = p.startingScore;
	for (const t of turns) scores[t.playerId] = t.scoreAfter;
	return scores;
}
