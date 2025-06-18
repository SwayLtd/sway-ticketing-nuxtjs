#!/usr/bin/env node

/**
 * Test avec logs pour vérifier les variables d'environnement dans Netlify Functions
 */

import https from 'https';

const SITE_URL = process.env.BASE_URL || 'https://your-app.netlify.app';

console.log('🔍 TEST AVEC LOGS - Variables d\'environnement Netlify');
console.log('====================================================');
console.log('');
console.log('Ce test va déclencher des logs dans Netlify Functions.');
console.log('🔗 Ouvrez en parallèle: https://app.netlify.com → Votre site → Functions → Logs');
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

async function testEnvVarsEndpoint() {
  console.log('1️⃣ Test de l\'endpoint debug env-vars...');
  console.log('   → Cela génère des logs dans Netlify Functions');
  
  try {
    const response = await makeRequest(`${SITE_URL}/api/debug/env-vars`);
    
    console.log('   Status:', response.statusCode);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('   📋 Variables détectées:');
        Object.entries(data).forEach(([key, value]) => {
        if (key === 'timestamp' || key === 'netlify_deploy_id' || key === 'NODE_ENV') {
          console.log(`      ${key}: ${value}`);
        } else {
          // Correction : BASE_URL retourne l'URL directement, pas "DÉFINIE"
          let status = '❌';
          if (value.includes('DÉFINIE')) {
            status = '✅';
          } else if (key === 'BASE_URL' && value.startsWith('https://')) {
            status = '✅'; // BASE_URL est bonne si elle commence par https://
          } else if (!value.includes('MANQUANTE')) {
            status = '✅'; // Autres cas où la variable existe
          }
          console.log(`      ${status} ${key}: ${value}`);
        }
      });
      
      return true;
    } else {
      console.log('   ❌ Erreur:', response.statusCode, response.body);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erreur de connexion:', error.message);
    return false;
  }
}

async function testWebhookWithLogs() {
  console.log('');
  console.log('2️⃣ Test du webhook (génère des logs de debug)...');
  console.log('   → Les logs de variables apparaîtront dans Netlify Functions');
  
  try {
    const response = await makeRequest(`${SITE_URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_trigger_logs'
      },
      body: JSON.stringify({ test: 'trigger_env_logs' })
    });
    
    console.log('   Status:', response.statusCode);
    console.log('   💡 Logs générés - Vérifiez Netlify Dashboard > Functions > Logs');
    
    return response.statusCode === 400; // 400 = signature invalide mais fonction accessible
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    return false;
  }
}

async function testCheckoutSessionWithLogs() {
  console.log('');
  console.log('3️⃣ Test du create-checkout-session (génère des logs de debug)...');
  
  try {
    const response = await makeRequest(`${SITE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },      body: JSON.stringify({
        eventId: 51,
        lineItems: [{ name: 'Test Ticket', amount: 1000, quantity: 1 }],
        promoterStripeAccountId: 'acct_1RawWbQHdYwP7DJL', // Compte Stripe du promoteur
        currency: 'eur',
        feeAmount: 100,
        buyerEmail: 'sway.x62sf@8alias.com',
        userId: 1
      })
    });
    
    console.log('   Status:', response.statusCode);
    console.log('   💡 Logs générés - Vérifiez Netlify Dashboard > Functions > Logs');
    
    return response.statusCode !== 404; // Fonction accessible
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Démarrage des tests avec logs...');
  console.log('');
  
  const envTest = await testEnvVarsEndpoint();
  
  // Pause pour laisser le temps de voir les logs
  console.log('');
  console.log('⏳ Pause de 2 secondes pour que vous puissiez voir les logs...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const webhookTest = await testWebhookWithLogs();
  
  console.log('');
  console.log('⏳ Pause de 2 secondes...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const checkoutTest = await testCheckoutSessionWithLogs();
  
  console.log('');
  console.log('📊 Résumé des tests:');
  console.log('===================');
  console.log('Variables env:', envTest ? '✅ Testées' : '❌ Échec');
  console.log('Webhook:', webhookTest ? '✅ Accessible' : '❌ Inaccessible');
  console.log('Checkout:', checkoutTest ? '✅ Accessible' : '❌ Inaccessible');
  
  console.log('');
  console.log('🔍 INSTRUCTIONS IMPORTANTES:');
  console.log('1. Ouvrez Netlify Dashboard: https://app.netlify.com');
  console.log('2. Sélectionnez votre site');
  console.log('3. Allez dans "Functions"');
  console.log('4. Cliquez sur "View logs" ou "Real-time logs"');
  console.log('5. Cherchez les logs "=== DEBUG ===" générés par ce test');
  console.log('');
  console.log('Les logs vous diront exactement quelles variables sont présentes ou manquantes!');
}

runTests().catch(console.error);
