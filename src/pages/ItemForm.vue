<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useItemsStore } from '../stores/items';
import { useCategoriesStore } from '../stores/categories';
import type { BillingType, ItemStatus, RecordType } from '../types';
import { isValidDate, isNotFutureDate } from '../utils';
import { calcItemDailyCost, calcPeriodDays, formatCost, resolveRecordType, today } from '../domain';
import { ITEM_EMOJIS, getDefaultItemEmoji, isItemEmoji } from '../utils/itemEmoji';

const route = useRoute();
const router = useRouter();
const itemsStore = useItemsStore();
const categoriesStore = useCategoriesStore();

const isEditing = ref(false);
const submitting = ref(false);
const hasUnsavedChanges = ref(false);

// Form data
const name = ref('');
const brandModel = ref('');
const recordType = ref<RecordType>('asset');
const billingType = ref<BillingType>('one_time');
const billingAmountYuan = ref<number | null>(null);
const purchaseDate = ref(today());
const startDate = ref(today());
const categoryId = ref('cat-other');
const status = ref<ItemStatus>('active');
const endDate = ref('');
const note = ref('');
const cardColor = ref('');
const iconKey = ref('');
const showEmojiPicker = ref(false);
const emojiTrigger = ref<HTMLButtonElement | null>(null);
const emojiCloseButton = ref<HTMLButtonElement | null>(null);

// Validation errors
interface FieldErrors {
  name?: string;
  billingAmountYuan?: string;
  purchaseDate?: string;
  startDate?: string;
  endDate?: string;
}

const errors = ref<FieldErrors>({});

const isExpense = computed(() => recordType.value === 'expense');
const periodDays = computed(() => {
  if (!isExpense.value || !isValidDate(startDate.value) || !isValidDate(endDate.value) || endDate.value < startDate.value) return 0;
  return calcPeriodDays(startDate.value, endDate.value);
});
const previewDailyCost = computed(() => {
  if (billingAmountYuan.value === null || billingAmountYuan.value < 0) return null;
  if (isExpense.value && periodDays.value === 0) return null;
  return calcItemDailyCost({
    recordType: recordType.value,
    billingType: billingType.value,
    billingAmountInCents: Math.round(billingAmountYuan.value * 100),
    purchaseDate: purchaseDate.value,
    startDate: isExpense.value ? startDate.value : purchaseDate.value,
    status: isExpense.value ? 'ended' : status.value,
    endDate: endDate.value || undefined,
  });
});

// Load existing item if editing
onMounted(async () => {
  await categoriesStore.loadActiveCategories();

  const itemId = route.params.id as string;
  if (itemId) {
    const existing = itemsStore.getItemById(itemId);
    if (existing) {
      isEditing.value = true;
      name.value = existing.name;
      brandModel.value = existing.brandModel || '';
      recordType.value = resolveRecordType(existing);
      billingType.value = existing.billingType;
      billingAmountYuan.value = existing.billingAmountInCents / 100;
      purchaseDate.value = existing.purchaseDate;
      startDate.value = existing.startDate;
      categoryId.value = existing.categoryId;
      status.value = existing.status;
      endDate.value = existing.endDate || '';
      note.value = existing.note || '';
      cardColor.value = existing.cardColor || '';
      iconKey.value = isItemEmoji(existing.iconKey) ? existing.iconKey! : '';
    } else {
      router.replace('/');
    }
  }
});

// Watch for changes (unsaved warning)
watch([name, brandModel, billingAmountYuan, iconKey], () => {
  hasUnsavedChanges.value = true;
});

