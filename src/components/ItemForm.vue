<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import type { Item, Category, BillingType, WarrantyType, ItemStatus } from '../types';
import { today } from '../domain';
import { isValidDate, isNotFutureDate, isValidAmount } from '../utils';

const props = defineProps<{
  item?: Item | null;
  categories: Category[];
}>();

const emit = defineEmits<{
  (e: 'save', data: ItemFormData): void;
  (e: 'cancel'): void;
}>();

export interface ItemFormData {
  name: string;
  brandModel?: string;
  billingType: BillingType;
  billingAmountYuan: number;
  purchaseDate: string;
  startDate: string;
  firstPaymentDate?: string;
  categoryId: string;
  iconKey?: string;
  cardColor?: string;
  warrantyType: WarrantyType;
  warrantyMonths?: number;
  status: ItemStatus;
  endDate?: string;
  note?: string;
}

const form = reactive<ItemFormData>({
  name: '',
  brandModel: '',
  billingType: 'one_time',
  billingAmountYuan: 0,
  purchaseDate: today(),
  startDate: today(),
  firstPaymentDate: undefined,
  categoryId: props.categories.length > 0 ? props.categories[0].id : '',
  iconKey: undefined,
  cardColor: undefined,
  warrantyType: 'unset',
  warrantyMonths: undefined,
  status: 'active',
  endDate: undefined,
  note: '',
});

const errors = reactive<Record<string, string>>({});
const submitted = ref(false);
const saving = ref(false);

const activeCategories = computed(() => {
  return props.categories.filter(c => c.id !== 'cat-all' && c.isActive !== false);
});

// Initialize form when editing
watch(() => props.item, (item) => {
  if (item) {
    form.name = item.name;
    form.brandModel = item.brandModel || '';
    form.billingType = item.billingType;
    form.billingAmountYuan = item.billingAmountInCents / 100;
    form.purchaseDate = item.purchaseDate;
    form.startDate = item.startDate;
    form.firstPaymentDate = item.firstPaymentDate;
    form.categoryId = item.categoryId;
    form.iconKey = item.iconKey;
    form.cardColor = item.cardColor;
    form.warrantyType = item.warrantyType;
    form.warrantyMonths = item.warrantyMonths;
    form.status = item.status;
    form.endDate = item.endDate;
    form.note = item.note || '';
  }
}, { immediate: true });

// Dynamic field visibility
const showFirstPaymentDate = computed(() => {
  return form.billingType === 'monthly' || form.billingType === 'yearly';
});

const showWarrantyMonths = computed(() => {
  return form.warrantyType === 'custom';
});

const showEndDate = computed(() => {
  return form.status === 'ended';
});

function validate(): boolean {
  Object.keys(errors).forEach(k => delete errors[k]);
  let valid = true;

  if (!form.name.trim()) {
    errors.name = '请输入物品名称';
    valid = false;
  } else if (form.name.trim().length > 50) {
    errors.name = '名称不超过50个字符';
    valid = false;
  }

  if (!form.billingAmountYuan || form.billingAmountYuan <= 0) {
    errors.billingAmountYuan = '请输入有效的金额';
    valid = false;
  } else if (!isValidAmount(form.billingAmountYuan)) {
    errors.billingAmountYuan = '金额格式不正确';
    valid = false;
  }

  if (!isValidDate(form.purchaseDate)) {
    errors.purchaseDate = '请输入有效日期';
    valid = false;
  } else if (!isNotFutureDate(form.purchaseDate)) {
    errors.purchaseDate = '购买日期不能为未来日期';
    valid = false;
  }

  if (!isValidDate(form.startDate)) {
    errors.startDate = '请输入有效日期';
    valid = false;
  } else if (form.purchaseDate && form.startDate < form.purchaseDate) {
    errors.startDate = '开始使用日期不能早于购买日期';
    valid = false;
  }

  if (!form.categoryId) {
    errors.categoryId = '请选择分类';
    valid = false;
  }

  if (showFirstPaymentDate.value && !form.firstPaymentDate) {
    errors.firstPaymentDate = '请选择首次付款日期';
    valid = false;
  } else if (showFirstPaymentDate.value && form.firstPaymentDate && !isValidDate(form.firstPaymentDate)) {
    errors.firstPaymentDate = '请输入有效日期';
    valid = false;
  }

  if (showWarrantyMonths.value && (!form.warrantyMonths || form.warrantyMonths < 1)) {
    errors.warrantyMonths = '请输入有效的保修月数';
    valid = false;
  } else if (form.warrantyMonths && form.warrantyMonths > 360) {
    errors.warrantyMonths = '保修月数不超过360个月';
    valid = false;
  }

  if (showEndDate.value && !form.endDate) {
    errors.endDate = '请选择结束日期';
    valid = false;
  } else if (showEndDate.value && form.endDate && !isValidDate(form.endDate)) {
    errors.endDate = '请输入有效日期';
    valid = false;
  } else if (showEndDate.value && form.endDate && form.startDate && form.endDate < form.startDate) {
    errors.endDate = '结束日期不能早于开始日期';
    valid = false;
  }

  if (form.note && form.note.length > 500) {
    errors.note = '备注不超过500个字符';
    valid = false;
  }

  return valid;
}

