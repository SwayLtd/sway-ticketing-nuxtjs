# Plan d'Implémentation - Système de Scanner de Tickets

## Sway Ticketing - Version 1.0

---

## **État Actuel de la Base de Données**

### **Tables Existantes Analysées :**

**✅ Table `events`**

- Colonnes importantes : `id`, `title`, `hmac_token` (déjà présent pour la signature HMAC)
- Status : **Conforme aux spécifications**

**✅ Table `tickets`**

- Colonnes existantes : `id`, `order_id`, `product_id`, `event_id`, `qr_code_data`, `status`, `scanned_at`, `created_at`, `scanned_by`, `customization_token`, `customization_data`
- Status : **Conforme aux spécifications**

**✅ Table `order_products`**

- Colonnes : `id`, `order_id`, `product_id`, `quantity`, `price`, `created_at`
- Status : **Conforme aux spécifications**

**⚠️ Table `scanners`**

- Colonnes actuelles : `id`, `name`, `event_id`, `auth_token`, `status`, `created_at`
- **Manque** : colonne `user_id` pour les scanners associés à un utilisateur
- Status : **Nécessite modification**

**✅ Table `users`**

- Colonnes importantes : `id`, `username`, `email`, `supabase_id`
- Status : **Conforme aux spécifications**

---

## **Phase 1 : Modifications de la Base de Données**

### **1.1 Ajout de la colonne `user_id` à la table `scanners`**

```sql
-- Migration : Ajout de la colonne user_id optionnelle pour les scanners liés à un utilisateur
ALTER TABLE public.scanners 
ADD COLUMN user_id integer REFERENCES public.users(id);

-- Index pour optimiser les requêtes
CREATE INDEX idx_scanners_user_id ON public.scanners(user_id);
CREATE INDEX idx_scanners_event_id ON public.scanners(event_id);
```

### **1.2 Contraintes et politiques RLS**

```sql
-- Activation RLS sur la table scanners
ALTER TABLE public.scanners ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leurs propres scanners
CREATE POLICY "Users can view their own scanners" ON public.scanners
FOR SELECT USING (
  user_id = auth.uid()::integer OR
  auth.uid() IN (
    SELECT supabase_id FROM users u 
    JOIN user_permissions up ON u.id = up.user_id 
    WHERE up.entity_type = 'event' AND up.entity_id = scanners.event_id
  )
);
```

---

## **Phase 2 : Edge Functions et RPC**

### **2.1 Edge Function pour la synchronisation des tickets scannés**

**Fichier :** `supabase/functions/sync-scanned-tickets/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { scannedTickets, scannerId } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Traitement en batch des tickets scannés
  const results = []
  for (const ticket of scannedTickets) {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        scanned_at: ticket.scanned_at,
        scanned_by: scannerId,
        status: 'scanned'
      })
      .eq('id', ticket.id)
      .eq('scanned_at', null) // Éviter les doubles scans
      .select()

    results.push({ ticket_id: ticket.id, success: !error, data, error })
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### **2.2 Fonction RPC pour valider un QR code**

```sql
CREATE OR REPLACE FUNCTION validate_qr_code(
  qr_data text,
  event_id_param integer,
  hmac_key text
) RETURNS jsonb AS $$
DECLARE
  ticket_record tickets%ROWTYPE;
  calculated_hmac text;
  is_valid boolean := false;
