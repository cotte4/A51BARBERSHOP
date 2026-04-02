interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (callback: (token: string) => void) => void;
  volume?: number;
}

interface SpotifyPlayerState {
  paused: boolean;
  track_window: {
    current_track: {
      id: string;
      uri: string;
      name: string;
      artists: { name: string }[];
    };
  };
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: "ready", callback: (data: { device_id: string }) => void): void;
  addListener(event: "not_ready", callback: (data: { device_id: string }) => void): void;
  addListener(event: "initialization_error", callback: (data: { message: string }) => void): void;
  addListener(event: "authentication_error", callback: (data: { message: string }) => void): void;
  addListener(event: "account_error", callback: (data: { message: string }) => void): void;
  addListener(event: "player_state_changed", callback: (state: SpotifyPlayerState | null) => void): void;
}

interface Window {
  Spotify: {
    Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer;
  };
  onSpotifyWebPlaybackSDKReady: () => void;
}