function fieldError(field: string): string {
  return submitted.value ? (errors[field] || '') : '';
}

function hasError(field: string): boolean {
  return submitted.value && !!errors[field];
}

async function handleSubmit(): Promise<void> {
  submitted.value = true;
  if (!validate()) return;
  if (saving.value) return;

  saving.value = true;
  try {
    emit('save', { ...form });
  } finally {
    saving.value = false;
  }
}

function handleCancel(): void {
  emit('cancel');
}
</script>

<template>
  <form
    class="item-form"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <!-- Name -->
    <div class="field" :class="{ 'field--error': hasError('name') }">
      <label class="field__label" for="item-name">
        物品名称 <span class="field__required" aria-label="必填">*</span>
      </label>
      <input
        id="item-name"
        v-model="form.name"
        class="field__input"
        type="text"
        maxlength="50"
        placeholder="例如：iPhone 16 Pro"
        aria-required="true"
        :aria-invalid="hasError('name')"
        :aria-describedby="fieldError('name') ? 'name-error' : undefined"
      />
      <p v-if="fieldError('name')" id="name-error" class="field__error" role="alert">{{ fieldError('name') }}</p>
    </div>

    <!-- Brand / Model -->
    <div class="field">
      <label class="field__label" for="item-brand">品牌型号</label>
      <input
        id="item-brand"
        v-model="form.brandModel"
        class="field__input"
        type="text"
        maxlength="100"
        placeholder="例如：Apple A3104"
        aria-label="品牌型号（可选）"
      />
    </div>

    <!-- Category -->
    <div class="field" :class="{ 'field--error': hasError('categoryId') }">
      <label class="field__label" for="item-category">
        分类 <span class="field__required" aria-label="必填">*</span>
      </label>
      <div class="field__select-wrap">
        <select
          id="item-category"
          v-model="form.categoryId"
          class="field__select"
          aria-required="true"
          :aria-invalid="hasError('categoryId')"
        >
          <option value="" disabled>请选择分类</option>
          <option
            v-for="cat in activeCategories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>
        <svg class="field__select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <p v-if="fieldError('categoryId')" class="field__error" role="alert">{{ fieldError('categoryId') }}</p>
    </div>

    <!-- Billing Type -->
    <div class="field" :class="{ 'field--error': hasError('billingType') }">
      <label class="field__label">
        计费方式 <span class="field__required" aria-label="必填">*</span>
      </label>
      <div class="field__radio-group" role="radiogroup" aria-label="计费方式">
        <button
          type="button"
          class="field__radio-pill"
          :class="{ 'field__radio-pill--active': form.billingType === 'one_time' }"
          role="radio"
          :aria-checked="form.billingType === 'one_time'"
          @click="form.billingType = 'one_time'; form.firstPaymentDate = undefined"
        >
          一次性
        </button>
        <button
          type="button"
          class="field__radio-pill"
          :class="{ 'field__radio-pill--active': form.billingType === 'monthly' }"
          role="radio"
          :aria-checked="form.billingType === 'monthly'"
          @click="form.billingType = 'monthly'"
        >
          按月付
        </button>
        <button
          type="button"
          class="field__radio-pill"
          :class="{ 'field__radio-pill--active': form.billingType === 'yearly' }"
          role="radio"
          :aria-checked="form.billingType === 'yearly'"
          @click="form.billingType = 'yearly'"
        >
          按年付
        </button>
      </div>
    </div>

    <!-- Billing Amount -->
    <div class="field" :class="{ 'field--error': hasError('billingAmountYuan') }">
      <label class="field__label" for="item-amount">
        计费金额（元）<span class="field__required" aria-label="必填">*</span>
      </label>
      <div class="field__input-group">
        <span class="field__prefix" aria-hidden="true">¥</span>
        <input
          id="item-amount"
          v-model.number="form.billingAmountYuan"
          class="field__input field__input--with-prefix"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          aria-required="true"
          :aria-invalid="hasError('billingAmountYuan')"
          :aria-describedby="fieldError('billingAmountYuan') ? 'amount-error' : undefined"
          @wheel.prevent
        />
      </div>
      <p v-if="fieldError('billingAmountYuan')" id="amount-error" class="field__error" role="alert">{{ fieldError('billingAmountYuan') }}</p>
    </div>

    <!-- First Payment Date (dynamic) -->
    <div v-if="showFirstPaymentDate" class="field" :class="{ 'field--error': hasError('firstPaymentDate') }">
      <label class="field__label" for="item-first-payment">
        首次付款日期 <span class="field__required" aria-label="必填">*</span>
      </label>
      <input
        id="item-first-payment"
        v-model="form.firstPaymentDate"
        class="field__input"
        type="date"
        aria-required="true"
        :aria-invalid="hasError('firstPaymentDate')"
        :aria-describedby="fieldError('firstPaymentDate') ? 'first-payment-error' : undefined"
      />
      <p v-if="fieldError('firstPaymentDate')" id="first-payment-error" class="field__error" role="alert">{{ fieldError('firstPaymentDate') }}</p>
    </div>

    <!-- Purchase Date -->
    <div class="field" :class="{ 'field--error': hasError('purchaseDate') }">
      <label class="field__label" for="item-purchase-date">
        购买日期 <span class="field__required" aria-label="必填">*</span>
      </label>
      <input
        id="item-purchase-date"
        v-model="form.purchaseDate"
        class="field__input"
        type="date"
        aria-required="true"
        :aria-invalid="hasError('purchaseDate')"
        :aria-describedby="fieldError('purchaseDate') ? 'purchase-date-error' : undefined"
      />
      <p v-if="fieldError('purchaseDate')" id="purchase-date-error" class="field__error" role="alert">{{ fieldError('purchaseDate') }}</p>
    </div>

    <!-- Start Date -->
    <div class="field" :class="{ 'field--error': hasError('startDate') }">
      <label class="field__label" for="item-start-date">
        开始使用日期 <span class="field__required" aria-label="必填">*</span>
      </label>
      <input
        id="item-start-date"
        v-model="form.startDate"
        class="field__input"
        type="date"
        aria-required="true"
        :aria-invalid="hasError('startDate')"
        :aria-describedby="fieldError('startDate') ? 'start-date-error' : undefined"
      />
      <p v-if="fieldError('startDate')" id="start-date-error" class="field__error" role="alert">{{ fieldError('startDate') }}</p>
    </div>

    <!-- Warranty Type -->
    <div class="field">
      <label class="field__label">保修情况</label>
      <div class="field__radio-group" role="radiogroup" aria-label="保修情况">
        <button
          type="button"
          class="field__radio-pill"
          :class="{ 'field__radio-pill--active': form.warrantyType === 'unset' }"
          role="radio"
          :aria-checked="form.warrantyType === 'unset'"
          @click="form.warrantyType = 'unset'; form.warrantyMonths = undefined"
        >
          未设置
        </button>
        <button
          type="button"
          class="field__radio-pill"
          :class="{ 'field__radio-pill--active': form.warrantyType === 'none' }"
          role="radio"
          :aria-checked="form.warrantyType === 'none'"
          @click="form.warrantyType = 'none'; form.warrantyMonths = undefined"
        >
          无保修
        </button>
        <button
          type="button"
          class="field__radio-pill"
          :class="{ 'field__radio-pill--active': form.warrantyType === 'custom' }"
          role="radio"
          :aria-checked="form.warrantyType === 'custom'"
          @click="form.warrantyType = 'custom'"
        >
          自定义
        </button>
      </div>
    </div>

    <!-- Warranty Months (dynamic) -->
    <div v-if="showWarrantyMonths" class="field" :class="{ 'field--error': hasError('warrantyMonths') }">
      <label class="field__label" for="item-warranty-months">
        保修月数 <span class="field__required" aria-label="必填">*</span>
      </label>
      <input
        id="item-warranty-months"
        v-model.number="form.warrantyMonths"
        class="field__input"
        type="number"
        min="1"
        max="360"
        placeholder="例如：12"
        aria-required="true"
        :aria-invalid="hasError('warrantyMonths')"
        :aria-describedby="fieldError('warrantyMonths') ? 'warranty-error' : undefined"
        @wheel.prevent
      />
      <p v-if="fieldError('warrantyMonths')" id="warranty-error" class="field__error" role="alert">{{ fieldError('warrantyMonths') }}</p>
    </div>

    <!-- Status -->
    <div class="field">
      <label class="field__label">使用状态</label>
      <div class="field__radio-group" role="radiogroup" aria-label="使用状态">
        <button
          type="button"
          class="field__radio-pill"
          :class="{ 'field__radio-pill--active': form.status === 'active' }"
          role="radio"
          :aria-checked="form.status === 'active'"
          @click="form.status = 'active'; form.endDate = undefined"
        >
          使用中
        </button>
        <button
          type="button"
          class="field__radio-pill"
          :class="{ 'field__radio-pill--active': form.status === 'ended' }"
          role="radio"
          :aria-checked="form.status === 'ended'"
          @click="form.status = 'ended'"
        >
          已结束
        </button>
      </div>
    </div>

    <!-- End Date (dynamic) -->
    <div v-if="showEndDate" class="field" :class="{ 'field--error': hasError('endDate') }">
      <label class="field__label" for="item-end-date">
        结束日期 <span class="field__required" aria-label="必填">*</span>
      </label>
      <input
        id="item-end-date"
        v-model="form.endDate"
        class="field__input"
        type="date"
        aria-required="true"
        :aria-invalid="hasError('endDate')"
        :aria-describedby="fieldError('endDate') ? 'end-date-error' : undefined"
      />
      <p v-if="fieldError('endDate')" id="end-date-error" class="field__error" role="alert">{{ fieldError('endDate') }}</p>
    </div>

    <!-- Note -->
    <div class="field" :class="{ 'field--error': hasError('note') }">
      <label class="field__label" for="item-note">备注</label>
      <textarea
        id="item-note"
        v-model="form.note"
        class="field__textarea"
        maxlength="500"
        rows="3"
        placeholder="添加备注（可选）"
        aria-label="备注（可选）"
        :aria-invalid="hasError('note')"
      ></textarea>
      <div class="field__hint">
        <span v-if="form.note">{{ form.note.length }}/500</span>
      </div>
      <p v-if="fieldError('note')" class="field__error" role="alert">{{ fieldError('note') }}</p>
    </div>

    <!-- Actions -->
    <div class="item-form__actions">
      <button
        type="button"
        class="item-form__cancel-btn"
        aria-label="取消"
        @click="handleCancel"
      >
        取消
      </button>
      <button
        type="submit"
        class="item-form__submit-btn"
        :disabled="saving"
        aria-label="保存"
      >
        <template v-if="saving">
          <span class="item-form__spinner" aria-hidden="true"></span>
          保存中…
        </template>
        <template v-else>
          {{ props.item ? '保存修改' : '添加物品' }}
        </template>
      </button>
    </div>
  </form>
