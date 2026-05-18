import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOwner } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { ServerSyncRepository } from '$lib/server/sync-repo';
import type { SyncPushBody, SyncPushResponse } from '$lib/sync/types';

export const POST: RequestHandler = async ({ request }) => {
	const owner = getOwner(request);
	const body = (await request.json()) as SyncPushBody;
	const repo = new ServerSyncRepository(getDb());

	const accepted = {
		players: body.players ? repo.upsertPlayers(owner, body.players) : 0,
		matches: body.matches ? repo.upsertMatches(owner, body.matches) : 0,
		matchPlayers: body.matchPlayers ? repo.upsertMatchPlayers(owner, body.matchPlayers) : 0,
		legs: body.legs ? repo.upsertLegs(owner, body.legs) : 0,
		turns: body.turns ? repo.upsertTurns(owner, body.turns) : 0
	};

	const response: SyncPushResponse = {
		syncedAt: new Date().toISOString(),
		accepted
	};
	return json(response);
};
