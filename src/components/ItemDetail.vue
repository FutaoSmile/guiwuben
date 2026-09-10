<script setup lang="ts">
import { ref } from 'vue';
import type { Item } from '../types';
import {
  calcHoldingDays,
  calcDailyCost,
  calcMonthlyCost,
  calcTotalInvestment,
  calcWarrantyStatus,
  calcWarrantyEndDate,
  calcPaidPeriods,
  calcNextPaymentDate,
  formatAmount,
  formatCostWithUnit,
} from '../domain';
import { formatDate } from '../utils';

const props = defineProps<{
  item: Item;
}>();

const emit = defineEmits<{
  (e: 'edit', item: Item): void;
  (e: 'delete', item: Item): void;
  (e: 'close'): void;
}>();

const deleteConfirming = ref(false);

// ---------- Computed values ----------

const holdingDays = calcHoldingDays(props.item.startDate, props.item.status, props.item.endDate);

const dailyCost = calcDailyCost(props.item.billingType, props.item.billingAmountInCents, holdingDays);
const monthlyCost = calcMonthlyCost(props.item.billingType, props.item.billingAmountInCents, holdingDays);

const totalInvestment = calcTotalInvestment(props.item);

const warrantyStatus = calcWarrantyStatus(props.item.warrantyType, props.item.warrantyMonths, props.item.purchaseDate);

function warrantyStatusIcon(): string {
  switch (warrantyStatus.status) {
    case 'in_warranty': return '✅';
    case 'expiring_soon': return '⚠️';
    case 'expired': return '❌';
    default: return '—';
  }
}

function warrantyStatusColor(): string {
  switch (warrantyStatus.status) {
    case 'in_warranty': return 'var(--clr-success, #059669)';
    case 'expiring_soon': return 'var(--clr-warning, #d97706)';
    case 'expired': return 'var(--clr-error, #dc2626)';
    default: return 'var(--clr-text-secondary, #6b7280)';
  }
}

const warrantyEndDate = props.item.warrantyType === 'custom' && props.item.warrantyMonths
  ? calcWarrantyEndDate(props.item.purchaseDate, props.item.warrantyMonths)
  : null;

const paidPeriods = (props.item.billingType === 'monthly' || props.item.billingType === 'yearly') && props.item.firstPaymentDate
  ? calcPaidPeriods(props.item.firstPaymentDate, props.item.billingType, props.item.status, props.item.endDate)
  : null;

const nextPaymentDate = props.item.billingType !== 'one_time' && props.item.firstPaymentDate
  ? calcNextPaymentDate(props.item.firstPaymentDate, props.item.billingType)
  : null;

// ---------- Billing type label ----------
function billingTypeLabel(): string {
  switch (props.item.billingType) {
    case 'one_time': return '一次性';
    case 'monthly': return '按月付费';
    case 'yearly': return '按年付费';
  }
}

// ---------- Status label ----------
function statusLabel(): string {
  return props.item.status === 'active' ? '使用中' : '已结束';
}

// ---------- Actions ----------
function handleEdit(): void {
  emit('edit', props.item);
}

function handleDelete(): void {
  emit('delete', props.item);
}

function handleClose(): void {
  emit('close');
}
</script>