function validate(): boolean {
  const newErrors: FieldErrors = {};

  // Name
  const trimmedName = name.value.trim();
  if (!trimmedName) {
    newErrors.name = `请输入${isExpense.value ? '费用' : '物品'}名称`;
  } else if (trimmedName.length > 40) {
    newErrors.name = '名称不超过 40 字';
  }

  // Amount
  if (billingAmountYuan.value === null || billingAmountYuan.value < 0) {
    newErrors.billingAmountYuan = '请输入有效金额';
  } else if (billingAmountYuan.value > 99999999.99) {
    newErrors.billingAmountYuan = '金额不能超过 99,999,999.99';
  } else {
    const parts = billingAmountYuan.value.toString().split('.');
    if (parts.length === 2 && parts[1].length > 2) {
      newErrors.billingAmountYuan = '金额最多 2 位小数';
    }
  }

  if (isExpense.value) {
    if (!startDate.value || !isValidDate(startDate.value)) newErrors.startDate = '请选择周期开始日';
    if (!endDate.value || !isValidDate(endDate.value)) {
      newErrors.endDate = '请选择周期结束日';
    } else if (startDate.value && endDate.value < startDate.value) {
      newErrors.endDate = '周期结束日不得早于开始日';
    }
  } else {
    if (!purchaseDate.value || !isValidDate(purchaseDate.value)) {
      newErrors.purchaseDate = '请选择购买日期';
    } else if (!isNotFutureDate(purchaseDate.value)) {
      newErrors.purchaseDate = '购买日期不得晚于今天';
    }
    if (status.value === 'ended' && !endDate.value) {
      newErrors.endDate = '请选择报废或停用日期';
    } else if (endDate.value && endDate.value < purchaseDate.value) {
      newErrors.endDate = '报废日期不得早于购买日期';
    }
  }

  errors.value = newErrors;
  return Object.keys(newErrors).length === 0;
}

async function handleSubmit() {
  if (submitting.value) return;
  if (!validate()) return;

  submitting.value = true;
  try {
    const amountInCents = Math.round((billingAmountYuan.value || 0) * 100);

    const itemData = {
      name: name.value.trim(),
      brandModel: !isExpense.value ? brandModel.value.trim() || undefined : undefined,
      recordType: recordType.value,
      billingType: isExpense.value ? billingType.value : 'one_time' as BillingType,
      billingAmountInCents: amountInCents,
      purchaseDate: isExpense.value ? startDate.value : purchaseDate.value,
      startDate: isExpense.value ? startDate.value : purchaseDate.value,
      firstPaymentDate: undefined,
      categoryId: categoryId.value,
      warrantyType: 'unset' as const,
      status: isExpense.value ? (endDate.value < today() ? 'ended' : 'active') as ItemStatus : status.value,
      endDate: endDate.value || undefined,
      note: note.value.trim() || undefined,
      cardColor: cardColor.value || undefined,
      iconKey: iconKey.value || getDefaultItemEmoji(categoryId.value),
    };

    if (isEditing.value) {
      const itemId = route.params.id as string;
      await itemsStore.updateItem(itemId, itemData);
    } else {
      await itemsStore.addItem(itemData);
    }

    hasUnsavedChanges.value = false;
    router.push('/');
  } finally {
    submitting.value = false;
  }
}

function selectRecordType(type: RecordType) {
  recordType.value = type;
  errors.value = {};
  if (type === 'asset') {
    billingType.value = 'one_time';
    startDate.value = purchaseDate.value;
    if (status.value === 'active') endDate.value = '';
  } else {
    billingType.value = billingType.value === 'one_time' ? 'monthly' : billingType.value;
    startDate.value = purchaseDate.value;
    status.value = 'active';
  }
}

function goBack() {
  if (hasUnsavedChanges.value) {
    if (!confirm('有未保存的内容，确定要放弃吗？')) return;
  }
  router.back();
}

function getNumberInput(event: Event): number | null {
  const val = (event.target as HTMLInputElement).value;
  return val === '' ? null : parseFloat(val);
}

async function openEmojiPicker() {
  showEmojiPicker.value = true;
  await nextTick();
  emojiCloseButton.value?.focus();
}

async function closeEmojiPicker() {
  showEmojiPicker.value = false;
  await nextTick();
  emojiTrigger.value?.focus();
}

