import { auth } from './firebase';

export async function apiFetch(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const headers = new Headers(options.headers);
  
  if (user) {
    // Force refresh if needed, usually getIdToken handles it
    const token = await user.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const res = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} ${res.statusText} - ${errorText}`);
  }
  
  return res;
}

export async function fetcher(url: string) {
  const res = await apiFetch(url, { headers: { Accept: "application/json" } });
  const contentType = res.headers.get("content-type") || "";
  if (res.status === 204) return null;
  if (!contentType.includes("application/json")) {
     throw new Error("Server returned non-JSON response");
  }
  return res.json();
}
