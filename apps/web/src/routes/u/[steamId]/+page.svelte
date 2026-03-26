<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Loadouts — CS2 Builder</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 text-white p-8 max-w-5xl mx-auto">
  <h1 class="text-2xl font-bold mb-6">Public Loadouts</h1>

  {#if data.loadouts.length === 0}
    <p class="text-gray-500">No public loadouts yet.</p>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {#each data.loadouts as loadout (loadout.id)}
        {#if loadout.shareSlug}
          <a
            href="/share/{loadout.shareSlug}"
            class="block bg-gray-900 rounded-xl p-4 hover:bg-gray-800 transition-colors border border-gray-800 hover:border-gray-600"
          >
            <h2 class="font-semibold mb-1">{loadout.name}</h2>
            <p class="text-sm text-gray-400">{loadout.slots?.length ?? 0} weapons configured</p>
            <div class="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <span>❤ {loadout.likesCount}</span>
              <span class="ml-auto">{new Date(loadout.createdAt).toLocaleDateString()}</span>
            </div>
          </a>
        {/if}
      {/each}
    </div>
  {/if}
</div>
