import type { DartistDb } from '$lib/db/client';
import type { Match, Player, Turn } from '$lib/db/schema';
import type { SyncPullResponse, SyncPushBody } from './types';

function isPending<T extends { syncState: string }>(row: T): boolean {
	return row.syncState !== 'synced';
}

export class SyncLocalRepository {
	constructor(private readonly db: DartistDb) {}

	async collectPending(): Promise<SyncPushBody> {
		const [allPlayers, allMatches, allTurns, allMatchPlayers, allLegs] = await Promise.all([
			this.db.players.toArray(),
			this.db.matches.toArray(),
			this.db.turns.toArray(),
			this.db.matchPlayers.toArray(),
			this.db.legs.toArray()
		]);

		const players = allPlayers.filter(isPending);
		const matches = allMatches.filter(isPending);
		const turns = allTurns.filter(isPending);

		const involvedMatchIds = new Set<string>([
			...matches.map((m) => m.id),
			...turns.map((t) => t.matchId)
		]);
		const matchPlayers = allMatchPlayers.filter((mp) => involvedMatchIds.has(mp.matchId));
		const legs = allLegs.filter((l) => involvedMatchIds.has(l.matchId));

		return { players, matches, matchPlayers, legs, turns };
	}

	async markSynced(body: SyncPushBody): Promise<void> {
		await this.db.transaction('rw', [this.db.players, this.db.matches, this.db.turns], async () => {
			for (const p of body.players ?? []) {
				await this.db.players.update(p.id, { syncState: 'synced', remoteId: p.id });
			}
			for (const m of body.matches ?? []) {
				await this.db.matches.update(m.id, { syncState: 'synced', remoteId: m.id });
			}
			for (const t of body.turns ?? []) {
				await this.db.turns.update(t.id, { syncState: 'synced', remoteId: t.id });
			}
		});
	}

	async applyPull(response: SyncPullResponse): Promise<void> {
		await this.db.transaction(
			'rw',
			[this.db.players, this.db.matches, this.db.matchPlayers, this.db.legs, this.db.turns],
			async () => {
				for (const p of response.players) await this.upsertPlayer(p);
				for (const m of response.matches) await this.upsertMatch(m);
				for (const mp of response.matchPlayers) await this.db.matchPlayers.put(mp);
				for (const l of response.legs) await this.db.legs.put(l);
				for (const t of response.turns) await this.upsertTurn(t);
			}
		);
	}

	private async upsertPlayer(remote: Player): Promise<void> {
		const local = await this.db.players.get(remote.id);
		if (!local || local.syncState === 'synced' || remote.updatedAt > local.updatedAt) {
			await this.db.players.put({ ...remote, syncState: 'synced', remoteId: remote.id });
		}
	}

	private async upsertMatch(remote: Match): Promise<void> {
		const local = await this.db.matches.get(remote.id);
		if (!local || local.syncState === 'synced' || remote.updatedAt > local.updatedAt) {
			await this.db.matches.put({ ...remote, syncState: 'synced', remoteId: remote.id });
		}
	}

	private async upsertTurn(remote: Turn): Promise<void> {
		const local = await this.db.turns.get(remote.id);
		if (local && local.syncState !== 'synced' && local.revertedAt !== remote.revertedAt) {
			return;
		}
		await this.db.turns.put({ ...remote, syncState: 'synced', remoteId: remote.id });
	}

	totals(body: SyncPushBody | SyncPullResponse): number {
		const keys: (keyof SyncPushBody)[] = ['players', 'matches', 'matchPlayers', 'legs', 'turns'];
		return keys.reduce(
			(sum, key) => sum + ((body as Record<string, unknown[] | undefined>)[key]?.length ?? 0),
			0
		);
	}
}
