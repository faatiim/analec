/* =====================================================================
   TABLEAU DE BORD « ÉLECTRIFICATION RÉGIONALE »

   Ce fichier lit les chiffres de donnees.js et remplit chaque carte.
   Chaque carte a sa propre fonction « afficher… ».
   Quand on change un filtre, toutAfficher() redessine toutes les cartes.

   Sommaire
     1. Préparation des données
     2. Mise en forme des nombres
     3. Filtres choisis par l'utilisateur
     4. Outils de calcul
     5. Indicateurs clés (4 cartes du haut)
     6. Classement
     7. Tendance (courbe)
     8. Ville ou campagne (anneau)
     9. Podium
    10. Objectif 2030
    11. Matrice des pays (tableau)
    12. Réactions aux clics et aux filtres
    13. Démarrage
   ===================================================================== */


/* =====================================================================
   1. PRÉPARATION DES DONNÉES
   ===================================================================== */

// Liste des années disponibles, de la plus ancienne à la plus récente (2000 → 2024)
const ANNEES = [...new Set(DONNEES.map(ligne => ligne.annee))].sort((a, b) => a - b);
const PREMIERE_ANNEE = ANNEES[0];
const DERNIERE_ANNEE = ANNEES[ANNEES.length - 1];

// Liste des codes pays (BFA, CIV, …, SEN)
const CODES_PAYS = [...new Set(DONNEES.map(ligne => ligne.code_pays))];

// Nom affiché de chaque pays : "SEN" → "Sénégal"
const NOMS_PAYS = new Map(DONNEES.map(ligne => [ligne.code_pays, ligne.nom_pays]));

function nomDuPays(code) {
  return NOMS_PAYS.get(code);
}

// Index pour retrouver vite une ligne : "SEN|2024" → { annee: 2024, acces_total: 82.9, … }
const INDEX_DONNEES = new Map(DONNEES.map(ligne => [ligne.code_pays + '|' + ligne.annee, ligne]));

// Renvoie la ligne d'un pays pour une année, ou undefined si elle n'existe pas
function donneesDe(code, annee) {
  return INDEX_DONNEES.get(code + '|' + annee);
}

// Nom en clair de chaque indicateur
const LIBELLES_INDICATEUR = {
  acces_total: 'accès total',
  acces_urbain: 'accès urbain',
  acces_rural: 'accès rural',
};

// "accès total" → "Accès total"
function libelleAvecMajuscule(indicateur) {
  const libelle = LIBELLES_INDICATEUR[indicateur];
  return libelle[0].toUpperCase() + libelle.slice(1);
}


/* =====================================================================
   2. MISE EN FORME DES NOMBRES (à la française : 82,9 %)
   ===================================================================== */

const formatUneDecimale = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatAbrege = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

// 82.9 → "82,9"
function decimal(valeur) {
  return formatUneDecimale.format(valeur);
}

// 82.9 → "82,9 %"   (— si la valeur manque)
function pourcentage(valeur) {
  if (valeur == null) return '—';
  return decimal(valeur) + ' %';
}

// 8.7 → "+8,7 pt"   -5 → "−5,0 pt"
function points(valeur) {
  let signe = '';
  if (valeur > 0) signe = '+';
  if (valeur < 0) signe = '−';
  return signe + decimal(Math.abs(valeur)) + ' pt';
}

// 18501984 → "18,5 M"
function nombreAbrege(valeur) {
  if (valeur == null) return '—';
  return formatAbrege.format(valeur);
}

