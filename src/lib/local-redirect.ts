const LOCAL_REDIRECT_BASE = "https://a51.local";

export function sanitizeLocalRedirectPath(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }

  try {
    const url = new URL(value, LOCAL_REDIRECT_BASE);
    if (url.origin !== LOCAL_REDIRECT_BASE) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
