import { browser } from '$app/environment';
import { apiFetch } from '$lib/api/client.js';
import type { User } from '@lb/shared';

export async function load() {
  if (!browser) return {};
  try {
    const user = await apiFetch<User>('/auth/me');
    return { user };
  } catch {
    return { user: null };
  }
}
