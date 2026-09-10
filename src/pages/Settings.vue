<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '../stores/settings';
import { useItemsStore } from '../stores/items';
import { useCategoriesStore } from '../stores/categories';
import { db } from '../db';
import type { BackupFile, BackupImage } from '../types';
import { convertLegacyExpenseAmountInCents } from '../domain';

const router = useRouter();
const settings = useSettingsStore();
const itemsStore = useItemsStore();
const categoriesStore = useCategoriesStore();

const importStatus = ref<'idle' | 'validating' | 'preview' | 'error'>('idle');
const importPreview = ref<{ itemCount: number; catCount: number; errors: string[] } | null>(null);
const importError = ref<string>('');
const importData = ref<BackupFile | null>(null);

const showClearConfirm = ref(false);
const showOverwriteConfirm = ref(false);

function goBack() {
  router.push('/');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Export
async function handleExport() {
  try {
    const allItems = await db.items.toArray();
    const allCategories = await db.categories.toArray();

    // Collect image data from items that have images
    const images: BackupImage[] = [];

    const backup: BackupFile = {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      settings: settings.settings,
      categories: allCategories,
      items: allItems,
      images,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `归物本备份_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('导出失败', e);
    alert('导出失败，请重试');
  }
}

// Import validation
async function handleImportFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  importStatus.value = 'validating';
  importError.value = '';
  importPreview.value = null;

  // Check file size (20MB limit)
  if (file.size > 20 * 1024 * 1024) {
    importStatus.value = 'error';
    importError.value = `文件过大（${formatFileSize(file.size)}），最大支持 20MB`;
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text) as BackupFile;

    // Validate schemaVersion
    if (!data.schemaVersion || ![1, 2].includes(data.schemaVersion)) {
      importStatus.value = 'error';
      importError.value = `不支持的版本 (schemaVersion: ${data.schemaVersion})，支持版本 1–2`;
      return;
    }

    // Validate required fields
    const errors: string[] = [];
    if (!Array.isArray(data.items)) errors.push('items 字段缺失或格式错误');
    if (!Array.isArray(data.categories)) errors.push('categories 字段缺失或格式错误');
    if (!data.settings) errors.push('settings 字段缺失');

    // Validate items
    for (const item of (data.items || [])) {
      if (!item.id) errors.push('存在缺少 id 的物品');
      if (!item.name) errors.push('存在缺少名称的物品');
      if (!item.billingType) errors.push(`物品 "${item.name || '未知'}" 缺少计费方式`);
      if (typeof item.billingAmountInCents !== 'number') errors.push(`物品 "${item.name || '未知'}" 金额格式错误`);
    }

    if (data.schemaVersion === 1 && Array.isArray(data.items)) {
      data.items = data.items.map(item => {
        if (item.recordType !== 'expense' || !item.endDate || item.billingType === 'one_time') return item;
        return {
          ...item,
          billingAmountInCents: convertLegacyExpenseAmountInCents(
            item.billingType,
            item.billingAmountInCents,
            item.startDate,
            item.endDate
          ),
        };
      });
      data.schemaVersion = 2;
    }

    importPreview.value = {
      itemCount: data.items?.length || 0,
      catCount: data.categories?.length || 0,
      errors,
    };
    importData.value = data;
    importStatus.value = errors.length > 0 ? 'preview' : 'preview';
  } catch (e) {
    importStatus.value = 'error';
    importError.value = '文件解析失败，请确认选择了正确的备份文件';
  }
}

// Merge import
async function confirmMergeImport() {
  if (!importData.value) return;

  try {
    const data = importData.value;
    const now = new Date().toISOString();

    // Merge categories: by UUID, updatedAt wins
    for (const cat of data.categories) {
      const existing = await db.categories.get(cat.id);
      if (existing) {
        if (cat.updatedAt > existing.updatedAt) {
          await db.categories.put({ ...existing, ...cat, updatedAt: now });
        }
      } else {
        await db.categories.add(cat);
      }
    }

    // Merge items: by UUID, updatedAt wins
    for (const item of data.items) {
      const existing = await db.items.get(item.id);
      if (existing) {
        if (item.updatedAt > existing.updatedAt) {
          await db.items.put({ ...existing, ...item, updatedAt: now });
        }
      } else {
        await db.items.add(item);
      }
    }

    // Reload data
    await Promise.all([
      itemsStore.loadItems(),
      categoriesStore.loadCategories(),
      categoriesStore.loadActiveCategories(),
    ]);

    importStatus.value = 'idle';
    importData.value = null;
    alert('导入成功！');
  } catch (e) {
    console.error('导入失败', e);
    alert('导入失败，数据未受影响');
  }
}

// Overwrite import
async function confirmOverwriteImport() {
  if (!importData.value) return;
  showOverwriteConfirm.value = false;

  try {
    const data = importData.value;
    const now = new Date().toISOString();

    // Clear existing data
    await db.items.clear();
    await db.categories.clear();

    // Write imported data
    await db.categories.bulkAdd(
      data.categories.map(c => ({ ...c, updatedAt: now }))
    );
    await db.items.bulkAdd(
      data.items.map(i => ({ ...i, updatedAt: now }))
    );

    // Update settings
    settings.importSettings(data.settings);

    // Reload
    await Promise.all([
      itemsStore.loadItems(),
      categoriesStore.loadCategories(),
      categoriesStore.loadActiveCategories(),
    ]);

    importStatus.value = 'idle';
    importData.value = null;
    alert('覆盖导入成功！');
  } catch (e) {
    console.error('覆盖导入失败', e);
    // Try to reload existing data
    await itemsStore.loadItems();
    await categoriesStore.loadCategories();
    alert('导入失败，已恢复原数据');
  }
}

// Clear all data
async function confirmClearData() {
  try {
    await db.items.clear();
    await db.categories.clear();
    // Re-init default categories
    await categoriesStore.initDefaultCategories();
    await itemsStore.loadItems();
    showClearConfirm.value = false;
    alert('所有数据已清空');
  } catch (e) {
    console.error('清空失败', e);
    alert('清空数据失败，请重试');
  }
}
</script>

<template>
  <div class="settings-page">
    <header class="page-header">
      <button class="back-btn" aria-label="返回" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1 class="page-title">设置</h1>
    </header>

    <div class="settings-content">
      <!-- Appearance -->
      <section class="setting-section">
        <h2 class="section-title">外观</h2>
        <div class="setting-item">
          <span class="setting-label">金额可见</span>
          <button
            class="toggle-btn"
            :class="{ active: settings.amountVisible }"
            :aria-label="settings.amountVisible ? '隐藏金额' : '显示金额'"
            @click="settings.toggleAmountVisibility()"
          >
            <span class="toggle-knob" />
          </button>
        </div>
        <div class="setting-item">
          <span class="setting-label">成本单位</span>
          <div class="unit-toggle">
            <button
              class="unit-btn"
              :class="{ active: settings.costDisplayUnit === 'day' }"
              @click="settings.setCostDisplayUnit('day')"
            >按天</button>
            <button
              class="unit-btn"
              :class="{ active: settings.costDisplayUnit === 'month' }"
              @click="settings.setCostDisplayUnit('month')"
            >按月</button>
          </div>
        </div>
      </section>

      <!-- Data Management -->
      <section class="setting-section">
        <h2 class="section-title">数据管理</h2>

        <div class="setting-item action-item">
          <div class="setting-info">
            <span class="setting-label">导出数据</span>
            <span class="setting-desc">导出为 JSON 备份文件</span>
          </div>
          <button class="action-btn" @click="handleExport">导出</button>
        </div>

        <div class="setting-item action-item">
          <div class="setting-info">
            <span class="setting-label">导入数据</span>
            <span class="setting-desc">从备份文件恢复</span>
          </div>
          <label class="action-btn import-label">
            导入
            <input
              type="file"
              accept=".json,application/json"
              class="file-input"
              @change="handleImportFile"
            />
          </label>
        </div>

        <!-- Import preview -->
        <div v-if="importStatus === 'preview' && importPreview" class="import-preview">
          <div class="preview-info">
            <p>物品：{{ importPreview.itemCount }} 件</p>
            <p>分类：{{ importPreview.catCount }} 个</p>
            <p v-if="importPreview.errors.length > 0" class="preview-errors">
              异常：{{ importPreview.errors.length }} 项
              <span v-for="err in importPreview.errors" :key="err" class="error-item">{{ err }}</span>
            </p>
          </div>
          <div class="preview-actions">
            <button class="action-btn primary" @click="confirmMergeImport" :disabled="importPreview.errors.length > 0">
              合并导入
            </button>
            <button class="action-btn danger" @click="showOverwriteConfirm = true" :disabled="importPreview.errors.length > 0">
              覆盖导入
            </button>
          </div>
        </div>

        <div v-if="importStatus === 'error'" class="import-error">
          <p>{{ importError }}</p>
        </div>

        <div class="setting-item action-item">
          <div class="setting-info">
            <span class="setting-label text-danger">清空所有数据</span>
            <span class="setting-desc">此操作不可撤销</span>
          </div>
          <button class="action-btn danger" @click="showClearConfirm = true">清空</button>
        </div>
      </section>

      <!-- About -->
      <section class="setting-section">
        <h2 class="section-title">关于</h2>
        <div class="setting-item">
          <span class="setting-label">应用版本</span>
          <span class="setting-value">1.0.0</span>
        </div>
        <div class="setting-item info-item">
          <p class="info-text">
            归物本是一款纯本地物品资产与使用成本管理工具。
            所有数据保存在当前浏览器中，清除浏览器数据或卸载浏览器可能导致数据丢失，建议定期导出备份。
          </p>
        </div>
      </section>
    </div>

    <!-- Clear data confirmation -->
    <Teleport to="body">
      <div v-if="showClearConfirm" class="modal-overlay" @click.self="showClearConfirm = false">
        <div class="modal-content" role="dialog" aria-label="确认清空">
          <h3>确认清空所有数据</h3>
          <p>此操作将删除所有物品和分类数据，且不可撤销。建议先导出备份。</p>
          <div class="modal-actions">
            <button class="action-btn" @click="showClearConfirm = false">取消</button>
            <button class="action-btn danger" @click="confirmClearData">确认清空</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Overwrite confirmation -->
    <Teleport to="body">
      <div v-if="showOverwriteConfirm" class="modal-overlay" @click.self="showOverwriteConfirm = false">
        <div class="modal-content" role="dialog" aria-label="确认覆盖导入">
          <h3>确认覆盖导入</h3>
          <p>覆盖导入将替换当前所有数据，此操作不可撤销。建议先导出备份。</p>
          <div class="modal-actions">
            <button class="action-btn" @click="showOverwriteConfirm = false">取消</button>
            <button class="action-btn danger" @click="confirmOverwriteImport">确认覆盖</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-page {
  padding: var(--spacing-lg) var(--spacing-md);
  padding-bottom: calc(var(--bottom-nav-height) + var(--spacing-lg) + var(--safe-area-bottom));
  max-width: var(--content-max-width);
  margin: 0 auto;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-2xl);
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

.setting-section {
  margin-bottom: var(--spacing-2xl);
}

.section-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-sm);
  padding: 0 var(--spacing-sm);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-sm);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  margin-bottom: 1px;
}

.setting-item + .setting-item {
  margin-top: 1px;
}

.setting-label {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.text-danger {
  color: var(--color-danger);
}

.setting-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.setting-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.setting-info {
  display: flex;
  flex-direction: column;
}

.action-item {
  padding: var(--spacing-lg) var(--spacing-sm);
}

.action-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  background: var(--color-surface-secondary);
  color: var(--color-text-primary);
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}

.action-btn.primary {
  background: var(--color-primary);
  color: white;
}

.action-btn.danger {
  background: var(--color-danger);
  color: white;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.import-label {
  cursor: pointer;
}

.file-input {
  display: none;
}

/* Toggle */
.toggle-btn {
  width: 48px;
  height: 28px;
  border-radius: 14px;
  background: var(--color-text-tertiary);
  position: relative;
  transition: background 0.2s;
}

.toggle-btn.active {
  background: var(--color-primary);
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-btn.active .toggle-knob {
  transform: translateX(20px);
}

.unit-toggle {
  display: flex;
  background: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.unit-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  min-height: 44px;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.unit-btn.active {
  background: var(--color-primary);
  color: white;
}

/* Import preview */
.import-preview {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  margin-top: var(--spacing-sm);
}

.preview-info {
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.preview-errors {
  color: var(--color-danger);
  margin-top: var(--spacing-sm);
}

.error-item {
  display: block;
  font-size: var(--font-size-xs);
  margin-top: 2px;
  padding-left: var(--spacing-md);
}

.preview-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.import-error {
  background: #fef2f2;
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);
}

.info-item {
  padding: var(--spacing-md);
}

.info-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  line-height: 1.6;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  max-width: 320px;
  width: 100%;
}

.modal-content h3 {
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-md);
}

.modal-content p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.settings-page { padding: calc(20px + var(--safe-area-top)) 16px 40px; min-height: 100dvh; }
.page-header { padding: 0 4px; margin-bottom: 20px; }
.page-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
.setting-section {
  overflow: hidden;
  margin-bottom: 14px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(14px);
}
.section-title { color: var(--color-primary); font-weight: 750; }
.action-btn.primary { background: linear-gradient(135deg, #7075ff, #4d46eb); }
.modal-content { border: 1px solid rgba(255, 255, 255, 0.92); box-shadow: var(--shadow-lg); }
</style>
