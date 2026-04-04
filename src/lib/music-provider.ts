import type { SpotifyPlaybackState, SpotifyPlaylist } from "@/lib/spotify-api";
import type { MusicPlayerStatus, MusicProvider, MusicProviderStatus } from "@/lib/music-types";

export type ProviderConnectionState = {
  provider: MusicProvider;
  status: MusicProviderStatus;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  lastError: string | null;
};

export type ProviderPlayer = {
  providerPlayerId: string;
  name: string;
  kind: string;
  status: MusicPlayerStatus;
  isDefault: boolean;
  lastSeenAt: Date | null;
  lastError: string | null;
};

export type ProviderPlaybackCommand =
  | { kind: "track"; uri: string; deviceId?: string | null }
  | { kind: "playlist"; uri: string; deviceId?: string | null };

export interface MusicProviderAdapter {
  readonly provider: MusicProvider;
  connect(input: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }): Promise<ProviderConnectionState>;
  disconnect(): Promise<void>;
  refreshConnection(): Promise<ProviderConnectionState | null>;
  getConnection(): Promise<ProviderConnectionState>;
  listPlayers(): Promise<ProviderPlayer[]>;
  getActivePlayer(): Promise<ProviderPlayer | null>;
  getPlaybackState(): Promise<SpotifyPlaybackState | null>;
  listPlaylists(): Promise<SpotifyPlaylist[]>;
  play(command: ProviderPlaybackCommand): Promise<void>;
  enqueue(trackUri: string, deviceId?: string | null): Promise<void>;
  pause(deviceId?: string | null): Promise<void>;
  resume(deviceId?: string | null): Promise<void>;
  skipNext(deviceId?: string | null): Promise<void>;
}