function selectEmoji(emoji: string) {
  iconKey.value = emoji;
  closeEmojiPicker();
}
</script>

<template>
  <div class="form-page">
    <header class="page-header">
      <button class="back-btn" aria-label="返回" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1 class="page-title">{{ isEditing ? '编辑记录' : '新增记录' }}</h1>
    </header>

    <form class="item-form" @submit.prevent="handleSubmit">
      <section class="form-section">
        <h2 class="section-title">记录什么</h2>
        <div class="record-type-grid" role="radiogroup" aria-label="记录类型">
          <button
            type="button"
            class="record-type-card"
            :class="{ active: recordType === 'asset' }"
            :aria-checked="recordType === 'asset'"
            role="radio"
            @click="selectRecordType('asset')"
          >
            <strong>长期使用的物品</strong>
            <span>电动车、手机、家具等</span>
            <small>购入价 ÷ 从购买日至今天或报废日</small>
          </button>
          <button
            type="button"
            class="record-type-card"
            :class="{ active: recordType === 'expense' }"
            :aria-checked="recordType === 'expense'"
            role="radio"
            @click="selectRecordType('expense')"
          >
            <strong>固定周期的费用</strong>
            <span>话费、房租、保养等</span>
            <small>本周期金额 ÷ 周期实际天数</small>
          </button>
        </div>
      </section>

      <!-- Basic Info -->
      <section class="form-section">
        <h2 class="section-title">基础信息</h2>

        <div class="form-group">
          <label class="form-label" for="item-name">
            {{ isExpense ? '费用名称' : '物品名称' }} <span class="required">*</span>
          </label>
          <input
            id="item-name"
            v-model="name"
            type="text"
            class="form-input"
            :placeholder="isExpense ? '例如：9 月房租' : '例如：通勤电动车'"
            maxlength="40"
            :aria-invalid="!!errors.name"
            :aria-describedby="errors.name ? 'name-error' : undefined"
          />
          <p v-if="errors.name" id="name-error" class="field-error">{{ errors.name }}</p>
        </div>

        <div v-if="!isExpense" class="form-group">
          <label class="form-label" for="item-brand">品牌/型号</label>
          <input
            id="item-brand"
            v-model="brandModel"
            type="text"
            class="form-input"
            placeholder="可选"
            maxlength="60"
          />
        </div>
      </section>

      <section class="form-section">
        <h2 class="section-title">记录 Emoji</h2>
        <div class="form-group">
          <button
            ref="emojiTrigger"
            type="button"
            class="emoji-trigger"
            aria-haspopup="dialog"
            @click="openEmojiPicker"
          >
            <span class="emoji-preview" aria-hidden="true">{{ iconKey || getDefaultItemEmoji(categoryId) }}</span>
            <span class="emoji-trigger__text">
              <strong>{{ iconKey ? '已选择记录 Emoji' : '使用分类默认 Emoji' }}</strong>
              <small>点击更换</small>
            </span>
            <svg class="emoji-trigger__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </section>

      <!-- Cost model -->
      <section class="form-section">
        <h2 class="section-title">{{ isExpense ? '费用周期' : '购入与使用' }}</h2>

        <div v-if="isExpense" class="form-group">
          <label class="form-label">
            周期类型 <span class="required">*</span>
          </label>
          <div class="option-group">
            <button
              type="button"
              class="option-btn"
              :class="{ active: billingType === 'monthly' }"
              @click="billingType = 'monthly'"
            >月度费用</button>
            <button
              type="button"
              class="option-btn"
              :class="{ active: billingType === 'yearly' }"
              @click="billingType = 'yearly'"
            >年度费用</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="item-amount">
            {{ isExpense ? '本周期总金额' : '购入金额' }}（元） <span class="required">*</span>
          </label>
          <div class="amount-input-wrapper">
            <span class="amount-prefix">¥</span>
            <input
              id="item-amount"
              :value="billingAmountYuan"
              @input="billingAmountYuan = getNumberInput($event)"
              type="number"
              step="0.01"
              min="0"
              max="99999999.99"
              class="form-input amount-input"
              placeholder="0.00"
              :aria-invalid="!!errors.billingAmountYuan"
            />
          </div>
          <p class="field-help">{{ isExpense ? '填写这一段开始至结束日期内的总费用' : '日均成本会随着使用天数增加而下降' }}</p>
          <p v-if="errors.billingAmountYuan" class="field-error">{{ errors.billingAmountYuan }}</p>
        </div>

        <template v-if="!isExpense">
          <div class="form-group">
            <label class="form-label" for="item-purchase-date">
              购买日期 <span class="required">*</span>
            </label>
            <input
              id="item-purchase-date"
              v-model="purchaseDate"
              type="date"
              class="form-input"
              :max="today()"
            />
            <p class="field-help">未设置报废日期时，使用天数会自动计算到今天</p>
            <p v-if="errors.purchaseDate" class="field-error">{{ errors.purchaseDate }}</p>
          </div>
        </template>

        <template v-else>
          <div class="form-row">
            <div class="form-group half">
              <label class="form-label" for="item-start-date">周期开始日 <span class="required">*</span></label>
              <input id="item-start-date" v-model="startDate" type="date" class="form-input" />
              <p v-if="errors.startDate" class="field-error">{{ errors.startDate }}</p>
            </div>
            <div class="form-group half">
              <label class="form-label" for="item-end-date">周期结束日 <span class="required">*</span></label>
              <input id="item-end-date" v-model="endDate" type="date" class="form-input" :min="startDate" />
              <p v-if="errors.endDate" class="field-error">{{ errors.endDate }}</p>
            </div>
          </div>
          <div v-if="previewDailyCost !== null" class="cost-preview" aria-live="polite">
            <span>系统将按 {{ periodDays }} 个自然日计算</span>
            <strong>日均 ¥{{ formatCost(previewDailyCost) }}</strong>
            <small>包含开始日与结束日，保存后数值固定</small>
          </div>
        </template>
      </section>

      <!-- Category -->
      <section class="form-section">
        <h2 class="section-title">分类</h2>
        <div class="form-group">
          <label class="form-label">分类 <span class="required">*</span></label>
          <div class="category-grid">
            <button
              v-for="cat in categoriesStore.activeCategories"
              :key="cat.id"
              type="button"
              class="category-btn"
              :class="{ active: categoryId === cat.id }"
              :style="categoryId === cat.id ? { borderColor: cat.color, background: cat.color + '15' } : {}"
              @click="categoryId = cat.id"
            >
              <span class="cat-dot" :style="{ background: cat.color }" />
              {{ cat.name }}
            </button>
          </div>
        </div>
      </section>

      <!-- Asset status -->
      <section v-if="!isExpense" class="form-section">
        <h2 class="section-title">使用状态</h2>
        <div class="form-group">
          <label class="form-label">状态 <span class="required">*</span></label>
          <div class="option-group">
            <button
              type="button"
              class="option-btn"
              :class="{ active: status === 'active' }"
              @click="status = 'active'; endDate = ''"
            >使用中</button>
            <button
              type="button"
              class="option-btn"
              :class="{ active: status === 'ended' }"
              @click="status = 'ended'"
            >已结束</button>
          </div>
        </div>

        <div v-if="status === 'ended'" class="form-group">
          <label class="form-label" for="item-end-date">
            报废或停用日期 <span class="required">*</span>
          </label>
          <input
            id="item-end-date"
            v-model="endDate"
            type="date"
            class="form-input"
            :min="purchaseDate"
            :max="today()"
          />
          <p v-if="errors.endDate" class="field-error">{{ errors.endDate }}</p>
        </div>
      </section>

      <!-- Notes -->
      <section class="form-section">
        <h2 class="section-title">备注</h2>
        <div class="form-group">
          <label class="form-label" for="item-note">备注</label>
          <textarea
            id="item-note"
            v-model="note"
            class="form-textarea"
            placeholder="可选备注信息"
            maxlength="500"
            rows="3"
          />
          <span class="char-count">{{ note.length }}/500</span>
        </div>
      </section>

      <!-- Submit -->
      <div class="form-actions">
        <button
          type="submit"
          class="submit-btn"
          :disabled="submitting"
          :aria-label="submitting ? '保存中...' : '保存'"
        >
          {{ submitting ? '保存中...' : (isEditing ? '保存修改' : '添加记录') }}
        </button>
      </div>
    </form>

    <Teleport to="body">
      <div
        v-if="showEmojiPicker"
        class="emoji-modal-overlay"
        @click.self="closeEmojiPicker"
        @keydown.esc.prevent="closeEmojiPicker"
      >
        <div
          class="emoji-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emoji-modal-title"
        >
          <div class="emoji-modal__header">
            <div>
              <h2 id="emoji-modal-title">选择记录 Emoji</h2>
              <p>选一个容易辨认的标记</p>
            </div>
            <button ref="emojiCloseButton" type="button" class="emoji-modal__close" aria-label="关闭 Emoji 选择" @click="closeEmojiPicker">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="emoji-grid" role="radiogroup" aria-label="记录 Emoji">
            <button
              v-for="emoji in ITEM_EMOJIS"
              :key="emoji"
              type="button"
              class="emoji-btn"
              :class="{ active: (iconKey || getDefaultItemEmoji(categoryId)) === emoji }"
              role="radio"
              :aria-label="`选择 ${emoji}`"
              :aria-checked="(iconKey || getDefaultItemEmoji(categoryId)) === emoji"
              @click="selectEmoji(emoji)"
            >
              <span aria-hidden="true">{{ emoji }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.form-page {
  padding: var(--spacing-lg) var(--spacing-md);
  padding-bottom: calc(var(--spacing-2xl) + var(--safe-area-bottom));
  max-width: var(--content-max-width);
  margin: 0 auto;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
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

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.form-section {
  margin-bottom: var(--spacing-2xl);
}

.record-type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}

.record-type-card {
  min-height: 132px;
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  text-align: left;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
}

.record-type-card strong { font-size: var(--font-size-md); }
.record-type-card span { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.record-type-card small { margin-top: auto; line-height: 1.4; color: var(--color-text-tertiary); }
.record-type-card.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
  box-shadow: 0 0 0 2px var(--color-primary-bg);
}

.record-type-card:focus-visible,
.option-btn:focus-visible,
.category-btn:focus-visible,
.emoji-trigger:focus-visible,
.emoji-btn:focus-visible,
.emoji-modal__close:focus-visible,
.submit-btn:focus-visible {
  outline: 3px solid var(--color-primary-bg);
  outline-offset: 2px;
}

.section-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-md);
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.required {
  color: var(--color-danger);
}

