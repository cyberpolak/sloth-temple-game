const NIVEAUX = [
  { num: 1, fichier: 'levels/niveau1.html', titre: 'CREATION OF A SLOTH' },
  { num: 2, fichier: 'levels/niveau2.html', titre: 'THE TEMPLE' },
  { num: 3, fichier: 'levels/niveau3.html', titre: "SHA'UR'NA" },
  { num: 4, fichier: 'levels/niveau4.html', titre: 'SOMNUL RISE' },
  { num: 5, fichier: 'levels/niveau5.html', titre: 'THE GREAT OLD SLOTH' },
];

const splash = document.getElementById('splash');
const menu = document.getElementById('menu');
const gameShell = document.getElementById('game-shell');
const gameFrame = document.getElementById('game-frame');
const musique = document.getElementById('musique-intro');
const niveauxEl = document.getElementById('niveaux');

function afficherMenu() {
  splash.style.display = 'none';
  menu.style.display = 'flex';
  gameShell.style.display = 'none';
  gameFrame.src = 'about:blank';
  musique.play().catch(() => {});
  rafraichirNiveaux();
}

function afficherAccueil() {
  menu.style.display = 'none';
  gameShell.style.display = 'none';
  gameFrame.src = 'about:blank';
  splash.style.display = 'flex';
  musique.pause();
  musique.currentTime = 0;
}

function lancerNiveau(url) {
  musique.pause();
  musique.currentTime = 0;
  splash.style.display = 'none';
  menu.style.display = 'none';
  gameShell.style.display = 'block';
  gameFrame.src = url;
}

function rafraichirNiveaux() {
  const progress = SlothProgress.load();
  niveauxEl.innerHTML = '';
  NIVEAUX.forEach((n) => {
    const debloque = progress.unlocked.includes(n.num);
    const termine = progress.completed.includes(n.num);
    const existe = n.num <= 3;
    const btn = document.createElement('button');
    btn.className = 'niveau-btn' + (debloque ? ' debloque' : '') + (termine ? ' termine' : '');
    btn.disabled = !debloque || !existe;
    let statut = 'VERROUILLÉ';
    if (!existe && debloque) statut = 'BIENTÔT';
    else if (termine) statut = 'REJOUER →';
    else if (debloque) statut = 'JOUER →';
    btn.innerHTML = `<span class="num">${String(n.num).padStart(2, '0')}</span>
      <span class="titre">${n.titre}</span>
      <span class="statut">${statut}</span>`;
    if (debloque && existe) {
      btn.onclick = () => lancerNiveau(n.fichier);
    }
    niveauxEl.appendChild(btn);
  });
}

window.SlothApp = { showMenu: afficherMenu, showSplash: afficherAccueil, launchLevel: lancerNiveau };

splash.addEventListener('click', afficherMenu);
document.getElementById('btn-accueil').addEventListener('click', afficherAccueil);

SlothFullscreen.mount();

if (new URLSearchParams(location.search).get('menu') === '1') {
  afficherMenu();
}
