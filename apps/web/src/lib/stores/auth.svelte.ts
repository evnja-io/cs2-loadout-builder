import type { User } from '@lb/shared';
import { apiFetch } from '../api/client.js';

export const authStore = $state<{
  user: User | null;
  loading: boolean;
}>({ user: null, loading: true });

export async function loadCurrentUser(): Promise<void> {
  try {
    authStore.user = await apiFetch<User>('/auth/me');
  } catch {
    authStore.user = null;
  } finally {
    authStore.loading = false;
  }
}

export async function logout(): Promise<void> {
  authStore.user = null;
  try {
    await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/auth/logout`, {
      method: 'POST', credentials: 'include',
    });
  } catch {
    // Server-side session invalidation failed; client is still logged out
  }
}
