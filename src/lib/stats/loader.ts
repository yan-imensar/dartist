import type { Repositories } from '$lib/db/repositories';
import type { ComputeStatsInput } from './compute';

export async function loadStatsInput(repos: Repositories): Promise<ComputeStatsInput> {
	const [matches, matchPlayers, legs, turns] = await Promise.all([
		repos.matches.listAll(),
		repos.matches.listAllMatchPlayers(),
		repos.matches.listAllLegs(),
		repos.turns.listAll()
	]);
	return { matches, matchPlayers, legs, turns };
}
