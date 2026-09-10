<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useItemsStore } from '../stores/items';
import { useCategoriesStore } from '../stores/categories';
import { useSettingsStore } from '../stores/settings';
import {
  calcItemDays,
  calcItemDailyCost,
  calcItemMonthlyCost,
  calcTotalInvestment,
  resolveRecordType,
  formatCost,
  formatAmount,
  formatCostWithUnit,
} from '../domain';
import { resolveItemEmoji } from '../utils/itemEmoji';

const route = useRoute();
const router = useRouter();
const itemsStore = useItemsStore();
const categoriesStore = useCategoriesStore();
const settingsStore = useSettingsStore();

const showDeleteConfirm = ref(false);
const item = ref(itemsStore.getItemById(route.params.id as string));

if (!item.value) {
  router.replace('/');
}

const category = computed(() => {
  if (!item.value) return undefined;
  return categoriesStore.activeCategories.find(c => c.id === item.value!.categoryId)
    ?? categoriesStore.categories.find(c => c.id === item.value!.categoryId);
});

const recordType = computed(() => item.value ? resolveRecordType(item.value) : 'asset');
const isExpense = computed(() => recordType.value === 'expense');
const recordTypeLabel = computed(() => {
  if (!item.value || !isExpense.value) return '长期使用的物品';
  if (item.value.billingType === 'one_time') return '固定周期总额';
  return item.value.billingType === 'monthly' ? '月度费用' : '年度费用';
});
const amountLabel = computed(() => {
  if (!item.value || !isExpense.value) return '购入金额';
  if (item.value.billingType === 'one_time') return '周期总金额';
  return item.value.billingType === 'monthly' ? '每月金额' : '每年金额';
});

const holdingDays = computed(() => {
  if (!item.value) return 0;
  return calcItemDays(item.value);
});

const dailyCost = computed(() => {
  if (!item.value) return 0;
  return calcItemDailyCost(item.value);
});

const monthlyCost = computed(() => {
  if (!item.value) return 0;
  return calcItemMonthlyCost(item.value);
});

const totalInvestment = computed(() => {
  if (!item.value) return 0;
  return calcTotalInvestment(item.value);
});

const costDisplay = computed(() => {
  const unit = settingsStore.costDisplayUnit;
  const value = unit === 'day' ? dailyCost.value : monthlyCost.value;
  return formatCostWithUnit(value, unit);
});

function goBack() {
  router.back();
}

function goEdit() {
  router.push({ name: 'item-edit', params: { id: item.value?.id } });
}

async function confirmDelete() {
  if (!item.value) return;
  await itemsStore.deleteItem(item.value.id);
  showDeleteConfirm.value = false;
  router.replace('/');
}

</script>