.form-input {
  width: 100%;
  padding: var(--spacing-md);
  font-size: var(--font-size-md);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 0.2s;
  min-height: 44px;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.form-input[aria-invalid="true"] {
  border-color: var(--color-danger);
}

.form-textarea {
  width: 100%;
  padding: var(--spacing-md);
  font-size: var(--font-size-md);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.form-textarea:focus {
  border-color: var(--color-primary);
}

.char-count {
  display: block;
  text-align: right;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-xs);
}

.field-error {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin-top: var(--spacing-xs);
}

.field-help {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
  line-height: 1.5;
  color: var(--color-text-tertiary);
}

.cost-preview {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-primary-bg);
  display: grid;
  gap: 4px;
  color: var(--color-text-secondary);
}

.cost-preview strong {
  font-size: var(--font-size-xl);
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.cost-preview small { color: var(--color-text-tertiary); }

.quick-date-ops {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.quick-date-btn {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-secondary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s;
  min-height: 28px;
  line-height: 1;
  white-space: nowrap;
}

.quick-date-btn:active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.amount-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0;
}

.amount-prefix {
  padding: var(--spacing-md) var(--spacing-sm) var(--spacing-md) var(--spacing-md);
  background: var(--color-surface-secondary);
  border: 1.5px solid var(--color-border);
  border-right: none;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  min-height: 44px;
  display: flex;
  align-items: center;
}

.amount-input {
  border-radius: 0;
  flex: 1;
}

.amount-input:last-child {
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.amount-suffix {
  padding: var(--spacing-md);
  background: var(--color-surface-secondary);
  border: 1.5px solid var(--color-border);
  border-left: none;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-height: 44px;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
}

.form-group.half {
  flex: 1;
}

/* Option buttons */
.option-group {
  display: flex;
  gap: var(--spacing-sm);
}

.option-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
  transition: all 0.2s;
  min-height: 44px;
}

.option-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 500;
}

