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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid email or password. Please check your credentials.');
      }

      if (data?.access_token) {
        this.setSession(data.access_token, data.worker);
      }
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to connect to authentication service.');
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed. Please check the entered details.');
      }

      if (data?.access_token) {
        this.setSession(data.access_token, data.worker);
      }
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Registration service could not be reached.');
    }
  },

  async fetchProfile(): Promise<WorkerUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/worker/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
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
