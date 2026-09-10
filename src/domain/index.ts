import type { BillingType, CostDisplayUnit, Item, RecordType } from '../types';

/**
 * 将 YYYY-MM-DD 字符串转为本地日期（避免时区偏移）
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 比较两个 YYYY-MM-DD 日期字符串是否同一天
 */
export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

/**
 * 获取今天日期字符串 YYYY-MM-DD
 */
export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type DateShortcut = 'month-start' | 'month-end' | 'year-start' | 'year-end';

/** 根据参考日期生成常用的月初、月末、年初和年末日期。 */
export function getDateShortcut(shortcut: DateShortcut, referenceDate = today()): string {
  const reference = parseLocalDate(referenceDate);
  const year = reference.getFullYear();
  const month = reference.getMonth();

  switch (shortcut) {
    case 'month-start': return formatLocalDate(new Date(year, month, 1));
    case 'month-end': return formatLocalDate(new Date(year, month + 1, 0));
    case 'year-start': return formatLocalDate(new Date(year, 0, 1));
    case 'year-end': return formatLocalDate(new Date(year, 11, 31));
  }
}

/**
 * 持有天数计算
 * 按自然日，包含开始日和结束日，最少为 1
 * 有 endDate 时使用结束日，否则使用今天
 */
export function calcHoldingDays(startDate: string, _status: 'active' | 'ended', endDate?: string): number {
  const end = endDate || today();
  const start = parseLocalDate(startDate);
  const endParsed = parseLocalDate(end);
  const diffMs = endParsed.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

/**
 * 自然日归一化天数差（按月付/年付周期计算）
 */
function daysBetween(start: string, end: string): number {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

/** 费用周期天数：按自然日计算，包含开始日和结束日。 */
export function calcPeriodDays(startDate: string, endDate: string): number {
  return Math.max(1, daysBetween(startDate, endDate) + 1);
}

/** 兼容旧数据：历史一次性记录视为长期物品，月付/年付记录视为周期费用。 */
export function resolveRecordType(item: Pick<Item, 'recordType' | 'billingType'>): RecordType {
  return item.recordType ?? (item.billingType === 'one_time' ? 'asset' : 'expense');
}

export function calcItemDays(item: Pick<Item,
  'recordType' | 'billingType' | 'purchaseDate' | 'startDate' | 'status' | 'endDate'
>): number {
  if (resolveRecordType(item) === 'expense' && item.endDate) {
    return calcPeriodDays(item.startDate, item.endDate);
  }
  return calcHoldingDays(item.purchaseDate || item.startDate, item.status, item.endDate);
}

/**
 * 一条记录的日均成本。
 * 长期物品：购入价 ÷ 购买日至今天（或报废日）的自然日数。
 * 周期费用：月度金额按 × 12 ÷ 365 折算，年度金额按 ÷ 365 折算。
 */
export function calcItemDailyCost(item: Pick<Item,
  'recordType' | 'billingType' | 'billingAmountInCents' | 'purchaseDate' | 'startDate' | 'status' | 'endDate'
>): number {
  if (item.recordType === 'expense') {
    if (item.billingType === 'one_time') {
      if (!item.endDate) return 0;
      return (item.billingAmountInCents / 100) / calcPeriodDays(item.startDate, item.endDate);
    }
    return calcDailyCost(item.billingType, item.billingAmountInCents, 1);
  }
  if (!item.recordType && item.billingType !== 'one_time') {
    return calcDailyCost(item.billingType, item.billingAmountInCents, 1);
  }
  return (item.billingAmountInCents / 100) / calcItemDays(item);
}

export function calcItemMonthlyCost(item: Pick<Item,
  'recordType' | 'billingType' | 'billingAmountInCents' | 'purchaseDate' | 'startDate' | 'status' | 'endDate'
>): number {
  return calcItemDailyCost(item) * 365 / 12;
}

export type TrendGranularity = 'daily' | 'monthly';

export interface CostTrendPoint {
  date: string;
  label: string;
  value: number;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

/** 计算某条记录在指定自然日的“当时日均成本”。 */
export function calcItemDailyCostOnDate(item: Item, date: string): number {
  const type = resolveRecordType(item);
  const start = type === 'asset' ? item.purchaseDate : item.startDate;
  if (date < start || (item.endDate && date > item.endDate)) return 0;

  if (type === 'expense') {
    return calcItemDailyCost(item);
  }

  return (item.billingAmountInCents / 100) / calcPeriodDays(item.purchaseDate, date);
}

/** 生成最近 30 天或最近 12 个月的综合日均成本趋势。 */
export function buildCostTrend(
  items: Item[],
  granularity: TrendGranularity,
  referenceDate = today()
): CostTrendPoint[] {
  const reference = parseLocalDate(referenceDate);

  if (granularity === 'daily') {
    return Array.from({ length: 30 }, (_, index) => {
      const date = addDays(reference, index - 29);
      const dateStr = formatLocalDate(date);
      return {
        date: dateStr,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        value: items.reduce((sum, item) => sum + calcItemDailyCostOnDate(item, dateStr), 0),
      };
    });
  }

  return Array.from({ length: 12 }, (_, index) => {
    const month = new Date(reference.getFullYear(), reference.getMonth() + index - 11, 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const observedEnd = monthEnd > reference ? reference : monthEnd;
    let total = 0;
    let days = 0;
    for (let date = month; date <= observedEnd; date = addDays(date, 1)) {
      const dateStr = formatLocalDate(date);
      total += items.reduce((sum, item) => sum + calcItemDailyCostOnDate(item, dateStr), 0);
      days += 1;
    }
    return {
      date: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
      label: `${month.getMonth() + 1}月`,
      value: days > 0 ? total / days : 0,
    };
  });
}

/**
 * 日成本计算
 */
export function calcDailyCost(billingType: BillingType, billingAmountInCents: number, holdingDays: number): number {
  if (holdingDays <= 0) return 0;
  const amount = billingAmountInCents / 100;
  switch (billingType) {
    case 'one_time':
      return amount / holdingDays;
    case 'monthly':
      return (amount * 12) / 365;
    case 'yearly':
      return amount / 365;
  }
}

/**
 * 月成本计算
 */
export function calcMonthlyCost(billingType: BillingType, billingAmountInCents: number, holdingDays: number): number {
  if (holdingDays <= 0) return 0;
  const amount = billingAmountInCents / 100;
  switch (billingType) {
    case 'one_time':
      return (amount / holdingDays) * 365 / 12;
    case 'monthly':
      return amount;
    case 'yearly':
      return amount / 12;
  }
}

/** 根据月度/年度金额，计算指定起止周期内的预计支出（分）。 */
export function calcExpensePeriodTotalInCents(
  billingType: BillingType,
  billingAmountInCents: number,
  startDate: string,
  endDate: string
): number {
  if (billingType === 'one_time') return billingAmountInCents;
  const dailyCost = calcDailyCost(billingType, billingAmountInCents, 1);
  return Math.round(dailyCost * calcPeriodDays(startDate, endDate) * 100);
}

/** 将旧版“整个周期总金额”换算为新版的每月/每年金额，保持原日均成本。 */
export function convertLegacyExpenseAmountInCents(
  billingType: BillingType,
  periodTotalInCents: number,
  startDate: string,
  endDate: string
): number {
  if (billingType === 'one_time') return periodTotalInCents;
  const annualizedAmount = periodTotalInCents * 365 / calcPeriodDays(startDate, endDate);
  return Math.round(billingType === 'monthly' ? annualizedAmount / 12 : annualizedAmount);
}

/**
 * 格式化金额显示（分 → 元），保留 2 位小数
 */
export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * 格式化成本，保留 2 位小数
 */
export function formatCost(value: number): string {
  return value.toFixed(2);
}

/**
 * 格式化持有天数
 */
export function formatHoldingDays(days: number): string {
  return `${days} 天`;
}

/**
 * 保修状态计算
 */
export interface WarrantyStatus {
  label: string;
  status: 'in_warranty' | 'expiring_soon' | 'expired' | 'no_warranty' | 'unset';
}

export function calcWarrantyStatus(
  warrantyType: 'unset' | 'none' | 'custom',
  warrantyMonths: number | undefined,
  purchaseDate: string
): WarrantyStatus {
  if (warrantyType === 'unset') {
    return { label: '未设置', status: 'unset' };
  }
  if (warrantyType === 'none') {
    return { label: '无保修', status: 'no_warranty' };
  }
  if (warrantyType === 'custom' && warrantyMonths != null) {
    const purchase = parseLocalDate(purchaseDate);
    const warrantyEnd = new Date(purchase.getFullYear(), purchase.getMonth() + warrantyMonths, purchase.getDate() - 1);
    const todayDate = parseLocalDate(today());
    const diffMs = warrantyEnd.getTime() - todayDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: '已过保', status: 'expired' };
    }
    if (diffDays <= 30) {
      return { label: '即将过保', status: 'expiring_soon' };
    }
    return { label: '在保中', status: 'in_warranty' };
  }
  return { label: '未设置', status: 'unset' };
}

/**
 * 保修截止日计算：购买日 + 保修月数 - 1 天
 */
export function calcWarrantyEndDate(purchaseDate: string, warrantyMonths: number): string {
  const purchase = parseLocalDate(purchaseDate);
  const end = new Date(purchase.getFullYear(), purchase.getMonth() + warrantyMonths, purchase.getDate() - 1);
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 获取某月的最后一天
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 计算已到达付款日的周期数
 * 对于月付/年付项目，从首次付款日到统计结束日之间已到达的付款周期数量
 * 包含首次付款周期
 */
export function calcPaidPeriods(
  firstPaymentDate: string,
  billingType: 'monthly' | 'yearly',
  status: 'active' | 'ended',
  endDate?: string
): number {
  const todayStr = today();
  const end = status === 'ended' && endDate ? endDate : todayStr;
  const first = parseLocalDate(firstPaymentDate);
  const endParsed = parseLocalDate(end);

  if (endParsed < first) return 0;

  const firstYear = first.getFullYear();
  const firstMonth = first.getMonth();
  const firstDay = first.getDate();

  const endYear = endParsed.getFullYear();
  const endMonth = endParsed.getMonth();

  let totalPeriods: number;

  if (billingType === 'monthly') {
    totalPeriods = (endYear - firstYear) * 12 + (endMonth - firstMonth) + 1;

    // 检查最后一个周期是否到达付款日
    // 最后一个周期的理论付款月
    let lastPaymentYear = endYear;
    let lastPaymentMonth = endMonth;
    if (endParsed.getDate() < firstDay) {
      // 还没到这个月的付款日，减一期
      lastPaymentMonth = endMonth - 1;
      if (lastPaymentMonth < 0) {
        lastPaymentMonth = 11;
        lastPaymentYear = endYear - 1;
      }
    }

    // 检查最后一个有效付款月的付款日是否 ≤ 结束日
    const lastPaymentDay = firstDay <= getLastDayOfMonth(lastPaymentYear, lastPaymentMonth + 1)
      ? firstDay
      : getLastDayOfMonth(lastPaymentYear, lastPaymentMonth + 1);

    const lastPaymentDate = new Date(lastPaymentYear, lastPaymentMonth, lastPaymentDay);
    if (lastPaymentDate <= endParsed) {
      totalPeriods = (lastPaymentYear - firstYear) * 12 + (lastPaymentMonth - firstMonth) + 1;
    } else {
      totalPeriods = (lastPaymentYear - firstYear) * 12 + (lastPaymentMonth - firstMonth);
    }
  } else {
    // yearly
    totalPeriods = endYear - firstYear + 1;

    // 检查最后一个周期是否到达付款日
    const lastPaymentMonth = firstMonth;
    const lastPaymentDay = firstDay <= getLastDayOfMonth(endYear, lastPaymentMonth + 1)
      ? firstDay
      : getLastDayOfMonth(endYear, lastPaymentMonth + 1);

    const lastPaymentDate = new Date(endYear, lastPaymentMonth, lastPaymentDay);

    if (endParsed >= lastPaymentDate) {
      // 检查是否从第一年开始就已到达付款日
      // 对于年付，需要检查当前年份是否已经到达付款日
      const currentYearPaymentDate = new Date(endYear, firstMonth, Math.min(firstDay, getLastDayOfMonth(endYear, firstMonth + 1)));
      if (endParsed < currentYearPaymentDate) {
        totalPeriods = (endYear - 1) - firstYear + 1;
      }
    } else {
      totalPeriods = (endYear - 1) - firstYear + 1;
    }
  }

  return Math.max(1, totalPeriods);
}

/**
 * 计算下次付款日
 */
export function calcNextPaymentDate(
  firstPaymentDate: string,
  billingType: 'monthly' | 'yearly'
): string {
  const todayStr = today();
  const first = parseLocalDate(firstPaymentDate);
  const todayDate = parseLocalDate(todayStr);
  const firstDay = first.getDate();

  // 计算下一个付款日期
  let nextYear = todayDate.getFullYear();
  let nextMonth = todayDate.getMonth();
  let nextDay = Math.min(firstDay, getLastDayOfMonth(nextYear, nextMonth + 1));

  let candidate = new Date(nextYear, nextMonth, nextDay);

  // 如果候选日期 ≤ 今天，则移到下一个周期
  if (candidate <= todayDate) {
    if (billingType === 'monthly') {
      nextMonth += 1;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }
    } else {
      nextYear += 1;
      nextMonth = first.getMonth(); // 年付：重置月份为首次付款月份
    }
    nextDay = Math.min(firstDay, getLastDayOfMonth(nextYear, nextMonth + 1));
    candidate = new Date(nextYear, nextMonth, nextDay);
  }

  const y = candidate.getFullYear();
  const m = String(candidate.getMonth() + 1).padStart(2, '0');
  const d = String(candidate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 计算累计投入（分）
 */
export function calcTotalInvestment(item: {
  recordType?: RecordType;
  billingType: BillingType;
  billingAmountInCents: number;
  status: 'active' | 'ended';
  endDate?: string;
  startDate?: string;
  firstPaymentDate?: string;
}): number {
  if (item.recordType === 'expense') {
    if (!item.startDate) return item.billingAmountInCents;
    const periodEnd = item.endDate || today();
    if (periodEnd < item.startDate) return 0;
    return calcExpensePeriodTotalInCents(
      item.billingType,
      item.billingAmountInCents,
      item.startDate,
      periodEnd
    );
  }
  if (item.billingType === 'one_time') {
    return item.billingAmountInCents;
  }

  if (!item.firstPaymentDate) return item.billingAmountInCents;

  const periods = calcPaidPeriods(
    item.firstPaymentDate,
    item.billingType,
    item.status,
    item.endDate
  );

  return item.billingAmountInCents * periods;
}

/**
 * 获取用户友好的成本展示字符串
 */
export function formatCostWithUnit(value: number, unit: CostDisplayUnit): string {
  const formatted = formatCost(value);
  return unit === 'day' ? `¥${formatted}/天` : `¥${formatted}/月`;
}
