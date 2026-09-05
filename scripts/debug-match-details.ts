import fs from 'fs';
import path from 'path';
import { MatchLogReport, MatchTurnLogEntry } from '../src/engine/match-logger';

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

function resolveLogPath(): string {
  const args = process.argv.slice(2);
  let targetPath = args[0] || findDefaultLogFile();

  if (!targetPath) {
    console.error('❌ Vui lòng truyền đường dẫn file JSON cần debug.');
    console.error('👉 Ví dụ: bun run scripts/debug-match-details.ts <đường_dẫn_file_json>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Không tìm thấy file tại đường dẫn: ${resolvedPath}`);
    process.exit(1);
  }

  return resolvedPath;
}

const resolvedPath = resolveLogPath();
console.log(`\n📂 Đang đọc và debug file log: ${resolvedPath}\n`);

const content = fs.readFileSync(resolvedPath, 'utf-8');
const report: MatchLogReport = JSON.parse(content);

console.log('=== MATCH METADATA ===');
console.log(`Match ID: ${report.matchId}`);
console.log(`Game Mode: ${report.gameMode}`);
console.log(`Duration: ${(report.durationMs / 1000).toFixed(1)}s`);
console.log(`Rules:`, JSON.stringify(report.rules));

console.log('\n=== PLAYERS & RESULTS ===');
report.players.forEach(p => {
  console.log(`Player [${p.id}] ${p.name} (${p.isBot ? 'BOT: ' + p.botPersonaId : 'HUMAN'}):`);
  console.log(`  Initial Hand (${p.initialHand.length}): ${p.initialHand.map(c => c.code).join(' ')}`);
  console.log(`  Final Hand (${p.finalHand.length}): ${p.finalHand.map(c => c.code).join(' ')}`);
  console.log(`  Rank: ${p.rankPosition}, ScoreDelta: ${p.scoreDelta}`);
});

console.log('\n=== ALL TURNS BREAKDOWN ===');
report.turns.forEach((t: MatchTurnLogEntry) => {
  const played = t.cardsPlayed ? t.cardsPlayed.map(c => c.code).join(' ') : 'PASS';
  const handBefore = t.handBeforeTurn.map(c => c.code).join(' ');
  console.log(`\nTurn #${t.turnNumber} (Round ${t.roundNumber}) | [${t.playerId}] ${t.playerName} (${t.isBot ? 'BOT' : 'HUMAN'})`);
  console.log(`  Hand before (${t.handBeforeTurn.length}): [ ${handBefore} ]`);
  console.log(`  Action: ${t.action} [ ${played} ]`);
  if (t.isBot && t.botDecision) {
    const d = t.botDecision;
    console.log(`  Bot Strategy: ${d.strategyUsed}`);
    console.log(`  Chosen Reason: ${d.chosenReason}`);
    console.log(`  Heuristic Score: ${d.heuristicScore}`);
    if (d.topCandidates && d.topCandidates.length > 0) {
      console.log(`  Candidates considered:`);
      d.topCandidates.forEach((c, idx) => {
        console.log(`    #${idx+1}: [ ${c.cards.map(x => x.code).join(' ')} ] (${c.combinationType}) Score: ${c.score} | Reasons: ${c.reasons.join('; ')}`);
      });
    }
  }
});
