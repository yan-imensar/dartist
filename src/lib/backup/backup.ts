import type { DartistDb } from '$lib/db/client';
import { getDb } from '$lib/db/client';
import { SettingsRepository } from '$lib/settings/repo';
import { BACKUP_SCHEMA_VERSION, type Backup } from './types';

export class BackupService {
	constructor(private readonly db: DartistDb = getDb()) {}

	async export(): Promise<Backup> {
		const settings = await new SettingsRepository(this.db).loadAll();
		const [players, matches, matchPlayers, legs, turns] = await Promise.all([
			this.db.players.toArray(),
			this.db.matches.toArray(),
			this.db.matchPlayers.toArray(),
			this.db.legs.toArray(),
			this.db.turns.toArray()
		]);
		return {
			schemaVersion: BACKUP_SCHEMA_VERSION,
			exportedAt: new Date().toISOString(),
			players,
			matches,
			matchPlayers,
			legs,
			turns,
			settings
		};
	}

	parse(json: string): Backup {
		let parsed: unknown;
		try {
			parsed = JSON.parse(json);
		} catch (err) {
			throw new Error(`invalid JSON: ${err instanceof Error ? err.message : String(err)}`, {
				cause: err
			});
		}
		if (!parsed || typeof parsed !== 'object') throw new Error('backup must be an object');
		const obj = parsed as Record<string, unknown>;
		if (obj.schemaVersion !== BACKUP_SCHEMA_VERSION) {
			throw new Error(`unsupported schemaVersion: ${String(obj.schemaVersion)}`);
		}
		for (const key of ['players', 'matches', 'matchPlayers', 'legs', 'turns'] as const) {
			if (!Array.isArray(obj[key])) throw new Error(`missing or invalid "${key}" array`);
		}
		return parsed as Backup;
	}

	async import(backup: Backup): Promise<{ counts: Record<string, number> }> {
		await this.db.transaction(
			'rw',
			[this.db.players, this.db.matches, this.db.matchPlayers, this.db.legs, this.db.turns],
			async () => {
				if (backup.players.length) await this.db.players.bulkPut(backup.players);
				if (backup.matches.length) await this.db.matches.bulkPut(backup.matches);
				if (backup.matchPlayers.length) await this.db.matchPlayers.bulkPut(backup.matchPlayers);
				if (backup.legs.length) await this.db.legs.bulkPut(backup.legs);
				if (backup.turns.length) await this.db.turns.bulkPut(backup.turns);
			}
		);
		return {
			counts: {
				players: backup.players.length,
				matches: backup.matches.length,
				matchPlayers: backup.matchPlayers.length,
				legs: backup.legs.length,
				turns: backup.turns.length
			}
		};
	}
}
