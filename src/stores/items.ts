import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Item } from '../types';
import { db } from '../db';
import { generateId } from '../utils';
import { useSettingsStore } from './settings';
import {
  calcItemDays,
  calcItemDailyCost,
  calcItemMonthlyCost,
  calcTotalInvestment,
} from '../domain';

export type SortKey =
  | 'createdAt-desc'
  | 'startDate-desc'
  | 'startDate-asc'
  | 'amount-desc'
  | 'amount-asc'
  | 'investment-desc'
  | 'investment-asc'
  | 'cost-desc'
  | 'cost-asc'
  | 'holdingDays-desc'
  | 'holdingDays-asc';

export interface ItemFilters {
  categoryId: string;
  searchQuery: string;
  statusFilter: string[];
  warrantyFilter: string[];
}

export const useItemsStore = defineStore('items', () => {
  const items = ref<Item[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const sortKey = ref<SortKey>('createdAt-desc');
  const filters = ref<ItemFilters>({
    categoryId: 'cat-all',
    searchQuery: '',
    statusFilter: [],
    warrantyFilter: [],
  });

  // 当前筛选条件下的物品
  const filteredItems = computed(() => {
    let result = [...items.value];

    // 分类筛选
    if (filters.value.categoryId !== 'cat-all') {
      result = result.filter(i => i.categoryId === filters.value.categoryId);
    }

    // 搜索
    const q = filters.value.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.brandModel && i.brandModel.toLowerCase().includes(q)) ||
        (i.note && i.note.toLowerCase().includes(q))
      );
    }

    // 状态筛选
    if (filters.value.statusFilter.length > 0) {
      result = result.filter(i => filters.value.statusFilter.includes(i.status));
    }

    return result;
  });

  // 已排序的筛选结果
  const sortedItems = computed(() => {
    const result = [...filteredItems.value];
    const settings = useSettingsStore();

    result.sort((a, b) => {
      switch (sortKey.value) {
        case 'createdAt-desc':
          return b.createdAt.localeCompare(a.createdAt);
        case 'startDate-desc':
          return b.startDate.localeCompare(a.startDate);
        case 'startDate-asc':
          return a.startDate.localeCompare(b.startDate);
        case 'amount-desc':
          return b.billingAmountInCents - a.billingAmountInCents;
        case 'amount-asc':
          return a.billingAmountInCents - b.billingAmountInCents;
        case 'investment-desc': {
          const invA = calcTotalInvestment(a);
          const invB = calcTotalInvestment(b);
          return invB - invA;
        }
        case 'investment-asc': {
          const invA = calcTotalInvestment(a);
          const invB = calcTotalInvestment(b);
          return invA - invB;
        }
        case 'cost-desc':
        case 'cost-asc': {
          const unit = settings.costDisplayUnit;
          const costA = unit === 'day'
            ? calcItemDailyCost(a)
            : calcItemMonthlyCost(a);
          const costB = unit === 'day'
            ? calcItemDailyCost(b)
            : calcItemMonthlyCost(b);
          return sortKey.value === 'cost-desc' ? costB - costA : costA - costB;
        }
        case 'holdingDays-desc':
        case 'holdingDays-asc': {
          const daysA = calcItemDays(a);
          const daysB = calcItemDays(b);
          return sortKey.value === 'holdingDays-desc' ? daysB - daysA : daysA - daysB;
        }
        default:
          return 0;
      }
    });

    return result;
  });

  // 概览统计
  const summary = computed(() => {
    const result = filteredItems.value;
    const itemCount = result.length;

    let totalInvestment = 0;
    let totalDailyCost = 0;
    let totalMonthlyCost = 0;

    for (const item of result) {
      totalInvestment += calcTotalInvestment(item);
      totalDailyCost += calcItemDailyCost(item);
      totalMonthlyCost += calcItemMonthlyCost(item);
    }

    return {
      itemCount,
      totalInvestment,       // 分
      totalDailyCost,        // 元
      totalMonthlyCost,      // 元
    };
  });

  // 加载所有物品
  async function loadItems(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      items.value = await db.items
        .filter(item => !item.deletedAt)
        .toArray();
    } catch (e) {
      error.value = '数据加载失败';
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  // 获取单件物品
  function getItemById(id: string): Item | undefined {
    return items.value.find(i => i.id === id);
  }

  // 添加物品
  async function addItem(data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
    const now = new Date().toISOString();
    const item: Item = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await db.items.add(item);
    items.value.unshift(item);
    return item;
  }

  // 更新物品
  async function updateItem(id: string, data: Partial<Item>): Promise<void> {
    const now = new Date().toISOString();
    await db.items.update(id, { ...data, updatedAt: now });
    const idx = items.value.findIndex(i => i.id === id);
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], ...data, updatedAt: now };
    }
  }

  // 软删除物品
  async function deleteItem(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.items.update(id, { deletedAt: now, updatedAt: now });
    items.value = items.value.filter(i => i.id !== id);
  }

  // 设置筛选条件
  function setCategoryFilter(categoryId: string): void {
    filters.value.categoryId = categoryId;
  }

  function setSearchQuery(query: string): void {
    filters.value.searchQuery = query;
  }

  function setStatusFilter(statuses: string[]): void {
    filters.value.statusFilter = statuses;
  }

  function setSortKey(key: SortKey): void {
    sortKey.value = key;
    const settings = useSettingsStore();
    settings.setDefaultSort(key);
  }

  function clearFilters(): void {
    filters.value = {
      categoryId: 'cat-all',
      searchQuery: '',
      statusFilter: [],
      warrantyFilter: [],
    };
  }

  const hasActiveFilters = computed(() => {
    return (
      filters.value.categoryId !== 'cat-all' ||
      filters.value.searchQuery !== '' ||
      filters.value.statusFilter.length > 0
    );
  });

  async function importItems(newItems: Item[]): Promise<void> {
    await db.items.bulkAdd(newItems);
    await loadItems();
  }

  return {
    items,
    filteredItems,
    sortedItems,
    summary,
    loading,
    error,
    sortKey,
    filters,
    hasActiveFilters,
    loadItems,
    getItemById,
    addItem,
    updateItem,
    deleteItem,
    setCategoryFilter,
    setSearchQuery,
    setSortKey,
    setStatusFilter,
    clearFilters,
    importItems,
  };
});
