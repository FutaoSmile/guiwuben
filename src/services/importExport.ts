/**
 * 数据导入导出服务
 * 支持将物品、分类、设置和图片导出为 JSON 备份文件，
 * 并支持通过 "合并" 或 "覆盖" 模式导入备份文件。
 */
import type {
  BackupFile,
  BackupImage,
  Item,
  Category,
  AppSettings,
  BillingType,
  WarrantyType,
  ItemStatus,
  ThemeMode,
  CostDisplayUnit,
} from '../types';
import { db } from '../db';
import { useItemsStore } from '../stores/items';
import { useCategoriesStore } from '../stores/categories';
import { useSettingsStore } from '../stores/settings';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

/** 当前支持的最新备份 schema 版本 */
const CURRENT_SCHEMA_VERSION = 2;

/** 导入文件大小上限：20 MB */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** 应用版本号（后期可从 package.json / 构建环境变量注入） */
const APP_VERSION = '1.0.0';

/** 合法的 BillingType 枚举值 */
const VALID_BILLING_TYPES: BillingType[] = ['one_time', 'monthly', 'yearly'];

/** 合法的 WarrantyType 枚举值 */
const VALID_WARRANTY_TYPES: WarrantyType[] = ['unset', 'none', 'custom'];

/** 合法的 ItemStatus 枚举值 */
const VALID_ITEM_STATUSES: ItemStatus[] = ['active', 'ended'];

/** 合法的 ThemeMode 枚举值 */
const VALID_THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

/** 合法的 CostDisplayUnit 枚举值 */
const VALID_COST_UNITS: CostDisplayUnit[] = ['day', 'month'];

// ---------------------------------------------------------------------------
// 导出
// ---------------------------------------------------------------------------

/**
 * 执行数据导出，生成备份 JSON 文件并触发浏览器下载。
 *
 * 导出内容包括：当前设置、全部分类、全部物品（含软删除）、关联图片。
 */
export async function exportBackup(): Promise<void> {
  // 1. 收集数据
  const settings = useSettingsStore();
  const categoriesStore = useCategoriesStore();
  const itemsStore = useItemsStore();

  // 确保数据已加载
  await Promise.all([
    categoriesStore.loadCategories(),
    itemsStore.loadItems(),
  ]);

  // 设置来自 localStorage（已由 settings store 维护）
  const appSettings: AppSettings = { ...settings.settings };

  // 分类 & 物品
  const categories: Category[] = await db.categories.toArray();
  const items: Item[] = await db.items.toArray();

  // 图片：尝试从 'images' 表中读取；若表不存在则返回空数组
  let images: BackupImage[] = [];
  try {
    const imagesTable = db.table<BackupImage, string>('images');
    const exists = await db.tables.some((t) => t.name === 'images');
    if (exists) {
      images = await imagesTable.toArray();
    }
  } catch {
    // images 表不存在，忽略
  }

  // 2. 构建备份对象
  const backup: BackupFile = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    settings: appSettings,
    categories,
    items,
    images,
  };

  // 3. 触发下载
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const filename = `归物本备份_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}_${pad(now.getHours())}${pad(now.getMinutes())}.json`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// 导入 —— 校验报告
// ---------------------------------------------------------------------------

/** 单条校验结果 */
export interface ValidationEntry {
  /** 问题描述 */
  message: string;
  /** 严重级别 */
  severity: 'error' | 'warning';
  /** 关联的备份数据类型 */
  source: 'settings' | 'categories' | 'items' | 'images' | 'meta';
  /** 关联的 ID（若有） */
  id?: string;
  /** 关联的索引（若有） */
  index?: number;
}

/** 导入前预检结果 */
export interface PreCheckResult {
  /** 是否通过全部校验（无 error） */
  valid: boolean;
  /** 校验条目列表 */
  entries: ValidationEntry[];
  /** 统计数据（仅通过基本校验后的有效数据） */
  stats: {
    itemCount: number;
    categoryCount: number;
    imageCount: number;
    /** 新引入的物品数（合并模式下） */
    newItems: number;
    /** 会覆盖的已有物品数（合并模式下） */
    updatedItems: number;
    /** 新引入的分类数（合并模式下） */
    newCategories: number;
    /** 会覆盖的已有分类数（合并模式下） */
    updatedCategories: number;
  };
}

