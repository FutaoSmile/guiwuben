import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AppSettings, CostDisplayUnit } from '../types';
import { DEFAULT_SETTINGS } from '../db';

const SETTINGS_KEY = 'guiwuben_settings';

function normalizeSettings(value: unknown): AppSettings {
  const input = value && typeof value === 'object' ? value as Partial<AppSettings> : {};
  return {
    currency: 'CNY',
    amountVisible: typeof input.amountVisible === 'boolean' ? input.amountVisible : DEFAULT_SETTINGS.amountVisible,
    costDisplayUnit: input.costDisplayUnit === 'month' ? 'month' : 'day',
    defaultSort: typeof input.defaultSort === 'string' ? input.defaultSort : DEFAULT_SETTINGS.defaultSort,
  };
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return normalizeSettings(JSON.parse(raw));
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadSettings());

  const amountVisible = computed(() => settings.value.amountVisible);
  const costDisplayUnit = computed(() => settings.value.costDisplayUnit);
  const defaultSort = computed(() => settings.value.defaultSort);

  function toggleAmountVisibility(): void {
    settings.value.amountVisible = !settings.value.amountVisible;
    saveSettings(settings.value);
  }

  function setCostDisplayUnit(unit: CostDisplayUnit): void {
    settings.value.costDisplayUnit = unit;
    saveSettings(settings.value);
  }

  function setDefaultSort(sort: string): void {
    settings.value.defaultSort = sort;
    saveSettings(settings.value);
  }

  function importSettings(s: AppSettings): void {
    settings.value = normalizeSettings(s);
    saveSettings(settings.value);
  }

  return {
    settings,
    amountVisible,
    costDisplayUnit,
    defaultSort,
    toggleAmountVisibility,
    setCostDisplayUnit,
    setDefaultSort,
    importSettings,
  };
});
