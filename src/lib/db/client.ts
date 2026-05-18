import Dexie, { type EntityTable } from 'dexie';
import type {
	Device,
	Leg,
	Match,
	MatchPlayer,
	Player,
	SettingsRow,
	SyncQueueItem,
	Turn
} from './schema';

export class DartsDb extends Dexie {
	devices!: EntityTable<Device, 'id'>;
	players!: EntityTable<Player, 'id'>;
	matches!: EntityTable<Match, 'id'>;
	matchPlayers!: EntityTable<MatchPlayer, 'id'>;
	legs!: EntityTable<Leg, 'id'>;
	turns!: EntityTable<Turn, 'id'>;
	syncQueue!: EntityTable<SyncQueueItem, 'id'>;
	settings!: EntityTable<SettingsRow, 'key'>;

	constructor(name = 'darts') {
		super(name);
		this.version(1).stores({
			devices: 'id, name, createdAt',
			players: 'id, name, updatedAt, syncState, deletedAt',
			matches: 'id, status, createdAt, updatedAt, syncState',
			matchPlayers: 'id, matchId, playerId, [matchId+position]',
			legs: 'id, matchId, legIndex, [matchId+legIndex]',
			turns: 'id, matchId, playerId, legId, [matchId+turnIndex], [legId+turnIndex], syncState',
			syncQueue: 'id, entityType, entityId, createdAt',
			settings: 'key'
		});
	}
}

let instance: DartsDb | null = null;

export function getDb(): DartsDb {
	if (!instance) instance = new DartsDb();
	return instance;
}

export function resetDbForTests(name?: string): DartsDb {
	if (instance) instance.close();
	instance = new DartsDb(name);
	return instance;
}
