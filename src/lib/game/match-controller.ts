import type { DartThrow, X01Settings } from './types';
import { applyX01Turn, legsToWin } from './x01';

export type ActiveMatchPlayer = {
	id: string;
	name: string;
	startingScore: number;
};

export type ActiveTurn = {
	playerId: string;
	turnIndex: number;
	legIndex: number;
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
	legIndex: number;
	legsWon: Record<string, number>;
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
	return deriveState(input.matchId, input.settings, input.players, []);
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
		legIndex: state.legIndex,
		scoreBefore,
		scoreEntered: input.scoreEntered,
		scoreApplied: result.scoreApplied,
		scoreAfter: result.scoreAfter,
		isBust: result.isBust,
		isCheckout: result.isCheckout,
		darts: input.darts ?? []
	};

	const next = deriveState(state.matchId, state.settings, state.players, [...state.turns, turn]);
	return { state: next, turn };
}

export function undoLastTurn(state: ActiveMatchState): ActiveMatchState {
	if (state.turns.length === 0) return state;
	return deriveState(state.matchId, state.settings, state.players, state.turns.slice(0, -1));
}

export function deriveState(
	matchId: string,
	settings: X01Settings,
	players: ActiveMatchPlayer[],
	turns: ActiveTurn[]
): ActiveMatchState {
	const needed = legsToWin(settings.bestOfLegs ?? 1);
	const scores: Record<string, number> = {};
	const legsWon: Record<string, number> = {};
	for (const p of players) {
		scores[p.id] = p.startingScore;
		legsWon[p.id] = 0;
	}

	let legIndex = 0;
	let currentPlayerIndex = 0;
	let status: ActiveMatchState['status'] = 'active';
	let winnerPlayerId: string | null = null;

	for (const t of turns) {
		scores[t.playerId] = t.scoreAfter;
		if (t.isCheckout) {
			legsWon[t.playerId] = (legsWon[t.playerId] ?? 0) + 1;
			if (legsWon[t.playerId] >= needed) {
				status = 'finished';
				winnerPlayerId = t.playerId;
			} else {
				legIndex += 1;
				for (const p of players) scores[p.id] = p.startingScore;
				currentPlayerIndex = legIndex % players.length;
			}
		} else {
			const idx = players.findIndex((p) => p.id === t.playerId);
			currentPlayerIndex = idx >= 0 ? (idx + 1) % players.length : 0;
		}
	}

	return {
		matchId,
		mode: 'x01',
		settings,
		players,
		currentPlayerIndex,
		scores,
		turns,
		legIndex,
		legsWon,
		status,
		winnerPlayerId
	};
}
