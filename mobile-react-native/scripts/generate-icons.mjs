#!/usr/bin/env node
// Renders the app's icons from the SVGs in assets/source:
//   npm run icons
// Uses sharp from the backend's packages (cd ../backend && npm install first).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const sharp = createRequire(new URL('../../backend/package.json', import.meta.url))('sharp');
const at = (path) => fileURLToPath(new URL(path, import.meta.url));
/** The lime of the icon's ground, also the splash and adaptive icon background in app.json. */
const GROUND = '#D8F34A';

const render = (source, target, size, options = {}) => {
  const image = sharp(at(`../assets/source/${source}.svg`), { density: 144 }).resize(size, size);
  const out = options.opaque ? image.flatten({ background: GROUND }).removeAlpha() : image;
  return out.png().toFile(at(target)).then(() => console.log(`  ${size}x${size}  ${target.replace('../', '')}`));
};

mkdirSync(at('../build'), { recursive: true });
await Promise.all([
  render('icon', '../assets/images/icon.png', 1024, { opaque: true }),
  render('adaptive-foreground', '../assets/images/android-icon-foreground.png', 1024),
  render('adaptive-monochrome', '../assets/images/android-icon-monochrome.png', 1024),
  render('splash', '../assets/images/splash-icon.png', 1024),
  render('notification', '../assets/images/notification-icon.png', 96),
  render('icon', '../assets/images/favicon.png', 48, { opaque: true }),
  // For the Google Play listing; not part of the app.
  render('icon', '../build/play-icon-512.png', 512, { opaque: true }),
]);
