<script setup lang="ts">
import { ref, watch } from 'vue';
import { debounce } from '../utils';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const localValue = ref(props.modelValue);

const debouncedEmit = debounce((value: string) => {
  emit('update:modelValue', value);
}, 200);

watch(localValue, (val) => {
  debouncedEmit(val);
});

watch(() => props.modelValue, (val) => {
  if (val !== localValue.value) {
    localValue.value = val;
  }
});

function handleClear(): void {
  localValue.value = '';
  emit('update:modelValue', '');
  inputRef.value?.focus();
}
</script>

<template>
  <div class="search-bar" role="search">
    <div class="search-bar__inner">
      <svg
        class="search-bar__icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        ref="inputRef"
        v-model="localValue"
        class="search-bar__input"
        type="search"
        placeholder="搜索物品、费用或备注…"
        aria-label="搜索记录"
        autocomplete="off"
        enterkeyhint="search"
      />
      <button
        v-if="localValue"
        class="search-bar__clear"
        type="button"
        aria-label="清除搜索"
        @click="handleClear"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  --search-padding-x: 0;
  --search-bg: var(--search-bg, rgba(255, 255, 255, 0.58));
  --search-text: var(--search-text, #1a1a2e);
  --search-placeholder: var(--search-placeholder, #9ca3af);
  --search-icon: var(--search-icon, #9ca3af);
  --search-radius: 999px;

  padding: 10px 0 0;
}

.search-bar__inner {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 0 18px;
  background: var(--search-bg);
  border-radius: var(--search-radius);
  border: 5px solid rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(218, 225, 242, 0.45), var(--shadow-sm);
  transition: border-color 0.2s, background 0.2s;
}

.search-bar__inner:focus-within {
  border-color: var(--search-active-border, #6366f1);
  background: var(--search-active-bg, #ffffff);
}

.search-bar__icon {
  flex-shrink: 0;
  color: var(--search-icon);
  width: 22px;
  height: 22px;
}

.search-bar__input {
  flex: 1;
  min-height: 48px;
  padding: 0;
  font-size: 16px;
  line-height: 1.4;
  color: var(--search-text);
  background: transparent;
  border: none;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.search-bar__input::placeholder {
  color: var(--search-placeholder);
}

.search-bar__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  margin: -10px -6px -10px 0;
  padding: 0;
  color: var(--search-icon);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s;
}

.search-bar__clear:active {
  color: var(--search-text);
}

/* Remove default search cancel button in WebKit */
.search-bar__input::-webkit-search-cancel-button,
.search-bar__input::-webkit-search-decoration {
  display: none;
}

/* ========= Responsive ========= */
@media (max-width: 359px) {
  .search-bar {
    --search-padding-x: 12px;
  }
}

@media (min-width: 420px) {
  .search-bar {
    --search-padding-x: 0;
  }
}

</style>
