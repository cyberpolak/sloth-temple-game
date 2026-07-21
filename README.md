# Sloth Temple Game

Jeu vidéo navigateur sur le thème du groupe de **stoner / doom metal** [Sloth Temple](https://slothtemple-doom.com/), originaire de Lille, France.

Esthétique rétro façon PlayStation 1 : palette verte sombre, police monospace, effet CRT, rendu pixelisé. Chaque niveau est un « rite » narratif dans l'univers du groupe et de **Somnul**, le dieu paresseux cosmique.

## Jouer

Aucune installation requise. Ouvrir `index.html` dans un navigateur moderne (Chrome, Firefox, Safari, Edge).

```bash
# Serveur local recommandé (audio + iframe)
python3 -m http.server 8080
# Puis ouvrir http://localhost:8080
```

## Contrôles

### Global
- **Bouton plein écran** (coin supérieur droit) : disponible dès l'écran d'accueil et conservé entre les niveaux
- Sur **mobile en plein écran** : l'affichage bascule automatiquement en **paysage** (rotation 90° si le téléphone est tenu en portrait)

### Menu
- **Écran d'accueil** : clic / toucher pour accéder au sélecteur de niveaux
- **Sélecteur** : choisir un niveau débloqué, ou revenir à l'accueil

### Niveau 1 — CREATION OF A SLOTH (JRPG tour par tour)
- Toucher / clic pour jouer
- Chaque membre du groupe attaque à son tour pour rendormir Somnul

### Niveau 2 — THE TEMPLE (plateforme 2D)
| Desktop | Mobile |
|---------|--------|
| `←` `→` se déplacer | D-pad gauche |
| `↑` `↓` ajuster la chute | D-pad haut / bas |
| `Espace` sauter (triple saut en l'air) | Bouton ✕ (saut) |
| `X` cri doom | Bouton CRR |

### Niveau 3 — SHA'UR'NA (FPS raycaster)
| Desktop | Mobile |
|---------|--------|
| `ZQSD` / `WASD` avancer / pas de côté | Croix (avancer / reculer / tourner) |
| `←` `→` ou souris (clic pour verrouiller) | — |
| `Espace` tirer | Bouton TIR |
| `E` briser un sceau | Bouton ACTION |

## Niveaux

| # | Titre | Type | Statut |
|---|-------|------|--------|
| 01 | CREATION OF A SLOTH | Combat tour par tour vs Somnul | Jouable |
| 02 | THE TEMPLE | Plateforme 2D (monde des songes) | Jouable |
| 03 | SHA'UR'NA | FPS raycaster (temple scellé) | Jouable |
| 04 | SOMNUL RISE | — | Bientôt |
| 05 | THE GREAT OLD SLOTH | — | Bientôt |

### Progression
- Le niveau 1 est débloqué par défaut
- Terminer un niveau **débloque le suivant**
- Les niveaux débloqués sont **rejouables** à volonté
- La progression est sauvegardée dans le navigateur (`localStorage`)
- À la fin d'un niveau, retour automatique au **sélecteur de niveaux**

## Niveau 2 — mécanique

Tu incarnes **Somnul** dans le monde des songes. Un courant onirique te propulse en permanence : le niveau est conçu pour être **trop difficile à vitesse normale**.

Collecte des reliques de torpeur pour **ralentir** Somnul temporairement :
- **Goutte de Brume** : ralentissement modéré, longue durée
- **Éclat de Kalimba** : ralentissement fort
- **Feuille de Sieste** : ralentissement maximal, courte durée

Dalles instables, vents de réveil et passages étroits exigent la torpeur. Atteins le **temple** pour sortir du monde des songes.

## Structure du projet

```
sloth-temple-game/
├── index.html              # Coquille : accueil, menu, iframe niveaux
├── _redirects              # Redirections Netlify (anciens chemins)
├── css/
│   └── common.css          # Styles partagés (CRT, plein écran, iframe)
├── js/
│   ├── common.js           # Progression, plein écran, navigation
│   └── app.js              # Menu et chargement des niveaux
├── levels/
│   ├── niveau1.html        # Niveau 1 — JRPG
│   ├── niveau2.html        # Niveau 2 — Plateforme
│   ├── niveau3.html        # Niveau 3 — FPS raycaster
│   └── niveau3/            # Modules JS du raycaster
├── docs/
│   └── niveau2-cartographie.svg  # Plan visuel du niveau 2
├── assets/
│   ├── audio/
│   │   ├── intro.mp3
│   │   ├── combat.mp3              # Bande son temporaire niveau 3
│   │   ├── Sloth_02_V7_Master.mp3  # Bande son niveau 2
│   │   └── Sloth_02_V7_Master.ogg
│   ├── niveau3/            # Art niveau 3 (procédural pour l'instant)
│   └── images/
│       ├── slothsleep.png
│       ├── logo.png
│       └── fondespace.jpeg
└── README.md
```

### Architecture plein écran

Les niveaux se chargent dans une **iframe** depuis `index.html`. Le plein écran reste actif sur la page parente lors des transitions menu ↔ niveau (plus de perte due au changement d'URL).

## Le groupe

**Sloth Temple** — stoner / doom metal, Lille.

| Membre | Rôle |
|--------|------|
| Lucas Polak | Guitare, chant |
| Steve Fuzzblood | Guitare |
| Quentin Roussel | Basse |
| Clement Defer | Batterie |
| Hadrien Hollart | Ingénieur son |

Site officiel : [slothtemple-doom.com](https://slothtemple-doom.com/)

## Branches Git

| Branche | Usage |
|---------|-------|
| `main` | Production |
| `develop` | Intégration |
| `feature/polak` | Développement Lucas |
| `feature/clement` | Développement Clément |

---

*SLOTH TEMPLE — TOUS LES RIFFS RÉSERVÉS — 199X*
