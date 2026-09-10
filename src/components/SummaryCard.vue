<script setup lang="ts">
import type { CostDisplayUnit } from '../types';
import { formatAmount } from '../domain';

const props = defineProps<{
  itemCount: number;
  totalInvestment: number;
  totalDailyCost: number;
  totalMonthlyCost: number;
  amountVisible: boolean;
  costDisplayUnit: CostDisplayUnit;
}>();

const emit = defineEmits<{
  (e: 'toggle-visibility'): void;
  (e: 'toggle-unit'): void;
  (e: 'add-first-item'): void;
}>();

function costLabel(): string {
  const value = props.costDisplayUnit === 'day'
    ? props.totalDailyCost
    : props.totalMonthlyCost;
  const unit = props.costDisplayUnit === 'day' ? '天' : '月';
  if (!props.amountVisible) return `¥••••••/${unit}`;
  return `¥${value.toFixed(2)}/${unit}`;
}

function investmentLabel(): string {
  if (!props.amountVisible) return '¥••••••';
  return `¥${formatAmount(props.totalInvestment)}`;
}
</script>

<template>
  <section
    class="summary-card"
    role="region"
    aria-label="消费概览"
  >
    <!-- Empty State -->
    <template v-if="itemCount === 0">
      <div class="summary-card__empty">
        <div class="summary-card__empty-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="14" width="32" height="24" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="24" cy="26" r="4" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M16 14V10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="summary-card__empty-text">还没有记录，从一件物品或一笔周期费用开始吧</p>
        <button
          class="summary-card__add-btn"
          type="button"
          aria-label="添加第一条记录"
          @click="emit('add-first-item')"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          添加第一条记录
        </button>
      </div>
    </template>

    <!-- Normal State -->
    <template v-else>
      <div class="summary-card__header">
        <div class="summary-card__identity">
          <span class="summary-card__brand-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
              <path d="M16 14h.01" />
            </svg>
          </span>
          <div>
            <h2 class="summary-card__count">
              共 <span class="summary-card__count-num">{{ itemCount }}</span> 条记录
            </h2>
            <p class="summary-card__hint">管理你的物品与日常费用</p>
          </div>
        </div>
        <div class="summary-card__actions">
          <button
            class="summary-card__action-btn"
            type="button"
            :aria-label="amountVisible ? '隐藏金额' : '显示金额'"
            @click="emit('toggle-visibility')"
          >
            <svg v-if="amountVisible" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" fill="none"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button
            class="summary-card__action-btn summary-card__unit-btn"
            type="button"
            aria-label="切换成本单位"
            @click="emit('toggle-unit')"
          >
            <span :class="{ 'summary-card__unit-active': costDisplayUnit === 'day' }">天</span>
            <span :class="{ 'summary-card__unit-active': costDisplayUnit === 'month' }">月</span>
          </button>
        </div>
      </div>

      <div class="summary-card__stats">
        <div class="summary-card__stat">
          <span class="summary-card__stat-icon summary-card__stat-icon--bars" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M5 20v-6M12 20V9M19 20V4" />
            </svg>
          </span>
          <span class="summary-card__stat-copy">
            <span class="summary-card__stat-label">累计投入</span>
            <span class="summary-card__stat-value summary-card__stat-value--investment">{{ investmentLabel() }}</span>
          </span>
        </div>
        <div class="summary-card__divider" aria-hidden="true"></div>
        <div class="summary-card__stat">
          <span class="summary-card__stat-icon summary-card__stat-icon--trend" aria-hidden="true">
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 17 5-5 4 4 8-9" />
            </svg>
          </span>
          <span class="summary-card__stat-copy">
            <span class="summary-card__stat-label">当前成本</span>
            <span class="summary-card__stat-value summary-card__stat-value--cost">{{ costLabel() }}</span>
          </span>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.summary-card {
  --card-radius: 24px;
  --card-padding: 22px;
  --card-bg: var(--summary-bg, #ffffff);
  --card-text: var(--summary-text, #1a1a2e);
  --card-text-secondary: var(--summary-text-secondary, #6b7280);
  --card-accent: var(--summary-accent, #6366f1);
  --card-border: var(--summary-border, #e5e7eb);

  background: var(--card-bg);
  border-radius: var(--card-radius);
  padding: var(--card-padding);
  margin: 0;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

/* ========= Empty State ========= */
.summary-card__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0 8px;
}

.summary-card__empty-icon {
  color: var(--card-text-secondary);
  opacity: 0.5;
}

.summary-card__empty-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--card-text-secondary);
  text-align: center;
  margin: 0;
}

.summary-card__add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 20px;
  font-size: 15px;
  font-weight: 500;
  color: #ffffff;
  background: var(--card-accent);
  border: none;
  border-radius: 22px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.summary-card__add-btn:active {
  opacity: 0.85;
  transform: scale(0.97);
}

/* ========= Normal State ========= */
.summary-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.summary-card__identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-card__brand-icon {
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  color: var(--card-accent);
  border-radius: 17px;
  background: linear-gradient(145deg, #f6f5ff, #dedfff);
}

.summary-card__count {
  font-size: 17px;
  font-weight: 650;
  color: var(--card-text);
  margin: 0;
}

.summary-card__count-num {
  font-size: 27px;
  font-weight: 800;
  color: var(--card-accent);
  margin: 0 2px;
}

.summary-card__hint {
  margin-top: 2px;
  color: var(--card-text-secondary);
  font-size: 12px;
}

.summary-card__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-card__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0 8px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--card-text-secondary);
  cursor: pointer;
  font-size: 14px;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.2s;
}

.summary-card__action-btn:active {
  background: rgba(0, 0, 0, 0.05);
}

.summary-card__unit-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  font-weight: 500;
  min-width: 84px;
  padding: 4px;
  border-radius: var(--radius-full);
  background: #f1f3fa;
}

.summary-card__unit-btn span {
  min-width: 36px;
  padding: 7px 8px;
  border-radius: var(--radius-full);
  color: var(--card-text-secondary);
}

.summary-card__unit-btn .summary-card__unit-active {
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, #6f74ff, #4d46eb);
  box-shadow: 0 5px 12px rgba(79, 70, 229, 0.28);
}

.summary-card__stats {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.summary-card__stat {
  flex: 1;
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 10px;
}

.summary-card__stat-icon {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.summary-card__stat-icon--bars {
  color: #3478f6;
  background: #edf4ff;
}

.summary-card__stat-icon--trend {
  color: var(--card-accent);
  background: #f1efff;
}

.summary-card__stat-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.summary-card__stat-label {
  font-size: 13px;
  color: var(--card-text-secondary);
  line-height: 1.4;
}

.summary-card__stat-value {
  font-size: clamp(17px, 4.5vw, 22px);
  font-weight: 800;
  color: var(--card-text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
  overflow-wrap: anywhere;
}

.summary-card__stat-value--investment {
  color: var(--card-text);
}

.summary-card__stat-value--cost {
  color: var(--card-accent);
}

.summary-card__divider {
  width: 1px;
  background: var(--card-border);
  margin: 2px 2px;
  flex-shrink: 0;
}

/* ========= Responsive ========= */
@media (max-width: 359px) {
  .summary-card {
    --card-padding: 14px;
  }

  .summary-card__stat-value {
    font-size: 16px;
  }

  .summary-card__count-num {
    font-size: 18px;
  }
}

@media (min-width: 420px) {
  .summary-card__stat-value {
    font-size: 20px;
  }
}

@media (max-width: 400px) {
  .summary-card__brand-icon { width: 46px; height: 46px; flex-basis: 46px; }
  .summary-card__hint { display: none; }
  .summary-card__action-btn { min-width: 40px; padding: 0 5px; }
  .summary-card__unit-btn { min-width: 76px; }
  .summary-card__unit-btn span { min-width: 32px; padding: 7px 6px; }
  .summary-card__stat-icon { display: none; }
}

</style>
