export type SpotifySessionSnapshot = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  selectedDeviceId: string | null;
};

export type SpotifySessionTokens = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds?: number | null;
  expiresAt?: number | null;
};

const STORAGE_KEYS = {
  accessToken: "spotify_access_token",
  refreshToken: "spotify_refresh_token",
  expiresAt: "spotify_token_expires_at",
  selectedDeviceId: "spotify_selected_device_id",
} as const;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readString(key: keyof typeof STORAGE_KEYS): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(STORAGE_KEYS[key]);
}

function writeString(key: keyof typeof STORAGE_KEYS, value: string | null): void {
  if (!isBrowser()) return;

  const storageKey = STORAGE_KEYS[key];
  if (value === null) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, value);
}

function readNumber(key: keyof typeof STORAGE_KEYS): number | null {
  const value = readString(key);
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getSpotifySessionSnapshot(): SpotifySessionSnapshot {
  return {
    accessToken: getSpotifyAccessToken(),
    refreshToken: getSpotifyRefreshToken(),
    expiresAt: getSpotifyTokenExpiresAt(),
    selectedDeviceId: getSpotifySelectedDeviceId(),
  };
}

export function getSpotifyAccessToken(): string | null {
  return readString("accessToken");
}

export function getSpotifyRefreshToken(): string | null {
  return readString("refreshToken");
}

export function getSpotifyTokenExpiresAt(): number | null {
  return readNumber("expiresAt");
}

export function isSpotifyAccessTokenExpired(leewaySeconds = 30): boolean {
  const expiresAt = getSpotifyTokenExpiresAt();
  if (!expiresAt) return false;
  return Date.now() >= expiresAt - leewaySeconds * 1000;
}

export function getSpotifySelectedDeviceId(): string | null {
  return readString("selectedDeviceId");
}

export function setSpotifyTokens(tokens: SpotifySessionTokens): void {
  writeString("accessToken", tokens.accessToken);
  writeString("refreshToken", tokens.refreshToken);

  if (typeof tokens.expiresAt === "number") {
    writeString("expiresAt", String(tokens.expiresAt));
    return;
  }

  if (typeof tokens.expiresInSeconds === "number") {
    writeString("expiresAt", String(Date.now() + tokens.expiresInSeconds * 1000));
    return;
  }

  writeString("expiresAt", null);
}

export function setSpotifyAccessToken(accessToken: string): void {
  writeString("accessToken", accessToken);
}

export function setSpotifyRefreshToken(refreshToken: string): void {
  writeString("refreshToken", refreshToken);
}

export function setSpotifySelectedDeviceId(deviceId: string | null): void {
  writeString("selectedDeviceId", deviceId);
}

export function clearSpotifySession(): void {
  writeString("accessToken", null);
  writeString("refreshToken", null);
  writeString("expiresAt", null);
  writeString("selectedDeviceId", null);
}

export function clearSpotifyAuthTokens(): void {
  writeString("accessToken", null);
  writeString("refreshToken", null);
  writeString("expiresAt", null);
}
