import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const DEFAULT_HEADER = 'X-Forwarded-User';

export function getOwner(request: Request): string {
	const headerName = env.SYNC_AUTH_HEADER ?? DEFAULT_HEADER;
	const owner = request.headers.get(headerName) ?? request.headers.get(headerName.toLowerCase());
	if (owner && owner.trim()) return owner.trim();

	if (env.ALLOW_ANON_SYNC === 'true') {
		return env.DEV_FAKE_USER ?? 'anonymous';
	}

	throw error(401, `missing ${headerName} header`);
}
