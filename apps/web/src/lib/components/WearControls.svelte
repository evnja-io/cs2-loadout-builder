<script lang="ts">
  const WEAR_LABELS = [
    { max: 0.07, label: 'Factory New', color: 'text-blue-400' },
    { max: 0.15, label: 'Minimal Wear', color: 'text-green-400' },
    { max: 0.38, label: 'Field-Tested', color: 'text-yellow-400' },
    { max: 0.45, label: 'Well-Worn', color: 'text-orange-400' },
    { max: 1.0, label: 'Battle-Scarred', color: 'text-red-400' },
  ];

  interface Props {
    wear: number;
    seed: number;
    statTrak: boolean;
    wearMin?: number;
    wearMax?: number;
    onWearChange: (wear: number) => void;
    onSeedChange: (seed: number) => void;
    onStatTrakChange: (statTrak: boolean) => void;
  }

  let {
    wear,
    seed,
    statTrak,
    wearMin = 0,
    wearMax = 1,
    onWearChange,
    onSeedChange,
    onStatTrakChange,
  }: Props = $props();

  const wearLabel = $derived(
    WEAR_LABELS.find(l => wear <= l.max) ?? WEAR_LABELS[WEAR_LABELS.length - 1]!
  );
</script>

<div class="flex flex-col gap-3 p-4 bg-gray-900/50 rounded-lg">
  <div>
    <div class="flex justify-between items-center mb-1">
      <label class="text-xs text-gray-400 uppercase tracking-wide">Wear</label>
      <span class="text-xs font-medium {wearLabel.color}">
        {wearLabel.label} ({wear.toFixed(4)})
      </span>
    </div>
    <input
      type="range"
      min={wearMin}
      max={wearMax}
      step="0.0001"
      value={wear}
      oninput={(e) => onWearChange(parseFloat((e.target as HTMLInputElement).value))}
      class="w-full accent-orange-500"
    />
  </div>

  <div class="flex gap-4 items-center">
    <div class="flex-1">
      <label class="text-xs text-gray-400 uppercase tracking-wide block mb-1">Pattern Seed</label>
      <input
        type="number"
        min="1"
        max="1000"
        value={seed}
        onchange={(e) => onSeedChange(parseInt((e.target as HTMLInputElement).value, 10))}
        class="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-orange-500"
      />
    </div>
    <label class="flex items-center gap-2 cursor-pointer mt-4">
      <input
        type="checkbox"
        checked={statTrak}
        onchange={(e) => onStatTrakChange((e.target as HTMLInputElement).checked)}
        class="accent-orange-500"
      />
      <span class="text-sm text-yellow-400 font-medium">StatTrak™</span>
    </label>
  </div>
</div>