<template>
  <div class="detail" role="document" aria-label="物品详情">
    <!-- Header -->
    <header class="detail__header">
      <button
        class="detail__back"
        type="button"
        aria-label="返回"
        @click="handleClose"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h1 class="detail__title">物品详情</h1>
      <div class="detail__header-actions">
        <button
          class="detail__action-btn"
          type="button"
          aria-label="编辑"
          @click="handleEdit"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          class="detail__action-btn detail__action-btn--delete"
          type="button"
          aria-label="删除"
          @click="deleteConfirming = true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="detail__body">
      <!-- Item Name + Brand -->
      <section class="detail__section detail__name-section">
        <h2 class="detail__item-name">{{ item.name }}</h2>
        <p v-if="item.brandModel" class="detail__brand">{{ item.brandModel }}</p>
      </section>

      <!-- Holding Days Hero -->
      <section class="detail__hero" aria-label="持有天数">
        <span class="detail__hero-num">{{ holdingDays }}</span>
        <span class="detail__hero-unit">天</span>
        <span class="detail__hero-label">持有天数</span>
      </section>

      <!-- Cost Overview -->
      <section class="detail__section detail__cost-section" aria-label="成本概览">
        <h3 class="detail__section-title">成本概览</h3>
        <div class="detail__cost-grid">
          <div class="detail__cost-item">
            <span class="detail__cost-label">累计投入</span>
            <span class="detail__cost-value detail__cost-value--primary">
              ¥{{ formatAmount(totalInvestment) }}
            </span>
          </div>
          <div class="detail__cost-item">
            <span class="detail__cost-label">日均成本</span>
            <span class="detail__cost-value">{{ formatCostWithUnit(dailyCost, 'day') }}</span>
          </div>
          <div class="detail__cost-item">
            <span class="detail__cost-label">月均成本</span>
            <span class="detail__cost-value">{{ formatCostWithUnit(monthlyCost, 'month') }}</span>
          </div>
        </div>
      </section>

      <!-- Billing Info -->
      <section class="detail__section" aria-label="计费信息">
        <h3 class="detail__section-title">计费信息</h3>
        <dl class="detail__info-list">
          <div class="detail__info-row">
            <dt class="detail__info-label">计费方式</dt>
            <dd class="detail__info-value">{{ billingTypeLabel() }}</dd>
          </div>
          <div class="detail__info-row">
            <dt class="detail__info-label">计费金额</dt>
            <dd class="detail__info-value">¥{{ formatAmount(item.billingAmountInCents) }}</dd>
          </div>
          <div v-if="paidPeriods !== null" class="detail__info-row">
            <dt class="detail__info-label">已付周期</dt>
            <dd class="detail__info-value">{{ paidPeriods }} 期</dd>
          </div>
          <div v-if="nextPaymentDate" class="detail__info-row">
            <dt class="detail__info-label">下次付款日</dt>
            <dd class="detail__info-value">{{ formatDate(nextPaymentDate) }}</dd>
          </div>
          <div v-if="item.firstPaymentDate" class="detail__info-row">
            <dt class="detail__info-label">首次付款日</dt>
            <dd class="detail__info-value">{{ formatDate(item.firstPaymentDate) }}</dd>
          </div>
        </dl>
      </section>

      <!-- Dates -->
      <section class="detail__section" aria-label="日期信息">
        <h3 class="detail__section-title">日期信息</h3>
        <dl class="detail__info-list">
          <div class="detail__info-row">
            <dt class="detail__info-label">购买日期</dt>
            <dd class="detail__info-value">{{ formatDate(item.purchaseDate) }}</dd>
          </div>
          <div class="detail__info-row">
            <dt class="detail__info-label">开始使用日期</dt>
            <dd class="detail__info-value">{{ formatDate(item.startDate) }}</dd>
          </div>
          <div v-if="item.endDate" class="detail__info-row">
            <dt class="detail__info-label">结束日期</dt>
            <dd class="detail__info-value">{{ formatDate(item.endDate) }}</dd>
          </div>
        </dl>
      </section>

      <!-- Warranty -->
      <section class="detail__section" aria-label="保修信息">
        <h3 class="detail__section-title">保修信息</h3>
        <dl class="detail__info-list">
          <div class="detail__info-row">
            <dt class="detail__info-label">保修情况</dt>
            <dd class="detail__info-value">
              <span :style="{ color: warrantyStatusColor() }">
                {{ warrantyStatusIcon() }} {{ warrantyStatus.label }}
              </span>
            </dd>
          </div>
          <div v-if="item.warrantyMonths" class="detail__info-row">
            <dt class="detail__info-label">保修期限</dt>
            <dd class="detail__info-value">{{ item.warrantyMonths }} 个月</dd>
          </div>
          <div v-if="warrantyEndDate" class="detail__info-row">
            <dt class="detail__info-label">保修截止日</dt>
            <dd class="detail__info-value">{{ formatDate(warrantyEndDate) }}</dd>
          </div>
        </dl>
      </section>

      <!-- Status -->
      <section class="detail__section" aria-label="使用状态">
        <h3 class="detail__section-title">使用状态</h3>
        <dl class="detail__info-list">
          <div class="detail__info-row">
            <dt class="detail__info-label">状态</dt>
            <dd class="detail__info-value">
              <span
                class="detail__status-badge"
                :class="item.status === 'active' ? 'detail__status-badge--active' : 'detail__status-badge--ended'"
              >
                {{ statusLabel() }}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Note -->
      <section v-if="item.note" class="detail__section" aria-label="备注">
        <h3 class="detail__section-title">备注</h3>
        <p class="detail__note">{{ item.note }}</p>
      </section>
    </div>

    <!-- Delete Confirmation Dialog -->
    <Teleport to="body">
      <Transition name="confirm-fade">
        <div
          v-if="deleteConfirming"
          class="detail__confirm-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          @click="deleteConfirming = false"
        >
          <div class="detail__confirm-dialog" @click.stop>
            <div class="detail__confirm-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 id="delete-confirm-title" class="detail__confirm-title">确认删除</h2>
            <p class="detail__confirm-text">
              确定要删除「<strong>{{ item.name }}</strong>」吗？此操作不可恢复。
            </p>
            <div class="detail__confirm-actions">
              <button
                type="button"
                class="detail__confirm-cancel"
                aria-label="取消删除"
                @click="deleteConfirming = false"
              >
                取消
              </button>
              <button
                type="button"
                class="detail__confirm-delete"
                aria-label="确认删除"
                @click="handleDelete"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.detail {
  --detail-bg: var(--detail-bg, #ffffff);
  --detail-text: var(--detail-text, #1a1a2e);
  --detail-text-secondary: var(--detail-text-secondary, #6b7280);
  --detail-border: var(--detail-border, #f0f0f5);
  --detail-accent: var(--detail-accent, #6366f1);
  --detail-section-bg: var(--detail-section-bg, #f9fafb);

  min-height: 100dvh;
  background: var(--detail-bg);
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

/* ========= Header ========= */
.detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  padding-top: calc(8px + env(safe-area-inset-top, 0px));
  border-bottom: 1px solid var(--detail-border);
  position: sticky;
  top: 0;
  background: var(--detail-bg);
  z-index: 10;
}

.detail__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: var(--detail-text);
  cursor: pointer;
  border-radius: 8px;
  -webkit-tap-highlight-color: transparent;
}

.detail__title {
  font-size: 17px;
  font-weight: 600;
  color: var(--detail-text);
  margin: 0;
}

.detail__header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: var(--detail-text-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.detail__action-btn:active {
  background: var(--detail-section-bg);
}

.detail__action-btn--delete:active {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

/* ========= Body ========= */
.detail__body {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 24px;
}

/* ========= Name Section ========= */
.detail__name-section {
  text-align: center;
  padding: 24px 20px 16px;
}

.detail__item-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--detail-text);
  margin: 0;
  line-height: 1.3;
}

.detail__brand {
  font-size: 15px;
  color: var(--detail-text-secondary);
  margin: 6px 0 0;
}

/* ========= Hero ========= */
.detail__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 20px;
  margin: 0 20px 16px;
  background: var(--detail-section-bg);
  border-radius: 16px;
}

.detail__hero-num {
  font-size: 42px;
  font-weight: 800;
  color: var(--detail-accent);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
}

.detail__hero-unit {
  font-size: 16px;
  font-weight: 600;
  color: var(--detail-accent);
  margin-top: 2px;
}

.detail__hero-label {
  font-size: 13px;
  color: var(--detail-text-secondary);
  margin-top: 4px;
}

/* ========= Section ========= */
.detail__section {
  padding: 0 20px;
  margin-bottom: 16px;
}

.detail__section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--detail-text-secondary);
  margin: 0 0 10px;
  padding: 0 4px;
}

/* ========= Cost Grid ========= */
.detail__cost-section {
  margin-bottom: 20px;
}

.detail__cost-grid {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--detail-border);
  border-radius: 14px;
  overflow: hidden;
}

.detail__cost-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--detail-section-bg);
}