BEGIN
  -- Rechercher le ticket par QR code et event_id
  SELECT * INTO ticket_record 
  FROM tickets 
  WHERE qr_code_data = qr_data AND event_id = event_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'ticket_not_found'
    );
  END IF;
  
  -- Vérifier si déjà scanné
  IF ticket_record.scanned_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'already_scanned',
      'scanned_at', ticket_record.scanned_at,
      'scanned_by', ticket_record.scanned_by
    );
  END IF;
  
  -- Vérifier le statut
  IF ticket_record.status != 'valid' THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'invalid_status',
      'status', ticket_record.status
    );
  END IF;
  
  -- TODO: Vérification HMAC (à implémenter selon la logique métier)
  -- calculated_hmac := hmac(ticket_record.order_id || ticket_record.product_id, hmac_key, 'sha256');
  
  -- Retourner les informations du ticket valide
  RETURN jsonb_build_object(
    'valid', true,
    'ticket', jsonb_build_object(
      'id', ticket_record.id,
      'order_id', ticket_record.order_id,
      'product_id', ticket_record.product_id,
      'event_id', ticket_record.event_id,
      'customization_data', ticket_record.customization_data
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## **Phase 3 : Interface d'Administration des Scanners**

### **3.1 Page de gestion des scanners**

**Fichier :** `pages/admin/event/[id]/scanners.vue`

```vue
<template>
  <div class="scanners-management">
    <AdminEventHeader :event="event" />
    
    <div class="scanner-list">
      <h2>Scanners pour {{ event.title }}</h2>
      
      <!-- Bouton d'ajout -->
      <button @click="showAddModal = true" class="btn-primary">
        Ajouter un Scanner
      </button>
      
      <!-- Liste des scanners -->
      <div class="scanners-grid">
        <div v-for="scanner in scanners" :key="scanner.id" class="scanner-card">
          <h3>{{ scanner.name }}</h3>
          <p v-if="scanner.user_id">
            Utilisateur : {{ getUserName(scanner.user_id) }}
          </p>
          <p v-else>Scanner anonyme</p>
          <p>Status : {{ scanner.status }}</p>
          <div class="scanner-actions">
            <button @click="generateScannerUrl(scanner)" class="btn-secondary">
              Générer URL
            </button>
            <button @click="deactivateScanner(scanner.id)" class="btn-danger">
              Désactiver
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal d'ajout -->
    <ScannerAddModal 
      v-if="showAddModal" 
      :event-id="event.id"
      @close="showAddModal = false"
      @scanner-added="refreshScanners"
    />
  </div>
</template>

<script setup>
// Logique de la page d'administration des scanners
</script>
```

### **3.2 Composant Modal d'ajout de scanner**

**Fichier :** `components/ScannerAddModal.vue`

```vue
<template>
  <div class="modal-overlay">
    <div class="modal">
      <h3>Ajouter un Scanner</h3>
      
      <form @submit.prevent="addScanner">
        <div class="form-group">
          <label>Nom du Scanner</label>
          <input v-model="scannerName" type="text" required />
        </div>
        
        <div class="form-group">
          <label>Type de Scanner</label>
          <select v-model="scannerType">
            <option value="anonymous">Scanner Anonyme</option>
            <option value="user">Utilisateur Existant</option>
          </select>
        </div>
        
        <div v-if="scannerType === 'user'" class="form-group">
          <label>Utilisateur</label>
          <select v-model="selectedUserId">
            <option value="">Sélectionner un utilisateur</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.username }} ({{ user.email }})
            </option>
          </select>
        </div>
        
        <div class="modal-actions">
          <button type="button" @click="$emit('close')">Annuler</button>
          <button type="submit" class="btn-primary">Ajouter</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
// Logique du modal d'ajout
</script>
```

---

## **Phase 4 : Interface de Scanning**

### **4.1 Page de scanning principale**

**Fichier :** `pages/scanner.vue`

```vue
<template>
  <div class="scanner-interface">
    <!-- Authentification -->
    <ScannerAuth 
      v-if="!isAuthenticated" 
      @authenticated="handleAuth"
    />
    
    <!-- Interface de scan -->
    <div v-else class="scanner-app">
      <ScannerHeader :event="currentEvent" :scanner="currentScanner" />
      
      <!-- Statut de connexion -->
      <ConnectionStatus :is-online="isOnline" />
      
      <!-- Scanner QR -->
      <QRScanner 
        @qr-scanned="handleQRScan"
        :is-scanning="isScanning"
      />
      
      <!-- Résultat du scan -->
      <ScanResult 
        v-if="scanResult"
        :result="scanResult"
        @close="scanResult = null"
      />
      
      <!-- Statistiques -->
      <ScannerStats :stats="scannerStats" />
      
      <!-- Queue des scans offline -->
      <OfflineQueue 
        v-if="offlineQueue.length > 0"
        :queue="offlineQueue"
        @sync="syncOfflineScans"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useScanner } from '~/composables/useScanner'

const {
  isAuthenticated,
  currentEvent,
  currentScanner,
  isOnline,
  scannerStats,
  offlineQueue,
  handleAuth,
  handleQRScan,
  syncOfflineScans
} = useScanner()

// Gestion PWA et cache offline
onMounted(() => {
  // Enregistrer service worker
  registerServiceWorker()
  // Télécharger les données de l'événement
  downloadEventData()
})
</script>
```

### **4.2 Composant Scanner QR**

**Fichier :** `components/scanner/QRScanner.vue`

```vue
<template>
  <div class="qr-scanner">
    <div class="camera-container">
      <video ref="videoElement" autoplay playsinline></video>
      <canvas ref="canvasElement" style="display: none;"></canvas>
    </div>
    
    <div class="manual-input">
      <input 
        v-model="manualQR" 
        @keyup.enter="$emit('qr-scanned', manualQR)"
        placeholder="Ou saisir le code manuellement"
      />
      <button @click="$emit('qr-scanned', manualQR)">Valider</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import jsQR from 'jsqr'

const emit = defineEmits(['qr-scanned'])

const videoElement = ref(null)
const canvasElement = ref(null)
const manualQR = ref('')
let stream = null
let scanningInterval = null

onMounted(async () => {
  await startCamera()
  startScanning()
})

const startCamera = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    videoElement.value.srcObject = stream
  } catch (error) {
    console.error('Erreur caméra:', error)
  }
}

const startScanning = () => {
  scanningInterval = setInterval(() => {
    scanQRCode()
  }, 100)
}

const scanQRCode = () => {
  if (!videoElement.value || !canvasElement.value) return
  
  const canvas = canvasElement.value
  const context = canvas.getContext('2d')
  const video = videoElement.value
  
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imageData.data, imageData.width, imageData.height)
  
  if (code) {
    emit('qr-scanned', code.data)
  }
}

onUnmounted(() => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
  if (scanningInterval) {
    clearInterval(scanningInterval)
  }
})
</script>
```

---

## **Phase 5 : Système de Cache Offline**

### **5.1 Composable pour la gestion offline**

**Fichier :** `composables/useScanner.js`

```javascript
import { ref, reactive } from 'vue'

export const useScanner = () => {
  const isAuthenticated = ref(false)
  const isOnline = ref(navigator.onLine)
  const currentEvent = ref(null)
  const currentScanner = ref(null)
  const offlineQueue = ref([])
  const cachedTickets = ref(new Map())
  
  const scannerStats = reactive({
    totalScanned: 0,
    validScans: 0,
    invalidScans: 0,
    offlineScans: 0
  })

  // Authentification
  const handleAuth = async (authData) => {
    try {
      const { data } = await $fetch('/api/scanner/authenticate', {
        method: 'POST',
        body: authData
      })
      
      currentScanner.value = data.scanner
      currentEvent.value = data.event
      isAuthenticated.value = true
      
      // Télécharger les données pour le cache offline
      await downloadEventData()
    } catch (error) {
      throw new Error('Authentification échouée')
    }
  }

  // Téléchargement des données pour cache offline
  const downloadEventData = async () => {
    if (!currentEvent.value) return
    
    try {
      const { data } = await $fetch(`/api/scanner/event-data/${currentEvent.value.id}`)
      
      // Stocker dans IndexedDB
      await storeEventDataOffline(data)
      
      // Mettre en cache les tickets
      data.tickets.forEach(ticket => {
        cachedTickets.value.set(ticket.qr_code_data, ticket)
      })
    } catch (error) {
      console.error('Erreur téléchargement:', error)
    }
  }

  // Gestion du scan QR
  const handleQRScan = async (qrData) => {
    try {
      let result
      
      if (isOnline.value) {
        // Validation en ligne
        result = await validateQROnline(qrData)
        
        if (result.valid) {
          // Marquer comme scanné immédiatement
          await markTicketScanned(result.ticket.id)
        }
      } else {
        // Validation offline
        result = validateQROffline(qrData)
        
        if (result.valid) {
          // Ajouter à la queue offline
          offlineQueue.value.push({
            ticketId: result.ticket.id,
            qrData,
            scannedAt: new Date().toISOString(),
            scannerId: currentScanner.value.id
          })
          
          scannerStats.offlineScans++
        }
      }
      
      // Mettre à jour les stats
      scannerStats.totalScanned++
      result.valid ? scannerStats.validScans++ : scannerStats.invalidScans++
      
      return result
    } catch (error) {
      return {
        valid: false,
        reason: 'scan_error',
        error: error.message
      }
    }
  }

  // Validation online
  const validateQROnline = async (qrData) => {
    const { data } = await $fetch('/api/scanner/validate-qr', {
      method: 'POST',
      body: {
        qrData,
        eventId: currentEvent.value.id,
        scannerId: currentScanner.value.id
      }
    })
    return data
  }

  // Validation offline
  const validateQROffline = (qrData) => {
    const ticket = cachedTickets.value.get(qrData)
    
    if (!ticket) {
      return { valid: false, reason: 'ticket_not_found' }
    }
    
    if (ticket.scanned_at) {
      return { 
        valid: false, 
        reason: 'already_scanned',
        scanned_at: ticket.scanned_at 
      }
    }
    
    if (ticket.status !== 'valid') {
      return { 
        valid: false, 
        reason: 'invalid_status',
        status: ticket.status 
      }
    }
    
    // Marquer comme scanné localement
    ticket.scanned_at = new Date().toISOString()
    ticket.scanned_by = currentScanner.value.id
    
    return {
      valid: true,
      ticket: ticket
    }
  }

  // Synchronisation des scans offline
  const syncOfflineScans = async () => {
    if (!isOnline.value || offlineQueue.value.length === 0) return
    
    try {
      const { data } = await $fetch('/api/scanner/sync-offline', {
        method: 'POST',
        body: {
          scannedTickets: offlineQueue.value,
          scannerId: currentScanner.value.id
        }
      })
      
      // Vider la queue si succès
      offlineQueue.value = []
      scannerStats.offlineScans = 0
      
      return data
    } catch (error) {
      console.error('Erreur synchronisation:', error)
      throw error
    }
  }

  // Écouter les changements de connexion
  window.addEventListener('online', () => {
    isOnline.value = true
    // Auto-sync si on retrouve la connexion
    if (offlineQueue.value.length > 0) {
      syncOfflineScans()
    }
  })
  
  window.addEventListener('offline', () => {
    isOnline.value = false
  })

  return {
    isAuthenticated,
    isOnline,
    currentEvent,
    currentScanner,
    offlineQueue,
    scannerStats,
    handleAuth,
    handleQRScan,
    syncOfflineScans,
    downloadEventData
  }
}
```

---

## **Phase 6 : API Routes**

### **6.1 Route d'authentification scanner**

**Fichier :** `server/api/scanner/authenticate.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { eventId, authToken, userId } = body

  // Vérifier le scanner
  const { data: scanner } = await supabase
    .from('scanners')
    .select('*, events(*)')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .or(`auth_token.eq.${authToken},user_id.eq.${userId}`)
    .single()

  if (!scanner) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Scanner non autorisé'
    })
  }

  return {
    scanner,
    event: scanner.events,
    hmacKey: scanner.events.hmac_token
  }
})
```

### **6.2 Route de validation QR**

**Fichier :** `server/api/scanner/validate-qr.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { qrData, eventId, scannerId } = body

  // Utiliser la fonction RPC pour valider
  const { data, error } = await supabase
    .rpc('validate_qr_code', {
      qr_data: qrData,
      event_id_param: eventId,
      hmac_key: 'temp_key' // À remplacer par la vraie clé HMAC
    })

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message
    })
  }

  // Si valide, marquer comme scanné
  if (data.valid) {
    await supabase
      .from('tickets')
      .update({
        scanned_at: new Date().toISOString(),
        scanned_by: scannerId,
        status: 'scanned'
      })
      .eq('id', data.ticket.id)
  }

  return data
})
```

### **6.3 Route de données événement pour cache**

**Fichier :** `server/api/scanner/event-data/[eventId].get.ts`

```typescript
export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')

  // Récupérer tous les tickets valides pour l'événement
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, qr_code_data, status, scanned_at, scanned_by, customization_data')
    .eq('event_id', eventId)
    .eq('status', 'valid')

  // Récupérer les informations de l'événement
  const { data: eventData } = await supabase
    .from('events')
    .select('id, title, hmac_token')
    .eq('id', eventId)
    .single()

  return {
    event: eventData,
    tickets,
    downloadedAt: new Date().toISOString()
  }
})
```

---

## **Phase 7 : Service Worker et PWA**

### **7.1 Service Worker**

**Fichier :** `public/sw.js`

```javascript
const CACHE_NAME = 'sway-scanner-v1'
const OFFLINE_CACHE = 'scanner-offline-v1'

const CACHE_URLS = [
  '/',
  '/scanner',
  '/offline.html',
  // Assets essentiels
]

// Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_URLS))
  )
})

// Stratégie Cache First pour les assets, Network First pour les API
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/scanner/')) {
    // Network First pour les API scanner
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/offline.html'))
    )
  } else {
    // Cache First pour les autres ressources
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
    )
  }
})

// Background Sync pour la synchronisation des données
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scanned-tickets') {
    event.waitUntil(syncScannedTickets())
  }
})

async function syncScannedTickets() {
  // Logique de synchronisation en arrière-plan
}
```

---

## **Phase 8 : Intégration et Tests**

### **8.1 Endpoints d'administration**

**Fichier :** `server/api/admin/scanners/create.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, eventId, userId, type } = body

  // Générer un token d'authentification unique
  const authToken = generateUniqueToken()

  const scannerData = {
    name,
    event_id: eventId,
    auth_token: authToken,
    status: 'active',
    ...(type === 'user' && userId && { user_id: userId })
  }

  const { data, error } = await supabase
    .from('scanners')
    .insert(scannerData)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message
    })
  }

  return {
    scanner: data,
    scannerUrl: `${process.env.BASE_URL}/scanner?event_id=${eventId}&auth_token=${authToken}`
  }
})
```

### **8.2 Tests unitaires**

**Fichier :** `tests/scanner.test.js`

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { useScanner } from '~/composables/useScanner'

describe('Scanner System', () => {
  it('should validate QR code online', async () => {
    // Test de validation en ligne
  })

  it('should validate QR code offline', () => {
    // Test de validation hors ligne
  })

  it('should queue offline scans', () => {
    // Test de mise en queue hors ligne
  })

  it('should sync offline scans when online', async () => {
    // Test de synchronisation
  })
})
```

---

## **Phase 9 : Déploiement et Monitoring**

### **9.1 Configuration PWA**

**Fichier :** `nuxt.config.ts` (ajouts)

```typescript
export default defineNuxtConfig({
  // ... configuration existante
  
  pwa: {
    registerType: 'autoUpdate',
    workbox: {
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 300 // 5 minutes
            }
          }
        }
      ]
    },
    manifest: {
      name: 'Sway Scanner',
      short_name: 'Scanner',
      description: 'Application de scan de tickets Sway',
      theme_color: '#000000',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/scanner'
    }
  }
})
```

---

## **Résumé des Livrables**

### **✅ Base de Données**

- [ ] Migration pour ajouter `user_id` à `scanners`
- [ ] Fonction RPC `validate_qr_code`
- [ ] Politiques RLS

### **🔄 Backend**

- [ ] Edge Function `sync-scanned-tickets`
- [ ] API Routes pour scanner
- [ ] API Routes d'administration

### **🎨 Frontend**

- [ ] Page administration scanners (`/admin/event/[id]/scanners`)
- [ ] Interface scanner (`/scanner`)
- [ ] Composants réutilisables
- [ ] Composable `useScanner`

### **📱 PWA & Offline**

- [ ] Service Worker
- [ ] Cache offline avec IndexedDB
- [ ] Background sync
- [ ] Manifest PWA

### **🧪 Tests & Déploiement**

- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Documentation utilisateur
- [ ] Guide de déploiement

---

## **Planning Estimé**

| Phase | Durée | Dépendances |
|-------|-------|-------------|
| Phase 1: BDD | 1 jour | - |
| Phase 2: Edge Functions | 2 jours | Phase 1 |
| Phase 3: Admin Interface | 2 jours | Phase 1 |
| Phase 4: Scanner Interface | 3 jours | Phase 2 |
| Phase 5: Cache Offline | 2 jours | Phase 4 |
| Phase 6: API Routes | 2 jours | Phase 2 |
| Phase 7: PWA | 1 jour | Phase 5 |
| Phase 8: Tests | 2 jours | Toutes |
| Phase 9: Déploiement | 1 jour | Phase 8 |

**Total estimé : 16 jours de développement**

---

## **Prochaines Étapes**

1. **Valider ce plan** avec l'équipe
2. **Commencer par la Phase 1** (modifications BDD)
3. **Tester chaque phase** avant de passer à la suivante
4. **Documenter** chaque fonctionnalité développée

---

*Ce plan d'implémentation respecte les spécifications détaillées dans le cahier des charges et tient compte de la structure existante de la base de données Sway.*
