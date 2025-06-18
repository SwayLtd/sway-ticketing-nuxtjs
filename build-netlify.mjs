#!/usr/bin/env node
/*** Script de build pour Netlify avec exit forcé (ES modules) ***/

import { spawn } from 'child_process';

console.log('🚀 Starting Netlify build...');

// Définir les variables d'environnement
process.env.NODE_ENV = 'production';
process.env.NETLIFY = 'true';

// Lancer le build
const buildProcess = spawn('npx', ['nuxt', 'build'], {
    stdio: 'inherit',
    env: process.env,
    shell: true
});

// Timeout de sécurité (2 minutes)
const timeout = setTimeout(() => {
    console.log('⚠️  Build timeout reached, forcing exit...');
    buildProcess.kill();
    process.exit(1);
}, 2 * 60 * 1000);

buildProcess.on('close', (code) => {
    clearTimeout(timeout);
    if (code === 0) {
        console.log('✅ Build completed successfully!');
        // Force l'exit après un délai court
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    } else {
        console.log(`❌ Build failed with code ${code}`);
        process.exit(code);
    }
});

buildProcess.on('error', (error) => {
    clearTimeout(timeout);
    console.log('❌ Build process error:', error);
    process.exit(1);
});
