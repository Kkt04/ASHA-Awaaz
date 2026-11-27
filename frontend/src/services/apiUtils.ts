/**
 * Safe API response parser and network error handler.
 * Prevents "Unexpected end of JSON input" and handles HTML, empty, and non-2xx responses gracefully.
 */

export interface ParsedApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export async function parseApiResponse<T = any>(res: Response): Promise<ParsedApiResponse<T>> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  // 1. Read raw response text safely
  let text = '';
  try {
    text = await res.text();
  } catch (err: any) {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: 'Unable to read response from server. Please try again.'
    };
  }

  const trimmed = text.trim();
  const isEmpty = trimmed.length === 0;

  // 2. Check for HTML response (SPA index.html rewrites, 404/405/502 error pages)
  const isHtml =
    contentType.includes('text/html') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<!DOCTYPE');

  if (isHtml) {
    if (res.status === 405) {
      return {
        ok: false,
        status: 405,
        data: null,
        error: 'The backend service endpoint is currently unreachable. Please check backend configuration.'
      };
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: 'The server is temporarily unavailable. Please try again.'
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: 'Unable to connect to the server. Please try again.'
      };
    }
  }

  // 3. Handle empty response body
  if (isEmpty) {
    if (res.status === 204 || res.status === 200 || res.status === 201) {
      return { ok: true, status: res.status, data: {} as T };
    }
    if (res.status === 401) {
      return { ok: false, status: 401, data: null, error: 'Your email or password is incorrect.' };
    }
    if (res.status === 405) {
      return {
        ok: false,
        status: 405,
        data: null,
        error: 'The server endpoint does not allow this method. Please verify backend API deployment.'
      };
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      return { ok: false, status: res.status, data: null, error: 'The server is temporarily unavailable. Please try again.' };
    }
    return {
      ok: false,
      status: res.status,
      data: null,
      error: `Server returned an empty response (HTTP ${res.status}).`
    };
  }

  // 4. Safely parse JSON
  let json: any = null;
  try {
    json = JSON.parse(trimmed);
  } catch {
    if (res.ok) {
      return { ok: true, status: res.status, data: trimmed as any };
    }
    return {
      ok: false,
      status: res.status,
      data: null,
      error: 'Received an invalid response from the server. Please try again.'
    };
  }

  // 5. Evaluate HTTP status code
  if (!res.ok) {
    let errorMsg = json?.detail || json?.message;
    if (Array.isArray(errorMsg)) {
      errorMsg = errorMsg[0]?.msg || JSON.stringify(errorMsg);
    }
    if (!errorMsg || typeof errorMsg !== 'string') {
      if (res.status === 401) errorMsg = 'Your email or password is incorrect.';
      else if (res.status === 409) errorMsg = 'This email is already registered.';
      else if (res.status === 422) errorMsg = 'Please check the entered details and try again.';
      else if (res.status >= 500) errorMsg = 'The server is temporarily unavailable. Please try again.';
      else errorMsg = 'Unable to connect to the server. Please try again.';
    }
    return { ok: false, status: res.status, data: json, error: errorMsg };
  }

  return { ok: true, status: res.status, data: json };
}

export function formatNetworkError(err: any): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Please check your internet connection.';
  }
  const msg = String(err?.message || '');
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed') ||
    msg.includes('connection refused')
  ) {
    return 'Unable to connect to the server. Please try again.';
  }
  return msg || 'Unable to connect to the server. Please try again.';
}
