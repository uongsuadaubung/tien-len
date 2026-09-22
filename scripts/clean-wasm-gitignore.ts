import fs from 'fs';
import path from 'path';

const gitignorePath = path.resolve(import.meta.dir || __dirname, '../src/engine/wasm/pkg/.gitignore');
if (fs.existsSync(gitignorePath)) {
  fs.unlinkSync(gitignorePath);
  console.log('[build:wasm] Removed auto-generated pkg/.gitignore so WASM artifacts are tracked in Git.');
}

// Fix wasm-bindgen bug: passStringToWasm0 splits UTF-16 surrogate pairs (e.g. emoji avatars 🤠, 🤖, 😎)
// when slice(offset) cuts between high surrogate or reallocates incorrectly.
const jsPkgPath = path.resolve(import.meta.dir || __dirname, '../src/engine/wasm/pkg/tien_len_core.js');
if (fs.existsSync(jsPkgPath)) {
  let content = fs.readFileSync(jsPkgPath, 'utf8');
  const faultyPassStringRegex = /function passStringToWasm0\(arg, malloc, realloc\) \{[\s\S]*?return ptr;\n\}/;
  const safePassString = `function passStringToWasm0(arg, malloc, realloc) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
}`;
  if (faultyPassStringRegex.test(content)) {
    content = content.replace(faultyPassStringRegex, safePassString);
    fs.writeFileSync(jsPkgPath, content, 'utf8');
    console.log('[build:wasm] Patched passStringToWasm0 in tien_len_core.js to safely encode UTF-8 emojis without surrogate corruption.');
  }
}
