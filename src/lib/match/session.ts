import { defaultX01Settings } from '$lib/game/x01';
import {
	createMatchState,
	currentPlayer,
	playTurn as applyPlayTurn,
	undoLastTurn,
	type ActiveMatchPlayer,
	type ActiveMatchState,
	type PlayTurnInput
} from '$lib/game/match-controller';
import type { Repositories } from '$lib/db/repositories';
import type { GameMode, X01Settings } from '$lib/game/types';

export type StartSessionInput = {
	mode: GameMode;
	playerIds: string[];
	settings?: X01Settings;
};

export class MatchSession {
	private constructor(
		private readonly repos: Repositories,
		private currentState: ActiveMatchState,
		private readonly legId: string | null
	) {}

	get state(): ActiveMatchState {
		return this.currentState;
	}

	get currentPlayerId(): string {
		return currentPlayer(this.currentState).id;
	}

	static async start(repos: Repositories, input: StartSessionInput): Promise<MatchSession> {
		const settings = input.settings ?? defaultX01Settings();
		const { match, matchPlayers, leg } = await repos.matches.start({
			mode: input.mode,
			playerIds: input.playerIds,
			settings
		});

		const players: ActiveMatchPlayer[] = await Promise.all(
			matchPlayers.map(async (mp) => {
				const p = await repos.players.get(mp.playerId);
				return {
					id: mp.playerId,
					name: p?.name ?? '?',
					startingScore: mp.startingScore
				};
			})
		);

		const state = createMatchState({ matchId: match.id, settings, players });
		return new MatchSession(repos, state, leg.id);
	}

	async playTurn(input: PlayTurnInput): Promise<ActiveMatchState> {
		const playerId = this.currentPlayerId;
		const { state: next, turn } = applyPlayTurn(this.currentState, input);

		await this.repos.turns.record({
			matchId: this.currentState.matchId,
			playerId,
			legId: this.legId,
			turnIndex: turn.turnIndex,
			scoreBefore: turn.scoreBefore,
			scoreEntered: turn.scoreEntered,
			scoreApplied: turn.scoreApplied,
			scoreAfter: turn.scoreAfter,
			isBust: turn.isBust,
			isCheckout: turn.isCheckout,
			darts: turn.darts
		});

		if (next.status === 'finished' && next.winnerPlayerId) {
			await this.repos.matches.finish(this.currentState.matchId, next.winnerPlayerId);
		}

		this.currentState = next;
		return next;
	}

	async undoLast(): Promise<ActiveMatchState> {
		if (this.currentState.turns.length === 0) return this.currentState;
		await this.repos.turns.revertLast(this.currentState.matchId);
		this.currentState = undoLastTurn(this.currentState);
		return this.currentState;
	}
}