/**
 * 校验单个物品字段
 */
function validateItem(item: unknown, index: number): ValidationEntry[] {
  const result: ValidationEntry[] = [];
  if (!item || typeof item !== 'object') {
    result.push({
      message: `items[${index}] 不是对象`,
      severity: 'error',
      source: 'items',
      index,
    });
    return result;
  }

  const i = item as Record<string, unknown>;
  const id = typeof i.id === 'string' ? i.id : undefined;

  // 必填字符串字段
  const requiredStrFields: { key: string; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '名称' },
    { key: 'billingType', label: '付费类型' },
    { key: 'purchaseDate', label: '购买日期' },
    { key: 'startDate', label: '开始日期' },
    { key: 'categoryId', label: '分类 ID' },
    { key: 'status', label: '状态' },
    { key: 'createdAt', label: '创建时间' },
    { key: 'updatedAt', label: '更新时间' },
  ];
  for (const { key, label } of requiredStrFields) {
    if (typeof i[key] !== 'string' || (i[key] as string).trim() === '') {
      result.push({
        message: `物品${id ? ` "${id}"` : `[${index}]`} 缺少必填字段：${label}`,
        severity: 'error',
        source: 'items',
        id,
        index,
      });
    }
  }

  // billingAmountInCents
  if (typeof i.billingAmountInCents !== 'number' || i.billingAmountInCents < 0) {
    result.push({
      message: `物品${id ? ` "${id}"` : `[${index}]`} 的金额无效（必须 >= 0）`,
      severity: 'error',
      source: 'items',
      id,
      index,
    });
  }

  // 枚举校验
  if (i.billingType && !VALID_BILLING_TYPES.includes(i.billingType as BillingType)) {
    result.push({
      message: `物品${id ? ` "${id}"` : `[${index}]`} 的付费类型非法：${i.billingType}`,
      severity: 'error',
      source: 'items',
      id,
      index,
    });
  }
  if (i.warrantyType && !VALID_WARRANTY_TYPES.includes(i.warrantyType as WarrantyType)) {
    result.push({
      message: `物品${id ? ` "${id}"` : `[${index}]`} 的保修类型非法：${i.warrantyType}`,
      severity: 'error',
      source: 'items',
      id,
      index,
    });
  }
  if (i.status && !VALID_ITEM_STATUSES.includes(i.status as ItemStatus)) {
    result.push({
      message: `物品${id ? ` "${id}"` : `[${index}]`} 的状态非法：${i.status}`,
      severity: 'error',
      source: 'items',
      id,
      index,
    });
  }

  // warrantyMonths 范围
  if (
    i.warrantyType === 'custom' &&
    (typeof i.warrantyMonths !== 'number' || i.warrantyMonths! < 1 || i.warrantyMonths! > 1200)
  ) {
    result.push({
      message: `物品${id ? ` "${id}"` : `[${index}]`} 的保修月数无效（范围 1-1200）`,
      severity: 'error',
      source: 'items',
      id,
      index,
    });
  }

  return result;
}

/**
 * 校验单个分类字段
 */
