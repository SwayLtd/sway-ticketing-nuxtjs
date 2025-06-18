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
        } else {
            console.log('⚠️ API répond mais avec erreur');
            const text = await response.text();
            console.log('❌ Erreur:', text);
        }
    } catch (error) {
        console.log('❌ Erreur de connexion:', error.message);
        console.log('💡 Vérifiez que le serveur est démarré');
    }
};

// Vérifier que nous sommes dans Node.js
if (typeof window === 'undefined' && typeof global !== 'undefined') {
    // Node.js - utiliser le module https
    import('https').then(async (https) => {
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

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log('📡 Status:', res.statusCode);
                console.log('📝 Body:', body);
                
                if (res.statusCode === 200) {
                    console.log('✅ API accessible et fonctionnelle');
                } else {
                    console.log('⚠️ API accessible mais erreur');
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Erreur de connexion:', error.message);
        });

        req.write(JSON.stringify({
            eventId: 1,
            authToken: 'test_token'
        }));

        req.end();
    });
} else {
    // Browser
    testAPI();
}
