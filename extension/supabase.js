// ============================================
// ReefCams — Supabase Client
// ============================================

const SUPABASE_URL = 'https://auwbrydulogqlscfymbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1d2JyeWR1bG9ncWxzY2Z5bWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODYyMzgsImV4cCI6MjA4NTk2MjIzOH0.0iylWRsxOnu265xefq0Ly7_qIOmH50x1spUn6V5WunY';
const HOSTED_PLAYER_BASE_URL = 'https://reefcams.vercel.app';

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.accessToken = null;
    this.userId = null;
  }

  // ---- Anonymous Auth ----

  async signInAnonymously() {
    // Check for existing anon session first
    const token = localStorage.getItem('rc_token');
    const userId = localStorage.getItem('rc_user_id');
    if (token && userId) {
      this.accessToken = token;
      this.userId = userId;
      // Try to verify it's still valid
      const user = await this.getUser();
      if (user) return user;
    }

    // Create a new anonymous session
    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: this.key },
      body: JSON.stringify({})  // empty body = anonymous sign-in
    });
    const data = await res.json();
    if (data.access_token) {
      this.accessToken = data.access_token;
      this.userId = data.user.id;
      localStorage.setItem('rc_token', data.access_token);
      localStorage.setItem('rc_refresh', data.refresh_token);
      localStorage.setItem('rc_user_id', data.user.id);
      return data.user;
    }
    throw new Error('Anonymous sign-in failed: ' + JSON.stringify(data));
  }

  async refreshSession() {
    const refresh = localStorage.getItem('rc_refresh');
    if (!refresh) return null;
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: this.key },
      body: JSON.stringify({ refresh_token: refresh })
    });
    const data = await res.json();
    if (data.access_token) {
      this.accessToken = data.access_token;
      this.userId = data.user?.id || localStorage.getItem('rc_user_id');
      localStorage.setItem('rc_token', data.access_token);
      localStorage.setItem('rc_refresh', data.refresh_token);
      return data.user;
    }
    return null;
  }

  getToken() {
    return this.accessToken || localStorage.getItem('rc_token');
  }

  getUserId() {
    return this.userId || localStorage.getItem('rc_user_id');
  }

  async getUser() {
    const token = this.getToken();
    if (!token) return null;
    const res = await fetch(`${this.url}/auth/v1/user`, {
      headers: { apikey: this.key, Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const user = await res.json();
    if (user?.id) {
      this.userId = user.id;
      localStorage.setItem('rc_user_id', user.id);
    }
    return user;
  }

  // ---- Database ----

  async query(table, options = {}) {
    const token = this.getToken();
    let url = `${this.url}/rest/v1/${table}`;
    const params = new URLSearchParams();
    if (options.select) params.set('select', options.select);
    if (options.filter) {
      for (const [k, v] of Object.entries(options.filter)) {
        params.set(k, `eq.${v}`);
      }
    }
    if (options.order) params.set('order', options.order);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    const res = await fetch(url, {
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || `Query failed for ${table}`);
    }
    return data;
  }

  async insert(table, data) {
    const token = this.getToken();
    const res = await fetch(`${this.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.message || body?.error || `Insert failed for ${table}`);
    }
    return body;
  }

  async delete(table, filter) {
    const token = this.getToken();
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filter)) {
      params.set(k, `eq.${v}`);
    }
    const res = await fetch(`${this.url}/rest/v1/${table}?${params.toString()}`, {
      method: 'DELETE',
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) {
      let message = `Delete failed for ${table}`;
      try {
        const body = await res.json();
        message = body?.message || body?.error || message;
      } catch (err) {
        // Ignore parse errors and surface the generic message.
      }
      throw new Error(message);
    }
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
