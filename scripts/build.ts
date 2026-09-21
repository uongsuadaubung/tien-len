import { spawnSync } from 'child_process';

interface Step {
  name: string;
  command: string;
  args: string[];
}

const steps: Step[] = [
  {
    name: 'Type Check (TypeScript)',
    command: 'bun',
    args: ['x', 'tsc', '--noEmit'],
  },
  {
    name: 'Unit Tests',
    command: 'bun',
    args: ['test', '--timeout', '15000'],
  },
  {
    name: 'Lint (ESLint)',
    command: 'bun',
    args: ['run', 'lint'],
  },
  {
    name: 'Vite Build',
    command: 'bun',
    args: ['x', 'vite', 'build'],
  },
];

console.log('🚀 [BUILD PIPELINE] Bắt đầu quy trình kiểm tra và build dự án...\n');

const totalStartTime = Date.now();

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const stepIndex = i + 1;
  const fullCommand = `${step.command} ${step.args.join(' ')}`;

  console.log(`--------------------------------------------------`);
  console.log(`▶ [Bước ${stepIndex}/${steps.length}] ${step.name}`);
  console.log(`📌 Lệnh: ${fullCommand}`);
  console.log(`--------------------------------------------------`);

  const stepStartTime = Date.now();
  const result = spawnSync(step.command, step.args, {
    stdio: 'inherit',
    shell: true,
  });

  const durationSec = ((Date.now() - stepStartTime) / 1000).toFixed(2);

  if (result.status !== 0) {
    console.error(`\n❌ [THẤT BẠI] Bước "${step.name}" bị lỗi (mã thoát: ${result.status}).`);
    console.error(`🛑 Dừng quy trình build tại bước ${stepIndex}/${steps.length}.\n`);
    process.exit(result.status ?? 1);
  }

  console.log(`✅ [THÀNH CÔNG] ${step.name} hoàn thành trong ${durationSec}s.\n`);
}

const totalDurationSec = ((Date.now() - totalStartTime) / 1000).toFixed(2);
console.log('==================================================');
console.log(`🎉 [BUILD HOÀN TẤT] Tất cả các bước (Type safe -> Test -> Lint -> Build) đã thành công!`);
console.log(`⏱️ Tổng thời gian: ${totalDurationSec}s`);
console.log('==================================================\n');
