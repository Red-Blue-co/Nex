const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const srcDirs = ['essentials', 'helpfiles'];
const srcFiles = ['cli.js', 'index.js'];
const distDir = path.join(__dirname, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Obfuscation configuration optimized for Node.js (protecting code, leaving strings intact)
const obfuscatorOptions = {
    target: 'node',
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false, // Critical for require() and process to function properly
    stringArray: false, // Explicitly disabled per user request to keep logs readable
    transformObjectKeys: true,
    unicodeEscapeSequence: false
};

// Helper function to recursively process directories
function processDirectory(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
    
    const items = fs.readdirSync(source);
    
    for (const item of items) {
        const sourcePath = path.join(source, item);
        const targetPath = path.join(target, item);
        
        const stat = fs.statSync(sourcePath);
        
        if (stat.isDirectory()) {
            processDirectory(sourcePath, targetPath);
        } else if (sourcePath.endsWith('.js')) {
            obfuscateFile(sourcePath, targetPath);
        } else {
            // Copy non-js files as-is (e.g., .html help files)
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`Copied static file: ${sourcePath} -> ${targetPath}`);
        }
    }
}

// Helper to obfuscate a single file
function obfuscateFile(sourcePath, targetPath) {
    const code = fs.readFileSync(sourcePath, 'utf8');
    try {
        const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscatorOptions);
        fs.writeFileSync(targetPath, obfuscationResult.getObfuscatedCode(), 'utf8');
        console.log(`Obfuscated: ${sourcePath} -> ${targetPath}`);
    } catch (e) {
        console.error(`Failed to obfuscate ${sourcePath}`, e);
    }
}

// 1. Process explicit top-level files
for (const file of srcFiles) {
    const sourcePath = path.join(__dirname, file);
    const targetPath = path.join(distDir, file);
    if (fs.existsSync(sourcePath)) {
        obfuscateFile(sourcePath, targetPath);
    }
}

// 2. Process complete directories recursively
for (const dir of srcDirs) {
    const sourceDir = path.join(__dirname, dir);
    const targetDir = path.join(distDir, dir);
    
    if (fs.existsSync(sourceDir)) {
        processDirectory(sourceDir, targetDir);
    }
}

console.log('✅ Obfuscation build completed successfully!');