// Protège un texte avant de l'insérer dans la page
function securiser(texte) {
  const remplacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(texte).replace(/[&<>"']/g, caractere => remplacements[caractere]);
}

// Numéro de rang sur deux chiffres : 2 → "02"
function rangSurDeuxChiffres(rang) {
  if (!rang) return '—';
  return String(rang).padStart(2, '0');
}

// "1er", "2e", "3e"
function rangEnToutesLettres(rang) {
  return rang + (rang === 1 ? 'er' : 'e');
}


/* =====================================================================
   3. FILTRES CHOISIS PAR L'UTILISATEUR
   ===================================================================== */

// Situation au chargement de la page (et après « Réinitialiser »)
const FILTRES_INITIAUX = {
  annee: DERNIERE_ANNEE,
  pays: 'SEN',
  indicateur: 'acces_total',
  recherche: '',
};

// Filtres actuellement choisis
const filtres = { ...FILTRES_INITIAUX };

// Tri actuel de la matrice des pays
const triMatrice = { colonne: 'rang', sens: 1 };   // sens : 1 = croissant, -1 = décroissant

// Raccourci pour trouver un élément de la page par son id
function element(id) {
  return document.getElementById(id);
}

const choixAnnee = element('filtre-annee');
const choixPays = element('filtre-pays');
const choixIndicateur = element('filtre-indicateur');
const champRecherche = element('recherche-pays');

// Remplit la liste des années (la plus récente en premier)
choixAnnee.innerHTML = ANNEES
  .slice()
  .reverse()
  .map(annee => `<option value="${annee}">${annee}</option>`)
  .join('');

// Remplit la liste des pays, par ordre alphabétique
choixPays.innerHTML = CODES_PAYS
  .slice()
  .sort((a, b) => nomDuPays(a).localeCompare(nomDuPays(b), 'fr'))
  .map(code => `<option value="${code}">${securiser(nomDuPays(code))}</option>`)
  .join('');


/* =====================================================================
   4. OUTILS DE CALCUL
   ===================================================================== */

// Classement des 8 pays pour une année et un indicateur, du meilleur au moins bon.
// Chaque élément : { code, nom, valeur, valeurAnneePrecedente, rang }
function classementDeLAnnee(annee, indicateur) {
  const pays = CODES_PAYS.map(code => ({
    code: code,
    nom: nomDuPays(code),
    valeur: donneesDe(code, annee)?.[indicateur] ?? null,
    valeurAnneePrecedente: donneesDe(code, annee - 1)?.[indicateur] ?? null,
  }));

  // Les pays sans valeur passent en dernier
  pays.sort((a, b) => (b.valeur ?? -1) - (a.valeur ?? -1));

  return pays.map((p, position) => ({
    ...p,
    rang: p.valeur == null ? null : position + 1,
  }));
}

// Retire les accents et les majuscules pour comparer : "Sénégal" → "senegal"
function simplifier(texte) {
  return texte.toLocaleLowerCase('fr').normalize('NFD').replace(/\p{M}/gu, '');
}

// Vrai si le pays correspond au texte tapé dans la recherche
function correspondALaRecherche(pays) {
  if (!filtres.recherche) return true;
  return simplifier(pays.nom).includes(simplifier(filtres.recherche));
}

// Moyenne des 8 pays pondérée par la population (un grand pays compte plus)
function moyennePonderee(annee, indicateur) {
  let somme = 0;
  let populationTotale = 0;

  CODES_PAYS.forEach(code => {
    const ligne = donneesDe(code, annee);
    if (ligne && ligne[indicateur] != null && ligne.population) {
      somme += ligne[indicateur] * ligne.population;
      populationTotale += ligne.population;
    }
  });

  return populationTotale ? somme / populationTotale : null;
}

// Moyenne simple des 8 pays (chaque pays compte pareil)
function moyenneSimple(annee, indicateur) {
  const valeurs = CODES_PAYS
    .map(code => donneesDe(code, annee)?.[indicateur])
    .filter(valeur => valeur != null);

  if (!valeurs.length) return null;
  return valeurs.reduce((total, valeur) => total + valeur, 0) / valeurs.length;
}

// Gain moyen par an sur les 5 dernières années (accès total)
function rythmeSurCinqAns(code, annee) {
  const maintenant = donneesDe(code, annee)?.acces_total;
  const ilYACinqAns = donneesDe(code, annee - 5)?.acces_total;
  if (maintenant == null || ilYACinqAns == null) return null;
  return (maintenant - ilYACinqAns) / 5;
}

// Taille réelle (en pixels) du cadre d'un graphique, pour qu'il le remplisse
function tailleDuCadre(svg, largeurParDefaut, hauteurParDefaut) {
  const cadre = svg.parentElement.getBoundingClientRect();
  return [
    cadre.width > 0 ? Math.round(cadre.width) : largeurParDefaut,
    cadre.height > 0 ? Math.round(cadre.height) : hauteurParDefaut,
  ];
}

// Petites flèches utilisées dans les indicateurs clés
const FLECHE_HAUSSE = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>';
const FLECHE_BAISSE = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 6 4-4 8 8M15 17h6v-6"/></svg>';

// Ligne « ↗ +8,7 pt vs 2023 » sous la valeur d'un indicateur.
// baisseEstBonne : vrai quand une baisse est une bonne nouvelle (ex. habitants sans électricité)
function ligneVariation(valeur, valeurPrecedente, { baisseEstBonne = false, format = points } = {}) {
  const anneePrecedente = filtres.annee - 1;

  if (valeur == null || valeurPrecedente == null) {
    return `<span class="variation stable">— <span class="comparaison">pas de donnée en ${anneePrecedente}</span></span>`;
  }

  const ecart = valeur - valeurPrecedente;
  const estUneBonneNouvelle = baisseEstBonne ? ecart < 0 : ecart > 0;

  let classe = estUneBonneNouvelle ? 'hausse' : 'baisse';
  if (Math.abs(ecart) < 1e-9) classe = 'stable';

  let fleche = '';
  if (ecart > 0) fleche = FLECHE_HAUSSE;
  if (ecart < 0) fleche = FLECHE_BAISSE;

  return `<span class="variation ${classe}">${fleche}${format(ecart)} <span class="comparaison">vs ${anneePrecedente}</span></span>`;
}

// Badge « ↑ +2,1 pt » utilisé dans la matrice
function badgeVariation(valeur, valeurPrecedente) {
  if (valeur == null || valeurPrecedente == null) {
    return '<span class="badge-variation stable">—</span>';
  }

  const ecart = valeur - valeurPrecedente;

  let classe = ecart > 0 ? 'hausse' : 'baisse';
  if (Math.abs(ecart) < 1e-9) classe = 'stable';

  let fleche = '';
  if (ecart > 0) fleche = '↑';
  if (ecart < 0) fleche = '↓';

  return `<span class="badge-variation ${classe}">${fleche} ${points(ecart)}</span>`;
}


/* =====================================================================
   5. INDICATEURS CLÉS (4 cartes du haut)
   ===================================================================== */

const ICONES = {
  eclair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  ville: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 21h18M5 21V8l5-3v16M10 21V3l9 4v14M14 10h2M14 14h2"/></svg>',
  maison: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 20h18M5 20v-7l7-6 7 6v7M10 20v-5h4v5"/></svg>',
  ampouleEteinte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/><path d="M4 4l16 16"/></svg>',
};

function afficherIndicateursCles() {
  const cetteAnnee = donneesDe(filtres.pays, filtres.annee) || {};
  const anneePrecedente = donneesDe(filtres.pays, filtres.annee - 1) || {};
  const nomPays = securiser(nomDuPays(filtres.pays));

  // Les trois indicateurs en pourcentage
  const cartes = [
    { indicateur: 'acces_total',  nom: 'Accès total',  icone: ICONES.eclair, pied: `Population raccordée · ${nomPays}` },
    { indicateur: 'acces_urbain', nom: 'Accès urbain', icone: ICONES.ville,  pied: 'Villes' },
    { indicateur: 'acces_rural',  nom: 'Accès rural',  icone: ICONES.maison, pied: 'Zones rurales' },
  ];

  let html = cartes.map(carte => {
    const valeur = cetteAnnee[carte.indicateur];
    const estChoisi = carte.indicateur === filtres.indicateur;

    return `
    <div class="carte indicateur ${estChoisi ? 'actif' : ''}">
      <div class="indicateur-haut">
        <span class="indicateur-nom"><i></i>${carte.nom}</span>
        <span class="indicateur-icone">${carte.icone}</span>
      </div>
      <div class="indicateur-valeur">${valeur == null ? '—' : decimal(valeur) + '<small>%</small>'}</div>
      ${ligneVariation(valeur, anneePrecedente[carte.indicateur])}
      <div class="indicateur-pied">${carte.pied}</div>
    </div>`;
  }).join('');

  // Quatrième carte : nombre d'habitants sans électricité (une baisse est une bonne nouvelle)
  const sansElectricite = cetteAnnee.pop_sans_electricite;
  const sansElectriciteAvant = anneePrecedente.pop_sans_electricite;

  // La variation est affichée en % : "−32,2 %"
  const variationEnPourcent = ecart => {
    const pourcent = ecart / sansElectriciteAvant * 100;
    let signe = '';
    if (pourcent > 0) signe = '+';
    if (pourcent < 0) signe = '−';
    return signe + decimal(Math.abs(pourcent)) + ' %';
  };

  html += `
    <div class="carte indicateur">
      <div class="indicateur-haut">
        <span class="indicateur-nom"><i></i>Sans électricité</span>
        <span class="indicateur-icone">${ICONES.ampouleEteinte}</span>
      </div>
      <div class="indicateur-valeur">${nombreAbrege(sansElectricite)}</div>
      ${ligneVariation(sansElectricite, sansElectriciteAvant, { baisseEstBonne: true, format: variationEnPourcent })}
      <div class="indicateur-pied">Habitants non raccordés sur ${nombreAbrege(cetteAnnee.population)}</div>
    </div>`;

  element('indicateurs-cles').innerHTML = html;
}


/* =====================================================================
   6. CLASSEMENT
   ===================================================================== */

function afficherClassement() {
  const classement = classementDeLAnnee(filtres.annee, filtres.indicateur);
  const paysAffiches = classement.filter(correspondALaRecherche);

  element('titre-classement').textContent = `Pays les mieux raccordés en ${filtres.annee}`;
  element('sous-titre-classement').textContent =
    `Classement par ${LIBELLES_INDICATEUR[filtres.indicateur]}, part de la population (%)`;

  if (!paysAffiches.length) {
    element('liste-classement').innerHTML =
      `<li class="vide" style="cursor:default">Aucun pays ne correspond à « ${securiser(filtres.recherche)} ».</li>`;
    return;
  }

  element('liste-classement').innerHTML = paysAffiches.map(pays => `
    <li data-code="${pays.code}" class="${pays.code === filtres.pays ? 'selectionne' : ''}" tabindex="0">
      <span class="rang">${rangSurDeuxChiffres(pays.rang)}</span>
      <span class="nom-et-barre">
        <span>${securiser(pays.nom)}</span>
        <span class="jauge"><i style="width:${pays.valeur ?? 0}%"></i></span>
      </span>
      <span class="valeur">${pourcentage(pays.valeur)}</span>
    </li>`).join('');
}


/* =====================================================================
   7. TENDANCE (courbe 2000–2024 du pays suivi)
   ===================================================================== */

function afficherTendance() {
  const svg = element('graphique-tendance');
  const indicateur = filtres.indicateur;
  const nomPays = nomDuPays(filtres.pays);

  // --- Dimensions : le graphique prend la taille de son cadre ---
  const [largeur, hauteur] = tailleDuCadre(svg, 440, 230);
  const marge = { gauche: 34, droite: 12, haut: 12, bas: 26 };
  svg.setAttribute('viewBox', `0 0 ${largeur} ${hauteur}`);

  // Conversion année → position horizontale, et pourcentage → position verticale
  const positionX = annee =>
    marge.gauche + (annee - PREMIERE_ANNEE) / (DERNIERE_ANNEE - PREMIERE_ANNEE) * (largeur - marge.gauche - marge.droite);
  const positionY = valeur =>
    marge.haut + (1 - valeur / 100) * (hauteur - marge.haut - marge.bas);

  // --- Les deux séries : le pays suivi et la moyenne des 8 pays ---
  const seriePays = ANNEES.map(annee => ({ annee, valeur: donneesDe(filtres.pays, annee)?.[indicateur] ?? null }));
  const serieMoyenne = ANNEES.map(annee => ({ annee, valeur: moyenneSimple(annee, indicateur) }));
  const pointsConnus = seriePays.filter(point => point.valeur != null);

  // Trace une ligne en sautant les années sans donnée
  const tracerLigne = serie => {
    let chemin = '';
    let crayonPose = false;
    serie.forEach(point => {
      if (point.valeur == null) {
        crayonPose = false;
        return;
      }
      chemin += (crayonPose ? 'L' : 'M') + positionX(point.annee).toFixed(1) + ',' + positionY(point.valeur).toFixed(1);
      crayonPose = true;
    });
    return chemin;
  };

  // Surface dégradée sous la courbe du pays
  let surface = '';
  if (pointsConnus.length > 1) {
    const premier = pointsConnus[0];
    const dernier = pointsConnus[pointsConnus.length - 1];
    surface = 'M' + positionX(premier.annee) + ',' + positionY(0)
      + pointsConnus.map(point => 'L' + positionX(point.annee).toFixed(1) + ',' + positionY(point.valeur).toFixed(1)).join('')
      + 'L' + positionX(dernier.annee) + ',' + positionY(0) + 'Z';
  }

  // Lignes horizontales de repère (0, 25, 50, 75, 100 %)
  const reperesHorizontaux = [0, 25, 50, 75, 100].map(valeur => `
    <line x1="${marge.gauche}" x2="${largeur - marge.droite}" y1="${positionY(valeur)}" y2="${positionY(valeur)}" stroke="var(--bordure)" stroke-width="1"/>
    <text x="${marge.gauche - 8}" y="${positionY(valeur) + 4}" text-anchor="end" font-size="10" fill="var(--texte-discret)" font-weight="700">${valeur}</text>`).join('');

  // Années sous l'axe
  const anneesAxe = [2000, 2005, 2010, 2015, 2020, 2024].map(annee => `
    <text x="${positionX(annee)}" y="${hauteur - 6}" text-anchor="middle" font-size="10.5" fill="var(--texte-discret)" font-weight="700">${annee}</text>`).join('');

  // Point lumineux sur l'année choisie
  const valeurAnneeChoisie = donneesDe(filtres.pays, filtres.annee)?.[indicateur];
  let marqueur = '';
  if (valeurAnneeChoisie != null) {
    const x = positionX(filtres.annee);
    const y = positionY(valeurAnneeChoisie);
    marqueur = `
      <line x1="${x}" x2="${x}" y1="${marge.haut}" y2="${positionY(0)}" stroke="var(--sable)" stroke-opacity=".25" stroke-dasharray="3 4"/>
      <circle cx="${x}" cy="${y}" r="9" fill="var(--sable)" fill-opacity=".18"/>
      <circle cx="${x}" cy="${y}" r="4.5" fill="var(--sable)" stroke="var(--carte)" stroke-width="2"/>`;
  }

  // --- Dessin ---
  svg.innerHTML = `
    <defs>
      <linearGradient id="degrade-surface" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--sable)" stop-opacity=".32"/>
        <stop offset="1" stop-color="var(--sable)" stop-opacity="0"/>
      </linearGradient>
      <filter id="halo" x="-10%" y="-30%" width="120%" height="160%">
        <feGaussianBlur stdDeviation="3.5" result="flou"/>
        <feMerge><feMergeNode in="flou"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    ${reperesHorizontaux}
    ${anneesAxe}
    <path d="${surface}" fill="url(#degrade-surface)"/>
    <path d="${tracerLigne(serieMoyenne)}" fill="none" stroke="var(--texte-discret)" stroke-width="1.6" stroke-dasharray="4 4"/>
    <path d="${tracerLigne(seriePays)}" fill="none" stroke="var(--sable)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" filter="url(#halo)"/>
    ${marqueur}
    <line id="ligne-survol" x1="0" x2="0" y1="${marge.haut}" y2="${positionY(0)}" stroke="var(--texte-secondaire)" stroke-opacity="0" stroke-width="1"/>
    <rect id="zone-survol" x="${marge.gauche}" y="${marge.haut}" width="${largeur - marge.gauche - marge.droite}" height="${hauteur - marge.haut - marge.bas}" fill="transparent"/>`;

  svg.setAttribute('aria-label', `Évolution de l'${LIBELLES_INDICATEUR[indicateur]} en ${nomPays}, ${PREMIERE_ANNEE} à ${DERNIERE_ANNEE}`);

  // --- Textes de la carte ---
  const premier = pointsConnus[0];
  const dernier = pointsConnus[pointsConnus.length - 1];

  element('titre-tendance').textContent = `${nomPays}, ${PREMIERE_ANNEE}–${DERNIERE_ANNEE}`;
  element('sous-titre-tendance').textContent = premier && dernier
    ? `${libelleAvecMajuscule(indicateur)} : de ${pourcentage(premier.valeur)} (${premier.annee}) à ${pourcentage(dernier.valeur)} (${dernier.annee})`
    : 'Pas de donnée';
  element('legende-pays').textContent = nomPays;

  // --- Les 3 chiffres sous la courbe ---
  // Meilleure année = plus forte hausse d'une année sur l'autre
  let meilleureAnnee = null;
  seriePays.forEach((point, i) => {
    const pointPrecedent = seriePays[i - 1];
    if (!pointPrecedent || point.valeur == null || pointPrecedent.valeur == null) return;
    const hausse = point.valeur - pointPrecedent.valeur;
    if (!meilleureAnnee || hausse > meilleureAnnee.hausse) {
      meilleureAnnee = { annee: point.annee, hausse };
    }
  });

  const moyenneAnneeChoisie = moyenneSimple(filtres.annee, indicateur);

  element('tendance-gain').innerHTML = premier && dernier
    ? `${points(dernier.valeur - premier.valeur)}<em>${premier.annee}–${dernier.annee}</em>`
    : '—';
  element('tendance-meilleure-annee').innerHTML = meilleureAnnee
    ? `${meilleureAnnee.annee}<em>${points(meilleureAnnee.hausse)}</em>`
    : '—';
  element('tendance-vs-moyenne').innerHTML = valeurAnneeChoisie != null && moyenneAnneeChoisie != null
    ? `${points(valeurAnneeChoisie - moyenneAnneeChoisie)}<em>${filtres.annee}</em>`
    : '—';

  // --- Bulle d'information au survol de la souris ---
  const zoneSurvol = element('zone-survol');
  const ligneSurvol = element('ligne-survol');
  const infobulle = element('infobulle-tendance');

  zoneSurvol.addEventListener('mousemove', evenement => {
    const cadre = svg.getBoundingClientRect();
    const xSouris = (evenement.clientX - cadre.left) * largeur / cadre.width;

    // Année la plus proche de la souris
    const anneeEstimee = Math.round(
      PREMIERE_ANNEE + (xSouris - marge.gauche) / (largeur - marge.gauche - marge.droite) * (DERNIERE_ANNEE - PREMIERE_ANNEE)
    );
    const annee = Math.max(PREMIERE_ANNEE, Math.min(DERNIERE_ANNEE, anneeEstimee));
    const valeur = donneesDe(filtres.pays, annee)?.[indicateur];
    const moyenne = serieMoyenne.find(point => point.annee === annee)?.valeur;

    ligneSurvol.setAttribute('x1', positionX(annee));
    ligneSurvol.setAttribute('x2', positionX(annee));
    ligneSurvol.setAttribute('stroke-opacity', '.5');

    infobulle.innerHTML = `<b>${annee}</b> · ${securiser(nomPays)} ${pourcentage(valeur)}<br><span style="color:var(--texte-discret)">Moyenne ${pourcentage(moyenne)}</span>`;
    infobulle.style.left = (positionX(annee) / largeur * cadre.width) + 'px';
    infobulle.style.top = ((valeur != null ? positionY(valeur) : positionY(50)) / hauteur * cadre.height) + 'px';
    infobulle.style.opacity = 1;
  });

  zoneSurvol.addEventListener('mouseleave', () => {
    infobulle.style.opacity = 0;
    ligneSurvol.setAttribute('stroke-opacity', '0');
  });
}


/* =====================================================================
   8. VILLE OU CAMPAGNE (anneau)
   ===================================================================== */

function afficherRepartition() {
  const ligne = donneesDe(filtres.pays, filtres.annee) || {};
  const accesTotal = ligne.acces_total;
  const nomPays = nomDuPays(filtres.pays);

  // L'anneau est un cercle dont on ne colore qu'une partie (accesTotal %)
  const rayon = 72;
  const perimetre = 2 * Math.PI * rayon;
  const partColoree = accesTotal == null ? 0 : accesTotal / 100;

  element('anneau').innerHTML = `
    <defs>
      <linearGradient id="degrade-anneau" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--sable)"/>
        <stop offset="1" stop-color="var(--caramel)"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="100" r="${rayon}" fill="none" stroke="rgba(243,246,251,.08)" stroke-width="26"/>
    <circle cx="100" cy="100" r="${rayon}" fill="none" stroke="url(#degrade-anneau)" stroke-width="26"
            stroke-dasharray="${(perimetre * partColoree).toFixed(1)} ${perimetre.toFixed(1)}" transform="rotate(-90 100 100)"/>
    <circle cx="100" cy="100" r="54" fill="var(--carte-foncee)"/>
    <text x="100" y="88" text-anchor="middle" font-size="9.5" letter-spacing="1.4" font-weight="800" fill="var(--texte-discret)">RACCORDÉS</text>
    <text x="100" y="116" text-anchor="middle" font-size="27" font-weight="800" fill="var(--sable)" font-family="Sora, sans-serif">${accesTotal == null ? '—' : decimal(accesTotal) + '%'}</text>`;

  element('anneau').setAttribute('aria-label', `${nomPays} : ${pourcentage(accesTotal)} de la population raccordée en ${filtres.annee}`);
  element('annee-repartition').textContent = filtres.annee;
  element('sous-titre-repartition').textContent = `${nomPays}, part de la population raccordée`;

  const ecart = ligne.ecart_urbain_rural;

  element('liste-repartition').innerHTML = `
    <li>
      <i style="background:var(--sable)"></i>
      <div><b>Villes</b><small>Accès urbain</small></div>
      <span class="pourcentage">${pourcentage(ligne.acces_urbain)}</span>
    </li>
    <li>
      <i style="background:var(--caramel)"></i>
      <div><b>Campagnes</b><small>Accès rural</small></div>
      <span class="pourcentage">${pourcentage(ligne.acces_rural)}</span>
    </li>
    <li>
      <i style="background:var(--texte-discret)"></i>
      <div><b>Écart ville / campagne</b><small>${nombreAbrege(ligne.pop_sans_electricite)} habitants sans courant</small></div>
      <span class="pourcentage">${ecart == null ? '—' : decimal(ecart) + ' pt'}</span>
    </li>`;
}


/* =====================================================================
   9. PODIUM (les 3 premiers pays)
   ===================================================================== */

// Dégradé de chaque marche du podium : or sable, latte, caramel
const DEGRADES_PODIUM = [
  'linear-gradient(180deg,var(--sable),var(--caramel))',
  'linear-gradient(180deg,var(--latte),var(--caramel))',
  'linear-gradient(180deg,var(--caramel),rgba(224,135,58,.45))',
];

function afficherPodium() {
  const classement = classementDeLAnnee(filtres.annee, filtres.indicateur)
    .filter(pays => pays.valeur != null);
  const troisPremiers = classement.slice(0, 3);
  const dernier = classement[classement.length - 1];
  const moyenne = classement.reduce((total, pays) => total + pays.valeur, 0) / classement.length;

  element('moyenne-podium').textContent = classement.length ? decimal(moyenne) + ' %' : '—';
  element('sous-titre-podium').textContent = `${libelleAvecMajuscule(filtres.indicateur)} en ${filtres.annee}`;

  element('podium').innerHTML = troisPremiers.map((pays, position) => {
    // Le pays suivi est entouré d'un liseré clair
    const contourPaysSuivi = pays.code === filtres.pays
      ? 'box-shadow:0 0 0 2px var(--texte), 0 0 18px rgba(242,184,75,.4)'
      : '';

    return `
    <div class="podium-colonne">
      <span class="podium-valeur">${decimal(pays.valeur)}%</span>
      <div class="podium-socle">
        <div class="podium-barre" style="height:${Math.max(3, pays.valeur)}%;background:${DEGRADES_PODIUM[position]};${contourPaysSuivi}"></div>
      </div>
      <span class="podium-pays" title="${securiser(pays.nom)}">${securiser(pays.nom)}</span>
      <span class="podium-rang">${rangEnToutesLettres(position + 1)}</span>
    </div>`;
  }).join('');

  // Les 3 chiffres sous le podium
  const paysSuivi = classement.find(pays => pays.code === filtres.pays);

  element('podium-rang-pays').innerHTML = paysSuivi
    ? `${paysSuivi.rang}<em>/ ${classement.length} · ${filtres.pays}</em>`
    : '—';
  element('podium-ecart').innerHTML = classement.length > 1
    ? `${decimal(classement[0].valeur - dernier.valeur)}<em>pt</em>`
    : '—';
  element('podium-dernier').innerHTML = dernier
    ? `${decimal(dernier.valeur)} %<em>${dernier.code}</em>`
    : '—';
}


/* =====================================================================
   10. OBJECTIF 2030 (ODD 7 : 100 % de la population raccordée)
   ===================================================================== */

const ANNEE_OBJECTIF = 2030;

function afficherObjectif2030() {
  const code = filtres.pays;
  const annee = filtres.annee;
  const accesActuel = donneesDe(code, annee)?.acces_total;

  // Rythme réel (5 dernières années) et rythme nécessaire pour atteindre 100 % en 2030
  const rythme = rythmeSurCinqAns(code, annee);
  const anneesRestantes = ANNEE_OBJECTIF - annee;
  const rythmeRequis = accesActuel != null && anneesRestantes > 0
    ? (100 - accesActuel) / anneesRestantes
    : null;

  // Année où l'on atteindrait 100 % en gardant le rythme actuel
  const anneeAtteinte = rythme > 0 && accesActuel != null
    ? Math.ceil(annee + (100 - accesActuel) / rythme)
    : null;

  // --- Jauge ---
  element('objectif-pays').textContent = `${code} · ${annee}`;
  element('objectif-jauge').style.width = (accesActuel ?? 0) + '%';
  element('objectif-valeur').textContent = accesActuel == null ? '' : `${nomDuPays(code)} : ${pourcentage(accesActuel)}`;

  // --- Les 3 chiffres ---
  element('objectif-rythme').innerHTML = rythme == null
    ? '—'
    : `${rythme > 0 ? '+' : ''}${decimal(rythme)} <em>pt/an</em>`;

  element('objectif-rythme-requis').innerHTML = rythmeRequis == null
    ? '—'
    : `+${decimal(rythmeRequis)} <em>pt/an</em>`;

  let texteAnnee;
  if (accesActuel >= 100) texteAnnee = 'Atteint';
  else if (anneeAtteinte == null) texteAnnee = '—';
  else if (anneeAtteinte > 2060) texteAnnee = 'après 2060';
  else texteAnnee = `${anneeAtteinte}<em>${anneeAtteinte <= ANNEE_OBJECTIF ? 'à temps' : 'en retard'}</em>`;

  const estATemps = accesActuel >= 100 || (anneeAtteinte != null && anneeAtteinte <= ANNEE_OBJECTIF);
  element('objectif-annee').innerHTML = texteAnnee;
  element('objectif-annee').style.color = estATemps ? 'var(--hausse)' : 'var(--baisse)';

  // --- Petit graphique de trajectoire ---
  dessinerTrajectoire2030(accesActuel, rythme);

  // Texte d'analyse masqué : retirer les // de la ligne suivante pour le réafficher
  // afficherTexteAnalyse(accesActuel, rythme, rythmeRequis);
}

// Graphique : courbe réelle depuis 2010, projection au rythme actuel, trajectoire requise
function dessinerTrajectoire2030(accesActuel, rythme) {
  const svg = element('graphique-objectif');
  const code = filtres.pays;
  const annee = filtres.annee;

  const [largeur, hauteur] = tailleDuCadre(svg, 380, 170);
  const marge = { gauche: 30, droite: 12, haut: 12, bas: 22 };
  svg.setAttribute('viewBox', `0 0 ${largeur} ${hauteur}`);

  const debut = 2010;
  const fin = Math.max(ANNEE_OBJECTIF, annee);
  const positionX = a => marge.gauche + (a - debut) / (fin - debut) * (largeur - marge.gauche - marge.droite);
  const positionY = valeur => {
    const borne = Math.min(100, Math.max(0, valeur));
    return marge.haut + (1 - borne / 100) * (hauteur - marge.haut - marge.bas);
  };

  // Courbe réelle
  const pointsReels = ANNEES
    .filter(a => a >= debut && a <= annee)
    .map(a => ({ annee: a, valeur: donneesDe(code, a)?.acces_total }))
    .filter(point => point.valeur != null);

  const courbeReelle = pointsReels
    .map((point, i) => (i ? 'L' : 'M') + positionX(point.annee).toFixed(1) + ',' + positionY(point.valeur).toFixed(1))
    .join('');

  // Repères 0, 50, 100 %
  const reperes = [0, 50, 100].map(valeur => `
    <line x1="${marge.gauche}" x2="${largeur - marge.droite}" y1="${positionY(valeur)}" y2="${positionY(valeur)}" stroke="var(--bordure)"/>
    <text x="${marge.gauche - 7}" y="${positionY(valeur) + 4}" text-anchor="end" font-size="10" font-weight="700" fill="var(--texte-discret)">${valeur}</text>`).join('');

  // Années sous l'axe (2030 en sable)
  const anneesAxe = [2010, 2015, 2020, 2025, 2030].map(a => `
    <text x="${positionX(a)}" y="${hauteur - 5}" text-anchor="middle" font-size="10" font-weight="700" fill="${a === ANNEE_OBJECTIF ? 'var(--sable)' : 'var(--texte-discret)'}">${a}</text>`).join('');

  // Trajectoire requise (verte) et projection au rythme actuel (pointillés)
  let projections = '';
  if (accesActuel != null && annee < ANNEE_OBJECTIF) {
    projections += `<path d="M${positionX(annee)},${positionY(accesActuel)}L${positionX(ANNEE_OBJECTIF)},${positionY(100)}" stroke="var(--hausse)" stroke-width="2" fill="none"/>`;

    if (rythme != null) {
      const valeurEn2030 = Math.min(100, Math.max(0, accesActuel + rythme * (ANNEE_OBJECTIF - annee)));
      const decalageEtiquette = valeurEn2030 > 88 ? 15 : -7;   // étiquette sous le point si trop haut
      projections += `
        <path d="M${positionX(annee)},${positionY(accesActuel)}L${positionX(ANNEE_OBJECTIF)},${positionY(valeurEn2030)}" stroke="var(--texte-secondaire)" stroke-width="2" stroke-dasharray="5 4" fill="none"/>
        <circle cx="${positionX(ANNEE_OBJECTIF)}" cy="${positionY(valeurEn2030)}" r="3.5" fill="var(--texte-secondaire)"/>
        <text x="${positionX(ANNEE_OBJECTIF) - 7}" y="${positionY(valeurEn2030) + decalageEtiquette}" text-anchor="end" font-size="10.5" font-weight="800" fill="var(--texte-secondaire)">${decimal(valeurEn2030)} % en 2030</text>`;
    }
  }

  const pointActuel = accesActuel != null
    ? `<circle cx="${positionX(annee)}" cy="${positionY(accesActuel)}" r="4.5" fill="var(--sable)" stroke="var(--carte)" stroke-width="2"/>`
    : '';

  svg.innerHTML = `
    ${reperes}
    ${anneesAxe}
    <line x1="${positionX(ANNEE_OBJECTIF)}" x2="${positionX(ANNEE_OBJECTIF)}" y1="${marge.haut}" y2="${hauteur - marge.bas}" stroke="var(--sable)" stroke-opacity=".35" stroke-dasharray="2 4"/>
    <circle cx="${positionX(ANNEE_OBJECTIF)}" cy="${positionY(100)}" r="4" fill="var(--hausse)"/>
    ${projections}
    <path d="${courbeReelle}" stroke="var(--sable)" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    ${pointActuel}`;

  svg.setAttribute('aria-label', `${nomDuPays(code)} : trajectoire de l'accès total vers l'objectif de 100 % en 2030`);
}

/* --- TEXTE D'ANALYSE (masqué car jugé trop chargé) ---------------------
   Pour le réafficher :
     1. dans index.html, retirer le commentaire autour de
        #objectif-verdict et #objectif-constats ;
     2. retirer les marques de commentaire autour de cette fonction ;
     3. retirer les // devant son appel dans afficherObjectif2030().

function afficherTexteAnalyse(accesActuel, rythme, rythmeRequis) {
  const code = filtres.pays;
  const annee = filtres.annee;
  const nomPays = nomDuPays(code);

  // Phrase de conclusion
  const verdict = element('objectif-verdict');
  if (rythme == null || rythmeRequis == null) {
    verdict.className = 'verdict';
    verdict.textContent = 'Pas assez de recul pour calculer le rythme.';
  } else if (rythme >= rythmeRequis) {
    verdict.className = 'verdict hausse';
    verdict.innerHTML = `Au rythme des 5 dernières années, ${securiser(nomPays)} atteindrait l'accès universel vers <b>${Math.ceil(annee + (100 - accesActuel) / rythme)}</b>, dans les temps pour 2030.`;
  } else if (rythme > 0) {
    const anneeAtteinte = Math.ceil(annee + (100 - accesActuel) / rythme);
    verdict.className = 'verdict baisse';
    verdict.innerHTML = `À ce rythme, l'accès universel arriverait ${anneeAtteinte > 2060 ? '<b>après 2060</b>' : 'vers <b>' + anneeAtteinte + '</b>'}. Il faudrait aller <b>${decimal(rythmeRequis / rythme)} fois plus vite</b> pour tenir 2030.`;
  } else {
    verdict.className = 'verdict baisse';
    verdict.innerHTML = `L'accès a reculé sur 5 ans : l'objectif 2030 n'est pas en vue à ce rythme.`;
  }

  // Liste de constats
  const paysSuivi = classementDeLAnnee(annee, 'acces_total').find(pays => pays.code === code);
  const cetteAnnee = donneesDe(code, annee) || {};
  const en2000 = donneesDe(code, PREMIERE_ANNEE) || {};
  const moyenne = moyennePonderee(annee, 'acces_total');
  const premierEcartConnu = ANNEES.map(a => donneesDe(code, a)).find(ligne => ligne && ligne.ecart_urbain_rural != null);
  const constats = [];

  if (paysSuivi?.rang) {
    constats.push(`<b>${paysSuivi.rang}<sup>${paysSuivi.rang === 1 ? 'er' : 'e'}</sup> sur 8</b> pour l'accès total en ${annee}, ${accesActuel >= moyenne ? 'au-dessus' : 'en dessous'} de la moyenne régionale pondérée (${pourcentage(moyenne)}).`);
  }
  if (accesActuel != null && en2000.acces_total != null) {
    constats.push(`<b>${points(accesActuel - en2000.acces_total)}</b> depuis ${PREMIERE_ANNEE} (${pourcentage(en2000.acces_total)} → ${pourcentage(accesActuel)}).`);
  }
  if (cetteAnnee.pop_sans_electricite != null && en2000.pop_sans_electricite != null) {
    constats.push(`Habitants sans électricité : <b>${nombreAbrege(en2000.pop_sans_electricite)} → ${nombreAbrege(cetteAnnee.pop_sans_electricite)}</b>, alors que la population est passée de ${nombreAbrege(en2000.population)} à ${nombreAbrege(cetteAnnee.population)}.`);
  }
  if (premierEcartConnu && cetteAnnee.ecart_urbain_rural != null && premierEcartConnu.annee < annee) {
    constats.push(`Écart ville/campagne : <b>${decimal(premierEcartConnu.ecart_urbain_rural)} → ${decimal(cetteAnnee.ecart_urbain_rural)} pt</b> (${premierEcartConnu.annee}–${annee}).`);
  } else if (cetteAnnee.acces_rural == null) {
    constats.push(`Accès rural non publié pour ${annee} : l'écart ville/campagne n'est pas calculable.`);
  }

  element('objectif-constats').innerHTML = constats.map(texte => `<li><span>${texte}</span></li>`).join('');
}
------------------------------------------------------------------------ */


/* =====================================================================
   11. MATRICE DES PAYS (tableau complet, triable)
   ===================================================================== */

// Colonnes du tableau : « cle » sert au tri, « titre » est affiché
const COLONNES_MATRICE = [
  { cle: 'rang',                 titre: 'RANG' },
  { cle: 'nom',                  titre: 'PAYS' },
  { cle: 'valeur',               titre: 'ACCÈS' },   // remplacé par « ACCÈS TOTAL / URBAIN / RURAL »
  { cle: 'acces_urbain',         titre: 'URBAIN' },
  { cle: 'acces_rural',          titre: 'RURAL' },
  { cle: 'ecart_urbain_rural',   titre: 'ÉCART VILLE/CAMPAGNE' },
  { cle: 'population',           titre: 'POPULATION' },
  { cle: 'pop_sans_electricite', titre: 'SANS ÉLECTRICITÉ' },
  { cle: 'variationSurUnAn',     titre: 'SUR 1 AN' },
  { cle: 'variationDepuis2000',  titre: 'DEPUIS 2000' },
];

function afficherMatrice() {
  const indicateur = filtres.indicateur;
  const annee = filtres.annee;

  // --- Une ligne par pays, avec toutes les colonnes ---
  const lignes = classementDeLAnnee(annee, indicateur)
    .map(pays => {
      const cetteAnnee = donneesDe(pays.code, annee) || {};
      const en2000 = donneesDe(pays.code, PREMIERE_ANNEE) || {};
      return {
        ...pays,
        ...cetteAnnee,
        valeur: pays.valeur,
        rang: pays.rang,
        variationSurUnAn: pays.valeur != null && pays.valeurAnneePrecedente != null
          ? pays.valeur - pays.valeurAnneePrecedente
          : null,
        variationDepuis2000: pays.valeur != null && en2000[indicateur] != null
          ? pays.valeur - en2000[indicateur]
          : null,
      };
    })
    .filter(correspondALaRecherche);

  // --- Tri selon la colonne choisie (les valeurs manquantes en dernier) ---
  lignes.sort((a, b) => {
    const valeurA = a[triMatrice.colonne];
    const valeurB = b[triMatrice.colonne];
    if (valeurA == null) return 1;
    if (valeurB == null) return -1;
    const comparaison = typeof valeurA === 'string' ? valeurA.localeCompare(valeurB, 'fr') : valeurA - valeurB;
    return comparaison * triMatrice.sens;
  });

  // --- En-têtes cliquables ---
  element('entete-matrice').innerHTML = COLONNES_MATRICE.map(colonne => {
    const estTriee = triMatrice.colonne === colonne.cle;
    const titre = colonne.cle === 'valeur'
      ? 'ACCÈS ' + LIBELLES_INDICATEUR[indicateur].split(' ')[1].toUpperCase()
      : colonne.titre;
    const flecheTri = estTriee ? (triMatrice.sens > 0 ? ' ▲' : ' ▼') : '';
    return `<th><button type="button" data-colonne="${colonne.cle}" class="${estTriee ? 'actif' : ''}">${titre}${flecheTri}</button></th>`;
  }).join('');

  element('sous-titre-matrice').textContent =
    `Toutes les données ${annee}, classées par ${LIBELLES_INDICATEUR[indicateur]}. Cliquez sur un en-tête pour trier, sur une ligne pour suivre le pays.`;

  // --- Lignes ---
  if (!lignes.length) {
    element('lignes-matrice').innerHTML =
      `<tr><td colspan="10" style="text-align:left;color:var(--texte-discret)">Aucun pays ne correspond à « ${securiser(filtres.recherche)} ».</td></tr>`;
  } else {
    element('lignes-matrice').innerHTML = lignes.map(pays => `
    <tr data-code="${pays.code}" class="${pays.code === filtres.pays ? 'selectionne' : ''}">
      <td>${rangSurDeuxChiffres(pays.rang)}</td>
      <td><div class="cellule-pays"><span class="code-pays">${pays.code}</span>${securiser(pays.nom)}</div></td>
      <td>
        <div class="cellule-jauge">
          <b>${pourcentage(pays.valeur)}</b>
          <div class="jauge"><i style="width:${pays.valeur ?? 0}%"></i></div>
        </div>
      </td>
      <td>${pourcentage(pays.acces_urbain)}</td>
      <td>${pourcentage(pays.acces_rural)}</td>
      <td>${pays.ecart_urbain_rural == null ? '—' : decimal(pays.ecart_urbain_rural) + ' pt'}</td>
      <td>${nombreAbrege(pays.population)}</td>
      <td>${nombreAbrege(pays.pop_sans_electricite)}</td>
      <td>${badgeVariation(pays.valeur, pays.valeurAnneePrecedente)}</td>
      <td>${pays.variationDepuis2000 == null ? '—' : points(pays.variationDepuis2000)}</td>
    </tr>`).join('');
  }

  // --- Ligne de total : les 8 pays ensemble, pondérés par la population ---
  let populationTotale = 0;
  let sansElectriciteTotal = 0;
  CODES_PAYS.forEach(code => {
    const ligne = donneesDe(code, annee) || {};
    populationTotale += ligne.population || 0;
    sansElectriciteTotal += ligne.pop_sans_electricite || 0;
  });

  const moyenneCetteAnnee = moyennePonderee(annee, indicateur);
  const moyenneAnneePrecedente = moyennePonderee(annee - 1, indicateur);
  const moyenneEn2000 = moyennePonderee(PREMIERE_ANNEE, indicateur);

  element('moyenne-ponderee').textContent = moyenneCetteAnnee == null ? '—' : decimal(moyenneCetteAnnee) + ' %';

  element('total-matrice').innerHTML = `
    <tr>
      <td></td>
      <td>Ensemble des 8 pays (pondéré par la population)</td>
      <td>${pourcentage(moyenneCetteAnnee)}</td>
      <td>${pourcentage(moyennePonderee(annee, 'acces_urbain'))}</td>
      <td>—</td>
      <td>—</td>
      <td>${nombreAbrege(populationTotale)}</td>
      <td>${nombreAbrege(sansElectriciteTotal)}</td>
      <td>${badgeVariation(moyenneCetteAnnee, moyenneAnneePrecedente)}</td>
      <td>${moyenneCetteAnnee == null || moyenneEn2000 == null ? '—' : points(moyenneCetteAnnee - moyenneEn2000)}</td>
    </tr>`;
}


/* =====================================================================
   12. RÉACTIONS AUX CLICS ET AUX FILTRES
   ===================================================================== */

// Redessine tout le tableau de bord avec les filtres actuels
function toutAfficher() {
  choixAnnee.value = filtres.annee;
  choixPays.value = filtres.pays;
  choixIndicateur.value = filtres.indicateur;

  afficherIndicateursCles();
  afficherClassement();
  afficherTendance();
  afficherRepartition();
  afficherPodium();
  afficherObjectif2030();
  afficherMatrice();
}

// Filtres de la barre latérale
choixAnnee.addEventListener('change', evenement => {
  filtres.annee = Number(evenement.target.value);
  toutAfficher();
});

choixPays.addEventListener('change', evenement => {
  filtres.pays = evenement.target.value;
  toutAfficher();
});

choixIndicateur.addEventListener('change', evenement => {
  filtres.indicateur = evenement.target.value;
  toutAfficher();
});

// Recherche : filtre les listes, et dès qu'un pays correspond, tout le tableau de bord le suit
champRecherche.addEventListener('input', evenement => {
  filtres.recherche = evenement.target.value.trim();

  const paysTrouves = CODES_PAYS
    .map(code => ({ code, nom: nomDuPays(code) }))
    .filter(correspondALaRecherche);

  const paysSuiviEstTrouve = paysTrouves.some(pays => pays.code === filtres.pays);
  if (filtres.recherche && paysTrouves.length && !paysSuiviEstTrouve) {
    filtres.pays = paysTrouves[0].code;
  }

  toutAfficher();
});

// Clic sur un en-tête de la matrice : trie (un 2e clic inverse le sens)
element('entete-matrice').addEventListener('click', evenement => {
  const bouton = evenement.target.closest('button[data-colonne]');
  if (!bouton) return;

  const colonne = bouton.dataset.colonne;
  if (triMatrice.colonne === colonne) {
    triMatrice.sens *= -1;
  } else {
    triMatrice.colonne = colonne;
    // Rang et nom : croissant par défaut ; chiffres : du plus grand au plus petit
    triMatrice.sens = (colonne === 'rang' || colonne === 'nom') ? 1 : -1;
  }
  afficherMatrice();
});

// Bouton Réinitialiser : retour à la situation de départ
element('bouton-reinitialiser').addEventListener('click', () => {
  Object.assign(filtres, FILTRES_INITIAUX);
  champRecherche.value = '';
  triMatrice.colonne = 'rang';
  triMatrice.sens = 1;
  toutAfficher();
});

// Clic sur un pays (classement ou matrice) : il devient le pays suivi
function suivreLePaysClique(evenement) {
  const ligne = evenement.target.closest('[data-code]');
  if (!ligne) return;
  filtres.pays = ligne.dataset.code;
  toutAfficher();
}

element('liste-classement').addEventListener('click', suivreLePaysClique);
element('lignes-matrice').addEventListener('click', suivreLePaysClique);

// Au clavier, Entrée ou Espace sur un pays du classement fait la même chose
element('liste-classement').addEventListener('keydown', evenement => {
  if (evenement.key === 'Enter' || evenement.key === ' ') {
    evenement.preventDefault();
    suivreLePaysClique(evenement);
  }
});

// Menu : met en surbrillance le lien cliqué
element('menu').addEventListener('click', evenement => {
  const lien = evenement.target.closest('a');
  if (!lien) return;
  document.querySelectorAll('#menu a').forEach(autreLien => {
    autreLien.classList.toggle('actif', autreLien === lien);
  });
});


/* =====================================================================
   13. DÉMARRAGE
   ===================================================================== */

toutAfficher();

// Quand la fenêtre change de taille, les deux graphiques se redessinent
// pour toujours remplir leur cadre.
if (window.ResizeObserver) {
  let redessinPrevu = 0;

  const surveillance = new ResizeObserver(() => {
    cancelAnimationFrame(redessinPrevu);
    redessinPrevu = requestAnimationFrame(() => {
      afficherTendance();
      const accesActuel = donneesDe(filtres.pays, filtres.annee)?.acces_total;
      dessinerTrajectoire2030(accesActuel, rythmeSurCinqAns(filtres.pays, filtres.annee));
    });
  });

  surveillance.observe(element('graphique-tendance').parentElement);
  surveillance.observe(element('graphique-objectif').parentElement);
}
