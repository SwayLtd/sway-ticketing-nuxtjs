/**
 * Test simple du système de scan sécurisé
 */

console.log('🚀 Test de santé du scanner sécurisé');

// Test simple d'accès à l'API
const testAPI = async () => {
    try {
        const response = await fetch('https://localhost:3000/api/scanner/authenticate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                eventId: 1,
                authToken: 'test_token'
            })
        });

        console.log('📡 Réponse API:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ API accessible');
            console.log('📝 Données:', data);
            return true;
        }

        console.log('⚠️ API répond mais avec erreur');
        const text = await response.text();
        console.log('❌ Erreur:', text);
        return false;
    } catch (error) {
        console.log('❌ Erreur de connexion:', error.message);
        console.log('💡 Vérifiez que le serveur est démarré');
        return false;
    }
};

const runNodeTest = async () => {
    const https = await import('https');
    console.log('🔧 Utilisation du module https Node.js');

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

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log('📡 Status:', res.statusCode);
                console.log('📝 Body:', body);
                resolve(res.statusCode === 200);
            });
        });

        req.on('error', (error) => {
            console.log('❌ Erreur de connexion:', error.message);
            resolve(false);
        });

        req.write(JSON.stringify({
            eventId: 1,
            authToken: 'test_token'
        }));

        req.end();
    });
};

const run = async () => {
    let success;

    if (typeof window === 'undefined' && typeof global !== 'undefined') {
        success = await runNodeTest();
    } else {
        success = await testAPI();
    }

    if (typeof process !== 'undefined') {
        process.exit(success ? 0 : 1);
    }
};

if (import.meta.url === `file://${process.argv[1]}`) {
    run();
}