function validateCategory(cat: unknown, index: number): ValidationEntry[] {
  const result: ValidationEntry[] = [];
  if (!cat || typeof cat !== 'object') {
    result.push({
      message: `categories[${index}] 不是对象`,
      severity: 'error',
      source: 'categories',
      index,
    });
    return result;
  }

  const c = cat as Record<string, unknown>;
  const id = typeof c.id === 'string' ? c.id : undefined;

  const requiredStrFields: { key: string; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '名称' },
    { key: 'iconKey', label: 'Emoji' },
    { key: 'color', label: '颜色' },
    { key: 'createdAt', label: '创建时间' },
    { key: 'updatedAt', label: '更新时间' },
  ];
  for (const { key, label } of requiredStrFields) {
    if (typeof c[key] !== 'string' || (c[key] as string).trim() === '') {
      result.push({
        message: `分类${id ? ` "${id}"` : `[${index}]`} 缺少必填字段：${label}`,
        severity: 'error',
        source: 'categories',
        id,
        index,
      });
    }
  }

  // sortOrder
  if (typeof c.sortOrder !== 'number' || !Number.isInteger(c.sortOrder)) {
    result.push({
      message: `分类${id ? ` "${id}"` : `[${index}]`} 的排序值必须为整数`,
      severity: 'error',
      source: 'categories',
      id,
      index,
    });
  }

  // isSystem / isActive
  if (typeof c.isSystem !== 'boolean') {
    result.push({
      message: `分类${id ? ` "${id}"` : `[${index}]`} 的 isSystem 必须为布尔值`,
      severity: 'error',
      source: 'categories',
      id,
      index,
    });
  }
  if (typeof c.isActive !== 'boolean') {
    result.push({
      message: `分类${id ? ` "${id}"` : `[${index}]`} 的 isActive 必须为布尔值`,
      severity: 'error',
      source: 'categories',
      id,
      index,
    });
  }

  // color 格式
  if (c.color && typeof c.color === 'string' && !/^#[0-9a-fA-F]{6}$/.test(c.color)) {
    result.push({
      message: `分类${id ? ` "${id}"` : `[${index}]`} 的颜色值不是合法十六进制颜色`,
      severity: 'warning',
      source: 'categories',
      id,
      index,
    });
  }

  return result;
}

/**
 * 校验设置字段
 */
function validateSettings(settings: unknown): ValidationEntry[] {
  const result: ValidationEntry[] = [];
  if (!settings || typeof settings !== 'object') {
    result.push({ message: '设置数据不是对象', severity: 'error', source: 'settings' });
    return result;
  }

  const s = settings as Record<string, unknown>;

  if (s.currency !== 'CNY') {
    result.push({
      message: `不支持的货币：${s.currency}，仅支持 CNY`,
      severity: 'warning',
      source: 'settings',
    });
  }
  if (typeof s.amountVisible !== 'boolean') {
    result.push({
      message: 'amountVisible 必须为布尔值',
      severity: 'error',
      source: 'settings',
    });
  }
  if (s.costDisplayUnit && !VALID_COST_UNITS.includes(s.costDisplayUnit as CostDisplayUnit)) {
    result.push({
      message: `无效的费用展示单位：${s.costDisplayUnit}`,
      severity: 'error',
      source: 'settings',
    });
  }
  if (s.theme && !VALID_THEME_MODES.includes(s.theme as ThemeMode)) {
    result.push({
      message: `无效的主题：${s.theme}`,
      severity: 'error',
      source: 'settings',
    });
  }
  if (typeof s.defaultSort !== 'string') {
    result.push({
      message: 'defaultSort 必须为字符串',
      severity: 'error',
      source: 'settings',
    });
  }

  return result;
}

/**
 * 校验单个图片字段
 */
