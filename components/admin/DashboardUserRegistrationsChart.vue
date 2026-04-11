<template>
  <div class="relative h-[280px] w-full min-h-[240px]">
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup>
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

const props = defineProps({
  labels: { type: Array, default: () => [] },
  values: { type: Array, default: () => [] },
  /** Legend / tooltip dataset label */
  seriesLabel: { type: String, default: 'User đăng ký' },
  /** Line + point color (hex) */
  color: { type: String, default: '#1877f2' }
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
  const rawHex = String(props.color || '#1877f2').replace(/^#/, '')
  const hex = rawHex.length >= 6 ? rawHex.slice(0, 6) : '1877f2'
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const fillRgb = [r, g, b].every(n => Number.isFinite(n) && n >= 0 && n <= 255)
    ? `rgba(${r}, ${g}, ${b}, 0.14)`
    : 'rgba(24, 119, 242, 0.14)'
  const lineColor = props.color || '#1877f2'

  chart = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: props.seriesLabel,
          data: values,
          borderColor: lineColor,
          backgroundColor: fillRgb,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: lineColor
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, minRotation: 0, font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0, font: { size: 11 } }
        }
      }
    }
  })
}

onMounted(render)
watch(
  () => [props.labels, props.values, props.seriesLabel, props.color],
  () => render(),
  { deep: true }
)
onBeforeUnmount(() => {
  chart?.destroy()
  chart = null
})
</script>
