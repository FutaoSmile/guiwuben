import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Category } from '../types';
import { db, DEFAULT_CATEGORIES } from '../db';

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([]);

  async function loadCategories(): Promise<void> {
    const all = await db.categories.toArray();
    categories.value = all
      .filter(c => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const activeCategories = ref<Category[]>([]);

  async function loadActiveCategories(): Promise<void> {
    const all = await db.categories.toArray();
    // "全部" 排第一位，其余按 sortOrder 排序
    const sorted = all
      .filter(c => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    activeCategories.value = sorted;
  }

  async function addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const now = new Date().toISOString();
    const newCat: Category = {
      ...category,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await db.categories.add(newCat);
    await loadActiveCategories();
    return newCat;
  }

  async function updateCategory(id: string, data: Partial<Category>): Promise<void> {
    const now = new Date().toISOString();
    await db.categories.update(id, { ...data, updatedAt: now });
    await loadActiveCategories();
  }

  async function deactivateCategory(id: string): Promise<void> {
    await db.categories.update(id, { isActive: false });
    await loadActiveCategories();
  }

  function getCategoryById(id: string): Category | undefined {
    return categories.value.find(c => c.id === id);
  }

  async function initDefaultCategories(): Promise<void> {
    const count = await db.categories.count();
    if (count === 0) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);
    }
    await loadActiveCategories();
  }

  return {
    categories,
    activeCategories,
    loadCategories,
    loadActiveCategories,
    addCategory,
    updateCategory,
    deactivateCategory,
    getCategoryById,
    initDefaultCategories,
  };
});