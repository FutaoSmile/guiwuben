/**
 * 金额格式化：分 → 元并格式化显示
 */
export function formatInYuan(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * 从元转分
 */
export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100);
}

/**
 * 从分转元
 */
export function centsToYuan(cents: number): number {
  return cents / 100;
}

/**
 * 格式化日期 YYYY-MM-DD 为本地显示
 */
export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

/**
 * 校验 YYYY-MM-DD 日期格式
 */
export function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * 校验日期不晚于今天
 */
export function isNotFutureDate(dateStr: string): boolean {
  if (!isValidDate(dateStr)) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date <= today;
}

/**
 * 金额输入校验
 */
export function isValidAmount(value: number): boolean {
  if (value < 0) return false;
  if (value > 99999999.99) return false;
  // 最多2位小数
  const parts = value.toString().split('.');
  if (parts.length === 2 && parts[1].length > 2) return false;
  return true;
}

/**
 * 生成 UUID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 防抖
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => unknown,
  delay: number
): (...args: TArgs) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: TArgs) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(isoStr: string): string {
  const date = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} 天前`;
  return formatDate(date.toISOString().split('T')[0]);
}