function validateImage(img: unknown, index: number): ValidationEntry[] {
  const result: ValidationEntry[] = [];
  if (!img || typeof img !== 'object') {
    result.push({
      message: `images[${index}] 不是对象`,
      severity: 'error',
      source: 'images',
      index,
    });
    return result;
  }

  const image = img as Record<string, unknown>;

  if (typeof image.id !== 'string' || !image.id) {
    result.push({
      message: `images[${index}] 缺少有效的 id`,
      severity: 'error',
      source: 'images',
      index,
    });
  }
  if (typeof image.mimeType !== 'string' || !image.mimeType) {
    result.push({
      message: `图片${image.id ? ` "${image.id}"` : `[${index}]`} 缺少 mimeType`,
      severity: 'error',
      source: 'images',
      index,
      id: typeof image.id === 'string' ? image.id : undefined,
    });
  }
  if (typeof image.base64 !== 'string' || !image.base64) {
    result.push({
      message: `图片${image.id ? ` "${image.id}"` : `[${index}]`} 缺少 base64 数据`,
      severity: 'error',
      source: 'images',
      index,
      id: typeof image.id === 'string' ? image.id : undefined,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// 导入 —— 核心
// ---------------------------------------------------------------------------

export type ImportMode = 'merge' | 'overwrite';

export interface ImportResult {
  success: boolean;
  message: string;
  /** 成功导入的物品数 */
  importedItems: number;
  /** 成功导入的分类数 */
  importedCategories: number;
  /** 成功导入的图片数 */
  importedImages: number;
}

/**
 * 读取用户选择的文件并进行预校验，返回解析后的备份数据及校验报告。
 *
 * @param file - 用户选择的 File 对象
 * @returns 包含解析后的 BackupFile（若格式正确）及 PreCheckResult
 *
 * @throws 如果文件大小超限或不是有效 JSON 格式
 */
export async function preCheckFile(file: File): Promise<{
  backup: BackupFile;
  report: PreCheckResult;
}> {
  // 文件大小检查
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `文件大小超出限制（最大 ${MAX_FILE_SIZE / 1024 / 1024} MB）`
    );
  }

  // 读取内容
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error('无法读取文件');
  }

  // 解析 JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('文件不是有效的 JSON 格式');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('备份文件格式错误：根节点不是对象');
  }

  const backup = parsed as Record<string, unknown>;
  const entries: ValidationEntry[] = [];

  // 1. 校验 schemaVersion
  if (
    typeof backup.schemaVersion !== 'number' ||
    !Number.isInteger(backup.schemaVersion) ||
    (backup.schemaVersion as number) < 1
  ) {
    entries.push({
      message: `不支持的 schemaVersion：${backup.schemaVersion}，当前版本为 ${CURRENT_SCHEMA_VERSION}`,
      severity: 'error',
      source: 'meta',
    });
  }

  // 2. 校验必填顶层字段
  const requiredTopKeys = ['exportedAt', 'appVersion', 'settings', 'categories', 'items', 'images'];
  for (const key of requiredTopKeys) {
    if (!(key in backup)) {
      entries.push({
        message: `备份文件缺少顶层字段：${key}`,
        severity: 'error',
        source: 'meta',
      });
    }
  }

  // 如果缺少关键字段，提前返回
  if (entries.some((e) => e.severity === 'error' && e.source === 'meta')) {
    return {
      backup: backup as unknown as BackupFile,
      report: {
        valid: false,
        entries,
        stats: { itemCount: 0, categoryCount: 0, imageCount: 0, newItems: 0, updatedItems: 0, newCategories: 0, updatedCategories: 0 },
      },
    };
  }

  // 3. 校验设置
  const settingsErrors = validateSettings(backup.settings);
  entries.push(...settingsErrors);

  // 4. 校验分类
  const cats = Array.isArray(backup.categories) ? backup.categories : [];
  for (let i = 0; i < cats.length; i++) {
    entries.push(...validateCategory(cats[i], i));
  }

  // 5. 校验物品
  const itms = Array.isArray(backup.items) ? backup.items : [];
  for (let i = 0; i < itms.length; i++) {
    entries.push(...validateItem(itms[i], i));
  }

  // 6. 校验图片
  const imgs = Array.isArray(backup.images) ? backup.images : [];
  for (let i = 0; i < imgs.length; i++) {
    entries.push(...validateImage(imgs[i], i));
  }

  // 7. 统计有效数据
  const validItems = itms.filter((_, i) =>
    !entries.some((e) => e.source === 'items' && e.index === i && e.severity === 'error')
  );
  const validCats = cats.filter((_, i) =>
    !entries.some((e) => e.source === 'categories' && e.index === i && e.severity === 'error')
  );
  const validImgs = imgs.filter((_, i) =>
    !entries.some((e) => e.source === 'images' && e.index === i && e.severity === 'error')
  );

  const hasError = entries.some((e) => e.severity === 'error');

  return {
    backup: backup as unknown as BackupFile,
    report: {
      valid: !hasError,
      entries,
      stats: {
        itemCount: validItems.length,
        categoryCount: validCats.length,
        imageCount: validImgs.length,
        newItems: 0,
        updatedItems: 0,
        newCategories: 0,
        updatedCategories: 0,
      },
    },
  };
}

/**
 * 执行数据导入。
 *
 * @param backup - 解析后的备份数据
 * @param mode   - 导入模式：'merge' | 'overwrite'
 * @param validEntryIds - 预检后判定合法的条目 ID（仅导入这些条目）
 */
