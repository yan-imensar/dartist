import type { Leg, Match, MatchPlayer, Player, Turn } from '$lib/db/schema';
import type { AppSettings } from '$lib/settings/types';

export const BACKUP_SCHEMA_VERSION = 1;

export type Backup = {
	schemaVersion: typeof BACKUP_SCHEMA_VERSION;
	exportedAt: string;
	players: Player[];
	matches: Match[];
	matchPlayers: MatchPlayer[];
	legs: Leg[];
	turns: Turn[];
	settings: AppSettings;
};
