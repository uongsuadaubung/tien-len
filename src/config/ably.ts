import { Realtime } from 'ably';

const envKey = import.meta.env?.VITE_ABLY_KEY;
export const ABLY_KEY: string = typeof envKey === 'string' ? envKey : '';

let ablyClientInstance: Realtime | null = null;

export function getAblyClient(): Realtime {
  if (!ablyClientInstance) {
    if (!ABLY_KEY) {
      console.warn('[Ably] VITE_ABLY_KEY chưa được cấu hình — chế độ Online sẽ không kết nối được.');
    }
    ablyClientInstance = new Realtime({
      // Key placeholder + autoConnect=false khi thiếu key (vd: unit test) để không mở kết nối mạng
      key: ABLY_KEY || 'missing.key:missing',
      autoConnect: Boolean(ABLY_KEY),
      // Tương đương broadcast { self: false } của Supabase
      echoMessages: false,
      // Tự động khôi phục phiên kết nối khi đổi mạng (Wifi/4G) hoặc tạm tắt màn hình trên trình duyệt
      recoveryKeyStorageName: typeof window !== 'undefined' ? 'tl_ably_recovery' : undefined
    });
  }
  return ablyClientInstance;
}
