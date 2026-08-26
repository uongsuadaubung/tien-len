import fs from 'fs';
import path from 'path';
import { MatchLogReport, MatchTurnLogEntry, BotCandidateEvaluation } from '../src/engine/match-logger';
import { replayTurnDecisionFromLog } from '../src/ai/log-replayer';
import { Card } from '../src/engine/types';

/**
 * CLI Tool: Phân tích toàn diện và Tái hiện quyết định Bot AI từ file Match Log JSON
 * 
 * Cách dùng:
 *   bun run scripts/analyze-match-log.ts <đường_dẫn_file_json>
 *   bun run analyze:log <đường_dẫn_file_json>
 */
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

function runAnalysis(): void {
  const args = process.argv.slice(2);
  let targetPath = args[0] || findDefaultLogFile();

  if (!targetPath) {
    console.error('❌ Vui lòng truyền đường dẫn file JSON cần phân tích.');
    console.error('👉 Ví dụ: bun run scripts/analyze-match-log.ts src/tienlen_match_log_1787718411227.json');
    process.exit(1);
  }

  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Không tìm thấy file tại đường dẫn: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`\n📂 Đang đọc và phân tích file log: ${resolvedPath}\n`);

  let report: MatchLogReport;
  try {
    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
    report = JSON.parse(fileContent);
  } catch (err: any) {
    console.error(`❌ Lỗi khi đọc/parse JSON: ${err.message}`);
    process.exit(1);
  }

  // ============================================================================
  // 1. THÔNG TIN TỔNG QUAN TRẬN ĐẤU
  // ============================================================================
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║ 🎮 TRẬN ĐẤU: ${report.matchId.padEnd(25)} | Chế độ: ${report.gameMode.padEnd(16)} ║`);
  console.log(`║ ⏱️  Thời lượng: ${(report.durationMs / 1000).toFixed(1)}s | Bắt đầu: ${report.startedAt.padEnd(20)}       ║`);
  console.log(`║ 🃏 Luật: Phạt 2 cuối: ${report.rules?.gameFlow?.prohibitEndingWithTwo ? 'BẬT' : 'TẮT'} | 3 Bích cuối: ${report.rules?.gameFlow?.threeSpadesEndingBonus ? 'BẬT' : 'TẮT'} | Chặt x2: ${report.rules?.chopping?.cascadeMultiplier ? 'BẬT' : 'TẮT'} ║`);
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

  // ============================================================================
  // 2. KẾT QUẢ VÀ BẢNG THỐNG KÊ NGƯỜI CHƠI
  // ============================================================================
  console.log('\n📋 BẢNG THỐNG KÊ NGƯỜI CHƠI & KẾT QUẢ:');
  console.log('──────────────────────────────────────────────────────────────────────────────────');
  report.players.forEach(p => {
    const role = p.isBot ? `🤖 Bot (${p.botPersonaId || 'N/A'})` : '👤 Người chơi';
    const rankStr = p.rankPosition ? `Hạng ${p.rankPosition}` : 'Chưa xếp';
    const scoreStr = p.scoreDelta >= 0 ? `+${p.scoreDelta}` : `${p.scoreDelta}`;
    const initialCards = p.initialHand.map((c: Card) => c.code).join(' ');
    const finalCards = p.finalHand.length > 0 ? p.finalHand.map((c: Card) => c.code).join(' ') : 'Hết bài';

    console.log(`  [${p.id}] ${p.name.padEnd(16)} | ${role.padEnd(26)} | 🏆 ${rankStr.padEnd(8)} | 💰 ${scoreStr} Xu`);
    console.log(`      Bài khởi đầu (${p.initialHand.length} lá): [ ${initialCards} ]`);
    if (p.finalHand.length > 0) {
      console.log(`      Bài còn lại  (${p.finalHand.length} lá): [ ${finalCards} ]`);
    }
  });
  console.log('──────────────────────────────────────────────────────────────────────────────────');

  // ============================================================================
  // 3. DIỄN BIẾN CHI TIẾT TỪNG LƯỢT ĐÁNH & TÁI HIỆN QUYẾT ĐỊNH BOT
  // ============================================================================
  console.log(`\n🔍 CHI TIẾT ${report.turns.length} LƯỢT ĐÁNH & PHÂN TÍCH SUY LUẬN AI:`);

  let botTurnsCount = 0;
  let matchCount = 0;

  report.turns.forEach((turn: MatchTurnLogEntry) => {
    const isPlay = turn.action === 'PLAY';
    const cardsStr = turn.cardsPlayed ? turn.cardsPlayed.map((c: Card) => c.code).join(' ') : 'BỎ LƯỢT';
    const handBeforeStr = turn.handBeforeTurn.map((c: Card) => c.code).join(' ');
    const chopBadge = turn.isChop ? ` ⚡ CHẶT (+${turn.penaltyAmount} Xu)` : '';

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 Lượt #${String(turn.turnNumber).padStart(2, '0')} (Vòng ${turn.roundNumber}) | [${turn.playerId}] ${turn.playerName} ${turn.isBot ? '🤖' : '👤'}${chopBadge}`);
    console.log(`   Bài trước lượt (${turn.handBeforeTurn.length} lá): [ ${handBeforeStr} ]`);
    console.log(`   ➡️  Hành động: ${isPlay ? 'ĐÁNH [ ' + cardsStr + ' ]' : 'BỎ LƯỢT'}`);

    if (turn.isBot && turn.botDecision) {
      botTurnsCount++;
      const bDec = turn.botDecision;
      console.log(`   🧠 [LOG THỰC TẾ TRONG GAME]`);
      console.log(`      • Chiến thuật  : ${bDec.strategyUsed || 'N/A'}`);
      console.log(`      • Điểm Heuristic: ${bDec.heuristicScore !== null ? bDec.heuristicScore + ' pts' : 'N/A'}`);
      console.log(`      • Lý do chọn   : ${bDec.chosenReason || 'N/A'}`);

      if (bDec.topCandidates && bDec.topCandidates.length > 0) {
        console.log(`      • Top ứng viên đã cân nhắc:`);
        bDec.topCandidates.forEach((cand: BotCandidateEvaluation, idx: number) => {
          const cCards = cand.cards.map((c: Card) => c.code).join(' ');
          console.log(`        ${idx + 1}. [ ${cCards} ] (${cand.combinationType || 'N/A'}) -> ${cand.score} pts (${cand.reasons.join(', ')})`);
        });
      }

      // TÁI HIỆN QUYẾT ĐỊNH BẰNG REPLAY ENGINE
      try {
        const replay = replayTurnDecisionFromLog(report, turn.turnNumber);
        const reCards = replay.reproducedDecision.cards 
          ? replay.reproducedDecision.cards.map((c: Card) => c.code).join(' ') 
          : 'BỎ LƯỢT';

        console.log(`   🎯 [REPLAY ENGINE TÁI HIỆN]`);
        console.log(`      • Quyết định tái hiện : ${replay.reproducedDecision.type} [ ${reCards} ]`);
        console.log(`      • Chiến thuật tái hiện: ${replay.reproducedDecision.strategyUsed || 'N/A'}`);
        console.log(`      • Lý do tái hiện      : ${replay.reproducedDecision.reason || 'N/A'}`);
        console.log(`      • Kết quả kiểm tra    : ${replay.isActionMatched ? '✅ KHỚP 100%' : '⚠️ KHÁC BIỆT'}`);

        if (replay.isActionMatched) {
          matchCount++;
        }
      } catch (e: any) {
        console.log(`      • [REPLAY ERROR]: ${e.message}`);
      }
    }
  });

  // ============================================================================
  // 4. BÁO CÁO TỔNG KẾT VÀ TÍNH TOÁN ĐỘ TRUNG THỰC TÁI HIỆN
  // ============================================================================
  console.log('\n================================================================================');
  console.log(`📊 TỔNG KẾT PHÂN TÍCH VÁN ĐẤU:`);
  console.log(`   • Tổng số lượt đánh       : ${report.turns.length} lượt`);
  console.log(`   • Tổng số lượt của Bot AI : ${botTurnsCount} lượt`);
  if (botTurnsCount > 0) {
    const accuracy = ((matchCount / botTurnsCount) * 100).toFixed(1);
    console.log(`   • Số lượt tái hiện chuẩn  : ${matchCount} / ${botTurnsCount} (${accuracy}%)`);
  }
  console.log('================================================================================\n');
}

runAnalysis();
