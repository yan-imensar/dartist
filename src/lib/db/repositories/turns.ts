import type { DartistDb } from '../client';
import { newId, nowIso } from '../ids';
import type { DartThrow } from '$lib/game/types';
import type { Turn } from '../schema';

export type RecordTurnInput = {
	matchId: string;
	playerId: string;
	legId: string | null;
	turnIndex: number;
	scoreBefore: number;
	scoreEntered: number;
	scoreApplied: number;
	scoreAfter: number;
	isBust: boolean;
	isCheckout: boolean;
	darts?: DartThrow[];
};

export class TurnsRepository {
	constructor(private readonly db: DartistDb) {}

	async record(input: RecordTurnInput): Promise<Turn> {
		const now = nowIso();
		const turn: Turn = {
			id: newId(),
			matchId: input.matchId,
			playerId: input.playerId,
			legId: input.legId,
			turnIndex: input.turnIndex,
			createdAt: now,
			enteredAt: now,
			scoreBefore: input.scoreBefore,
			scoreEntered: input.scoreEntered,
			scoreApplied: input.scoreApplied,
			scoreAfter: input.scoreAfter,
			isBust: input.isBust,
			isCheckout: input.isCheckout,
			darts: input.darts ?? [],
			correctionOfTurnId: null,
			revertedAt: null,
			syncState: 'local',
			remoteId: null
		};
		await this.db.turns.add(turn);
		return turn;
	}

	async listForMatch(matchId: string): Promise<Turn[]> {
		const rows = await this.db.turns.where('matchId').equals(matchId).toArray();
		return rows.sort((a, b) => a.turnIndex - b.turnIndex);
	}

	listAll(): Promise<Turn[]> {
		return this.db.turns.toArray();
	}

	async lastActive(matchId: string): Promise<Turn | undefined> {
		const rows = await this.db.turns.where('matchId').equals(matchId).toArray();
		const active = rows.filter((t) => t.revertedAt === null);
		return active.sort((a, b) => b.turnIndex - a.turnIndex)[0];
	}

	async revertLast(matchId: string): Promise<Turn | undefined> {
		const last = await this.lastActive(matchId);
		if (!last) return undefined;
		const now = nowIso();
		const reverted: Turn = { ...last, revertedAt: now };
		await this.db.turns.put(reverted);
		return reverted;
	}

	async correct(originalTurnId: string, replacement: RecordTurnInput): Promise<Turn> {
		const original = await this.db.turns.get(originalTurnId);
		if (!original) throw new Error(`turn ${originalTurnId} not found`);
		const now = nowIso();
		const correction: Turn = {
			id: newId(),
			matchId: replacement.matchId,
			playerId: replacement.playerId,
			legId: replacement.legId,
			turnIndex: replacement.turnIndex,
			createdAt: now,
			enteredAt: now,
			scoreBefore: replacement.scoreBefore,
			scoreEntered: replacement.scoreEntered,
			scoreApplied: replacement.scoreApplied,
			scoreAfter: replacement.scoreAfter,
			isBust: replacement.isBust,
			isCheckout: replacement.isCheckout,
			darts: replacement.darts ?? [],
			correctionOfTurnId: original.id,
			revertedAt: null,
			syncState: 'local',
			remoteId: null
		};
		await this.db.transaction('rw', this.db.turns, async () => {
			await this.db.turns.put({ ...original, revertedAt: now });
			await this.db.turns.add(correction);
		});
		return correction;
	}
}
