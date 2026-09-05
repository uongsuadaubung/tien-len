import fs from 'fs';
import path from 'path';
import { MatchLogReport } from '../src/engine/match-logger';
import { Card } from '../src/engine/types';
import { replayTurnDecisionFromLog } from '../src/ai/log-replayer';

function findDefaultLogFile(): string | null {
  const searchDirs = ['.', './src', './logs'];
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const match = files.find(f => f.startsWith('tienlen_match_log') && f.endsWith('.json'));
      if (match) {
        return path.join(dir, match);
      }
    }
  }
  return null;
}

function resolveLogPathAndTurns(): { resolvedPath: string; targetTurns: number[] } {
  const args = process.argv.slice(2);
  let targetPath: string | null = null;
  const targetTurns: number[] = [];

  for (const arg of args) {
    if (/^\d+$/.test(arg)) {
      targetTurns.push(parseInt(arg, 10));
    } else if (!targetPath) {
      targetPath = arg;
    }
  }

  targetPath = targetPath || findDefaultLogFile();

  if (!targetPath) {
    console.error('❌ Vui lòng truyền đường dẫn file JSON cần tái hiện quyết định.');
    console.error('👉 Ví dụ: bun run scripts/verify-replay-fixes.ts <đường_dẫn_file_json> [các_lượt_cần_xem...]');
    console.error('👉 Ví dụ: bun run scripts/verify-replay-fixes.ts logs/match.json 2 8 46 47');
    process.exit(1);
  }

  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Không tìm thấy file tại đường dẫn: ${resolvedPath}`);
    process.exit(1);
  }

  return { resolvedPath, targetTurns };
}

const { resolvedPath, targetTurns } = resolveLogPathAndTurns();
console.log(`\n📂 Đang đọc và tái hiện quyết định từ file log: ${resolvedPath}\n`);

const content = fs.readFileSync(resolvedPath, 'utf-8');
const report: MatchLogReport = JSON.parse(content);

console.log('=== VERIFYING REPLAY DECISIONS AFTER AI FIXES ===\n');

// Nếu người dùng không chỉ định lượt cụ thể:
// Mặc định kiểm tra các lượt của Bot có quyết định, hoặc các lượt 2, 8, 46, 47 nếu có
let turnsToVerify = targetTurns;
if (turnsToVerify.length === 0) {
  const candidateDefaults = [2, 8, 46, 47].filter(num => report.turns.some(t => t.turnNumber === num));
  if (candidateDefaults.length > 0) {
    turnsToVerify = candidateDefaults;
  } else {
    // Lấy tất cả lượt của bot có botDecision
    turnsToVerify = report.turns.filter(t => t.isBot && t.botDecision).map(t => t.turnNumber);
  }
}

turnsToVerify.forEach(turnNum => {
  const turn = report.turns.find(t => t.turnNumber === turnNum);
  if (!turn) {
    console.log(`⚠️ Không tìm thấy lượt #${turnNum} trong file log.`);
    return;
  }

  console.log(`--------------------------------------------------------------------------------`);
  console.log(`📍 LƯỢT #${turnNum} (Vòng ${turn.roundNumber}) | [${turn.playerId}] ${turn.playerName} (${turn.isBot ? 'BOT' : 'HUMAN'})`);
  console.log(`   Bài trên tay: [ ${turn.handBeforeTurn.map((c: Card) => c.code).join(' ')} ]`);
  console.log(`   📜 Đã đánh trong log cũ: ${turn.action} [ ${turn.cardsPlayed?.map((c: Card) => c.code).join(' ') || 'BỎ LƯỢT'} ]`);
  if (turn.botDecision) {
    console.log(`      • Chiến thuật cũ: ${turn.botDecision.strategyUsed}`);
    console.log(`      • Điểm cũ       : ${turn.botDecision.heuristicScore}`);
  }

  try {
    const replay = replayTurnDecisionFromLog(report, turnNum);
    const reCards = replay.reproducedDecision.cards?.map((c: Card) => c.code).join(' ') || 'BỎ LƯỢT';

    console.log(`   🎯 Quyết định mới sau khi Fix:`);
    console.log(`      • Loại hành động : ${replay.reproducedDecision.type}`);
    console.log(`      • Lá bài lựa chọn: [ ${reCards} ]`);
    console.log(`      • Chiến thuật    : ${replay.reproducedDecision.strategyUsed || 'N/A'}`);
    console.log(`      • Lý do          : ${replay.reproducedDecision.reason || 'N/A'}`);
    console.log(`      • Trạng thái     : ${replay.isActionMatched ? '✅ Khớp với log' : '🔄 Đã cải thiện/khác biệt so với log cũ'}`);
  } catch (err: any) {
    console.log(`   ❌ Lỗi tái hiện lượt: ${err.message}`);
  }
});

console.log('--------------------------------------------------------------------------------\n');
