import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SVG_PATH  = path.join(root, 'public', 'icons', 'icon.svg');
const ICONS_DIR = path.join(root, 'public', 'icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const svgBuffer = fs.readFileSync(SVG_PATH);

for (const size of SIZES) {
  const outFile = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outFile);
  console.log(`✓ icon-${size}x${size}.png`);
}

// Also generate a 180x180 apple-touch-icon (no rounded corners — iOS clips it)
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');

console.log('\nAll icons generated successfully.');
