<script lang="ts">
  import type { PriceData } from '@lb/shared';
  import { getPrices } from '$lib/api/prices.js';

  interface Props {
    skinId: number;
  }

  let { skinId }: Props = $props();

  let prices = $state<PriceData[]>([]);
  let loading = $state(false);

  $effect(() => {
    let cancelled = false;
    prices = [];
    loading = true;
    getPrices(skinId)
      .then(data => { if (!cancelled) prices = data; })
      .catch(() => { if (!cancelled) prices = []; })
      .finally(() => { if (!cancelled) loading = false; });
    return () => { cancelled = true; };
  });

  const SOURCE_CONFIG = {
    steam: { label: 'Steam', color: 'text-blue-400' },
    csfloat: { label: 'CSFloat', color: 'text-green-400' },
    bitskin: { label: 'Bitskin', color: 'text-purple-400' },
  } as const;
</script>

<div class="flex gap-3 flex-wrap">
  {#if loading}
    <span class="text-xs text-gray-500">Loading prices…</span>
  {:else}
    {#each prices as p}
      {@const cfg = SOURCE_CONFIG[p.source as keyof typeof SOURCE_CONFIG]}
      {#if cfg}
        <a
          href={p.listingUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          class="flex flex-col items-center bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors no-underline"
        >
          <span class="text-xs text-gray-400">{cfg.label}</span>
          <span class="text-sm font-semibold {cfg.color}">
            {p.price != null ? `$${p.price.toFixed(2)}` : '—'}
          </span>
        </a>
      {/if}
    {/each}
  {/if}
</div>
