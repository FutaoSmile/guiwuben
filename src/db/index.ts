import Dexie, { type Table } from 'dexie';
import type { Item, Category, AppSettings } from '../types';
import { convertLegacyExpenseAmountInCents } from '../domain';

const STORE_SCHEMA = {
  items: 'id, categoryId, status, billingType, purchaseDate, startDate, createdAt',
  categories: 'id, sortOrder, isSystem, isActive',
};

export class GuiWuBenDB extends Dexie {
  items!: Table<Item, string>;
  categories!: Table<Category, string>;

  constructor() {
    super('GuiWuBenDB');
    this.version(1).stores(STORE_SCHEMA);
    this.version(2).stores(STORE_SCHEMA).upgrade(async transaction => {
      await transaction.table<Item, string>('items').toCollection().modify(item => {
        if (item.recordType !== 'expense' || !item.endDate || item.billingType === 'one_time') return;
        item.billingAmountInCents = convertLegacyExpenseAmountInCents(
          item.billingType,
          item.billingAmountInCents,
          item.startDate,
          item.endDate
        );
      });
    });
  }
}

export const db = new GuiWuBenDB();

/**
 * 默认分类
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-all', name: '全部', iconKey: 'all', color: '#6366f1', sortOrder: 0, isSystem: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-digital', name: '数码产品', iconKey: 'digital', color: '#3b82f6', sortOrder: 1, isSystem: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-home', name: '生活家居', iconKey: 'home', color: '#10b981', sortOrder: 2, isSystem: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-transport', name: '交通出行', iconKey: 'transport', color: '#f59e0b', sortOrder: 3, isSystem: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-sport', name: '运动健康', iconKey: 'sport', color: '#ef4444', sortOrder: 4, isSystem: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-fashion', name: '服饰箱包', iconKey: 'fashion', color: '#ec4899', sortOrder: 5, isSystem: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-subscription', name: '订阅租赁', iconKey: 'subscription', color: '#8b5cf6', sortOrder: 6, isSystem: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-other', name: '其他', iconKey: 'other', color: '#6b7280', sortOrder: 7, isSystem: true, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'CNY',
  amountVisible: true,
  costDisplayUnit: 'day',
  defaultSort: 'createdAt-desc',
  theme: 'system',
};

export async function initDB(): Promise<void> {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }
}
