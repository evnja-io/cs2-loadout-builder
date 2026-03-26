<script lang="ts">
  import type { Loadout } from '@lb/shared';

  interface Props {
    loadout: Loadout;
    allLoadouts: Loadout[];
    saving: boolean;
    dirty: boolean;
    onSwitch: (loadout: Loadout) => void;
    onSave: () => void;
    onShareOpen: () => void;
    onNewLoadout: () => void;
  }

  let { loadout, allLoadouts, saving, dirty, onSwitch, onSave, onShareOpen, onNewLoadout }: Props = $props();
</script>

<div class="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
  <select
    class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
    value={loadout.id}
    onchange={(e) => {
      const selected = allLoadouts.find(l => l.id === (e.target as HTMLSelectElement).value);
      if (selected) onSwitch(selected);
    }}
  >
    {#each allLoadouts as l}
      <option value={l.id}>{l.name}</option>
    {/each}
  </select>

  <button
    onclick={onNewLoadout}
    class="text-gray-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-gray-800"
  >
    + New
  </button>

  <div class="flex-1"></div>

  {#if dirty}
    <button
      onclick={onSave}
      disabled={saving}
      class="text-sm px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded transition-colors"
    >
      {saving ? 'Saving…' : 'Save'}
    </button>
  {:else}
    <span class="text-xs text-gray-500">Saved</span>
  {/if}

  <button
    onclick={onShareOpen}
    class="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
  >
    Share
  </button>
</div>
