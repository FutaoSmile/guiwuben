<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Item } from '../types';
import { buildCostTrend, formatCost, type TrendGranularity } from '../domain';

const props = defineProps<{
  items: Item[];
  amountVisible: boolean;
}>();

const granularity = ref<TrendGranularity>('daily');
const selectedIndex = ref(29);
const points = computed(() => buildCostTrend(props.items, granularity.value));

watch(granularity, value => {
  selectedIndex.value = value === 'daily' ? 29 : 11;
});

const width = 360;
const plotLeft = 40;
const plotRight = 348;
const plotTop = 14;
const plotBottom = 138;

const maxValue = computed(() => Math.max(1, ...points.value.map(point => point.value)));
const xAt = (index: number) => plotLeft + (index / Math.max(1, points.value.length - 1)) * (plotRight - plotLeft);
const yAt = (value: number) => plotBottom - (value / maxValue.value) * (plotBottom - plotTop);
const linePoints = computed(() => points.value.map((point, index) => `${xAt(index)},${yAt(point.value)}`).join(' '));
const areaPath = computed(() => {
  if (points.value.length === 0) return '';
  const line = points.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index)} ${yAt(point.value)}`).join(' ');
  return `${line} L ${xAt(points.value.length - 1)} ${plotBottom} L ${plotLeft} ${plotBottom} Z`;
});

const selectedPoint = computed(() => points.value[selectedIndex.value] ?? points.value.at(-1));
const labelIndexes = computed(() => granularity.value === 'daily'
  ? [0, 7, 14, 21, 29]
  : [0, 2, 4, 6, 8, 10, 11]
);
const change = computed(() => {
  const first = points.value[0]?.value ?? 0;
  const last = points.value.at(-1)?.value ?? 0;
  if (first === 0) return null;
  return ((last - first) / first) * 100;
});
const trendSummary = computed(() => {
  if (change.value === null) return '当前时间范围暂无可比较的起点数据';
  if (Math.abs(change.value) < 0.05) return '当前成本与区间起点基本持平';
  return `当前成本比区间起点${change.value > 0 ? '上升' : '下降'} ${Math.abs(change.value).toFixed(1)}%`;
});
</script>

<template>
  <section class="trend-card" aria-labelledby="cost-trend-title">
    <div class="trend-card__header">
      <div>
        <h2 id="cost-trend-title">成本趋势</h2>
        <p>{{ granularity === 'daily' ? '最近 30 天的综合日均成本' : '最近 12 个月的平均日均成本' }}</p>
      </div>
      <div class="trend-card__tabs" role="tablist" aria-label="趋势时间粒度">
        <button
          type="button"
          role="tab"
          :aria-selected="granularity === 'daily'"
          :class="{ active: granularity === 'daily' }"
          @click="granularity = 'daily'"
        >每天</button>
        <button
          type="button"
          role="tab"
          :aria-selected="granularity === 'monthly'"
          :class="{ active: granularity === 'monthly' }"
          @click="granularity = 'monthly'"
        >每月</button>
      </div>
    </div>

    <template v-if="amountVisible">
      <div class="trend-card__selected" aria-live="polite">
        <span>{{ selectedPoint?.date }}</span>
        <strong>¥{{ formatCost(selectedPoint?.value ?? 0) }}/天</strong>
      </div>

      <div class="trend-card__chart-wrap">
        <svg
          class="trend-card__chart"
          :viewBox="`0 0 ${width} 176`"
          role="img"
          :aria-label="`${granularity === 'daily' ? '最近30天' : '最近12个月'}成本折线图。${trendSummary}`"
        >
          <defs>
            <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="var(--color-primary)" stop-opacity="0.24" />
              <stop offset="1" stop-color="var(--color-primary)" stop-opacity="0.02" />
            </linearGradient>
          </defs>
          <g aria-hidden="true">
            <line v-for="ratio in [0, 0.5, 1]" :key="ratio" :x1="plotLeft" :x2="plotRight" :y1="plotTop + ratio * (plotBottom - plotTop)" :y2="plotTop + ratio * (plotBottom - plotTop)" class="trend-card__grid" />
            <text x="4" :y="plotTop + 4" class="trend-card__axis">¥{{ formatCost(maxValue) }}</text>
            <text x="4" :y="plotBottom + 4" class="trend-card__axis">¥0</text>
            <path :d="areaPath" fill="url(#trend-area)" />
            <polyline :points="linePoints" class="trend-card__line" />
          </g>

          <g
            v-for="(point, index) in points"
            :key="point.date"
            role="button"
            tabindex="0"
            :aria-label="`${point.date}，日均 ${formatCost(point.value)} 元`"
            @click="selectedIndex = index"
            @focus="selectedIndex = index"
            @keydown.enter.prevent="selectedIndex = index"
            @keydown.space.prevent="selectedIndex = index"
          >
            <circle :cx="xAt(index)" :cy="yAt(point.value)" r="14" fill="transparent" />
            <circle :cx="xAt(index)" :cy="yAt(point.value)" :r="selectedIndex === index ? 4.5 : 2.5" class="trend-card__point" :class="{ selected: selectedIndex === index }" />
          </g>

          <text
            v-for="index in labelIndexes"
            :key="points[index]?.date"
            :x="xAt(index)"
            y="164"
            text-anchor="middle"
            class="trend-card__axis trend-card__axis--x"
            aria-hidden="true"
          >{{ points[index]?.label }}</text>
        </svg>
      </div>

      <p class="trend-card__summary">{{ trendSummary }}</p>

      <details class="trend-card__details">
        <summary>查看数据明细</summary>
        <div class="trend-card__table-wrap">
          <table>
            <thead><tr><th>日期</th><th>日均成本</th></tr></thead>
            <tbody>
              <tr v-for="point in points" :key="point.date">
                <td>{{ point.date }}</td>
                <td>¥{{ formatCost(point.value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </template>

    <div v-else class="trend-card__private">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10 10 0 0 1 12 4c7 0 10 8 10 8a15 15 0 0 1-2 3M6.2 6.2C3.4 8.1 2 12 2 12s3 8 10 8a10 10 0 0 0 4-.8" />
      </svg>
      <span>金额已隐藏，显示金额后查看趋势</span>
    </div>
  </section>
</template>

<style scoped>
.trend-card {
  margin-top: var(--spacing-md);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.trend-card__header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-md); }
.trend-card__header h2 { font-size: var(--font-size-lg); font-weight: 600; }
.trend-card__header p { margin-top: 2px; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.trend-card__tabs { display: flex; padding: 3px; border-radius: var(--radius-md); background: var(--color-surface-secondary); }
.trend-card__tabs button { min-height: 36px; padding: 0 12px; border-radius: 6px; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.trend-card__tabs button.active { color: var(--color-primary); background: var(--color-surface); font-weight: 600; box-shadow: var(--shadow-sm); }
.trend-card__tabs button:focus-visible, .trend-card__details summary:focus-visible { outline: 3px solid var(--color-primary-bg); outline-offset: 2px; }

.trend-card__selected { display: flex; align-items: baseline; justify-content: space-between; margin-top: var(--spacing-lg); }
.trend-card__selected span { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.trend-card__selected strong { color: var(--color-primary); font-size: var(--font-size-xl); font-variant-numeric: tabular-nums; }
.trend-card__chart-wrap { margin: 4px -4px 0; overflow: hidden; }
.trend-card__chart { display: block; width: 100%; height: auto; overflow: visible; }
.trend-card__grid { stroke: var(--color-border); stroke-width: 1; stroke-dasharray: 3 4; }
.trend-card__line { fill: none; stroke: var(--color-primary); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.trend-card__point { fill: var(--color-surface); stroke: var(--color-primary); stroke-width: 2; cursor: pointer; }
.trend-card__point.selected { fill: var(--color-primary); stroke: var(--color-surface); stroke-width: 2.5; }
.trend-card__axis { fill: var(--color-text-tertiary); font-size: 9px; font-variant-numeric: tabular-nums; }
.trend-card__axis--x { font-size: 9px; }
.trend-card__summary { padding: 8px 10px; border-radius: var(--radius-md); background: var(--color-primary-bg); color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.trend-card__details { margin-top: var(--spacing-sm); color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.trend-card__details summary { min-height: 36px; display: flex; align-items: center; cursor: pointer; color: var(--color-primary); }
.trend-card__table-wrap { max-height: 220px; overflow: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.trend-card__details table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.trend-card__details th, .trend-card__details td { padding: 8px 10px; border-bottom: 1px solid var(--color-border); text-align: left; }
.trend-card__details th:last-child, .trend-card__details td:last-child { text-align: right; }
.trend-card__private { min-height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--spacing-sm); color: var(--color-text-tertiary); text-align: center; }

@media (max-width: 359px) {
  .trend-card__header { flex-direction: column; }
  .trend-card__tabs { width: 100%; }
  .trend-card__tabs button { flex: 1; min-height: 44px; }
}

.trend-card {
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(14px);
}
.trend-card__tabs { border-radius: var(--radius-full); }
.trend-card__tabs button { border-radius: var(--radius-full); }
.trend-card__tabs button.active { color: #fff; background: linear-gradient(135deg, #7075ff, #4d46eb); }
.trend-card__line { stroke-width: 3; }
</style>
