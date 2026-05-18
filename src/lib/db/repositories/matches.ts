import type { DartistDb } from '../client';
import { defaultX01Settings } from '$lib/game/x01';
import { newId, nowIso } from '../ids';
import type { GameMode } from '$lib/game/types';
import type { Leg, Match, MatchPlayer, MatchSettings } from '../schema';

export type StartMatchInput = {
	mode: GameMode;
	playerIds: string[];
	settings?: MatchSettings;
};

export type StartMatchResult = {
	match: Match;
	matchPlayers: MatchPlayer[];
	leg: Leg;
};

export class MatchesRepository {
	constructor(private readonly db: DartistDb) {}

	async start(input: StartMatchInput): Promise<StartMatchResult> {
		if (input.playerIds.length === 0) throw new Error('at least one player required');
		const settings = input.settings ?? defaultX01Settings();
		const now = nowIso();

		const match: Match = {
			id: newId(),
			mode: input.mode,
			status: 'active',
			createdAt: now,
			startedAt: now,
			finishedAt: null,
			updatedAt: now,
			settings,
			winnerPlayerId: null,
			syncState: 'local',
			remoteId: null
		};

		const startingScore =
			input.mode === 'x01' && 'startingScore' in settings
				? Number((settings as { startingScore: number }).startingScore)
				: 0;

		const matchPlayers: MatchPlayer[] = input.playerIds.map((playerId, idx) => ({
			id: newId(),
			matchId: match.id,
			playerId,
			position: idx,
			startingScore,
			finalRank: null
		}));

		const leg: Leg = {
			id: newId(),
			matchId: match.id,
			legIndex: 0,
			status: 'active',
			startedAt: now,
			finishedAt: null,
			winnerPlayerId: null
		};

		await this.db.transaction(
			'rw',
			this.db.matches,
			this.db.matchPlayers,
			this.db.legs,
			async () => {
				await this.db.matches.add(match);
				await this.db.matchPlayers.bulkAdd(matchPlayers);
				await this.db.legs.add(leg);
			}
		);

		return { match, matchPlayers, leg };
	}

	get(id: string): Promise<Match | undefined> {
		return this.db.matches.get(id);
	}

	async getMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
		const rows = await this.db.matchPlayers.where('matchId').equals(matchId).toArray();
		return rows.sort((a, b) => a.position - b.position);
	}

	getActiveLeg(matchId: string): Promise<Leg | undefined> {
		return this.db.legs
			.where('[matchId+legIndex]')
			.between([matchId, 0], [matchId, Infinity])
			.filter((l) => l.status === 'active')
			.first();
	}

	async finish(matchId: string, winnerPlayerId: string): Promise<void> {
		const match = await this.db.matches.get(matchId);
		if (!match) throw new Error(`match ${matchId} not found`);
		await this.db.matches.put({
			...match,
			status: 'finished',
			finishedAt: nowIso(),
			updatedAt: nowIso(),
			winnerPlayerId,
			syncState: match.syncState === 'synced' ? 'pending' : match.syncState
		});
	}

	async reopen(matchId: string): Promise<void> {
		const match = await this.db.matches.get(matchId);
		if (!match) return;
		await this.db.matches.put({
			...match,
			status: 'active',
			finishedAt: null,
			updatedAt: nowIso(),
			winnerPlayerId: null,
			syncState: match.syncState === 'synced' ? 'pending' : match.syncState
		});
	}

	async createLeg(matchId: string, legIndex: number): Promise<Leg> {
		const leg: Leg = {
			id: newId(),
			matchId,
			legIndex,
			status: 'active',
			startedAt: nowIso(),
			finishedAt: null,
			winnerPlayerId: null
		};
		await this.db.legs.add(leg);
		return leg;
	}

	async finishLeg(legId: string, winnerPlayerId: string): Promise<void> {
		const leg = await this.db.legs.get(legId);
		if (!leg) return;
		await this.db.legs.put({
			...leg,
			status: 'finished',
			finishedAt: nowIso(),
			winnerPlayerId
		});
	}

	async reopenLeg(legId: string): Promise<void> {
		const leg = await this.db.legs.get(legId);
		if (!leg) return;
		await this.db.legs.put({
			...leg,
			status: 'active',
			finishedAt: null,
			winnerPlayerId: null
		});
	}

	async deleteLeg(legId: string): Promise<void> {
		await this.db.legs.delete(legId);
	}

	async listLegs(matchId: string): Promise<Leg[]> {
		const rows = await this.db.legs.where('matchId').equals(matchId).toArray();
		return rows.sort((a, b) => a.legIndex - b.legIndex);
	}

	async listFinished(): Promise<Match[]> {
		const rows = await this.db.matches.where('status').equals('finished').toArray();
		return rows.sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''));
	}

	findActive(): Promise<Match | undefined> {
		return this.db.matches.where('status').equals('active').first();
	}

	async abandon(matchId: string): Promise<void> {
		const match = await this.db.matches.get(matchId);
		if (!match) return;
		await this.db.matches.put({
			...match,
			status: 'abandoned',
			updatedAt: nowIso(),
			syncState: match.syncState === 'synced' ? 'pending' : match.syncState
		});
	}

	listAll(): Promise<Match[]> {
		return this.db.matches.toArray();
	}

	listAllMatchPlayers(): Promise<MatchPlayer[]> {
		return this.db.matchPlayers.toArray();
	}

	listAllLegs(): Promise<Leg[]> {
		return this.db.legs.toArray();
	}
}