.detail__cost-label {
  font-size: 14px;
  color: var(--detail-text-secondary);
}

.detail__cost-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--detail-text);
  font-variant-numeric: tabular-nums;
}

.detail__cost-value--primary {
  font-size: 18px;
  color: var(--detail-accent);
}

/* ========= Info List ========= */
.detail__info-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--detail-border);
  border-radius: 14px;
  overflow: hidden;
}

.detail__info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  background: var(--detail-section-bg);
  min-height: 44px;
}

.detail__info-label {
  font-size: 14px;
  font-weight: 400;
  color: var(--detail-text-secondary);
  margin: 0;
  flex-shrink: 0;
}

.detail__info-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--detail-text);
  margin: 0;
  text-align: right;
  word-break: break-all;
}

/* ========= Status Badge ========= */
.detail__status-badge {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 12px;
}

.detail__status-badge--active {
  color: #059669;
  background: rgba(5, 150, 105, 0.1);
}

.detail__status-badge--ended {
  color: var(--detail-text-secondary);
  background: var(--detail-border);
}

/* ========= Note ========= */
.detail__note {
  font-size: 14px;
  line-height: 1.6;
  color: var(--detail-text);
  margin: 0;
  padding: 14px 16px;
  background: var(--detail-section-bg);
  border-radius: 14px;
  white-space: pre-wrap;
}

/* ========= Delete Confirmation ========= */
.detail__confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.detail__confirm-dialog {
  background: var(--detail-bg);
  border-radius: 20px;
  padding: 28px 24px 20px;
  max-width: 320px;
  width: 100%;
  text-align: center;
}

.detail__confirm-icon {
  color: #ef4444;
  margin-bottom: 12px;
}

.detail__confirm-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--detail-text);
  margin: 0 0 8px;
}

.detail__confirm-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--detail-text-secondary);
  margin: 0 0 24px;
}

.detail__confirm-text strong {
  color: var(--detail-text);
}

.detail__confirm-actions {
  display: flex;
  gap: 12px;
}

.detail__confirm-cancel,
.detail__confirm-delete {
  flex: 1;
  min-height: 48px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.detail__confirm-cancel {
  color: var(--detail-text-secondary);
  background: var(--detail-section-bg);
  border: 1.5px solid var(--detail-border);
}

.detail__confirm-delete {
  color: #ffffff;
  background: #ef4444;
  border: none;
}

.detail__confirm-cancel:active,
.detail__confirm-delete:active {
  opacity: 0.85;
}

/* ========= Transitions ========= */
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

/* ========= Responsive ========= */
@media (max-width: 359px) {
  .detail__hero {
    margin-left: 16px;
    margin-right: 16px;
  }

  .detail__section {
    padding-left: 16px;
    padding-right: 16px;
  }

  .detail__hero-num {
    font-size: 34px;
  }
}

@media (min-width: 420px) {
  .detail__body {
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
  }
}

</style>
