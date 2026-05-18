import { defaultX01Settings } from '$lib/game/x01';
import {
	createMatchState,
	currentPlayer,
	deriveState,
	playTurn as applyPlayTurn,
	undoLastTurn,
	type ActiveMatchPlayer,
	type ActiveMatchState,
	type ActiveTurn,
	type PlayTurnInput
} from '$lib/game/match-controller';
import type { Repositories } from '$lib/db/repositories';
import type { Turn } from '$lib/db/schema';
import type { GameMode, X01Settings } from '$lib/game/types';

export type StartSessionInput = {
	mode: GameMode;
	playerIds: string[];
	settings?: X01Settings;
};

export class MatchSession {
	private readonly legs = new Map<number, string>();

	private constructor(
		private readonly repos: Repositories,
		private currentState: ActiveMatchState
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

		const players = await loadPlayers(repos, matchPlayers);
		const state = createMatchState({ matchId: match.id, settings, players });
		const session = new MatchSession(repos, state);
		session.legs.set(0, leg.id);
		return session;
	}

	static async load(repos: Repositories, matchId: string): Promise<MatchSession> {
		const match = await repos.matches.get(matchId);
		if (!match) throw new Error(`match ${matchId} not found`);

		const [matchPlayers, legs, turns] = await Promise.all([
			repos.matches.getMatchPlayers(matchId),
			repos.matches.listLegs(matchId),
			repos.turns.listForMatch(matchId)
		]);

		const players = await loadPlayers(repos, matchPlayers);
		const settings = normalizeSettings(match.settings as X01Settings);
		const activeTurns = turns
			.filter((t) => t.revertedAt === null)
			.sort((a, b) => a.turnIndex - b.turnIndex)
			.map(toActiveTurn);

		const state = deriveState(matchId, settings, players, activeTurns);
		const session = new MatchSession(repos, state);
		for (const l of legs) session.legs.set(l.legIndex, l.id);
		return session;
	}

	async playTurn(input: PlayTurnInput): Promise<ActiveMatchState> {
		const playerId = this.currentPlayerId;
		const beforeLegIndex = this.currentState.legIndex;
		const { state: next, turn } = applyPlayTurn(this.currentState, input);

		const legIdForTurn = this.legs.get(beforeLegIndex) ?? null;

		await this.repos.turns.record({
			matchId: this.currentState.matchId,
			playerId,
			legId: legIdForTurn,
			legIndex: turn.legIndex,
			turnIndex: turn.turnIndex,
			scoreBefore: turn.scoreBefore,
			scoreEntered: turn.scoreEntered,
			scoreApplied: turn.scoreApplied,
			scoreAfter: turn.scoreAfter,
			isBust: turn.isBust,
			isCheckout: turn.isCheckout,
			darts: turn.darts
		});

		if (turn.isCheckout) {
			const finishingLegId = this.legs.get(beforeLegIndex);
			if (finishingLegId) await this.repos.matches.finishLeg(finishingLegId, playerId);
		}

		if (next.legIndex > beforeLegIndex && next.status === 'active') {
			const newLeg = await this.repos.matches.createLeg(this.currentState.matchId, next.legIndex);
			this.legs.set(next.legIndex, newLeg.id);
		}

		if (next.status === 'finished' && next.winnerPlayerId) {
			await this.repos.matches.finish(this.currentState.matchId, next.winnerPlayerId);
		}

		this.currentState = next;
		return next;
	}

	async undoLast(): Promise<ActiveMatchState> {
		if (this.currentState.turns.length === 0) return this.currentState;

		const beforeStatus = this.currentState.status;
		const beforeLegIndex = this.currentState.legIndex;
		const lastTurn = this.currentState.turns[this.currentState.turns.length - 1];

		await this.repos.turns.revertLast(this.currentState.matchId);

		const next = undoLastTurn(this.currentState);

		if (lastTurn.isCheckout) {
			const legIdOfFinishedLeg = this.legs.get(lastTurn.legIndex);
			if (legIdOfFinishedLeg) await this.repos.matches.reopenLeg(legIdOfFinishedLeg);

			if (beforeStatus === 'active' && beforeLegIndex > lastTurn.legIndex) {
				const newerLegId = this.legs.get(beforeLegIndex);
				if (newerLegId) {
					await this.repos.matches.deleteLeg(newerLegId);
					this.legs.delete(beforeLegIndex);
				}
			}

			if (beforeStatus === 'finished') {
				await this.repos.matches.reopen(this.currentState.matchId);
			}
		}

		this.currentState = next;
		return next;
	}
}

function normalizeSettings(settings: X01Settings): X01Settings {
	return {
		startingScore: settings.startingScore,
		doubleOut: settings.doubleOut,
		straightIn: settings.straightIn,
		maxDartsPerTurn: settings.maxDartsPerTurn,
		bestOfLegs: settings.bestOfLegs ?? 1
	};
}

async function loadPlayers(
	repos: Repositories,
	matchPlayers: { playerId: string; startingScore: number }[]
): Promise<ActiveMatchPlayer[]> {
	return Promise.all(
		matchPlayers.map(async (mp) => {
			const p = await repos.players.get(mp.playerId);
			return {
				id: mp.playerId,
				name: p?.name ?? '?',
				startingScore: mp.startingScore
			};
		})
	);
}

function toActiveTurn(t: Turn): ActiveTurn {
	return {
		playerId: t.playerId,
		turnIndex: t.turnIndex,
		legIndex: t.legIndex ?? 0,
		scoreBefore: t.scoreBefore,
		scoreEntered: t.scoreEntered,
		scoreApplied: t.scoreApplied,
		scoreAfter: t.scoreAfter,
		isBust: t.isBust,
		isCheckout: t.isCheckout,
		darts: t.darts
	};
}
