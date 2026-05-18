import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOwner } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { ServerSyncRepository } from '$lib/server/sync-repo';
import type { SyncPullResponse } from '$lib/sync/types';

export const GET: RequestHandler = async ({ url }) => {
	const owner = getOwner();
	const since = url.searchParams.get('since') ?? '1970-01-01T00:00:00.000Z';
	const repo = new ServerSyncRepository(getDb());

	const response: SyncPullResponse = {
		syncedAt: new Date().toISOString(),
		players: repo.listPlayersSince(owner, since),
		matches: repo.listMatchesSince(owner, since),
		matchPlayers: repo.listMatchPlayersSince(owner, since),
		legs: repo.listLegsSince(owner, since),
		turns: repo.listTurnsSince(owner, since)
	};
	return json(response);
};