/* Category grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: var(--spacing-sm);
}

.category-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  transition: all 0.2s;
  min-height: 44px;
  justify-content: center;
}

.category-btn.active {
  border-color: var(--color-primary);
  font-weight: 500;
}

.cat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.emoji-trigger {
  width: 100%;
  min-height: 68px;
  display: flex;
  align-items: center;
  text-align: left;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
}

.emoji-preview {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--color-primary-bg);
  font-size: 26px;
  line-height: 1;
}

.emoji-trigger__text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.emoji-trigger__text strong {
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.emoji-trigger__text small {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.emoji-trigger__arrow {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.emoji-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: var(--spacing-md);
  padding-bottom: calc(var(--spacing-md) + var(--safe-area-bottom));
  background: rgba(15, 23, 42, 0.5);
}

.emoji-modal {
  width: min(100%, 480px);
  max-height: min(70vh, 520px);
  overflow-y: auto;
  padding: var(--spacing-lg);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.24);
}

.emoji-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.emoji-modal__header h2 {
  margin: 0 0 2px;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.emoji-modal__header p {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.emoji-modal__close {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  margin: -8px -8px 0 0;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.emoji-modal__close:active {
  background: var(--color-surface-secondary);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(44px, 1fr));
  gap: var(--spacing-sm);
}

.emoji-btn {
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 23px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.emoji-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
  box-shadow: inset 0 0 0 1px var(--color-primary);
}

.emoji-btn:active {
  background: var(--color-surface-secondary);
}

/* Submit */
.form-actions {
  margin-top: var(--spacing-2xl);
}

