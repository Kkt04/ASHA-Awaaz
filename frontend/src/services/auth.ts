import { parseApiResponse, formatNetworkError } from './apiUtils';

const rawApiBase: string = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';
export const API_BASE = rawApiBase.endsWith('/api/v1') 
  ? rawApiBase 
  : rawApiBase.endsWith('/') 
    ? `${rawApiBase}api/v1` 
    : `${rawApiBase}/api/v1`;

export interface WorkerUser {
  worker_id: string;
  name: string;
  email?: string;
  role: string;
  village: string;
  preferred_language: string;
  phone: string;
}

export interface AuthSuccessPayload {
  access_token: string;
  token_type: string;
  worker: WorkerUser;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  village?: string;
  preferred_language?: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

const TOKEN_KEY = 'asha_auth_token';
const USER_KEY = 'asha_auth_user';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): WorkerUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WorkerUser;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  },

  setSession(token: string, user: WorkerUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  async login(payload: LoginPayload): Promise<AuthSuccessPayload> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email.trim(),
          password: payload.password
        }),
      });

      const parsed = await parseApiResponse<AuthSuccessPayload>(res);
      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.error || 'Invalid email or password. Please check your credentials.');
      }

      const data = parsed.data;
      if (data?.access_token) {
        this.setSession(data.access_token, data.worker);
      }
      return data;
    } catch (err: any) {
      throw new Error(formatNetworkError(err));
    }
  },

  async demoLogin(): Promise<AuthSuccessPayload> {
    try {
      const res = await fetch(`${API_BASE}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const parsed = await parseApiResponse<AuthSuccessPayload>(res);
      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.error || 'Demo login failed. Please try again.');
      }

      const data = parsed.data;
      if (data?.access_token) {
        this.setSession(data.access_token, data.worker);
      }
      return data;
    } catch (err: any) {
      throw new Error(formatNetworkError(err));
    }
  },

  async signup(payload: SignupPayload): Promise<AuthSuccessPayload> {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          email: payload.email.trim()
        }),
      });

      const parsed = await parseApiResponse<AuthSuccessPayload>(res);
      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.error || 'Registration failed. Please check the entered details.');
      }

      const data = parsed.data;
      if (data?.access_token) {
        this.setSession(data.access_token, data.worker);
      }
      return data;
    } catch (err: any) {
      throw new Error(formatNetworkError(err));
    }
  },

  async fetchProfile(): Promise<WorkerUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/worker/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const parsed = await parseApiResponse<WorkerUser>(res);
      if (parsed.ok && parsed.data) {
        localStorage.setItem(USER_KEY, JSON.stringify(parsed.data));
        return parsed.data;
      } else if (res.status === 401) {
        // Token has expired or is invalid
        this.clearSession();
        return null;
      }
    } catch (err) {
      console.warn('Could not refresh remote profile, using cached user:', err);
    }

    return this.getUser();
  },

  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {
      // offline safe
    } finally {
      this.clearSession();
    }
  }
};
