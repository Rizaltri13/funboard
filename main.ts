// Funboard — the hand-in program (Node 22, standard library only).
//
// What ships is a static site: the plain files under app/ (served as-is,
// no build step) and the screenshots under screenshots/. Running this
// program stages both into the output directory and writes dossier.json
// there, built by the vendored make.fun library in
// vendor/makefun-frontend.ts. That file is the kit's own copy and stays
// untouched on purpose: the scorer regenerates the dossier with its copy
// and compares the bytes against ours.
//
// The grader's output directory is /output. Anywhere else, point
// MAKEFUN_OUTPUT_DIR at the directory to use instead:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copy one top-level entry of the repo into the output directory. */
function stage(name) {
  cpSync(join(here, name), join(outDir, name), { recursive: true });
}

mkdirSync(outDir, { recursive: true });
stage('app');
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) stage('screenshots');

// The scorer's caps, mirrored locally so an oversized entry fails here
// first: dossier text at most 160 KiB, at most 3 screenshots of at most
// 256 KiB each, and app/ at most 993 files and directories and 16 MiB
// in all.
const CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 3, max_bytes: 262_144 },
  app_max_files: 993,
  app_max_bytes: 16_777_216,
};

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`funboard: app/ and screenshots/ copied to ${outDir}, dossier.json written (${dossier.length} bytes)`);
