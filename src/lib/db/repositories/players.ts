import type { DartistDb } from '../client';
import { newId, nowIso } from '../ids';
import type { Player } from '../schema';

export type CreatePlayerInput = {
	name: string;
	color?: string;
	avatarUrl?: string;
};

export type UpdatePlayerInput = Partial<Pick<Player, 'name' | 'color' | 'avatarUrl'>>;

export class PlayersRepository {
	constructor(private readonly db: DartistDb) {}

	async create(input: CreatePlayerInput): Promise<Player> {
		const name = input.name.trim();
		if (!name) throw new Error('player name is required');
		const now = nowIso();
		const player: Player = {
			id: newId(),
			name,
			color: input.color,
			avatarUrl: input.avatarUrl,
			createdAt: now,
			updatedAt: now,
			deletedAt: null,
			syncState: 'local',
			remoteId: null
		};
		await this.db.players.add(player);
		return player;
	}

	async update(id: string, patch: UpdatePlayerInput): Promise<Player> {
		const existing = await this.db.players.get(id);
		if (!existing) throw new Error(`player ${id} not found`);
		const updated: Player = {
			...existing,
			...patch,
			name: patch.name?.trim() || existing.name,
			updatedAt: nowIso(),
			syncState: existing.syncState === 'synced' ? 'pending' : existing.syncState
		};
		await this.db.players.put(updated);
		return updated;
	}

	async softDelete(id: string): Promise<void> {
		const existing = await this.db.players.get(id);
		if (!existing) return;
		const now = nowIso();
		await this.db.players.put({
			...existing,
			deletedAt: now,
			updatedAt: now,
			syncState: existing.syncState === 'synced' ? 'pending' : existing.syncState
		});
	}

	get(id: string): Promise<Player | undefined> {
		return this.db.players.get(id);
	}

	async listActive(): Promise<Player[]> {
		const rows = await this.db.players.orderBy('name').toArray();
		return rows.filter((p) => p.deletedAt === null);
	}
}
