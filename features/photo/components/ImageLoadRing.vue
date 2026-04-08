<template>
    <div class="flex h-full w-full flex-col items-center justify-center bg-zinc-100">
        <div class="relative inline-flex items-center justify-center">
            <svg class="h-14 w-14 -rotate-90 sm:h-16 sm:w-16" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" stroke-width="2" class="text-zinc-200" />
                <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    class="text-[#1877f2] transition-[stroke-dashoffset] duration-150 ease-out"
                    :stroke-dasharray="circumference"
                    :stroke-dashoffset="dashOffset"
                />
            </svg>
            <span class="absolute text-[11px] font-semibold tabular-nums text-[#1877f2] sm:text-xs">{{ displayPct }}%</span>
        </div>
        <span v-if="label" class="mt-1 max-w-[90%] truncate px-1 text-center text-[10px] text-zinc-500 sm:text-[11px]">{{ label }}</span>
    </div>
</template>

<script>
const R = 15;
const C = 2 * Math.PI * R;

export default {
    name: 'ImageLoadRing',
    props: {
        /** 0–100 */
        progress: {
            type: Number,
            default: 0,
        },
        label: {
            type: String,
            default: '',
        },
    },
    computed: {
        circumference() {
            return C;
        },
        clamped() {
            const p = Number(this.progress);
            if (Number.isNaN(p)) {
                return 0;
            }
            return Math.min(100, Math.max(0, p));
        },
        dashOffset() {
            return C * (1 - this.clamped / 100);
        },
        displayPct() {
            return Math.round(this.clamped);
        },
    },
};
</script>
