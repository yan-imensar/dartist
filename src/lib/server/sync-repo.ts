import type Database from 'better-sqlite3';
import type { DartThrow } from '$lib/game/types';
import type { Leg, Match, MatchPlayer, Player, SyncState, Turn } from '$lib/db/schema';

function boolToInt(b: boolean): number {
	return b ? 1 : 0;
}

function intToBool(n: number | null): boolean {
	return n === 1;
}

const NEVER: SyncState = 'synced';

export class ServerSyncRepository {
	constructor(private readonly db: Database.Database) {}

	upsertPlayers(owner: string, players: Player[]): number {
		const stmt = this.db.prepare(`
			INSERT INTO players (owner, id, name, color, avatarUrl, createdAt, updatedAt, deletedAt)
			VALUES (@owner, @id, @name, @color, @avatarUrl, @createdAt, @updatedAt, @deletedAt)
			ON CONFLICT(owner, id) DO UPDATE SET
				name = excluded.name,
				color = excluded.color,
				avatarUrl = excluded.avatarUrl,
				updatedAt = excluded.updatedAt,
				deletedAt = excluded.deletedAt
			WHERE excluded.updatedAt > players.updatedAt
		`);
		let count = 0;
		const tx = this.db.transaction((rows: Player[]) => {
			for (const p of rows) {
				stmt.run({
					owner,
					id: p.id,
					name: p.name,
					color: p.color ?? null,
					avatarUrl: p.avatarUrl ?? null,
					createdAt: p.createdAt,
					updatedAt: p.updatedAt,
					deletedAt: p.deletedAt
				});
				count++;
			}
		});
		tx(players);
		return count;
	}

	upsertMatches(owner: string, matches: Match[]): number {
		const stmt = this.db.prepare(`
			INSERT INTO matches (owner, id, mode, status, createdAt, startedAt, finishedAt,
				updatedAt, settings, winnerPlayerId)
			VALUES (@owner, @id, @mode, @status, @createdAt, @startedAt, @finishedAt,
				@updatedAt, @settings, @winnerPlayerId)
			ON CONFLICT(owner, id) DO UPDATE SET
				mode = excluded.mode,
				status = excluded.status,
				startedAt = excluded.startedAt,
				finishedAt = excluded.finishedAt,
				updatedAt = excluded.updatedAt,
				settings = excluded.settings,
				winnerPlayerId = excluded.winnerPlayerId
			WHERE excluded.updatedAt > matches.updatedAt
		`);
		let count = 0;
		const tx = this.db.transaction((rows: Match[]) => {
			for (const m of rows) {
				stmt.run({
					owner,
					id: m.id,
					mode: m.mode,
					status: m.status,
					createdAt: m.createdAt,
					startedAt: m.startedAt,
					finishedAt: m.finishedAt,
					updatedAt: m.updatedAt,
					settings: JSON.stringify(m.settings),
					winnerPlayerId: m.winnerPlayerId
				});
				count++;
			}
		});
		tx(matches);
		return count;
	}

	upsertMatchPlayers(owner: string, rows: MatchPlayer[]): number {
		const stmt = this.db.prepare(`
			INSERT INTO matchPlayers (owner, id, matchId, playerId, position, startingScore,
				finalRank, updatedAt)
			VALUES (@owner, @id, @matchId, @playerId, @position, @startingScore,
				@finalRank, @updatedAt)
			ON CONFLICT(owner, id) DO UPDATE SET
				position = excluded.position,
				startingScore = excluded.startingScore,
				finalRank = excluded.finalRank,
				updatedAt = excluded.updatedAt
		`);
		let count = 0;
		const tx = this.db.transaction((items: MatchPlayer[]) => {
			for (const mp of items) {
				stmt.run({
					owner,
					id: mp.id,
					matchId: mp.matchId,
					playerId: mp.playerId,
					position: mp.position,
					startingScore: mp.startingScore,
					finalRank: mp.finalRank,
					updatedAt: new Date().toISOString()
				});
				count++;
			}
		});
		tx(rows);
		return count;
	}

	upsertLegs(owner: string, legs: Leg[]): number {
		const stmt = this.db.prepare(`
			INSERT INTO legs (owner, id, matchId, legIndex, status, startedAt, finishedAt,
				winnerPlayerId, updatedAt)
			VALUES (@owner, @id, @matchId, @legIndex, @status, @startedAt, @finishedAt,
				@winnerPlayerId, @updatedAt)
			ON CONFLICT(owner, id) DO UPDATE SET
				status = excluded.status,
				finishedAt = excluded.finishedAt,
				winnerPlayerId = excluded.winnerPlayerId,
				updatedAt = excluded.updatedAt
		`);
		let count = 0;
		const tx = this.db.transaction((rows: Leg[]) => {
			for (const l of rows) {
				stmt.run({
					owner,
					id: l.id,
					matchId: l.matchId,
					legIndex: l.legIndex,
					status: l.status,
					startedAt: l.startedAt,
					finishedAt: l.finishedAt,
					winnerPlayerId: l.winnerPlayerId,
					updatedAt: new Date().toISOString()
				});
				count++;
			}
		});
		tx(legs);
		return count;
	}

