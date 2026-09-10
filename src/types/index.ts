export type ItemStatus = 'active' | 'ended';
export type WarrantyType = 'unset' | 'none' | 'custom';
export type BillingType = 'one_time' | 'monthly' | 'yearly';
export type RecordType = 'asset' | 'expense';
export type CostDisplayUnit = 'day' | 'month';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Item {
  id: string;
  name: string;
  /** 旧备份中没有该字段时，根据 billingType 自动兼容。 */
  recordType?: RecordType;
  brandModel?: string;
  billingType: BillingType;
  billingAmountInCents: number;
  purchaseDate: string;
  startDate: string;
  firstPaymentDate?: string;
  categoryId: string;
  imageId?: string;
  iconKey?: string;
  cardColor?: string;
  warrantyType: WarrantyType;
  warrantyMonths?: number;
  status: ItemStatus;
  endDate?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  iconKey: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  currency: 'CNY';
  amountVisible: boolean;
  costDisplayUnit: CostDisplayUnit;
  defaultSort: string;
  theme: ThemeMode;
}

export interface BackupImage {
  id: string;
  mimeType: string;
  base64: string;
}

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  settings: AppSettings;
  categories: Category[];
  items: Item[];
  images: BackupImage[];
}
