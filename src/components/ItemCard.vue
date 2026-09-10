<script setup lang="ts">
import type { Item, CostDisplayUnit } from '../types';
import {
  calcItemDays,
  calcItemDailyCost,
  calcItemMonthlyCost,
  resolveRecordType,
  formatCost,
} from '../domain';
import { resolveItemEmoji } from '../utils/itemEmoji';

const props = defineProps<{
  item: Item;
  costDisplayUnit: CostDisplayUnit;
  amountVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'click', item: Item): void;
}>();

function holdingDays(): number {
  return calcItemDays(props.item);
}

function dailyCost(): number {
  return calcItemDailyCost(props.item);
}

function monthlyCost(): number {
  return calcItemMonthlyCost(props.item);
}

function currentCostLabel(): string {
  const value = props.costDisplayUnit === 'day' ? dailyCost() : monthlyCost();
  const unit = props.costDisplayUnit === 'day' ? '天' : '月';
  if (!props.amountVisible) return `¥••••/${unit}`;
  return `¥${formatCost(value)}/${unit}`;
}

function billingLabel(): string {
  switch (props.item.billingType) {
    case 'one_time': return `${resolveRecordType(props.item) === 'expense' ? '固定总额' : '购入'} ¥${formatCost(props.item.billingAmountInCents / 100)}`;
    case 'monthly': return `每月 ¥${formatCost(props.item.billingAmountInCents / 100)}`;
    case 'yearly': return `每年 ¥${formatCost(props.item.billingAmountInCents / 100)}`;
    default: return '';
  }
}

function emojiBackground(): string {
  const backgrounds: Record<string, string> = {
    'cat-digital': 'linear-gradient(145deg, #eef0ff, #e3e2ff)',
    'cat-home': 'linear-gradient(145deg, #e8fbf6, #d8f5eb)',
    'cat-transport': 'linear-gradient(145deg, #fff5e8, #ffead5)',
    'cat-sport': 'linear-gradient(145deg, #fff0f3, #ffe0e7)',
    'cat-fashion': 'linear-gradient(145deg, #fff0f8, #f9e3f2)',
    'cat-subscription': 'linear-gradient(145deg, #f1f0ff, #e5e3ff)',
  };
  return backgrounds[props.item.categoryId] ?? 'linear-gradient(145deg, #f2f4fa, #e9edf6)';
}
</script>

<template>
  <article
    class="item-card"
    role="button"
    tabindex="0"
    :aria-label="item.name"
    @click="emit('click', item)"
    @keydown.enter.prevent="emit('click', item)"
    @keydown.space.prevent="emit('click', item)"
  >
    <!-- User-selected emoji -->
    <div
      class="item-card__thumb"
      :style="{ background: item.cardColor ? item.cardColor + '20' : emojiBackground() }"
      aria-hidden="true"
    >
      {{ resolveItemEmoji(item.iconKey, item.categoryId) }}
    </div>

    <!-- Info -->
    <div class="item-card__info">
      <div class="item-card__top">
        <h3 class="item-card__name">{{ item.name }}</h3>
      </div>

      <p v-if="item.brandModel" class="item-card__subtitle">{{ item.brandModel }}</p>

      <div class="item-card__meta">
        <span class="item-card__billing">{{ billingLabel() }}</span>
        <span class="item-card__cost">{{ currentCostLabel() }}</span>
      </div>
    </div>

    <!-- Holding Days -->
    <div class="item-card__days" :aria-label="resolveRecordType(item) === 'asset' ? '已使用天数' : '费用周期天数'">
      <span class="item-card__days-num">{{ holdingDays() }}</span>
      <span class="item-card__days-unit">{{ resolveRecordType(item) === 'asset' ? '天使用' : '天周期' }}</span>
    </div>
    <svg class="item-card__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  </article>
</template>

<style scoped>
.item-card {
  --card-radius: 22px;
  --card-padding: 16px;
  --card-gap: 14px;
  --card-bg: var(--item-bg, #ffffff);
  --card-text: var(--item-text, #1a1a2e);
  --card-text-secondary: var(--item-text-secondary, #6b7280);
  --card-border: var(--item-border, #f0f0f5);
  --card-accent: var(--item-accent, #6366f1);
  --card-thumb-bg: var(--item-thumb-bg, #f3f4f6);

  display: flex;
  align-items: center;
  gap: var(--card-gap);
  padding: var(--card-padding);
  min-height: 104px;
  margin: 0;
  background: var(--card-bg);
  border-radius: var(--card-radius);
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(14px);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  outline: none;
}

.item-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}

.item-card:active {
  transform: scale(0.985);
}

/* ========= Thumbnail ========= */
.item-card__thumb {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-thumb-bg);
  font-size: 31px;
  line-height: 1;
}

/* ========= Info ========= */
.item-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.item-card__top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-card__name {
  font-size: 18px;
  font-weight: 750;
  color: var(--card-text);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-height: 2.8em;
}

.item-card__subtitle {
  font-size: 13px;
  color: var(--card-text-secondary);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--card-text-secondary);
  line-height: 1.4;
}

.item-card__billing {
  font-weight: 500;
}

.item-card__cost {
  color: var(--card-accent);
  font-weight: 700;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  background: var(--color-primary-bg);
}

/* ========= Holding Days ========= */
.item-card__days {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  min-width: 54px;
  padding: 4px 0;
}

.item-card__days-num {
  font-size: 23px;
  font-weight: 800;
  color: var(--card-text);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.item-card__days-unit {
  font-size: 12px;
  color: var(--card-text-secondary);
  line-height: 1.3;
}

.item-card__arrow {
  flex: 0 0 auto;
  color: var(--color-text-tertiary);
}

/* ========= Responsive ========= */
@media (max-width: 359px) {
  .item-card {
    --card-padding: 12px;
    --card-gap: 10px;
  }

  .item-card__thumb {
    width: 50px;
    height: 50px;
  }

  .item-card__name {
    font-size: 16px;
  }

  .item-card__days-num {
    font-size: 19px;
  }

  .item-card__arrow { display: none; }
}

/* ========= Dark Mode ========= */
@media (prefers-color-scheme: dark) {
  .item-card {
    --card-bg: #1e1e2e;
    --card-text: #e4e4ef;
    --card-text-secondary: #9ca3af;
    --card-border: #2a2a3e;
    --card-accent: #818cf8;
    --card-thumb-bg: #2a2a3e;
  }
}
</style>