<template>
  <div v-if="item" class="detail-page">
    <header class="page-header">
      <button class="back-btn" aria-label="返回" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <div class="header-actions">
        <button class="icon-btn" aria-label="编辑" @click="goEdit">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="icon-btn" aria-label="删除" @click="showDeleteConfirm = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="detail-content">
      <!-- Name & Category -->
      <div class="detail-header" :style="item.cardColor ? { borderLeftColor: item.cardColor } : {}">
        <div class="detail-identity">
          <span class="detail-emoji" aria-hidden="true">{{ resolveItemEmoji(item.iconKey, item.categoryId) }}</span>
          <div>
            <h1 class="item-name">{{ item.name }}</h1>
            <span v-if="item.brandModel" class="brand-model">{{ item.brandModel }}</span>
            <div class="category-badge" v-if="category">
              <span :style="{ background: category.color + '20', color: category.color }">{{ category.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Cost overview -->
      <div class="cost-overview">
        <div class="cost-main">
          <span class="cost-label">{{ isExpense ? '周期日均' : '当前日均' }}</span>
          <span class="cost-value" v-if="settingsStore.amountVisible">{{ costDisplay }}</span>
          <span class="cost-value blurred" v-else>¥••••••</span>
        </div>
        <div class="cost-grid">
          <div class="cost-item">
            <span class="cost-item-label">{{ isExpense ? '周期天数' : '已使用天数' }}</span>
            <span class="cost-item-value large">{{ holdingDays }}</span>
            <span class="cost-item-unit">天</span>
          </div>
          <div class="cost-item">
            <span class="cost-item-label">{{ isExpense ? '周期预计支出' : '购入金额' }}</span>
            <span class="cost-item-value" v-if="settingsStore.amountVisible">¥{{ formatAmount(totalInvestment) }}</span>
            <span class="cost-item-value blurred" v-else>¥••••••</span>
          </div>
        </div>
      </div>

      <!-- Detail fields -->
      <div class="detail-fields">
        <div class="field-row">
          <span class="field-label">记录类型</span>
          <span class="field-value">
            {{ recordTypeLabel }}
          </span>
        </div>
        <div class="field-row">
          <span class="field-label">{{ amountLabel }}</span>
          <span class="field-value" v-if="settingsStore.amountVisible">
            ¥{{ formatAmount(item.billingAmountInCents) }}
          </span>
          <span class="field-value blurred" v-else>¥••••••</span>
        </div>
        <div v-if="!isExpense" class="field-row">
          <span class="field-label">购买日期</span>
          <span class="field-value">{{ item.purchaseDate }}</span>
        </div>
        <div class="field-row">
          <span class="field-label">{{ isExpense ? '费用周期' : '使用周期' }}</span>
          <span class="field-value">
            {{ isExpense ? item.startDate : item.purchaseDate }} ~ {{ item.endDate || '至今' }}
          </span>
        </div>

        <div class="field-row">
          <span class="field-label">日均成本</span>
          <span class="field-value" v-if="settingsStore.amountVisible">¥{{ formatCost(dailyCost) }}</span>
          <span class="field-value blurred" v-else>¥••••••</span>
        </div>
        <div class="field-row">
          <span class="field-label">月均成本</span>
          <span class="field-value" v-if="settingsStore.amountVisible">¥{{ formatCost(monthlyCost) }}</span>
          <span class="field-value blurred" v-else>¥••••••</span>
        </div>
        <div class="field-row">
          <span class="field-label">{{ isExpense ? '费用状态' : '使用状态' }}</span>
          <span class="field-value status-badge" :class="item.status === 'active' ? 'status-active' : 'status-ended'">
            {{ isExpense ? (!item.endDate ? '持续中' : (item.status === 'active' ? '进行中' : '已结束')) : (item.status === 'active' ? '使用中' : '已结束') }}
          </span>
        </div>
        <div v-if="item.endDate" class="field-row">
          <span class="field-label">{{ isExpense ? '周期结束日' : '报废或停用日期' }}</span>
          <span class="field-value">{{ item.endDate }}</span>
        </div>

        <div class="field-row">
          <span class="field-label">备注</span>
          <span class="field-value note-text">{{ item.note }}</span>
        </div>

        <div class="field-row timestamp-row">
          <span class="field-label">创建时间</span>
          <span class="field-value timestamp">{{ new Date(item.createdAt).toLocaleString('zh-CN') }}</span>
        </div>
        <div class="field-row timestamp-row">
          <span class="field-label">更新时间</span>
          <span class="field-value timestamp">{{ new Date(item.updatedAt).toLocaleString('zh-CN') }}</span>
        </div>
      </div>
    </div>

    <!-- Delete confirmation -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal-content" role="dialog" aria-label="确认删除">
          <h3>确认删除</h3>
          <p>确定要删除「{{ item.name }}」吗？删除后无法恢复。</p>
          <div class="modal-actions">
            <button class="action-btn secondary" @click="showDeleteConfirm = false">取消</button>
            <button class="action-btn danger" @click="confirmDelete">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.detail-page {
  padding: var(--spacing-lg) var(--spacing-md);
  padding-bottom: calc(var(--bottom-nav-height) + var(--spacing-lg) + var(--safe-area-bottom));
  max-width: var(--content-max-width);
  margin: 0 auto;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xl);
  padding-top: var(--safe-area-top);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
}

.icon-btn:hover {
  background: var(--color-surface-secondary);
}

.detail-header {
  border-left: 4px solid var(--color-primary);
  padding-left: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.detail-identity {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.detail-emoji {
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg);
  background: var(--color-surface-secondary);
  font-size: 30px;
  line-height: 1;
}

.item-name {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.brand-model {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: var(--spacing-sm);
}

.category-badge span {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.cost-overview {
  background: linear-gradient(135deg, var(--color-primary-bg), var(--color-surface));
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.cost-main {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.cost-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: var(--spacing-xs);
}

.cost-value {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--color-primary);
}

.cost-value.blurred {
  letter-spacing: 4px;
}

.cost-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.cost-item {
  text-align: center;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.cost-item-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  display: block;
  margin-bottom: var(--spacing-xs);
}

.cost-item-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.cost-item-value.large {
  font-size: var(--font-size-number);
}

.cost-item-value.blurred {
  letter-spacing: 4px;
  filter: blur(4px);
}

.cost-item-unit {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-left: 2px;
}

.detail-fields {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.field-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.field-row:last-child {
  border-bottom: none;
}

.field-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  min-width: 80px;
}

.field-value {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  text-align: right;
  word-break: break-all;
}

.field-value.blurred {
  filter: blur(4px);
}

.note-text {
  white-space: pre-wrap;
  line-height: 1.6;
}

.timestamp {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.timestamp-row {
  background: var(--color-surface-secondary);
}

.status-badge {
  padding: 2px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.status-active {
  background: #d1fae5;
  color: #065f46;
}

.status-ended {
  background: #f3f4f6;
  color: #6b7280;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  max-width: 320px;
  width: 100%;
}

.modal-content h3 {
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-md);
}

.modal-content p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.action-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  min-height: 44px;
}

.action-btn.secondary {
  background: var(--color-surface-secondary);
  color: var(--color-text-primary);
}

.action-btn.danger {
  background: var(--color-danger);
  color: white;
}

.detail-page { padding: calc(20px + var(--safe-area-top)) 16px 40px; min-height: 100dvh; }
.page-header { padding: 0 4px; margin-bottom: 20px; }
.detail-header,
.cost-overview,
.detail-fields {
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(14px);
}
.detail-header { padding: 20px; border-left: 4px solid var(--color-primary); }
.item-name { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
.cost-overview { background: linear-gradient(145deg, rgba(245, 244, 255, 0.96), rgba(255, 255, 255, 0.86)); }
</style>
