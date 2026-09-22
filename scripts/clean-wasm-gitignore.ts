import fs from 'fs';
import path from 'path';

const gitignorePath = path.resolve(import.meta.dir || __dirname, '../src/engine/wasm/pkg/.gitignore');
if (fs.existsSync(gitignorePath)) {
  fs.unlinkSync(gitignorePath);
  console.log('[build:wasm] Removed auto-generated pkg/.gitignore so WASM artifacts are tracked in Git.');
}
