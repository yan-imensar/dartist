import { describe, expect, it } from 'vitest';
import {
	createMatchState,
	currentPlayer,
	playTurn,
	undoLastTurn,
	type ActiveMatchPlayer
} from './match-controller';
import type { DartThrow } from './types';
import { defaultX01Settings } from './x01';

const settings = defaultX01Settings(501);

const players: ActiveMatchPlayer[] = [
	{ id: 'a', name: 'Alice', startingScore: 501 },
	{ id: 'b', name: 'Bob', startingScore: 501 }
];

function freshState() {
	return createMatchState({ matchId: 'm1', settings, players });
}

describe('match-controller', () => {
	it('starts with player 0 active and full scores', () => {
		const state = freshState();
		expect(currentPlayer(state).id).toBe('a');
		expect(state.scores).toEqual({ a: 501, b: 501 });
		expect(state.status).toBe('active');
	});

	it('rotates to next player after a normal turn', () => {
		const s0 = freshState();
		const { state: s1 } = playTurn(s0, { scoreEntered: 60 });
		expect(s1.scores.a).toBe(441);
		expect(currentPlayer(s1).id).toBe('b');
	});

	it('rotation wraps back to first player', () => {
		const s0 = freshState();
		const s1 = playTurn(s0, { scoreEntered: 60 }).state;
		const s2 = playTurn(s1, { scoreEntered: 100 }).state;
		expect(currentPlayer(s2).id).toBe('a');
		expect(s2.scores).toEqual({ a: 441, b: 401 });
	});

	it('keeps score and rotates on bust', () => {
		const s0 = createMatchState({
			matchId: 'm1',
			settings,
			players: [
				{ id: 'a', name: 'Alice', startingScore: 40 },
				{ id: 'b', name: 'Bob', startingScore: 501 }
			]
		});
		const { state: s1, turn } = playTurn(s0, { scoreEntered: 41 });
		expect(turn.isBust).toBe(true);
		expect(s1.scores.a).toBe(40);
		expect(currentPlayer(s1).id).toBe('b');
	});

	it('finishes the match on checkout', () => {
		const s0 = createMatchState({
			matchId: 'm1',
			settings,
			players: [
				{ id: 'a', name: 'Alice', startingScore: 40 },
				{ id: 'b', name: 'Bob', startingScore: 100 }
			]
		});
		const { state: s1, turn } = playTurn(s0, {
			scoreEntered: 40,
			darts: [{ segment: 20, multiplier: 2, score: 40 }]
		});
		expect(turn.isCheckout).toBe(true);
		expect(s1.status).toBe('finished');
		expect(s1.winnerPlayerId).toBe('a');
		expect(s1.scores.a).toBe(0);
	});

	it('rejects play when match is finished', () => {
		const s0 = createMatchState({
			matchId: 'm1',
			settings,
			players: [{ id: 'a', name: 'A', startingScore: 2 }]
		});
		const s1 = playTurn(s0, {
			scoreEntered: 2,
			darts: [{ segment: 1, multiplier: 2, score: 2 }]
		}).state;
		expect(() => playTurn(s1, { scoreEntered: 60 })).toThrow(/active/);
	});

	it('undo reverts the last turn and restores the previous player', () => {
		const s0 = freshState();
		const s1 = playTurn(s0, { scoreEntered: 60 }).state;
		const s2 = playTurn(s1, { scoreEntered: 100 }).state;
		const undone = undoLastTurn(s2);
		expect(undone.scores).toEqual({ a: 441, b: 501 });
		expect(currentPlayer(undone).id).toBe('b');
		expect(undone.turns).toHaveLength(1);
	});

	it('undo on empty history is a no-op', () => {
		const s0 = freshState();
		expect(undoLastTurn(s0)).toEqual(s0);
	});

	it('undo reopens a finished match', () => {
		const s0 = createMatchState({
			matchId: 'm1',
			settings,
			players: [{ id: 'a', name: 'A', startingScore: 40 }]
		});
		const finished = playTurn(s0, {
			scoreEntered: 40,
			darts: [{ segment: 20, multiplier: 2, score: 40 }]
		}).state;
		expect(finished.status).toBe('finished');
		const reopened = undoLastTurn(finished);
		expect(reopened.status).toBe('active');
		expect(reopened.winnerPlayerId).toBeNull();
		expect(reopened.scores.a).toBe(40);
	});
});

describe('match-controller — best-of-X legs', () => {
	const bestOf3 = { ...defaultX01Settings(40), bestOfLegs: 3 };

	function freshBestOfThree() {
		return createMatchState({
			matchId: 'm1',
			settings: bestOf3,
			players: [
				{ id: 'a', name: 'Alice', startingScore: 40 },
				{ id: 'b', name: 'Bob', startingScore: 40 }
			]
		});
	}

	function checkoutDart(): DartThrow[] {
		return [{ segment: 20, multiplier: 2, score: 40 }];
	}

	it('starts a new leg on checkout when match still needs more wins', () => {
		const s0 = freshBestOfThree();
		const s1 = playTurn(s0, { scoreEntered: 40, darts: checkoutDart() }).state;
		expect(s1.status).toBe('active');
		expect(s1.legsWon).toEqual({ a: 1, b: 0 });
		expect(s1.legIndex).toBe(1);
		expect(s1.scores).toEqual({ a: 40, b: 40 });
		expect(currentPlayer(s1).id).toBe('b');
	});

	it('finishes the match once the winning player reaches the majority', () => {
		let state = freshBestOfThree();
		state = playTurn(state, { scoreEntered: 40, darts: checkoutDart() }).state;
		state = playTurn(state, { scoreEntered: 0 }).state;
		state = playTurn(state, { scoreEntered: 40, darts: checkoutDart() }).state;
		expect(state.status).toBe('finished');
		expect(state.winnerPlayerId).toBe('a');
		expect(state.legsWon).toEqual({ a: 2, b: 0 });
	});

	it('undo rewinds across leg transitions', () => {
		let state = freshBestOfThree();
		state = playTurn(state, { scoreEntered: 40, darts: checkoutDart() }).state;
		expect(state.legIndex).toBe(1);

		state = undoLastTurn(state);
		expect(state.legIndex).toBe(0);
		expect(state.legsWon).toEqual({ a: 0, b: 0 });
		expect(state.scores.a).toBe(40);
		expect(currentPlayer(state).id).toBe('a');
	});
});
