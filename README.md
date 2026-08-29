# LAAFI CAFÉ — Suite de gestion


PWA de gestion intégrée pour LAAFI CAFÉ (café-restaurant + coworking 18 places).

**État de ce livrable** : socle fonctionnel complet et déployable —
authentification, base de données (18 modèles : coworking, restaurant, stocks,
achats, caisse, facturation, notifications), tableau de bord avec chiffres
réels, PWA installable. Les écrans métier détaillés (POS, plan de salle,
cuisine, stocks, achats…) arrivent dans les blocs suivants, sur cette même
base.

- **Connexion démo** : `admin@laafi.cafe` / `admin123`

---

## 1. Déployer en ligne (Vercel + Neon) — ~10 minutes

### Étape 1 — Créer la base de données (gratuit, Neon)

1. Va sur https://neon.tech, crée un compte, crée un projet Postgres.
2. Copie les deux chaînes de connexion fournies : `DATABASE_URL` (pooled)
   et `DIRECT_URL` (direct, pour les migrations).

### Étape 2 — Pousser le code sur GitHub

```bash
cd laafi-suite
git init
git add .
git commit -m "Initial commit — socle LAAFI CAFÉ"
```

Crée un dépôt vide sur GitHub puis :

```bash
git remote add origin https://github.com/<ton-compte>/laafi-suite.git
git branch -M main
git push -u origin main
```

### Étape 3 — Déployer sur Vercel

1. Va sur https://vercel.com, connecte-toi avec GitHub.
2. « Add New Project » → sélectionne le dépôt `laafi-suite`.
3. Dans **Environment Variables**, ajoute :
   - `DATABASE_URL` → la chaîne pooled de Neon
   - `DIRECT_URL` → la chaîne directe de Neon
   - `AUTH_SECRET` → une valeur aléatoire longue (génère-la avec
     `openssl rand -base64 32`)
4. Clique **Deploy**.

### Étape 4 — Initialiser la base en production

Une fois déployé, depuis ton poste (avec les mêmes variables dans un fichier
`.env` local pointant vers Neon) :

```bash
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

Ceci crée les tables puis charge les données de démonstration (18 postes,
10 tables, produits, stocks, compte admin).

**Ton lien de connexion est l'URL Vercel** (ex. `https://laafi-suite.vercel.app`)
— accessible depuis un navigateur sur Windows, et installable comme app sur
Android (voir section 3).

---

## 2. Lancer en local (développement)

```bash
npm install
cp .env.example .env          # adapte DATABASE_URL si besoin
docker compose up -d          # lance Postgres local
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
npm run dev
```

Ouvre http://localhost:3000 → redirection automatique vers `/login`.

---

## 3. Installer comme application (Android / Windows)

**Android (Chrome)** : ouvrir le lien → menu ⋮ → « Ajouter à l'écran d'accueil »
/ « Installer l'application ». L'app s'ouvre ensuite en plein écran, sans
barre de navigateur, avec l'icône LAAFI CAFÉ.

**Windows (Chrome ou Edge)** : ouvrir le lien → icône d'installation ⊕ dans
la barre d'adresse → « Installer ». L'app apparaît dans le menu Démarrer
comme un logiciel classique.

---

## 4. Structure du projet

```
laafi-suite/
├── prisma/schema.prisma     # 18 modèles : orga, users, coworking, restaurant,
│                             # menu, recettes, commandes, cuisine, stocks,
│                             # achats, caisse, dépenses, factures, notifications
├── prisma/seed.ts            # jeu de données de démonstration
├── src/lib/auth.ts           # sessions JWT (cookie httpOnly), bcrypt
├── src/middleware.ts         # protection des routes par session
├── src/app/login             # page de connexion
├── src/app/admin/dashboard   # tableau de bord (chiffres réels de la base)
├── src/app/staff/caisse      # emplacement du futur module POS
└── public/manifest.webmanifest  # PWA installable
```

## 5. Prochaines étapes

Dis-moi quel module développer ensuite et je l'ajoute sur cette même base :
- **POS / Caisse** (prise de commande, tables, paiement, ticket cuisine)
- **Coworking** (plan des 18 postes, réservations, check-in/out, QR code)
- **Stocks & achats** (mouvements, alertes, fournisseurs, réception)
- **Facturation** (factures restaurant/coworking, export PDF)
- **Rapports** (chiffre d'affaires, marge, occupation)
