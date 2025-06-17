# Génération des tickets lors de l’achat et personnalisation \- Sway Ticketing

---

## **1\. Modifications de la structure de la base de données**

### **a. Table products**

* **Ajoutez une colonne `type`** qui précisera le type de produit (ex. `"ticket"`, `"token"`, `"merchandising"`).  
   Cela permettra de savoir, lors du traitement des commandes, quels produits nécessitent la génération de tickets.

### **b. Table orders**

* Conserve les informations générales de la commande :  
  * buyer\_email  
  * user\_id (si l'utilisateur est connecté)  
  * entity\_type et entity\_id (pour lier la commande à l'événement)  
  * Montant, devise, provider\_order\_id, etc.  
* *Note :* Aucune donnée de personnalisation spécifique (comme un token) n'est stockée ici, car ce champ ne s'applique qu'aux tickets.

### **c. Table de jointure order\_products**

* Enregistrez pour chaque commande les produits achetés :  
  * order\_id (clé étrangère vers orders)  
  * product\_id (clé étrangère vers products)  
  * quantity  
  * price (facultatif)  
* Vous pourrez ensuite joindre cette table à **products** pour déterminer quels produits sont de type `"ticket"`.

Voici la partie 1.d. sur la table **tickets** mise à jour avec toutes les colonnes (existantes et nouvelles) :

---

### **d. Table tickets**

* **Colonnes existantes à conserver :**

  * **id** : uuid généré automatiquement (ex. `gen_random_uuid()`)  
  * **order\_id** : référence vers l'ordre auquel le ticket appartient  
  * **product\_id** : référence vers le produit acheté (lié à la table **products**)  
  * **event\_id** : identifiant de l'événement associé  
  * **qr\_code\_data** : texte contenant les données du QR code (à terme généré avec un HMAC sécurisé)  
  * **status** : par défaut `"valid"`  
  * **scanned\_at** : timestamp indiquant quand le ticket a été scanné (nullable)  
  * **created\_at** : timestamp de création du ticket (par défaut `now()`)  
  * **scanned\_by** : uuid de l'utilisateur ayant scanné le ticket (nullable)  
* **Nouvelles colonnes à ajouter pour la personnalisation :**

  * **customization\_token** (texte)  
    * Par défaut, tous les tickets générés recevront le même token de personnalisation pour la commande.  
    * Ce token sera utilisé pour sécuriser l'accès à la personnalisation (et éventuellement pour être intégré dans le QR code).  
    * Lors d’une personnalisation individuelle ou en cas de transfert/revente, ce token pourra être régénéré, rendant l'ancien non valide.  
  * **customization\_data** (JSON)  
    * Cette colonne regroupera toutes les informations de personnalisation du ticket (par exemple, le prénom, le nom et l'email du participant).  
  * Exemple de contenu JSON :  
     {  
  * "participant\_first\_name": "John",  
  * "participant\_last\_name": "Doe",  
  * "participant\_email": "<john.doe@example.com>"  
  * }  
    *
    * Si cette colonne est `null` ou vide, cela indique que le ticket n’a pas encore été personnalisé.

---

## **2\. Création de la session Stripe** *([commit c4678a0d2133288e07e434a48fb1abaf1ddc9471](https://github.com/SwayLtd/sway-ticketing-nuxtjs/commit/c4678a0d2133288e07e434a48fb1abaf1ddc9471))*

### **Dans votre endpoint de création de session (ex. `create-checkout-session.ts`) :**

* **Métadonnées globales de la session** :

  * Transmettez dans la metadata de la session :  
    * `buyer_email` (user.email si connecté, sinon l’email du formulaire)  
    * `user_id` (si l'utilisateur est connecté)  
    * `entity_type` et `entity_id` (pour relier la commande à l'événement)  
* **Pour chaque line item** :  

Dans la propriété `price_data.product_data`, ajoutez une metadata avec votre identifiant interne de produit, par exemple :  
 line\_items: lineItems.map((item) \=\> ({  
  price\_data: {  
    currency,  
    product\_data: {
      name: item.name,  
      metadata: { product\_id: item.id }  // identifiant interne  
    },  
    unit\_amount: item.amount,  
  },  
  quantity: item.quantity,  
})),

*
  * Le champ `product_id` permettra de faire le lien entre le produit Stripe et votre produit interne.  
  * Le type de produit sera déterminé côté backend en rejoignant la table **products** (où vous avez défini le champ `type`).

\+ fix login (commit eab1c5c2aab93fc029e4e01f979ac7926027894d)  
---

## **3\. Traitement du webhook Stripe (checkout.session.completed)** *([commit 6b02d973fb7d8b3fb9395c1dcc1aebcf62703e31](https://github.com/SwayLtd/sway-ticketing-nuxtjs/commit/6b02d973fb7d8b3fb9395c1dcc1aebcf62703e31))*

### **Dans votre webhook (ex. `server/api/webhooks/stripe.ts`) :**

1. **Création de la commande dans la table orders**

   * Récupérez les données de la session (buyer\_email, user\_id, entity\_type, entity\_id, montant, devise, provider\_order\_id, etc.).  
   * Créez l'enregistrement dans **orders**.  
2. **Insertion dans la table de jointure order\_products**

   * Pour chaque line item (en utilisant l'option expand pour récupérer les détails), récupérez :  
     * Le `product_id` via `item.price_data.product_data.metadata.product_id`.  
     * La quantité et, éventuellement, le prix.  
   * Insérez ces enregistrements dans **order\_products**.  
3. **Note sur le token de personnalisation**

   * **Ne stockez pas de token ici.**  
      Le token ne concerne que les tickets. Vous déterminerez plus tard (dans l’Edge Function) si l’ordre contient des tickets (en rejoignant **order\_products** et **products** sur le champ `type`).

---

## **4\. Génération des tickets via une Edge Function Supabase** *([commit 6537e26dce2e25c63c0dee2e08dfd3b471a41eab](https://github.com/SwayLtd/sway-ticketing-nuxtjs/commit/6537e26dce2e25c63c0dee2e08dfd3b471a41eab))*

### **Fonctionnement de l’Edge Function :**

1. **Déclenchement**

   * La fonction est appelée (par exemple via un appel HTTP depuis le webhook ou un autre mécanisme) avec l’`order_id`.  
2. **Vérification pour éviter la double création**

   * Interrogez la table **order\_products** pour récupérer tous les produits achetés pour cet order\_id.  
   * Pour chaque produit, joignez avec **products** pour connaître le `type` (ex. `"ticket"`).  
   * Pour chaque enregistrement de type `"ticket"`, vérifiez dans **tickets** combien de tickets ont déjà été créés pour la combinaison `order_id` / `product_id`.  
   * Si le nombre existant est inférieur à la quantité indiquée dans **order\_products**, créez les tickets manquants.  
3. **Création des tickets**

   * Pour chaque ticket à générer, insérez dans **tickets** :  
     * `order_id`, `product_id`, `event_id`  
     * `qr_code_data` généré (à terme, via HMAC sécurisé avec un token lié à l’événement)  
     * `status` à `"valid"`  
     * **Le même `customization_token` par défaut** (généré une fois par commande pour tous les tickets concernés).  
     * `customization_data` initialisé à `null` (pour signifier qu’il n’est pas encore personnalisé).

---

## **5\. Email récapitulatif et page Success** *([commit ccdf5d40f05f71b077a7e5ed86e8704baf9074dd](https://github.com/SwayLtd/sway-ticketing-nuxtjs/commit/ccdf5d40f05f71b077a7e5ed86e8704baf9074dd))*

### **5.2 Email récapitulatif** *([commit ccdf5d40f05f71b077a7e5ed86e8704baf9074dd](https://github.com/SwayLtd/sway-ticketing-nuxtjs/commit/ccdf5d40f05f71b077a7e5ed86e8704baf9074dd))*

* Après la création de la commande et l’insertion dans **order\_products**, envoyez un email à l’acheteur.  
* L’email contiendra un récapitulatif de la commande et, si des tickets sont achetés (vérifié en rejoignant **order\_products** avec **products** sur le champ `type`), inclura un lien de personnalisation.  

### **5.3 Lien de personnalisation** *([commit ccdf5d40f05f71b077a7e5ed86e8704baf9074dd](https://github.com/SwayLtd/sway-ticketing-nuxtjs/commit/ccdf5d40f05f71b077a7e5ed86e8704baf9074dd))*

* Le lien proposé pourrait ressembler à :  
     <https://votredomaine.com/customize-tickets?order\_id=ORDER\_ID\&token=CUSTOMIZATION\_TOKEN>  
* Ici, `ORDER_ID` est l’identifiant de la commande, et `CUSTOMIZATION_TOKEN` est le token commun (initial) pour tous les tickets de l'ordre.  
* Sur la page success du paiement, si l’ordre contient des tickets, affichez un bouton « Personnaliser mes tickets » renvoyant à ce lien.

   > **Note importante :** Après personnalisation d’un ticket, un email avec le ticket PDF est envoyé à l’utilisateur. Dans cet email, un nouveau `customization_token` devrait être généré individuellement pour chaque ticket personnalisé afin que seule la personne à qui est dédié ce ticket puisse le personnaliser à nouveau. Cette fonctionnalité de régénération de token individuel **N’EST PAS ENCORE IMPLÉMENTÉE** et nécessite une mise à jour future.

---

## **6\. Page de personnalisation des tickets** *[(commit f67fdf9b45ba68445df70a1298a1a27d89a92a31)*](https://github.com/SwayLtd/sway-ticketing-nuxtjs/commit/f67fdf9b45ba68445df70a1298a1a27d89a92a31)

1. **Accès sécurisé**

   * La page récupère l’`order_id` et le token depuis l’URL.  
   * Elle vérifie, pour chaque ticket associé à l’order\_id dans la table **tickets**, que le token correspond à celui stocké dans la colonne `customization_token`.  
2. **Interface de personnalisation**

   * Affichez la liste des tickets.  
   * Pour chaque ticket, proposez un formulaire permettant de renseigner les informations de personnalisation (prénom, nom, email du participant).  
   * Ces informations seront enregistrées dans la colonne `customization_data` (au format JSON) du ticket.  
3. **Mise à jour et sécurité post-personnalisation**

   * Lorsqu’un ticket est personnalisé, vous pouvez choisir de générer un nouveau `customization_token` pour ce ticket afin de bloquer l’accès avec l'ancien token (utile pour des fonctionnalités futures comme la revente ou le transfert).

---

## **7\. Système de Scanners et Synchronisation Offline** *([commit 94045334e8ae14da98bd8d91734c053a90f1efdc](https://github.com/SwayLtd/sway-ticketing-nuxtjs/commit/94045334e8ae14da98bd8d91734c053a90f1efdc))*

### **1\. Accès à l’Interface de Scanning**

* **URL d’Accès :**  
   L’interface de scanning est accessible via une URL qui inclut obligatoirement l’event ID (ex. :  
   `https://votredomaine.com/scanner?event_id=123`) pour identifier l’événement concerné.

* **Authentification :**  
   Deux approches possibles pour sécuriser l’accès :

  * **Token d’authentification dans l’URL :**  
     L’URL peut inclure un paramètre `auth_token` qui est généré pour l’appareil ou l’utilisateur scanner (ex. :  
     `https://votredomaine.com/scanner?event_id=123&auth_token=XYZ`).  
  * **Connexion via Compte :**  
     Vous pouvez ajouter une colonne `user_id` dans la table **scanners** et proposer aux utilisateurs de se connecter via un compte dédié.  
     Une fois connectés, ils pourront voir la liste des événements qu’ils sont autorisés à scanner. En cliquant sur un événement, l’interface de scanning s’ouvre pour cet événement.

### **2\. Fonctionnement de l’Interface de Scanning**

* **Validation du QR Code :**  
   Lorsque le scanner scanne un QR code :

  * L’application compare les données scannées avec une liste pré-téléchargée (cache locale) des tickets valides pour l’événement.  
  * **Si le QR code est valide** et que le ticket n’a pas encore été scanné (c’est-à-dire que les champs `scanned_at` et `scanned_by` sont null), un indicateur visuel vert s’affiche.  
  * **Sinon** (ticket déjà scanné ou invalide), un indicateur rouge s’affiche.  
* **Mise à Jour des Tickets :**

  * Une fois qu’un ticket valide est scanné, l’appareil met à jour localement l’état du ticket (en remplissant `scanned_at` et `scanned_by`).  
  * La mise à jour se fait via une fonction RPC ou une Edge Function qui enregistre ces informations dans la base de données.  
* **Interface Utilisateur Offline :**

  * **Téléchargement initial des données :** Au démarrage, l’application télécharge et met en cache la liste complète des tickets pour l’événement (avec leurs QR codes, statuts et autres données essentielles).  
  * **Cache Local :** Cette liste est stockée dans une base de données locale (par exemple via IndexedDB) pour permettre la vérification des tickets même en l'absence de connexion Internet.  
  * **Synchronisation différée :**  
    * Dès qu’une connexion est rétablie, l’appareil synchronise les mises à jour (tickets scannés) avec le serveur.  
    * Il envoie via une fonction RPC ou une Edge Function les informations mises à jour (les champs `scanned_at` et `scanned_by`) et rafraîchit ensuite le cache local en récupérant les dernières modifications effectuées par d’autres appareils.

### **3\. Sécurité et Conception du QR Code**

* **Génération du QR Code :**  
   Le QR code est généré par la Edge Function lors de la commande, en intégrant notamment :

  * L’**order\_id** (qui n’est jamais affiché à l’utilisateur)  
  * Le **product\_id** (pour garantir l’unicité et l’authenticité, sans être visible par l’utilisateur)  
  * Une signature HMAC sécurisée réalisée avec une clé spécifique à l’événement (téléchargée sur les appareils de scanning)  
     Cette approche garantit que le QR code est unique, difficile à falsifier, et que la vérification peut se faire localement grâce à la clé partagée.  
* **Validation Offline :**  
   Les appareils de scanning disposent de la clé HMAC (pré-téléchargée lors de la configuration ou via une mise à jour automatique) pour recalculer la signature du QR code. Ainsi, même hors ligne, le scanner peut vérifier que le QR code correspond à un ticket valide.

### **4\. Gestion de la Concurrence et Synchronisation Multi-Scanner**

* **Enregistrement Local des Scans :**  
   Chaque appareil enregistre localement les tickets scannés avec leurs timestamps (`scanned_at`) et l’identifiant du scanner (`scanned_by`).

* **Synchronisation en Temps Réel (ou Différée) :**  
   Lorsqu’un appareil retrouve la connexion, il envoie les mises à jour au serveur via une Edge Function ou une RPC.  
   Parallèlement, l’appareil télécharge les mises à jour des autres scanners pour éviter la relecture du même ticket sur plusieurs appareils.

* **Résolution des Conflits :**  
   Le serveur est la source de vérité. Si plusieurs appareils tentent de scanner le même ticket, la logique côté serveur (via des contraintes ou une fonction RPC) déterminera si le ticket doit être marqué comme scanné et renverra une réponse appropriée. Les appareils mettront ensuite à jour leur cache local en conséquence.

---

## **8\. Système de Scanners et Synchronisation Offline** *([commit 94045334e8ae14da98bd8d91734c053a90f1efdc](https://github.com/SwayLtd/sway-ticketing-nuxtjs/commit/94045334e8ae14da98bd8d91734c053a90f1efdc))*

### **1\. Accès et Authentification**

* **URL d'accès sécurisée :**  
   L'interface de scanning doit être accessible via une URL contenant au minimum l’event\_id. Deux approches sont possibles :

* **Via un token d'authentification dans l'URL :**  
   L'URL inclut un paramètre `auth_token` généré spécifiquement pour l'appareil scanner.  
   Exemple :  
   <https://votredomaine.com/scanner?event\_id=123\&auth\_token=XYZ>  
  *
  * **Via une connexion scanner dédiée :**  
     Ajoutez une colonne `user_id` dans la table **scanners**. Le scanner se connecte via un compte, puis accède à la liste des événements qu’il peut scanner. En cliquant sur un événement, l’interface de scanning s’ouvre pour cet event.  
* **Table scanners :**  
   La table doit contenir au minimum :

  * `id` (uuid)  
  * `name` (nom du scanner)  
  * `event_id` (pour lier le scanner à l’événement)  
  * `auth_token` (clé d'authentification unique pour l'appareil)  
  * `user_id` (optionnel, si le scanner est associé à un compte)  
  * `status` (ex. "active")  
  * `created_at`

  ---

  ### **2\. Pré-chargement et Stockage Local des Données**

* **Téléchargement initial :**  
   Lors du lancement de l’interface de scanning, l’appareil télécharge la liste complète des tickets pour l’événement (incluant `id`, `qr_code_data`, `scanned_at`, `scanned_by`, etc.) via une API ou une fonction RPC.

* **Stockage en cache :**  
   La liste est enregistrée dans une base de données locale (IndexedDB ou un autre mécanisme de stockage web) pour permettre la validation des tickets même en mode offline.

  ---

  ### **3\. Validation du QR Code et Mise à Jour Locale**

* **Vérification offline :**  
   Lorsqu'un ticket est scanné, l’appareil :

  * Recalcule la signature du QR code en utilisant la clé HMAC spécifique à l’événement (téléchargée au préalable).  
  * Compare les données scannées avec la liste locale des tickets.  
* **Indicateurs visuels :**

  * **Ticket valide et non scanné :** Affichage d'un indicateur vert.  
  * **Ticket déjà scanné ou invalide :** Affichage d'un indicateur rouge.  
* **Mise à jour locale :**  
   Lors d’un scan réussi, l’appareil met à jour localement le ticket (remplissant les champs `scanned_at` et `scanned_by`).

  ---

  ### **4\. Synchronisation et Gestion Multi-Scanner**

* **Synchronisation différée :**  
   Lorsque la connexion est rétablie, l’appareil :  
  * Envoie les mises à jour (tickets scannés) au serveur via une fonction RPC ou une Edge Function.  
  * Télécharge les mises à jour effectuées par d’autres appareils pour rafraîchir sa copie locale.  

* **Gestion des conflits :**  
   La base de données demeure la source de vérité. En cas de tentative de double scan, le serveur (via des contraintes ou une logique de mise à jour) renvoie un message d'erreur et l'appareil met à jour sa liste locale pour refléter l’état réel du ticket.  
  ---

  ### **5\. Interface Utilisateur pour le Scanning**

* **Interface claire et intuitive :**  
   L’application de scanning doit afficher :

  * Un champ de saisie ou une caméra pour scanner les QR codes.  
  * Un retour immédiat avec un indicateur visuel (vert pour validé, rouge pour déjà scanné ou invalide).  
  * Une notification sonore ou vibratoire peut être ajoutée pour améliorer l’expérience utilisateur.  
* **Mode offline :**  
   L’interface utilise le cache local pour vérifier les tickets et, en l'absence de connexion, enregistre localement toutes les mises à jour pour synchronisation ultérieure.

* **Mise à jour en temps réel :**  
   En mode connecté, la synchronisation en temps réel (via WebSocket ou polling) permet de refléter l’état des tickets sur tous les appareils de scanning.

  ---

## **Conclusion**

Ce cahier des charges pour le système de scanners et la synchronisation offline propose une solution complète pour le contrôle des billets lors d’un événement. En combinant :

* Une interface d'accès sécurisée (via URL avec event\_id et auth\_token ou connexion dédiée),  
* Le pré-chargement et la mise en cache locale des tickets pour la validation offline,  
* Une validation du QR code via recalcul de la signature HMAC (intégrant order\_id et product\_id),  
* Et une synchronisation différée des mises à jour (scanned\_at et scanned\_by) en mode multi-scanner, vous garantissez à la fois la sécurité, la fiabilité et l’efficacité de votre système de contrôle, même en cas de connexion intermittente.

Ce plan vous offre une solution complète et modulable, capable de gérer différents types de produits dans une commande tout en sécurisant et en facilitant la personnalisation des tickets achetés.
