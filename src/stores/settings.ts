import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AppSettings, CostDisplayUnit, ThemeMode } from '../types';
import { DEFAULT_SETTINGS } from '../db';

const SETTINGS_KEY = 'guiwuben_settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as AppSettings;
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
  const theme = computed(() => settings.value.theme);
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

  function setTheme(t: ThemeMode): void {
    settings.value.theme = t;
    saveSettings(settings.value);
  }

  function importSettings(s: AppSettings): void {
    settings.value = { ...s };
    saveSettings(settings.value);
  }

  return {
    settings,
    amountVisible,
    costDisplayUnit,
    theme,
    defaultSort,
    toggleAmountVisibility,
    setCostDisplayUnit,
    setDefaultSort,
    setTheme,
    importSettings,
  };
});