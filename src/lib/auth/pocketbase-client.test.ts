import { describe, expect, it, vi } from 'vitest';
import { PocketBaseClient } from './pocketbase-client';

describe('PocketBaseClient', () => {
	it('starts unconfigured', () => {
		const client = new PocketBaseClient();
		expect(client.snapshot).toEqual({
			configured: false,
			authenticated: false,
			user: null,
			url: null
		});
	});

	it('configure() updates URL and notifies subscribers', () => {
		const client = new PocketBaseClient();
		const listener = vi.fn();
		client.subscribe(listener);
		listener.mockClear();

		client.configure('https://darts.example.com');
		expect(client.snapshot.configured).toBe(true);
		expect(client.snapshot.url).toBe('https://darts.example.com');
		expect(listener).toHaveBeenCalled();
	});

	it('configure(null) tears the instance down', () => {
		const client = new PocketBaseClient();
		client.configure('https://darts.example.com');
		client.configure(null);
		expect(client.snapshot.configured).toBe(false);
		expect(client.instance).toBeNull();
	});

	it('loginWithOAuth throws when not configured', async () => {
		const client = new PocketBaseClient();
		await expect(client.loginWithOAuth('oidc')).rejects.toThrow(/PocketBase/);
	});

	it('logout() is a no-op when not configured', () => {
		const client = new PocketBaseClient();
		expect(() => client.logout()).not.toThrow();
	});
});
