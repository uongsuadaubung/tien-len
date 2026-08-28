import { z } from 'zod';
import { PlayerProfileSchema } from './profile.schema';
import { SavedSettingsSchema } from './settings.schema';
import { BotEntitySchema, EcosystemNewsItemSchema } from './ecosystem.schema';
import type { MatchLogReport } from '../match-logger';

export const TienLenSaveDataSchema = z.object({
  version: z.number().default(1),
  updatedAt: z.number().default(() => Date.now()),
  profile: PlayerProfileSchema,
  settings: SavedSettingsSchema.partial().default({}),
  bots: z.array(BotEntitySchema).optional(),
  newsfeed: z.array(EcosystemNewsItemSchema).optional(),
  humanBehavior: z.unknown().optional(),
  matchLogs: z.array(z.custom<MatchLogReport>()).optional()
});

export type TienLenSaveData = z.infer<typeof TienLenSaveDataSchema>;
export type ValidatedTienLenSaveData = TienLenSaveData;

/**
 * Hàm phân tích và làm sạch an toàn gói dữ liệu lưu trữ (Gist Cloud / File Import / RAM)
 * Tự động gắn giá trị mặc định cho các trường bị thiếu hoặc sai kiểu dữ liệu.
 */
export function safeParseSaveData(data: unknown): {
  success: boolean;
  data: ValidatedTienLenSaveData | null;
  error?: string;
} {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      data: null,
      error: 'Dữ liệu không hợp lệ (Không phải là một Object).'
    };
  }

  const result = TienLenSaveDataSchema.safeParse(data);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return {
      success: false,
      data: null,
      error: `Lỗi cấu trúc dữ liệu: ${errorDetails}`
    };
  }

  return {
    success: true,
    data: result.data
  };
}
