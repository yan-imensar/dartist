export const SETTINGS_KEYS = {
	pocketbaseUrl: 'pocketbaseUrl',
	oauthProvider: 'oauthProvider',
	lastSyncedAt: 'lastSyncedAt'
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export type AppSettings = {
	pocketbaseUrl: string | null;
	oauthProvider: string;
	lastSyncedAt: string | null;
};

export const DEFAULT_OAUTH_PROVIDER = 'oidc';

export const DEFAULT_SETTINGS: AppSettings = {
	pocketbaseUrl: null,
	oauthProvider: DEFAULT_OAUTH_PROVIDER,
	lastSyncedAt: null
};
