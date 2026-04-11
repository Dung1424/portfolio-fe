<template>
  <div class="relative mx-auto h-[280px] w-full max-w-[320px] min-h-[240px]">
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup>
import {
  Chart,
  PieController,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

Chart.register(PieController, ArcElement, Tooltip, Legend)

const props = defineProps({
  labels: { type: Array, default: () => [] },
  values: { type: Array, default: () => [] }
})

const canvasRef = ref(null)
let chart = null

function render() {
  if (!canvasRef.value) {
    return
  }
  chart?.destroy()
  const labels = Array.isArray(props.labels) ? props.labels.map(String) : []
  const values = Array.isArray(props.values)
    ? props.values.map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0))
    : []

  const colors = [
    'rgba(245, 158, 11, 0.85)',
    'rgba(34, 197, 94, 0.85)',
    'rgba(239, 68, 68, 0.85)'
  ]
  const borderColors = ['#d97706', '#16a34a', '#dc2626']
  const backgroundColor = labels.map((_, i) => colors[i % colors.length])
  const borderColor = labels.map((_, i) => borderColors[i % borderColors.length])

  chart = new Chart(canvasRef.value, {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor,
          borderColor,
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11 }, padding: 12 }
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.raw ?? 0
              const total = (ctx.dataset.data || []).reduce((a, b) => a + Number(b || 0), 0)
              const pct = total > 0 ? ((Number(v) / total) * 100).toFixed(1) : '0'
              return `${ctx.label}: ${v} (${pct}%)`
            }
          }
        }
      }
    }
  })
}

onMounted(render)
watch(
  () => [props.labels, props.values],
  () => render(),
  { deep: true }
)
onBeforeUnmount(() => {
  chart?.destroy()
  chart = null
})
</script>
