#!/usr/bin/env node

/**
 * Script de test pour le système de scan sécurisé
 * 
 * Ce script teste :
 * - L'authentification des scanners
 * - Les sessions sécurisées
 * - La validation des QR codes
 * - La gestion des erreurs
 */

import https from 'https';
import crypto from 'crypto';

// Configuration
const BASE_URL = 'https://localhost:3000';
const TEST_CONFIG = {
    eventId: 1,
    authToken: 'test_scanner_token',
    testTicketId: 'test_ticket_123'
};

// Utilitaires HTTP
const makeRequest = (options, data) => {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : null
                    };
                    resolve(result);
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
};

// Tests
const tests = {
    // Test 1: Authentification scanner
    async testAuthentication() {
        console.log('🔐 Test de l\'authentification...');
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/scanner/authenticate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            rejectUnauthorized: false
        };

        const data = {
            eventId: TEST_CONFIG.eventId,
            authToken: TEST_CONFIG.authToken
        };

        try {
            const response = await makeRequest(options, data);
            
            if (response.statusCode === 200 && response.body?.success) {
                console.log('✅ Authentification réussie');
                console.log('📝 Session token:', response.body.session_token?.substring(0, 20) + '...');
                return response.body.session_token;
            } else {
                console.log('❌ Échec de l\'authentification');
                console.log('Status:', response.statusCode);
                console.log('Body:', response.body);
                return null;
            }
        } catch (error) {
            console.log('❌ Erreur lors de l\'authentification:', error.message);
            return null;
        }
    },

    // Test 2: Vérification de session
    async testSessionValidation(sessionToken) {
        console.log('🔍 Test de validation de session...');
        
        if (!sessionToken) {
            console.log('❌ Pas de token de session');
            return false;
        }

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/scanner/session?session_token=${encodeURIComponent(sessionToken)}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            rejectUnauthorized: false
        };

        try {
            const response = await makeRequest(options);
            
            if (response.statusCode === 200 && response.body?.valid) {
                console.log('✅ Session valide');
                return true;
            } else {
                console.log('❌ Session invalide');
                console.log('Status:', response.statusCode);
                console.log('Body:', response.body);
                return false;
            }
        } catch (error) {
            console.log('❌ Erreur lors de la validation de session:', error.message);
            return false;
        }
    },

    // Test 3: Validation QR
    async testQRValidation(sessionToken) {
        console.log('📱 Test de validation QR...');
        
        if (!sessionToken) {
            console.log('❌ Pas de token de session');
            return false;
        }

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/scanner/validate-qr',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            rejectUnauthorized: false
        };

        const data = {
            session_token: sessionToken,
            ticket_id: TEST_CONFIG.testTicketId,
            hmac_signature: 'test_hmac_signature'
        };

        try {
            const response = await makeRequest(options, data);
            
            console.log('📊 Réponse validation QR:');
            console.log('Status:', response.statusCode);
            console.log('Body:', response.body);
            
            return response.statusCode === 200;
        } catch (error) {
            console.log('❌ Erreur lors de la validation QR:', error.message);
            return false;
        }
    },

    // Test 4: Révocation de session
    async testSessionRevocation(sessionToken) {
        console.log('🔒 Test de révocation de session...');
        
        if (!sessionToken) {
            console.log('❌ Pas de token de session');
            return false;
        }

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/scanner/session',
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            rejectUnauthorized: false
        };

        const data = {
            session_token: sessionToken
        };

        try {
            const response = await makeRequest(options, data);
            
            if (response.statusCode === 200) {
                console.log('✅ Session révoquée avec succès');
                return true;
            } else {
                console.log('❌ Échec de révocation');
                console.log('Status:', response.statusCode);
                console.log('Body:', response.body);
                return false;
            }
        } catch (error) {
            console.log('❌ Erreur lors de la révocation:', error.message);
            return false;
        }
    }
};

// Exécution des tests
async function runTests() {
    console.log('🚀 Démarrage des tests de sécurité du scanner\n');
    
    let sessionToken = null;
    let allTestsPassed = true;

    try {
        // Test 1: Authentification
        sessionToken = await tests.testAuthentication();
        if (!sessionToken) {
            allTestsPassed = false;
        }
        console.log('');

        // Test 2: Validation de session
        if (sessionToken) {
            const sessionValid = await tests.testSessionValidation(sessionToken);
            if (!sessionValid) {
                allTestsPassed = false;
            }
        }
        console.log('');

        // Test 3: Validation QR
        if (sessionToken) {
            const qrValid = await tests.testQRValidation(sessionToken);
            if (!qrValid) {
                allTestsPassed = false;
            }
        }
        console.log('');

        // Test 4: Révocation de session
        if (sessionToken) {
            const revoked = await tests.testSessionRevocation(sessionToken);
            if (!revoked) {
                allTestsPassed = false;
            }
        }
        console.log('');

    } catch (error) {
        console.log('❌ Erreur générale:', error.message);
        allTestsPassed = false;
    }

    // Résultats
    console.log('📋 Résultats des tests:');
    if (allTestsPassed) {
        console.log('✅ Tous les tests sont passés avec succès!');
        process.exit(0);
    } else {
        console.log('❌ Certains tests ont échoué');
        console.log('💡 Vérifiez que le serveur est démarré et que la base de données est configurée');
        process.exit(1);
    }
}

// Vérification des prérequis
function checkPrerequisites() {
    console.log('🔍 Vérification des prérequis...');
    
    // Vérifier que le serveur est accessible
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'HEAD',
        timeout: 5000,
        rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
        console.log('✅ Serveur accessible');
        runTests();
    });

    req.on('error', (error) => {
        console.log('❌ Serveur non accessible:', error.message);
        console.log('💡 Assurez-vous que le serveur est démarré avec: npm run dev');
        process.exit(1);
    });

    req.on('timeout', () => {
        console.log('❌ Timeout de connexion au serveur');
        process.exit(1);
    });

    req.end();
}

// Point d'entrée
if (import.meta.url === `file://${process.argv[1]}`) {
    checkPrerequisites();
}

export { tests, runTests };
