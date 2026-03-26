<script lang="ts">
  import type { Loadout } from '@lb/shared';
  import { updateLoadout } from '$lib/api/loadouts.js';
  import { page } from '$app/stores';

  interface Props {
    loadout: Loadout;
    onClose: () => void;
    onUpdate: (updated: Loadout) => void;
  }

  let { loadout, onClose, onUpdate }: Props = $props();

  const shareUrl = $derived(
    loadout.shareSlug ? `${$page.url.origin}/share/${loadout.shareSlug}` : null
  );

  let copied = $state(false);
  let isPublic = $state(loadout.isPublic);

  $effect(() => {
    isPublic = loadout.isPublic;
  });

  async function togglePublic() {
    const prev = isPublic;
    isPublic = !isPublic; // optimistic
    try {
      const updated = await updateLoadout(loadout.id, { isPublic: !prev });
      isPublic = updated.isPublic;
      onUpdate(updated);
    } catch {
      isPublic = prev; // revert on error
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }
</script>

<div
  class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
  onclick={onClose}
  role="dialog"
  aria-modal="true"
  aria-label="Share loadout"
>
  <div
    class="bg-gray-900 rounded-xl w-full max-w-md shadow-2xl p-6"
    onclick={(e) => e.stopPropagation()}
    role="presentation"
  >
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-white font-semibold text-lg">Share Loadout</h2>
      <button onclick={onClose} class="text-gray-400 hover:text-white text-xl">×</button>
    </div>

    <div class="flex items-center justify-between mb-4">
      <div>
        <p class="text-white text-sm font-medium">Public loadout</p>
        <p class="text-gray-400 text-xs">Anyone with the link can view</p>
      </div>
      <button
        onclick={togglePublic}
        class="relative w-11 h-6 rounded-full transition-colors {isPublic ? 'bg-orange-500' : 'bg-gray-600'}"
        aria-label="Toggle public"
      >
        <span
          class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform {isPublic ? 'translate-x-5' : ''}"
        ></span>
      </button>
    </div>

    {#if shareUrl}
      <div class="flex gap-2">
        <input
          type="text"
          value={shareUrl}
          readonly
          class="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none"
        />
        <button
          onclick={copyLink}
          class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    {:else}
      <p class="text-gray-500 text-sm">Enable public to get a share link.</p>
    {/if}

    <div class="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2 text-gray-400 text-sm">
      <span>❤ {loadout.likesCount} likes</span>
    </div>
  </div>
</div>
