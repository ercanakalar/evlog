import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const sharp = createRequire(new URL('../../../raf-api/package.json', import.meta.url))('sharp');
const at = (path) => fileURLToPath(new URL(path, import.meta.url));
const render = (source, target, size, options = {}) => {
  const image = sharp(at(`./${source}.svg`), { density: 144 }).resize(size, size);
  return (options.opaque ? image.flatten({ background: '#D8F34A' }).removeAlpha() : image).png().toFile(at(target));
};

await Promise.all([
  render('icon', '../images/icon.png', 1024, { opaque: true }),
  render('adaptive-foreground', '../images/android-icon-foreground.png', 1024),
  render('adaptive-monochrome', '../images/android-icon-monochrome.png', 1024),
  render('splash', '../images/splash-icon.png', 1024),
  render('notification', '../images/notification-icon.png', 96),
  render('icon', '../images/favicon.png', 48, { opaque: true }),
  // Google Play listing.
  render('icon', '../../../store/graphics/play-icon-512.png', 512, { opaque: true }),
]);
