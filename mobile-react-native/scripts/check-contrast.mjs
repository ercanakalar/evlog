#!/usr/bin/env node
// Checks that every colour palette (light and dark) keeps text readable:
//   npm run check:contrast        (VERBOSE=1 prints every pair)
// WCAG AA: 4.5:1 for text, 3:1 for shapes such as bars, outlines and switches.
import { palettes } from '../src/theme/colors.ts';

const channel = (value) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hue = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

const GROUNDS = ['background', 'card'];
/** [foreground, backgrounds, minimum ratio] */
const PAIRS = [
  ['text', [...GROUNDS, 'cardMuted', 'tag'], 4.5],
  ['textMuted', GROUNDS, 4.5],
  ['textSoft', GROUNDS, 4.5],
  ['urgentText', GROUNDS, 4.5],
  ['soonText', GROUNDS, 4.5],
  ['onAccent', ['accent'], 4.5],
  ['onInk', ['ink'], 4.5],
  ['onInkMuted', ['ink'], 4.5],
  ['urgentBar', ['card'], 3],
  ['soonBar', ['card'], 3],
  ['calmBar', ['card'], 3],
  ['inputBorder', ['card'], 3],
  ['switchOff', ['card'], 3],
];

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
  if (process.env.VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
};

for (const [name, schemes] of Object.entries(palettes)) {
  for (const [scheme, colors] of Object.entries(schemes)) {
    const where = `${name}/${scheme}`;
    for (const [fg, grounds, min] of PAIRS) {
      for (const bg of grounds) {
        const ratio = contrast(colors[fg], colors[bg]);
        check(ratio >= min, `${where}: ${fg} on ${bg} ${ratio.toFixed(2)}:1 (needs ${min})`);
      }
    }
    // Red, orange and amber mean "use soon" on the countdown; an accent must not look like it.
    const h = hue(colors.accent);
    check(h > 45 && h < 345, `${where}: accent hue ${h.toFixed(0)}° is red, orange or amber`);
  }
}

if (failures.length) {
  console.error('Palette contrast broken:\n');
  for (const line of failures) console.error(`  ${line}`);
  console.error('\nSee src/theme/colors.ts.');
  process.exit(1);
}
console.log(`Contrast holds in all ${Object.keys(palettes).length} palettes, light and dark.`);
