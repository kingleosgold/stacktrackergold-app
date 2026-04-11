import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFile } from 'node:fs/promises';

const SRC = 'public/troy-avatar.png';

await sharp(SRC).resize(16, 16).png().toFile('public/favicon-16x16.png');
await sharp(SRC).resize(32, 32).png().toFile('public/favicon-32x32.png');
await sharp(SRC).resize(180, 180).png().toFile('public/apple-touch-icon.png');

const png32 = await sharp(SRC).resize(32, 32).png().toBuffer();
const icoBuf = await pngToIco([png32]);
await writeFile('public/favicon.ico', icoBuf);

console.log('favicons generated');
