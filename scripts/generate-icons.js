/**
 * Simple icon generator for PWA
 * Creates basic placeholder icons with the app initial
 * For production, replace with professional icons
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../client/public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const sizes = [16, 32, 72, 96, 120, 128, 144, 152, 180, 192, 384, 512];

// Simple SVG icon with gradient background and "IA" text
const generateSVG = (size) => {
  const fontSize = size * 0.4;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#gradient)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${fontSize}" font-weight="700" fill="white">IA</text>
</svg>`;
};

console.log('🎨 Generating PWA icons...');

sizes.forEach(size => {
  const svg = generateSVG(size);
  const filename = size === 16 || size === 32 ? `favicon.png` : `icon-${size}.png`;
  const svgPath = path.join(publicDir, `icon-${size}.svg`);

  // Save SVG (for now, in production you'd convert to PNG)
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Generated ${svgPath}`);
});

// Create a simple favicon.svg
const faviconSVG = generateSVG(32);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSVG);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), faviconSVG); // Placeholder

console.log('✅ Icon generation complete!');
console.log('📝 Note: These are SVG placeholders. For production, convert to PNG format.');
console.log('   You can use: https://realfavicongenerator.net/ for professional icons');
