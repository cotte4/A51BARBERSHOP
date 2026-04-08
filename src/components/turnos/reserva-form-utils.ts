export type Slot = {
  id: string;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
};

export type SpotifyTrackOption = {
  id: string;
  uri: string;
  name: string;
  artistNames: string[];
  albumName: string;
  imageUrl: string;
};

export type QuickDateOption = {
  value: string;
  eyebrow: string;
  weekday: string;
  dayNumber: string;
  month: string;
};

export function formatARS(value: string | null) {
  if (!value) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

export function parsePublicDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(parsePublicDate(value));
}

export function formatDateLongLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(parsePublicDate(value));
}

export function addDaysToISODate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days, 12));

  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function buildQuickDateOptions(start: string, count: number): QuickDateOption[] {
  return Array.from({ length: count }, (_, index) => {
    const value = addDaysToISODate(start, index);
    const date = parsePublicDate(value);

    return {
      value,
      eyebrow: index === 0 ? "Arranca" : index === 1 ? "Sigue" : "Agenda",
      weekday: new Intl.DateTimeFormat("es-AR", {
        weekday: "short",
        timeZone: "America/Argentina/Buenos_Aires",
      })
        .format(date)
        .replace(".", ""),
      dayNumber: new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(date),
      month: new Intl.DateTimeFormat("es-AR", {
        month: "short",
        timeZone: "America/Argentina/Buenos_Aires",
      })
        .format(date)
        .replace(".", ""),
    };
  });
}