.submit-btn {
  width: 100%;
  padding: var(--spacing-md);
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-lg);
  font-weight: 500;
  min-height: 48px;
  transition: opacity 0.2s;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 420px) {
  .record-type-grid,
  .form-row {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .emoji-grid {
    grid-template-columns: repeat(5, minmax(44px, 1fr));
  }
}

@media (min-width: 640px) {
  .emoji-modal-overlay {
    align-items: center;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .emoji-modal {
    animation: emoji-modal-in 0.18s ease-out;
  }
}

@keyframes emoji-modal-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Reference-aligned visual layer */
.form-page {
  padding: calc(20px + var(--safe-area-top)) 16px 40px;
  max-width: var(--content-max-width);
  min-height: 100dvh;
}

.page-header { padding: 0 4px; margin-bottom: 20px; }
.page-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
.form-section {
  margin-bottom: 14px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(14px);
}
.section-title { color: var(--color-primary); font-weight: 750; }
.record-type-card,
.option-btn,
.category-btn,
.emoji-trigger { background: rgba(246, 248, 253, 0.9); }
.form-input,
.form-textarea { border-radius: 14px; background: rgba(248, 250, 255, 0.9); }
.submit-btn { border-radius: var(--radius-full); background: linear-gradient(135deg, #7075ff, #4d46eb); box-shadow: 0 12px 24px rgba(79, 70, 229, 0.24); }
.emoji-modal { border: 1px solid rgba(255, 255, 255, 0.92); box-shadow: var(--shadow-lg); }
</style>
