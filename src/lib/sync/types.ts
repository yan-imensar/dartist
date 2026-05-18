import type { Leg, Match, MatchPlayer, Player, Turn } from '$lib/db/schema';

export type SyncableEntity = 'players' | 'matches' | 'matchPlayers' | 'legs' | 'turns';

export type SyncPushBody = {
	players?: Player[];
	matches?: Match[];
	matchPlayers?: MatchPlayer[];
	legs?: Leg[];
	turns?: Turn[];
};

export type SyncPushResponse = {
	syncedAt: string;
	accepted: Record<SyncableEntity, number>;
};

export type SyncPullResponse = {
	syncedAt: string;
	players: Player[];
	matches: Match[];
	matchPlayers: MatchPlayer[];
	legs: Leg[];
	turns: Turn[];
};
