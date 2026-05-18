import type { DartistDb } from '../client';
import { getDb } from '../client';
import { MatchesRepository } from './matches';
import { PlayersRepository } from './players';
import { TurnsRepository } from './turns';

export type Repositories = {
	players: PlayersRepository;
	matches: MatchesRepository;
	turns: TurnsRepository;
};

export function createRepositories(db: DartistDb = getDb()): Repositories {
	return {
		players: new PlayersRepository(db),
		matches: new MatchesRepository(db),
		turns: new TurnsRepository(db)
	};
}

export { MatchesRepository, PlayersRepository, TurnsRepository };
