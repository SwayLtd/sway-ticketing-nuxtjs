import forge from 'node-forge';
import fs from 'fs';

// Générer une paire de clés
const keys = forge.pki.rsa.generateKeyPair(2048);

// Créer un certificat
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'FR' },
    { shortName: 'ST', value: 'Test' },
    { name: 'localityName', value: 'Test' },
    { name: 'organizationName', value: 'Test' },
    { shortName: 'OU', value: 'Test' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Auto-signer le certificat
cert.sign(keys.privateKey);

// Convertir en PEM
const certPem = forge.pki.certificateToPem(cert);
const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

// Sauvegarder les fichiers
fs.writeFileSync('server.crt', certPem);
fs.writeFileSync('server.key', keyPem);

console.log('Certificats SSL générés: server.crt et server.key');