	upsertTurns(owner: string, turns: Turn[]): number {
		const stmt = this.db.prepare(`
			INSERT INTO turns (owner, id, matchId, playerId, legId, legIndex, turnIndex,
				createdAt, enteredAt, scoreBefore, scoreEntered, scoreApplied, scoreAfter,
				isBust, isCheckout, darts, correctionOfTurnId, revertedAt, updatedAt)
			VALUES (@owner, @id, @matchId, @playerId, @legId, @legIndex, @turnIndex,
				@createdAt, @enteredAt, @scoreBefore, @scoreEntered, @scoreApplied, @scoreAfter,
				@isBust, @isCheckout, @darts, @correctionOfTurnId, @revertedAt, @updatedAt)
			ON CONFLICT(owner, id) DO UPDATE SET
				revertedAt = excluded.revertedAt,
				updatedAt = excluded.updatedAt
		`);
		let count = 0;
		const tx = this.db.transaction((rows: Turn[]) => {
			for (const t of rows) {
				stmt.run({
					owner,
					id: t.id,
					matchId: t.matchId,
					playerId: t.playerId,
					legId: t.legId,
					legIndex: t.legIndex,
					turnIndex: t.turnIndex,
					createdAt: t.createdAt,
					enteredAt: t.enteredAt,
					scoreBefore: t.scoreBefore,
					scoreEntered: t.scoreEntered,
					scoreApplied: t.scoreApplied,
					scoreAfter: t.scoreAfter,
					isBust: boolToInt(t.isBust),
					isCheckout: boolToInt(t.isCheckout),
					darts: JSON.stringify(t.darts),
					correctionOfTurnId: t.correctionOfTurnId,
					revertedAt: t.revertedAt,
					updatedAt: new Date().toISOString()
				});
				count++;
			}
		});
		tx(turns);
		return count;
	}

	listPlayersSince(owner: string, since: string): Player[] {
		const rows = this.db
			.prepare(`SELECT * FROM players WHERE owner = ? AND updatedAt > ?`)
			.all(owner, since) as PlayerRow[];
		return rows.map((r) => ({
			id: r.id,
			name: r.name,
			color: r.color ?? undefined,
			avatarUrl: r.avatarUrl ?? undefined,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt,
			deletedAt: r.deletedAt,
			syncState: NEVER,
			remoteId: r.id
		}));
	}

	listMatchesSince(owner: string, since: string): Match[] {
		const rows = this.db
			.prepare(`SELECT * FROM matches WHERE owner = ? AND updatedAt > ?`)
			.all(owner, since) as MatchRow[];
		return rows.map((r) => ({
			id: r.id,
			mode: r.mode as Match['mode'],
			status: r.status as Match['status'],
			createdAt: r.createdAt,
			startedAt: r.startedAt,
			finishedAt: r.finishedAt,
			updatedAt: r.updatedAt,
			settings: JSON.parse(r.settings),
			winnerPlayerId: r.winnerPlayerId,
			syncState: NEVER,
			remoteId: r.id
		}));
	}

	listMatchPlayersSince(owner: string, since: string): MatchPlayer[] {
		const rows = this.db
			.prepare(`SELECT * FROM matchPlayers WHERE owner = ? AND updatedAt > ?`)
			.all(owner, since) as MatchPlayerRow[];
		return rows.map((r) => ({
			id: r.id,
			matchId: r.matchId,
			playerId: r.playerId,
			position: r.position,
			startingScore: r.startingScore,
			finalRank: r.finalRank
		}));
	}

	listLegsSince(owner: string, since: string): Leg[] {
		const rows = this.db
			.prepare(`SELECT * FROM legs WHERE owner = ? AND updatedAt > ?`)
			.all(owner, since) as LegRow[];
		return rows.map((r) => ({
			id: r.id,
			matchId: r.matchId,
			legIndex: r.legIndex,
			status: r.status as Leg['status'],
			startedAt: r.startedAt,
			finishedAt: r.finishedAt,
			winnerPlayerId: r.winnerPlayerId
		}));
	}

	listTurnsSince(owner: string, since: string): Turn[] {
		const rows = this.db
			.prepare(`SELECT * FROM turns WHERE owner = ? AND updatedAt > ?`)
			.all(owner, since) as TurnRow[];
		return rows.map((r) => ({
			id: r.id,
			matchId: r.matchId,
			playerId: r.playerId,
			legId: r.legId,
			legIndex: r.legIndex,
			turnIndex: r.turnIndex,
			createdAt: r.createdAt,
			enteredAt: r.enteredAt,
			scoreBefore: r.scoreBefore,
			scoreEntered: r.scoreEntered,
			scoreApplied: r.scoreApplied,
			scoreAfter: r.scoreAfter,
			isBust: intToBool(r.isBust),
			isCheckout: intToBool(r.isCheckout),
			darts: JSON.parse(r.darts) as DartThrow[],
			correctionOfTurnId: r.correctionOfTurnId,
			revertedAt: r.revertedAt,
			syncState: NEVER,
			remoteId: r.id
		}));
	}
}

type PlayerRow = {
	owner: string;
	id: string;
	name: string;
	color: string | null;
	avatarUrl: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

type MatchRow = {
	owner: string;
	id: string;
	mode: string;
	status: string;
	createdAt: string;
	startedAt: string | null;
	finishedAt: string | null;
	updatedAt: string;
	settings: string;
	winnerPlayerId: string | null;
};

type MatchPlayerRow = {
	owner: string;
	id: string;
	matchId: string;
	playerId: string;
	position: number;
	startingScore: number;
	finalRank: number | null;
	updatedAt: string;
};

type LegRow = {
	owner: string;
	id: string;
	matchId: string;
	legIndex: number;
	status: string;
	startedAt: string;
	finishedAt: string | null;
	winnerPlayerId: string | null;
	updatedAt: string;
};

type TurnRow = {
	owner: string;
	id: string;
	matchId: string;
	playerId: string;
	legId: string | null;
	legIndex: number;
	turnIndex: number;
	createdAt: string;
	enteredAt: string;
	scoreBefore: number;
	scoreEntered: number;
	scoreApplied: number;
	scoreAfter: number;
	isBust: number;
	isCheckout: number;
	darts: string;
	correctionOfTurnId: string | null;
	revertedAt: string | null;
	updatedAt: string;
};
