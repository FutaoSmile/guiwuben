/**
 * 图片压缩服务
 * 将上传的图片压缩到指定尺寸和文件大小，返回 Blob 用于 IndexedDB 存储。
 * 支持 JPEG、PNG、WebP 格式。
 */
// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

/** 最长边最大像素 */
const MAX_SIDE_PX = 1280;

/** 目标文件大小上限（字节） */
const TARGET_SIZE_BYTES = 500 * 1024; // 500 KB

/** Canvas 导出 quality 参数的最小值 */
const MIN_QUALITY = 0.1;

/** quality 递减步长 */
const QUALITY_STEP = 0.1;

/** 支持的 MIME 类型 */
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface CompressOptions {
  /** 允许的输出 MIME 类型，默认使用输入格式（PNG → png, 否则 jpeg） */
  outputMimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** 最长边最大像素，默认 1280 */
  maxSide?: number;
  /** 目标文件大小（字节），默认 500KB */
  targetSize?: number;
}

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

/**
 * 读取 File 为 ImageData（用于后续 Canvas 绘制）
 */
function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };

    img.src = url;
  });
}

/**
 * 将图像绘制到 Canvas，按最长边等比缩放
 */
function drawScaledToCanvas(
  img: HTMLImageElement,
  maxSide: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  let { width, height } = img;

  // 等比缩放
  if (width > maxSide || height > maxSide) {
    const ratio = Math.min(maxSide / width, maxSide / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法获取 Canvas 2D 上下文');
  }

  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx };
}

/**
 * 尝试以指定 quality 导出为指定格式，若超出目标大小则逐步降低 quality。
 */
function compressWithQuality(
  canvas: HTMLCanvasElement,
  mimeType: string,
  targetSize: number
): Blob {
  // 先用 0.92 尝试
  let quality = 0.92;
  let blob: Blob | null = null;

  // 对于 PNG，canvas.toBlob 的 quality 参数无效（PNG 为无损）
  // 所以我们先尽量缩小尺寸，然后直接输出
  if (mimeType === 'image/png') {
    blob = dataUriToBlob(canvas.toDataURL(mimeType));
    if (blob && blob.size <= targetSize) {
      return blob;
    }
    // PNG 即使缩小后仍然过大，则降级为 JPEG
    if (blob && blob.size > targetSize) {
      mimeType = 'image/jpeg';
    }
  }

  // JPEG / WebP 迭代降低 quality
  while (quality >= MIN_QUALITY) {
    blob = dataUriToBlob(canvas.toDataURL(mimeType, quality));
    if (blob && blob.size <= targetSize) {
      return blob;
    }
    quality = Math.round((quality - QUALITY_STEP) * 100) / 100;
  }

  // 即使 quality 降到最低仍然 > targetSize，返回最小 quality 结果
  blob = dataUriToBlob(canvas.toDataURL(mimeType, MIN_QUALITY));
  return blob ?? new Blob([], { type: mimeType });
}

/**
 * 将 dataURI 转为 Blob
 */
function dataUriToBlob(dataUri: string): Blob {
  const commaIndex = dataUri.indexOf(',');
  const mimeMatch = dataUri.match(/^data:(.+?)(;base64)?,/);

  const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
  const base64 = dataUri.substring(commaIndex + 1);

  const byteString = atob(base64);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }

  return new Blob([byteArray], { type: mimeType });
}

// ---------------------------------------------------------------------------
// 主函数
// ---------------------------------------------------------------------------

/**
 * 压缩图片。
 *
 * 步骤：
 * 1. 将 File 加载为 HTMLImageElement
 * 2. 按最长边等比缩放（默认 max 1280px）
 * 3. 将图像绘制到 Canvas
 * 4. 以目标格式和 quality 导出 Blob
 * 5. 如果超出目标大小（默认 500KB），逐步降低 quality
 *
 * @param file    - 用户选择的图片文件
 * @param options - 可选压缩参数
 * @returns 压缩后的 Blob（可用于 IndexedDB 存储），失败返回 null
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<Blob | null> {
  const {
    outputMimeType,
    maxSide = MAX_SIDE_PX,
    targetSize = TARGET_SIZE_BYTES,
  } = options;

  try {
    // 1. 校验文件类型
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      console.warn(`[compressImage] 不支持的图片格式：${file.type}`);
      return null;
    }

    // 2. 加载图片
    const img = await createImageFromFile(file);

    // 3. 缩放到 Canvas
    const { canvas } = drawScaledToCanvas(img, maxSide);

    // 4. 确定输出 MIME 类型
    const mimeType = outputMimeType ?? (file.type === 'image/png' ? 'image/png' : 'image/jpeg');

    // 5. 压缩输出
    const blob = compressWithQuality(canvas, mimeType, targetSize);

    if (!blob || blob.size === 0) {
      console.error('[compressImage] 压缩结果为空');
      return null;
    }

    return blob;
  } catch (e) {
    console.error('[compressImage] 图片压缩失败:', e);
    return null;
  }
}

/**
 * 将 Blob 转为 base64 字符串（用于 BackupImage 序列化）
 *
 * @param blob - 图片 Blob
 * @returns base64 字符串（不含 data: URI 前缀）
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // 去掉 data:...;base64, 前缀
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.substring(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Blob 转 base64 失败'));
    reader.readAsDataURL(blob);
  });
}

/**
 * 将 base64 字符串还原为 Blob
 *
 * @param base64   - 图片 base64 数据（不含 data: URI 前缀）
 * @param mimeType - MIME 类型
 * @returns Blob 对象
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  return new Blob([byteArray], { type: mimeType });
}