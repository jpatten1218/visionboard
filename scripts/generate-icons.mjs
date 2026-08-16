/**
 * Rasterises public/icon.svg into the PNG sizes iOS and the manifest need.
 * Run with `npm run icons` after editing the source SVG.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

const source = await readFile(join(publicDir, "icon.svg"));

// Maskable icons get cropped to a circle on some launchers, so the mark is
// inset to the 80% safe zone and the background is extended to the edges.
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
     <rect width="512" height="512" fill="#0c0b0a"/>
     <g transform="translate(51.2 51.2) scale(0.8)">
       ${source.toString().replace(/<\?xml.*?\?>/, "").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}
     </g>
   </svg>`,
);

const targets = [
  { name: "icon-192.png", size: 192, input: source },
  { name: "icon-512.png", size: 512, input: source },
  { name: "apple-touch-icon.png", size: 180, input: source },
  { name: "icon-maskable-512.png", size: 512, input: maskable },
];

await mkdir(publicDir, { recursive: true });

for (const { name, size, input } of targets) {
  const png = await sharp(input, { density: 512 })
    .resize(size, size)
    .flatten({ background: "#0c0b0a" })
    .png()
    .toBuffer();
  await writeFile(join(publicDir, name), png);
  console.log(`wrote public/${name} (${size}x${size})`);
}
