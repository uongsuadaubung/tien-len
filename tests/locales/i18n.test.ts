import { describe, it, expect, beforeEach } from 'bun:test';
import { t, useI18nStore, vi, en } from '../../src/locales';

describe('Centralized i18n & Localization Dictionary System', () => {
  beforeEach(() => {
    useI18nStore.getState().setLocale('vi');
  });

  it('1. Đọc đúng chuỗi văn bản Tiếng Việt mặc định từ key path', () => {
    expect(t('common.confirm')).toBe('Xác Nhận');
    expect(t('common.cancel')).toBe('Hủy Bỏ');
    expect(t('game.playCard')).toBe('Đánh Bài');
    expect(t('game.passTurn')).toBe('Bỏ Lượt');
    expect(t('game.quickSelect')).toBe('Bắt Bài');
    expect(t('game.clearSelection')).toBe('Hạ Bài');
    expect(t('sort.naturalLabel')).toBe('Giá Trị (3 -> 2)');
    expect(t('sort.bySuitLabel')).toBe('Đồng Chất (Bích-Chuồn-Rô-Cơ)');
  });

  it('2. Nội suy tham số động (Variable Interpolation)', () => {
    const formatted = t('game.chopAlert', {
      chopper: 'Nam',
      victim: 'Hùng',
      amount: 10000
    });
    expect(formatted).toBe('Nam vừa chặt Hùng phạt 10.000 Xu!');

    const cascade = t('game.cascadeChopAlert', {
      chain: 2,
      chopper: 'Alice',
      victim: 'Bob',
      amount: 40000
    });
    expect(cascade).toBe('CHẶT CHỒNG CẤP 2! Alice chặt đè Bob phạt 40.000 Xu!');

    const waiting = t('game.turnWaiting', { name: 'Bot Tí' });
    expect(waiting).toBe('Đang chờ Bot Tí đi bài...');
  });

  it('3. Chuyển đổi ngôn ngữ sang Tiếng Anh (English Locale Switch)', () => {
    useI18nStore.getState().setLocale('en');

    expect(t('common.confirm')).toBe('Confirm');
    expect(t('common.cancel')).toBe('Cancel');
    expect(t('game.playCard')).toBe('Play');
    expect(t('game.passTurn')).toBe('Pass');
    expect(t('game.quickSelect')).toBe('Quick Match');
    expect(t('sort.naturalLabel')).toBe('Rank (3 -> 2)');
    expect(t('sort.twoPreserveLabel')).toBe('Preserve 2s');
  });

  it('4. Kiểm tra số lượng key và tính đồng bộ 100% giữa các từ điển (vi vs en)', () => {
    function getAllLeafKeys(obj: Record<string, any>, prefix = ''): string[] {
      let keys: string[] = [];
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const val = obj[key];
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
          keys = keys.concat(getAllLeafKeys(val, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    const viLeafKeys = getAllLeafKeys(vi);
    const enLeafKeys = getAllLeafKeys(en);

    // 1. Kiểm tra số lượng key của vi và en phải khớp nhau hoàn toàn
    expect(viLeafKeys.length).toBe(enLeafKeys.length);
    expect(viLeafKeys.length).toBeGreaterThan(0);

    // 2. Kiểm tra không có key nào thiếu ở một trong hai ngôn ngữ
    const enSet = new Set(enLeafKeys);
    const viSet = new Set(viLeafKeys);

    const missingInEn = viLeafKeys.filter(k => !enSet.has(k));
    const missingInVi = enLeafKeys.filter(k => !viSet.has(k));

    expect(missingInEn).toEqual([]);
    expect(missingInVi).toEqual([]);

    // 3. Đảm bảo mọi key đều có giá trị chuỗi không rỗng
    const getVal = (obj: any, path: string) => path.split('.').reduce((acc, part) => acc?.[part], obj);
    const emptyViKeys = viLeafKeys.filter(k => typeof getVal(vi, k) !== 'string' || getVal(vi, k).trim() === '');
    const emptyEnKeys = enLeafKeys.filter(k => typeof getVal(en, k) !== 'string' || getVal(en, k).trim() === '');

    expect(emptyViKeys).toEqual([]);
    expect(emptyEnKeys).toEqual([]);
  });

  it('5. Fallback an toàn khi không truyền params hoặc key không tồn tại', () => {
    // Không truyền params
    const template = t('game.turnWaiting');
    expect(template).toBe('Đang chờ {name} đi bài...');

    // Key không hợp lệ ép kiểu
    const invalid = t('invalid.key' as any);
    expect(invalid).toBe('invalid.key');
  });

  it('6. Kiểm tra các biến nội suy {variable} giữa vi và en phải đồng nhất 100%', () => {
    function getAllLeafKeys(obj: Record<string, any>, prefix = ''): string[] {
      let keys: string[] = [];
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const val = obj[key];
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
          keys = keys.concat(getAllLeafKeys(val, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    function getPlaceholders(str: string): string[] {
      const matches = str.match(/\{([a-zA-Z0-9_]+)\}/g);
      return matches ? matches.map(m => m.slice(1, -1)).sort() : [];
    }

    const viLeafKeys = getAllLeafKeys(vi);
    const getVal = (obj: any, path: string) => path.split('.').reduce((acc, part) => acc?.[part], obj);

    const mismatches: string[] = [];
    for (const key of viLeafKeys) {
      const strVi = getVal(vi, key);
      const strEn = getVal(en, key);
      if (typeof strVi === 'string' && typeof strEn === 'string') {
        const pVi = getPlaceholders(strVi);
        const pEn = getPlaceholders(strEn);
        if (pVi.join(',') !== pEn.join(',')) {
          mismatches.push(`${key}: vi=[${pVi.join(', ')}] vs en=[${pEn.join(', ')}]`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  });
});

describe('Kiểm tra source code không chứa text cứng (Source Code Hardcoded Strings Scanner)', () => {
  const fs = require('fs');
  const path = require('path');

  // Regex phát hiện ký tự Tiếng Việt có dấu trong source code
  const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸ]/;

  interface HardcodeViolation {
    file: string;
    line: number;
    text: string;
  }

  function stripCommentsAndLogs(code: string): string {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, (m: string) => ' '.repeat(m.length)) // comment block
      .replace(/\/\/.*$/gm, (m: string) => ' '.repeat(m.length)) // comment line
      .replace(/console\.(log|warn|error|info|debug)\([\s\S]*?\);?/g, (m: string) => ' '.repeat(m.length)); // console logs
  }

  function scanDirectory(dir: string, baseDir: string, ignoreFiles: Set<string> = new Set()): HardcodeViolation[] {
    const violations: HardcodeViolation[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        violations.push(...scanDirectory(fullPath, baseDir, ignoreFiles));
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        if (ignoreFiles.has(relativePath)) continue;

        const content = fs.readFileSync(fullPath, 'utf-8');
        const stripped = stripCommentsAndLogs(content);
        const lines = stripped.split('\n');

        lines.forEach((line: string, index: number) => {
          if (VIETNAMESE_REGEX.test(line)) {
            violations.push({
              file: relativePath,
              line: index + 1,
              text: line.trim()
            });
          }
        });
      }
    }

    return violations;
  }

  it('6. Scanner kiểm tra đơn vị: bắt được hardcode text mẫu và bỏ qua comment / console', () => {
    const sampleSnippet = `
      // Đây là comment tiếng Việt (phải được bỏ qua)
      /* Comment khối tiếng Việt (bỏ qua) */
      console.warn('Cảnh báo console (bỏ qua)');
      const label = "Xác Nhận Đặt Cược"; // Dòng này có hardcode!
      return <div>Xin Chào Bạn</div>; // Dòng này có hardcode!
    `;
    const stripped = stripCommentsAndLogs(sampleSnippet);
    const lines = stripped.split('\n');
    const detected = lines.filter((l: string) => VIETNAMESE_REGEX.test(l));
    expect(detected.length).toBe(2);
    expect(detected[0]).toContain('Xác Nhận Đặt Cược');
    expect(detected[1]).toContain('Xin Chào Bạn');
  });

  it('7. Quét toàn bộ source UI (src/ui) và báo lỗi nếu có hardcoded text', () => {
    const rootDir = path.resolve(__dirname, '../../');
    const uiDir = path.join(rootDir, 'src/ui');

    // Danh sách whitelist các file chứa dữ liệu domain đặc thù của game (ví dụ: bộ từ điển sinh nickname ngẫu nhiên)
    // không nằm trong diện nhãn giao diện i18n cần dịch
    const WHITELIST_FILES = new Set<string>([
      'src/ui/mobile/components/MobileVirtualKeyboard.tsx'
    ]);

    const violations = scanDirectory(uiDir, rootDir, WHITELIST_FILES);

    if (violations.length > 0) {
      const summaryByFile: Record<string, number> = {};
      violations.forEach((v: HardcodeViolation) => {
        summaryByFile[v.file] = (summaryByFile[v.file] || 0) + 1;
      });

      console.error('\n' + '='.repeat(70));
      console.error(`🚨 [PHÁT HIỆN HARDCODED TEXT TRONG SOURCE CODE]`);
      console.error(`Tổng cộng: ${violations.length} chuỗi text cứng cần chuyển qua i18n.`);
      console.error('Danh sách các file vi phạm:');
      Object.entries(summaryByFile).forEach(([file, count]) => {
        console.error(`  - ${file}: ${count} vị trí`);
      });
      console.error('\nChi tiết các vi phạm đầu tiên:');
      violations.slice(0, 20).forEach((v: HardcodeViolation) => {
        console.error(`  📍 ${v.file}:${v.line} -> "${v.text}"`);
      });
      if (violations.length > 20) {
        console.error(`  ... và còn ${violations.length - 20} vị trí khác.`);
      }
      console.error('='.repeat(70) + '\n');
    }

    expect(violations).toEqual([]);
  });

  it('8. Quét source code và đảm bảo các lời gọi t() truyền đủ tham số nội suy {param}', () => {
    const rootDir = path.resolve(__dirname, '../../');
    const srcDir = path.join(rootDir, 'src');

    function resolveKeyPath(obj: any, p: string): string | null {
      const parts = p.split('.');
      let curr = obj;
      for (const part of parts) {
        if (curr && typeof curr === 'object' && part in curr) {
          curr = curr[part];
        } else {
          return null;
        }
      }
      return typeof curr === 'string' ? curr : null;
    }

    function getAllTsFiles(dir: string): string[] {
      const list: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          list.push(...getAllTsFiles(full));
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          list.push(full);
        }
      }
      return list;
    }

    const files = getAllTsFiles(srcDir);
    const mismatches: string[] = [];

    for (const file of files) {
      if (file.includes('locales')) continue;
      const content = fs.readFileSync(file, 'utf-8');

      let pos = 0;
      while (pos < content.length) {
        const match = content.slice(pos).match(/(?:^|[^a-zA-Z0-9_$])t\(\s*['"]([a-zA-Z0-9_.]+)['"]/);
        if (!match || match.index === undefined) break;

        const callStart = pos + match.index + match[0].indexOf('t(');
        const key = match[1];

        let parenDepth = 1;
        let i = callStart + 2;
        let quote: string | null = null;
        let argsContent = '';

        while (i < content.length && parenDepth > 0) {
          const char = content[i];
          if (quote) {
            if (char === quote && content[i - 1] !== '\\') quote = null;
          } else {
            if (char === "'" || char === '"' || char === '`') quote = char;
            else if (char === '(') parenDepth++;
            else if (char === ')') {
              parenDepth--;
              if (parenDepth === 0) break;
            }
          }
          argsContent += char;
          i++;
        }

        pos = i + 1;

        const template = resolveKeyPath(vi, key);
        if (!template) continue;

        const placeholders = template.match(/\{([a-zA-Z0-9_]+)\}/g)?.map(x => x.slice(1, -1)) || [];
        if (placeholders.length === 0) continue;

        const firstComma = argsContent.indexOf(',');
        const passedParams = firstComma !== -1 ? argsContent.slice(firstComma + 1).trim() : '';

        for (const ph of placeholders) {
          const phRegex = new RegExp(`\\b${ph}\\s*:`);
          if (!passedParams || !phRegex.test(passedParams)) {
            mismatches.push(`${path.relative(rootDir, file)}: key "${key}" expects "{${ph}}" but received: ${passedParams.slice(0, 80)}`);
          }
        }
      }
    }

    if (mismatches.length > 0) {
      console.error('\n🚨 [PHÁT HIỆN THAM SỐ NỘI SUY BỊ THIẾU HOẶC SAI TÊN TRONG t()]:');
      mismatches.forEach(m => console.error('  - ' + m));
    }

    expect(mismatches).toEqual([]);
  });
});

