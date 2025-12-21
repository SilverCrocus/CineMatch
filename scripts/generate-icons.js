// Run this script to generate PWA icons
// Usage: node scripts/generate-icons.js
// Note: Requires 'canvas' package: npm install canvas --save-dev

const fs = require('fs');
const path = require('path');

try {
  const { createCanvas } = require('canvas');

  function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background - rose/pink color
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#e11d48');
    gradient.addColorStop(1, '#be123c');
    ctx.fillStyle = gradient;

    // Rounded rectangle
    const radius = size * 0.2;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    // Letter C
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.55}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C', size/2, size/2 + size*0.03);

    return canvas.toBuffer('image/png');
  }

  const iconsDir = path.join(__dirname, '..', 'public', 'icons');

  fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generateIcon(192));
  fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generateIcon(512));

  console.log('Icons generated successfully!');
} catch (e) {
  console.log('canvas package not installed. Installing...');
  console.log('Run: npm install canvas --save-dev');
  console.log('Then: node scripts/generate-icons.js');
}
