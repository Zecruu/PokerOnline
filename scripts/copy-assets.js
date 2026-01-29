const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../hub/out');
const gamesDir = path.join(__dirname, '../games');
const adminFile = path.join(__dirname, '../admin.html');

// Copy games folder to out directory
function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        console.log(`Source not found: ${src}`);
        return;
    }
    
    if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(child => {
            copyRecursive(path.join(src, child), path.join(dest, child));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Remove existing games folder in out if it exists
const outGamesDir = path.join(outDir, 'games');
if (fs.existsSync(outGamesDir)) {
    fs.rmSync(outGamesDir, { recursive: true, force: true });
}

// Copy games
console.log('Copying games folder...');
copyRecursive(gamesDir, outGamesDir);

// Copy admin.html
console.log('Copying admin.html...');
if (fs.existsSync(adminFile)) {
    fs.copyFileSync(adminFile, path.join(outDir, 'admin.html'));
}

console.log('✅ Assets copied successfully!');

