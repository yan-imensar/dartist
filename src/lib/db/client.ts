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

export class DartistDb extends Dexie {
	devices!: EntityTable<Device, 'id'>;
	players!: EntityTable<Player, 'id'>;
	matches!: EntityTable<Match, 'id'>;
	matchPlayers!: EntityTable<MatchPlayer, 'id'>;
	legs!: EntityTable<Leg, 'id'>;
	turns!: EntityTable<Turn, 'id'>;
	syncQueue!: EntityTable<SyncQueueItem, 'id'>;
	settings!: EntityTable<SettingsRow, 'key'>;

	constructor(name = 'dartist') {
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

let instance: DartistDb | null = null;

export function getDb(): DartistDb {
	if (!instance) instance = new DartistDb();
	return instance;
}

export function resetDbForTests(name?: string): DartistDb {
	if (instance) instance.close();
	instance = new DartistDb(name);
	return instance;
}