export async function importBackup(
  backup: BackupFile,
  mode: ImportMode,
  validEntryIds?: {
    itemIds: Set<string>;
    categoryIds: Set<string>;
    imageIds: Set<string>;
  }
): Promise<ImportResult> {
  const itemsStore = useItemsStore();
  const categoriesStore = useCategoriesStore();
  const settingsStore = useSettingsStore();

  let importedItems = 0;
  let importedCategories = 0;
  let importedImages = 0;

  try {
    await db.transaction('rw', db.items, db.categories, async () => {
      // ---- 设置 ----
      settingsStore.importSettings(backup.settings);

      if (mode === 'overwrite') {
        // ---- 覆盖模式：清除旧数据 ----
        await db.items.clear();
        await db.categories.clear();
        // 清空 images 表（若存在）
        try {
          const imagesTable = db.table<BackupImage, string>('images');
          if (db.tables.some((t) => t.name === 'images')) {
            await imagesTable.clear();
          }
        } catch {
          // 忽略
        }

        // 写入分类
        const catsToAdd = validEntryIds
          ? backup.categories.filter((c) => validEntryIds.categoryIds.has(c.id))
          : backup.categories;
        if (catsToAdd.length > 0) {
          await db.categories.bulkAdd(catsToAdd);
          importedCategories = catsToAdd.length;
        }

        // 写入物品
        const itemsToAdd = validEntryIds
          ? backup.items.filter((i) => validEntryIds.itemIds.has(i.id))
          : backup.items;
        if (itemsToAdd.length > 0) {
          await db.items.bulkAdd(itemsToAdd);
          importedItems = itemsToAdd.length;
        }

        // 写入图片
        if (backup.images.length > 0) {
          try {
            const imagesTable = db.table<BackupImage, string>('images');
            if (db.tables.some((t) => t.name === 'images')) {
              const imgsToAdd = validEntryIds
                ? backup.images.filter((img) => validEntryIds.imageIds.has(img.id))
                : backup.images;
              if (imgsToAdd.length > 0) {
                await imagesTable.bulkAdd(imgsToAdd);
                importedImages = imgsToAdd.length;
              }
            }
          } catch {
            // images 表不存在，跳过图片导入
          }
        }
      } else {
        // ---- 合并模式：UUID 去重，按 updatedAt 决定覆盖 ----

        // 合并分类
        for (const cat of backup.categories) {
          if (validEntryIds && !validEntryIds.categoryIds.has(cat.id)) continue;

          const existing = await db.categories.get(cat.id);
          if (!existing) {
            await db.categories.add(cat);
            importedCategories++;
          } else if (cat.updatedAt > existing.updatedAt) {
            await db.categories.put(cat);
            importedCategories++;
          }
        }

        // 合并物品
        for (const item of backup.items) {
          if (validEntryIds && !validEntryIds.itemIds.has(item.id)) continue;

          const existing = await db.items.get(item.id);
          if (!existing) {
            await db.items.add(item);
            importedItems++;
          } else if (item.updatedAt > existing.updatedAt) {
            await db.items.put(item);
            importedItems++;
          }
        }

        // 合并图片
        if (backup.images.length > 0) {
          try {
            const imagesTable = db.table<BackupImage, string>('images');
            if (db.tables.some((t) => t.name === 'images')) {
              for (const img of backup.images) {
                if (validEntryIds && !validEntryIds.imageIds.has(img.id)) continue;

                const existing = await imagesTable.get(img.id);
                if (!existing) {
                  await imagesTable.add(img);
                  importedImages++;
                }
                // 图片没有 updatedAt，有相同 ID 即跳过
              }
            }
          } catch {
            // 忽略
          }
        }
      }
    });

    // 刷新数据
    await Promise.all([
      itemsStore.loadItems(),
      categoriesStore.loadCategories(),
      categoriesStore.loadActiveCategories(),
    ]);

    return {
      success: true,
      message:
        mode === 'overwrite'
          ? `已覆盖导入 ${importedItems} 个物品、${importedCategories} 个分类、${importedImages} 张图片`
          : `已合并导入 ${importedItems} 个物品、${importedCategories} 个分类、${importedImages} 张图片`,
      importedItems,
      importedCategories,
      importedImages,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : '导入过程中发生未知错误';
    console.error('[importBackup] 导入失败:', e);
    return {
      success: false,
      message: `导入失败：${message}`,
      importedItems: 0,
      importedCategories: 0,
      importedImages: 0,
    };
  }
}
