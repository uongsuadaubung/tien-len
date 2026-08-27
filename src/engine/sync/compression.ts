import type { TienLenSaveData } from './types';

/**
 * Nén đối tượng TienLenSaveData thành chuỗi Base64 (sử dụng gzip qua Streams API)
 */
export async function compressSaveData(data: TienLenSaveData): Promise<string> {
  const jsonString = JSON.stringify(data);
  const byteArray = new TextEncoder().encode(jsonString);

  // Khởi tạo gzip CompressionStream
  const stream = new Response(byteArray).body!.pipeThrough(
    new CompressionStream('gzip')
  );
  const compressedBuffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(compressedBuffer);

  // Chuyển đổi Uint8Array sang Base64
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  // Fallback trình duyệt cũ
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Giải nén chuỗi Base64 (gzip) thành đối tượng TienLenSaveData
 */
export async function decompressSaveData(base64: string): Promise<TienLenSaveData> {
  const binary =
    typeof Buffer !== 'undefined'
      ? Buffer.from(base64, 'base64').toString('binary')
      : atob(base64);

  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const stream = new Blob([buffer]).stream().pipeThrough(
    new DecompressionStream('gzip')
  );
  const jsonString = await new Response(stream).text();
  const raw: TienLenSaveData = JSON.parse(jsonString);
  return raw;
}

/**
 * Giải nén hoặc phân tích dữ liệu tải về từ Gist.
 * Hỗ trợ tự động nhận dạng dữ liệu cũ chưa nén (JSON thô bắt đầu bằng '{')
 * và dữ liệu mới đã nén (GZIP + Base64).
 */
export async function parseGistContent(content: string): Promise<TienLenSaveData> {
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    const parsed: TienLenSaveData = JSON.parse(trimmed);
    return parsed;
  }
  return await decompressSaveData(trimmed);
}
