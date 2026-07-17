const localDefaultBaseUrl = "http://localhost:5173";

export function getAppBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_APP_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  return localDefaultBaseUrl;
}

export function buildAppUrl(path = "/") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBaseUrl()}${cleanPath}`;
}
