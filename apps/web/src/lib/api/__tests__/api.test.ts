import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the base client
vi.mock('../client.js', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../client.js';
import { getLoadouts, createLoadout, updateLoadoutSlots, updateLoadout, toggleLike, getSharedLoadout } from '../loadouts.js';
import { getWeapons, getSkinsForWeapon } from '../weapons.js';
import { getPrices } from '../prices.js';

const mockFetch = vi.mocked(apiFetch);

beforeEach(() => { vi.clearAllMocks(); });

describe('getLoadouts', () => {
  it('calls GET /loadouts', async () => {
    mockFetch.mockResolvedValue([]);
    await getLoadouts();
    expect(mockFetch).toHaveBeenCalledWith('/loadouts');
  });
});

describe('createLoadout', () => {
  it('calls POST /loadouts with name', async () => {
    mockFetch.mockResolvedValue({ id: 'abc', name: 'Test' });
    await createLoadout('My Loadout');
    expect(mockFetch).toHaveBeenCalledWith('/loadouts', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'My Loadout' }),
    }));
  });
});

describe('getWeapons', () => {
  it('calls GET /weapons', async () => {
    mockFetch.mockResolvedValue({ rifles: [], pistols: [] });
    await getWeapons();
    expect(mockFetch).toHaveBeenCalledWith('/weapons');
  });
});

describe('getSkinsForWeapon', () => {
  it('builds correct URL with filters', async () => {
    mockFetch.mockResolvedValue([]);
    await getSkinsForWeapon(7, { rarity: 'covert' });
    expect(mockFetch).toHaveBeenCalledWith('/weapons/7/skins?rarity=covert');
  });

  it('calls /weapons/7/skins with no query string when no filters', async () => {
    mockFetch.mockResolvedValue([]);
    await getSkinsForWeapon(7);
    expect(mockFetch).toHaveBeenCalledWith('/weapons/7/skins');
  });

  it('includes maxPrice=0 in query string when maxPrice is 0', async () => {
    mockFetch.mockResolvedValue([]);
    await getSkinsForWeapon(7, { maxPrice: 0 });
    expect(mockFetch).toHaveBeenCalledWith('/weapons/7/skins?maxPrice=0');
  });
});

describe('updateLoadoutSlots', () => {
  it('calls PUT /loadouts/id/slots with body { slots: [] }', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    await updateLoadoutSlots('id', []);
    expect(mockFetch).toHaveBeenCalledWith('/loadouts/id/slots', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ slots: [] }),
    }));
  });
});

describe('updateLoadout', () => {
  it('calls PATCH with patch object', async () => {
    mockFetch.mockResolvedValue({ id: 'abc' });
    await updateLoadout('abc', { name: 'New Name' });
    expect(mockFetch).toHaveBeenCalledWith('/loadouts/abc', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    }));
  });
});

describe('toggleLike', () => {
  it('calls POST like endpoint', async () => {
    mockFetch.mockResolvedValue({ liked: true });
    await toggleLike('abc');
    expect(mockFetch).toHaveBeenCalledWith('/loadouts/abc/like', expect.objectContaining({ method: 'POST' }));
  });
});

describe('getSharedLoadout', () => {
  it('calls GET /share/:slug', async () => {
    mockFetch.mockResolvedValue({});
    await getSharedLoadout('my-slug');
    expect(mockFetch).toHaveBeenCalledWith('/share/my-slug');
  });
});

describe('getPrices', () => {
  it('calls with default sources', async () => {
    mockFetch.mockResolvedValue([]);
    await getPrices(42);
    expect(mockFetch).toHaveBeenCalledWith('/prices?skinId=42&sources=steam%2Ccsfloat%2Cbitskin');
  });

  it('calls with custom sources', async () => {
    mockFetch.mockResolvedValue([]);
    await getPrices(42, ['steam']);
    expect(mockFetch).toHaveBeenCalledWith('/prices?skinId=42&sources=steam');
  });
});
