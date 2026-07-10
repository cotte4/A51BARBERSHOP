import { getMusicDashboardState } from "@/lib/music-engine";
import MusicConfigPanel from "@/components/configuracion/MusicConfigPanel";

export const dynamic = "force-dynamic";

type ConfiguracionMusicaPageProps = {
  searchParams: Promise<{
    spotify_connected?: string;
    spotify_error?: string;
  }>;
};

function getCallbackMessage(params: {
  spotify_connected?: string;
  spotify_error?: string;
}) {
  if (params.spotify_connected === "1") {
    return "Spotify quedo conectado al negocio.";
  }

  if (!params.spotify_error) {
    return null;
  }

  const messages: Record<string, string> = {
    auth_failed: "No se pudo autenticar con Spotify.",
    config_missing: "Falta configuracion de Spotify en el servidor.",
    token_failed: "Spotify no devolvio un token valido.",
    unexpected: "Paso un error inesperado al conectar Spotify.",
  };

  return messages[params.spotify_error] ?? "No se pudo completar la conexion con Spotify.";
}

export default async function ConfiguracionMusicaPage({
  searchParams,
}: ConfiguracionMusicaPageProps) {
  const params = await searchParams;

  // El sync con Spotify puede fallar (token vencido, API caida). Si pasa,
  // caemos al estado local sin sync antes que romper la pagina entera.
  let state;
  try {
    state = await getMusicDashboardState({ sync: true });
  } catch {
    state = await getMusicDashboardState();
  }

  return <MusicConfigPanel state={state} callbackMessage={getCallbackMessage(params)} />;
}
