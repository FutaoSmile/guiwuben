<script setup lang="ts">
import type { SortKey } from '../stores/items';

defineProps<{
  show: boolean;
  currentSortKey: SortKey;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', sortKey: SortKey): void;
}>();

interface SortOption {
  key: SortKey;
  label: string;
  group: string;
}

const sortOptions: SortOption[] = [
  { key: 'createdAt-desc', label: '最近添加', group: '添加时间' },
  { key: 'startDate-desc', label: '从新到旧', group: '开始使用日期' },
  { key: 'startDate-asc', label: '从旧到新', group: '开始使用日期' },
  { key: 'amount-desc', label: '从高到低', group: '计费金额' },
  { key: 'amount-asc', label: '从低到高', group: '计费金额' },
  { key: 'investment-desc', label: '从高到低', group: '累计投入' },
  { key: 'investment-asc', label: '从低到高', group: '累计投入' },
  { key: 'cost-desc', label: '从高到低', group: '当前成本' },
  { key: 'cost-asc', label: '从低到高', group: '当前成本' },
  { key: 'holdingDays-desc', label: '从多到少', group: '持有天数' },
  { key: 'holdingDays-asc', label: '从少到多', group: '持有天数' },
];

// Group options for display
const groups = [
  { id: 'recent', label: '添加时间', options: sortOptions.filter(o => o.group === '添加时间') },
  { id: 'date', label: '开始使用日期', options: sortOptions.filter(o => o.group === '开始使用日期') },
  { id: 'amount', label: '计费金额', options: sortOptions.filter(o => o.group === '计费金额') },
  { id: 'investment', label: '累计投入', options: sortOptions.filter(o => o.group === '累计投入') },
  { id: 'cost', label: '当前成本', options: sortOptions.filter(o => o.group === '当前成本') },
  { id: 'holding', label: '持有天数', options: sortOptions.filter(o => o.group === '持有天数') },
];

function isDefaultSort(key: SortKey): boolean {
  return key === 'createdAt-desc';
}

function handleSelect(key: SortKey): void {
  emit('select', key);
}

function handleBackdropClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    emit('close');
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="panel-fade">
      <div
        v-if="show"
        class="sort-panel-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="排序选项"
        @click="handleBackdropClick"
      >
        <Transition name="panel-slide" appear>
          <div v-if="show" class="sort-panel">
            <div class="sort-panel__handle" aria-hidden="true">
              <span class="sort-panel__handle-bar"></span>
            </div>

            <div class="sort-panel__header">
              <h2 class="sort-panel__title">排序方式</h2>
              <button
                class="sort-panel__close"
                type="button"
                aria-label="关闭"
                @click="emit('close')"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="sort-panel__body">
              <div
                v-for="group in groups"
                :key="group.id"
                class="sort-panel__group"
              >
                <h3 class="sort-panel__group-title">{{ group.label }}</h3>
                <div class="sort-panel__options">
                  <button
                    v-for="opt in group.options"
                    :key="opt.key"
                    class="sort-panel__option"
                    :class="{ 'sort-panel__option--active': currentSortKey === opt.key }"
                    type="button"
                    :aria-label="opt.label"
                    :aria-pressed="currentSortKey === opt.key"
                    @click="handleSelect(opt.key)"
                  >
                    <span class="sort-panel__option-label">{{ opt.label }}</span>
                    <span v-if="currentSortKey === opt.key" class="sort-panel__option-check" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div class="sort-panel__footer">
              <button
                class="sort-panel__reset-btn"
                type="button"
                :disabled="isDefaultSort(currentSortKey)"
                aria-label="重置排序"
                @click="handleSelect('createdAt-desc')"
              >
                重置
              </button>
              <button
                class="sort-panel__confirm-btn"
                type="button"
                aria-label="确定"
                @click="emit('close')"
              >
                确定
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sort-panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0;
  margin: 0;
  /* Safe area */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.sort-panel {
  --panel-radius: 20px;
  --panel-bg: #ffffff;
  --panel-text: #1a1a2e;
  --panel-text-secondary: #6b7280;
  --panel-accent: #6366f1;
  --panel-border: #e5e7eb;
  --panel-option-bg: #f9fafb;
  --panel-option-active-bg: #eef2ff;

  background: var(--panel-bg);
  border-radius: var(--panel-radius) var(--panel-radius) 0 0;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sort-panel__handle {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
}

.sort-panel__handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--panel-border);
}

.sort-panel__header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 20px 8px;
  position: relative;
}

.sort-panel__title {
  font-size: 17px;
  font-weight: 600;
  color: var(--panel-text);
  margin: 0;
}

.sort-panel__close {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  color: var(--panel-text-secondary);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.sort-panel__body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 20px 12px;
}

.sort-panel__group {
  margin-bottom: 16px;
}

.sort-panel__group:last-child {
  margin-bottom: 0;
}

.sort-panel__group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--panel-text-secondary);
  margin: 0 0 8px;
  padding-left: 4px;
}

.sort-panel__options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sort-panel__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 8px 14px;
  font-size: 15px;
  color: var(--panel-text);
  background: var(--panel-option-bg);
  border: 1.5px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.sort-panel__option:active {
  transform: scale(0.98);
}

.sort-panel__option--active {
  color: var(--panel-accent);
  background: var(--panel-option-active-bg);
  border-color: var(--panel-accent);
  font-weight: 600;
}

.sort-panel__option-check {
  flex-shrink: 0;
  color: var(--panel-accent);
}

.sort-panel__footer {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--panel-border);
}

.sort-panel__reset-btn,
.sort-panel__confirm-btn {
  flex: 1;
  min-height: 48px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.sort-panel__reset-btn {
  color: var(--panel-text-secondary);
  background: var(--panel-option-bg);
  border: 1.5px solid var(--panel-border);
}

.sort-panel__reset-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sort-panel__confirm-btn {
  color: #ffffff;
  background: var(--panel-accent);
  border: none;
}

.sort-panel__confirm-btn:active,
.sort-panel__reset-btn:not(:disabled):active {
  opacity: 0.85;
}

/* ========= Transitions ========= */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.25s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateY(100%);
}

/* ========= Responsive ========= */
@media (max-width: 359px) {
  .sort-panel__header,
  .sort-panel__body {
    padding-left: 16px;
    padding-right: 16px;
  }
}

</style>
