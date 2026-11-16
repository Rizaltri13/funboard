// Funboard's hand-in program (Node 22, standard library only).
//
// The entry is the static frontend in app/ — plain files, no build step —
// plus the three screenshots in screenshots/. This program copies both to
// the output directory and writes dossier.json there with the vendored
// make.fun library (vendor/makefun-frontend.ts, the kit's copy, unchanged:
// the scorer rebuilds the dossier with its own copy and compares bytes).
//
// In the grader the output directory is /output; anywhere else,
// MAKEFUN_OUTPUT_DIR names it instead:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's caps, mirrored so an oversized entry fails here first:
// dossier text at most 160 KiB, at most 3 screenshots of 256 KiB each,
// app/ at most 993 files and directories and 16 MiB in all.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163_840,
  screenshots: { max: 3, max_bytes: 262_144 },
  app_max_files: 993,
  app_max_bytes: 16_777_216,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`funboard: app/ and screenshots/ copied to ${outDir}, dossier.json written (${dossier.length} bytes)`);