</template>

<style scoped>
.item-form {
  --form-padding-x: 20px;
  --form-label-font: 14px;
  --form-input-font: 15px;
  --form-radius: 12px;
  --form-bg: var(--form-bg, #ffffff);
  --form-text: var(--form-text, #1a1a2e);
  --form-text-secondary: var(--form-text-secondary, #6b7280);
  --form-border: var(--form-border, #e5e7eb);
  --form-accent: var(--form-accent, #6366f1);
  --form-error: var(--form-error, #ef4444);
  --form-input-bg: var(--form-input-bg, #f9fafb);

  padding: 0 var(--form-padding-x) 24px;
}

/* ========= Field ========= */
.field {
  margin-bottom: 20px;
}

.field__label {
  display: block;
  font-size: var(--form-label-font);
  font-weight: 600;
  color: var(--form-text);
  margin-bottom: 6px;
}

.field__required {
  color: var(--form-error);
}

.field__input,
.field__select,
.field__textarea {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  font-size: var(--form-input-font);
  color: var(--form-text);
  background: var(--form-input-bg);
  border: 1.5px solid var(--form-border);
  border-radius: var(--form-radius);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
  font-family: inherit;
}

.field__input:focus,
.field__select:focus,
.field__textarea:focus {
  border-color: var(--form-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.field--error .field__input,
.field--error .field__select {
  border-color: var(--form-error);
}

.field--error .field__input:focus,
.field--error .field__select:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.field__input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.field__prefix {
  position: absolute;
  left: 14px;
  font-size: var(--form-input-font);
  font-weight: 500;
  color: var(--form-text-secondary);
  pointer-events: none;
  z-index: 1;
}

.field__input--with-prefix {
  padding-left: 32px;
}

/* Number input arrows */
.field__input[type="number"]::-webkit-inner-spin-button,
.field__input[type="number"]::-webkit-outer-spin-button {
  display: none;
}

.field__input[type="number"] {
  -moz-appearance: textfield;
}

/* ========= Select ========= */
.field__select-wrap {
  position: relative;
}

.field__select {
  padding-right: 36px;
  cursor: pointer;
  background-image: none;
}

.field__select-arrow {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--form-text-secondary);
  pointer-events: none;
}

/* ========= Textarea ========= */
.field__textarea {
  padding: 12px 14px;
  min-height: 80px;
  resize: vertical;
  line-height: 1.5;
}

.field__hint {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
  font-size: 12px;
  color: var(--form-text-secondary);
}

/* ========= Radio Group (Pills) ========= */
.field__radio-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.field__radio-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 6px 18px;
  font-size: 14px;
  font-weight: 500;
  color: var(--form-text-secondary);
  background: var(--form-input-bg);
  border: 1.5px solid var(--form-border);
  border-radius: 22px;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.field__radio-pill--active {
  color: var(--form-accent);
  background: rgba(99, 102, 241, 0.08);
  border-color: var(--form-accent);
  font-weight: 600;
}

/* ========= Error ========= */
.field__error {
  font-size: 13px;
  color: var(--form-error);
  margin: 4px 0 0;
  line-height: 1.4;
}

/* ========= Actions ========= */
.item-form__actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
  padding-top: 16px;
}

.item-form__cancel-btn,
.item-form__submit-btn {
  flex: 1;
  min-height: 50px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.item-form__cancel-btn {
  color: var(--form-text-secondary);
  background: var(--form-input-bg);
  border: 1.5px solid var(--form-border);
}

.item-form__submit-btn {
  color: #ffffff;
  background: var(--form-accent);
  border: none;
}

.item-form__submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.item-form__cancel-btn:active:not(:disabled),
.item-form__submit-btn:active:not(:disabled) {
  opacity: 0.85;
}

.item-form__spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========= Responsive ========= */
@media (max-width: 359px) {
  .item-form {
    --form-padding-x: 16px;
  }
}

</style>
