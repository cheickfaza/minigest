# MiniGest v2

Application full-stack de capture de prospects et de suivi client, avec **espace public** et **back-office administrateur séparé**.

- **Démo en ligne** : https://minigest-ruby.vercel.app
- **Code source** : https://github.com/cheickfaza/minigest

## Architecture

| Couche | Technologies | Rôle |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript strict | Rendu serveur, Server Actions, séparation public / admin |
| Base de données | Drizzle ORM + PostgreSQL (Neon en prod, PGlite embarqué en local) | Stockage partagé, migrations SQL versionnées (`drizzle/`) |
| Authentification | `scrypt` (KDF) + JWT HS256 (`jose`) en cookie `HttpOnly` | Protection en profondeur (`proxy.ts` + `requireAdmin()`) |
| Validation & i18n | Zod v4 + `libphonenumber-js` (E.164) + `next-intl` (FR / EN) | Contrôle partagé client/serveur, formats internationaux |
| UI / UX | Tailwind CSS v4 + Lucide + WCAG 2.2 AA | Thème clair/sombre, navigation clavier, contrastes vérifiés |
| Qualité | Vitest (tests unitaires + intégration Postgres), ESLint, `tsc` | `npm run check` |

### Séparation Public / Admin

- **Public (`/[locale]`, `/[locale]/privacy`)** : page d'accueil avec formulaire de demande de contact (validation stricte, numéro E.164, consentement RGPD, honeypot anti-spam, rate limiting). Les doublons d'e-mail sont acceptés silencieusement pour ne pas exposer la base.
- **Admin (`/[locale]/admin/*`)** : accessible uniquement après authentification (`/admin/login`).
  - Tableau de bord : indicateurs clés, taux de contact, graphique sur 14 jours, file d'attente des demandes les plus anciennes.
  - Gestion des demandes : recherche, filtres (*Tous / À contacter / Contactés*), tri, pagination, **case « Contacté » réservée à l'admin** avec horodatage et traçabilité (`contactedAt`, `contactedBy`), notes internes, suppression confirmée, export CSV (RFC 4180 + protection OWASP contre l'injection de formules).

## Démarrage en local

Aucune installation de PostgreSQL n'est requise : en local sans `DATABASE_URL`, MiniGest utilise **PGlite** (PostgreSQL embarqué dans `.data/pglite`).

```bash
npm install
cp .env.example .env.local
```

Générez un hash de mot de passe et un secret de session dans `.env.local` :

```bash
npm run admin:hash -- "mon-mot-de-passe-robuste"
openssl rand -base64 48
```

Initialisez la base, ajoutez des données d'exemple et lancez le serveur :

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

- Site public : http://localhost:3000/fr (ou `/en`)
- Back-office admin : http://localhost:3000/fr/admin

## Vérifications

```bash
npm run check   # typecheck + lint + tests (unitaires & intégration Postgres)
npm run build   # migrations + build de production Next.js
```

## Déploiement sur Vercel + Neon

1. Connectez une base **Neon Postgres** au projet Vercel (variable `DATABASE_URL`).
2. Configurez `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` et `SESSION_SECRET` dans les variables d'environnement Vercel.
3. Déployez (`git push` ou `npx vercel --prod`) : `npm run build` applique automatiquement les migrations avant de construire l'application.
