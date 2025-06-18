#!/usr/bin/env node

/**
 * Diagnostic Netlify avancé - Alternative au MCP
 * Simule les fonctionnalités du MCP Netlify
 */

import https from 'https';

const SITE_URL = process.env.BASE_URL || 'https://your-app.netlify.app';

console.log('🔧 DIAGNOSTIC NETLIFY AVANCÉ');
console.log('============================');
console.log('Site URL:', SITE_URL);
console.log('');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testDeploymentStatus() {
  console.log('1️⃣ Test du statut de déploiement...');
  
  try {
    const response = await makeRequest(`${SITE_URL}`, {
      method: 'HEAD'
    });
    
    console.log('   Status:', response.statusCode);
    console.log('   Headers utiles:');
    
    // Headers Netlify typiques
    const netlifyHeaders = [
      'x-nf-request-id',
      'server',
      'x-served-by',
      'x-cache',
      'date'
    ];
    
    netlifyHeaders.forEach(header => {
      if (response.headers[header]) {
        console.log(`      ${header}: ${response.headers[header]}`);
      }
    });
    
    return response.statusCode === 200;
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    return false;
  }
}

async function testEnvironmentVariables() {
  console.log('');
  console.log('2️⃣ Test des variables d\'environnement...');
  
  try {
    const response = await makeRequest(`${SITE_URL}/api/debug/config`);
    
    if (response.statusCode === 200) {
      const config = JSON.parse(response.body);
      
      const requiredVars = [
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET', 
        'BASE_URL',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
      ];
      
      console.log('   Variables requises:');
      let missingCount = 0;
      
      requiredVars.forEach(varName => {
        if (config[varName]) {
          console.log(`   ✅ ${varName}: Définie`);
        } else {
          console.log(`   ❌ ${varName}: Manquante`);
          missingCount++;
        }
      });
      
      return missingCount === 0;
    } else {
      console.log('   ❌ Impossible d\'accéder aux variables (Status:', response.statusCode, ')');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    return false;
  }
}

async function testNetlifyFunctions() {
  console.log('');
  console.log('3️⃣ Test des fonctions Netlify...');
  
  const endpoints = [
    '/api/webhooks/stripe',
    '/api/order-summary',
    '/api/create-checkout-session',
    '/api/debug/config'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${SITE_URL}${endpoint}`, {
        method: 'GET'
      });
      
      const status = response.statusCode;
      let statusText = '';
      
      if (status === 200) statusText = '✅ OK';
      else if (status === 405) statusText = '✅ Exists (Method Not Allowed)';
      else if (status === 400) statusText = '✅ Exists (Bad Request)';
      else if (status === 404) statusText = '❌ Not Found';
      else if (status >= 500) statusText = '⚠️ Server Error';
      else statusText = `⚠️ Status ${status}`;
      
      console.log(`   ${endpoint}: ${statusText}`);
      results.push({ endpoint, status, working: status !== 404 });
      
    } catch (error) {
      console.log(`   ${endpoint}: ❌ Error (${error.message})`);
      results.push({ endpoint, status: 'ERROR', working: false });
    }
  }
  
  return results.filter(r => r.working).length === results.length;
}

async function testWebhookConnectivity() {
  console.log('');
  console.log('4️⃣ Test de connectivité webhook Stripe...');
  
  try {
    const response = await makeRequest(`${SITE_URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature'
      },
      body: JSON.stringify({ test: true })
    });
    
    console.log('   Status:', response.statusCode);
    
    if (response.statusCode === 400) {
      if (response.body.includes('validation du webhook')) {
        console.log('   ✅ Webhook accessible, signature invalide (normal)');
        return true;
      } else if (response.body.includes('stripe-signature manquant')) {
        console.log('   ⚠️ Ancienne version du code déployée');
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    return false;
  }
}

async function generateReport() {
  console.log('');
  console.log('5️⃣ Génération du rapport...');
  
  const deploymentOk = await testDeploymentStatus();
  const envVarsOk = await testEnvironmentVariables();
  const functionsOk = await testNetlifyFunctions();
  const webhookOk = await testWebhookConnectivity();
  
  console.log('');
  console.log('📊 RAPPORT FINAL');
  console.log('===============');
  console.log('Déploiement:', deploymentOk ? '✅ OK' : '❌ KO');
  console.log('Variables d\'env:', envVarsOk ? '✅ OK' : '❌ KO');
  console.log('Fonctions:', functionsOk ? '✅ OK' : '❌ KO');
  console.log('Webhook:', webhookOk ? '✅ OK' : '❌ KO');
  
  const allGood = deploymentOk && envVarsOk && functionsOk && webhookOk;
  
  console.log('');
  console.log('🎯 RÉSULTAT GLOBAL:', allGood ? '✅ TOUT FONCTIONNE' : '❌ PROBLÈMES DÉTECTÉS');
  
  if (!allGood) {
    console.log('');
    console.log('🔧 ACTIONS RECOMMANDÉES:');
    if (!envVarsOk) {
      console.log('   1. Ajoutez les variables d\'environnement manquantes dans Netlify Dashboard');
    }
    if (!functionsOk) {
      console.log('   2. Vérifiez les logs de build Netlify');
    }
    if (!webhookOk) {
      console.log('   3. Redéployez le site avec le nouveau code');
    }
    console.log('   4. Testez un vrai paiement après corrections');
  }
  
  return allGood;
}

generateReport().catch(console.error);
