import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const svg = (size, fontSize, label) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#4f46e5"/>
  <text x="50%" y="54%" font-family="Nunito, Arial, sans-serif" font-size="${fontSize}" font-weight="800" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">${label}</text>
</svg>`;

async function writeIcon(name, size, fontSize, label, padding = 0) {
  const inner = size - padding * 2;
  const png = await sharp(Buffer.from(svg(inner, fontSize, label)))
    .png()
    .toBuffer();
  const out = padding
    ? await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 79, g: 70, b: 229, alpha: 1 },
        },
      })
        .composite([{ input: png, top: padding, left: padding }])
        .png()
        .toBuffer()
    : png;
  writeFileSync(join(root, name), out);
}

await writeIcon('icon-192.png', 192, 72, 'MQ');
await writeIcon('icon-512.png', 512, 192, 'MQ');
await writeIcon('icon-512-maskable.png', 512, 160, 'MQ', 64);
console.log('Wrote icon-192.png, icon-512.png, icon-512-maskable.png');
