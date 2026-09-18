import { auth } from './firebase';

export async function apiFetch(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const headers = new Headers(options.headers);
  
  if (user) {
    // Force refresh if needed, usually getIdToken handles it
    const token = await user.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    let message = errorText;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.error) {
        message = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
        if (parsed.details && Array.isArray(parsed.details)) {
          const detailMsgs = parsed.details.map((d: any) => d.message || JSON.stringify(d)).join(", ");
          if (detailMsgs) message += ` (${detailMsgs})`;
        }
      }
    } catch {
      // not JSON, keep errorText
    }
    throw new Error(message || `API error: ${res.status} ${res.statusText}`);
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
