# Girlies.gg — frontend

Frontend React + TypeScript + Vite relié au schéma Supabase fourni.

## Démarrer

1. Installe Node.js LTS.
2. Dans ce dossier, lance `npm install`.
3. Copie `.env.example` vers `.env.local`.
4. Renseigne l'URL de ton projet et la clé publique `anon`/`publishable` dans `.env.local`.
5. Lance `npm run dev`, puis ouvre l'adresse locale affichée par Vite.

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=ta_cle_publique
```

Ne mets jamais la clé `service_role` dans le frontend. Ne committe pas `.env.local`.

## Fonctionnalités incluses

- Interface responsive Girlies.gg (navigation, accueil, jeux, communauté).
- Liste des jeux et des cartes publiées depuis Supabase.
- Filtres par jeu, rôle, personnage, rang et recherche texte.
- Inscription/connexion via Supabase Auth.
- Création d'une carte en brouillon, publication via `publish_card`, suppression d'une carte.
- Écran profil avec les cartes de l'utilisatrice.
- Paramètres de confidentialité et notifications.
- Mode démonstration avec données d'exemple si les variables Supabase ne sont pas configurées.

## Important

Ce starter ne prétend pas encore implémenter toute la messagerie, les demandes d'amitié, la modération ni les avatars téléversés. Les pages Amies et Messages sont des états d'attente visuels ; il faudra les connecter aux tables `friendships`, `conversations`, `messages` et `blocks`, avec des contrôles de sécurité et des états d'erreur adaptés.

Le schéma SQL fourni est prévu pour un projet Supabase vide et n'a pas été exécuté/testé par ce frontend. Teste les politiques RLS et les fonctions SQL sur un environnement de développement avant tout lancement public.
