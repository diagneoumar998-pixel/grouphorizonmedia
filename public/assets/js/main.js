/* Group Horizon Media – script commun. Configuration en haut de fichier. */
const CONFIG = {
  api: '/api/news',            // fonction Cloudflare (functions/api/news.js)
  refresh: 600000,             // actualisation toutes les 10 min
  demo: false,                 // true (ou ?demo=1) = affiche du faux contenu pour tester la mise en page uniquement
  liveUrl: '',                 // URL d'embed d'un direct (YouTube/HLS iframe). Vide = aucun direct affiché
  videos: [],                  // [{id:'ID_YOUTUBE', title:'', date:'2026-10-31', type:'video|reportage|interview'}]
  ads: {},                     // ex: {lead:{img:'assets/images/pub1.jpg', href:'https://annonceur.com'}}
  email: 'contact@exemple.com' // à remplacer
};
const CATS = [['actualite','Actualité'],['politique','Politique'],['economie','Économie'],['societe','Société'],['sante','Santé'],['education','Éducation'],['culture','Culture'],['environnement','Environnement'],['sport','Sport'],['international','International'],['technologie','Technologie']];
const R = document.body.dataset.root || '', PAGE = document.body.dataset.page;
const $ = (s, e = document) => e.querySelector(s);
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fd = d => d ? new Date(d).toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'}) : '';
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const cname = k => (CATS.find(c => c[0] == k) || [0, 'Actualité'])[1];
const param = k => new URLSearchParams(location.search).get(k) || '';
const AD = (k, t) => { const a = CONFIG.ads[k]; return a ? `<a class="ad" href="${esc(a.href)}" rel="sponsored noopener" target="_blank"><span>Publicité</span><img src="${R}${esc(a.img)}" alt="Publicité" loading="lazy"></a>` : `<aside class="ad" aria-label="Espace publicitaire"><span>Publicité</span>${t}</aside>`; };
const LOGO = '<svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true"><rect width="48" height="48" rx="8" fill="#0b2a5b"/><circle cx="24" cy="22" r="9" fill="#d7263d"/><rect x="6" y="26" width="36" height="3" fill="#fff"/><rect x="10" y="32" width="28" height="2.5" fill="#fff" opacity=".7"/><rect x="15" y="37" width="18" height="2" fill="#fff" opacity=".45"/></svg>';

let ITEMS = [], LIVE = false;
const demo = () => CATS.flatMap(c => [1,2,3,4,5].map(n => ({id:`d-${c[0]}-${n}`, title:`Article de démonstration n°${n} – ${c[1]}`, summary:'Emplacement réservé : ce contenu sera remplacé automatiquement par les actualités des flux RSS configurés.', cat:c[0], source:'Démo', date:new Date().toISOString(), link:'#', demo:1})));
let META = null, FIRST = true, LAST = 0, ERR = '';
const stored = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (_) { return []; } };
const setBusy = () => { const s = $('#st'); if (s) s.textContent = '⟳ Mise à jour des actualités…'; };
const pick = (ids, n) => { const m = new Map(ITEMS.map(i => [i.id, i])), a = (ids || []).map(x => m.get(x)).filter(Boolean); return (a.length ? a : ITEMS).slice(0, n); };
async function load() {
  const prev = new Set(ITEMS.map(i => i.id));
  try {
    const r = await fetch(CONFIG.api, {cache: 'no-store'}); if (!r.ok) throw new Error('serveur ' + r.status);
    const j = await r.json(); if (!Array.isArray(j.items)) throw new Error('réponse invalide');
    ITEMS = j.items; META = j; ERR = '';
    try { localStorage.setItem('ghm', JSON.stringify(ITEMS)); const all = [...ITEMS, ...stored('ghm_all')]; localStorage.setItem('ghm_all', JSON.stringify(all.filter((x, n) => all.findIndex(y => y.id == x.id) == n).slice(0, 300))); } catch (_) {}
  } catch (e) { ERR = String(e.message || e); if (!ITEMS.length) ITEMS = stored('ghm'); }
  LIVE = ITEMS.length > 0;
  if (!LIVE && (CONFIG.demo || param('demo'))) ITEMS = demo();
  return LIVE && !FIRST ? ITEMS.filter(i => !prev.has(i.id)).length : 0;
}
function status() {
  const s = $('#st'); if (!s) return;
  const t = d => new Date(d).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}), src = META && META.sources ? META.sources.filter(x => x.ok !== null) : [];
  s.textContent = !LIVE ? `Aucune actualité disponible pour le moment${ERR ? ' (' + ERR + ')' : ''} · nouvelle tentative automatique` : `Actualités mises à jour à ${t(META && META.updated || Date.now())}` + (src.length ? ` · sources actives : ${src.filter(x => x.ok).length}/${src.length}` : '') + (ERR ? ' · connexion interrompue : dernières données affichées' : '');
}
function toast(n) {
  if (PAGE != 'home' && PAGE != 'cat') return;
  const e = document.createElement('div'); e.className = 'toast'; e.setAttribute('role', 'status'); e.textContent = `${n} nouvelle(s) actualité(s) ajoutée(s)`;
  document.body.append(e); setTimeout(() => e.remove(), 5000);
}
const url = i => `${R}pages/article.html?id=${encodeURIComponent(i.id)}`;
const idx = k => Math.max(0, CATS.findIndex(c => c[0] == k));
const cv = i => `<div class="cv" style="--h:${205 + idx(i.cat) * 3}">${i.image ? `<img src="${esc(i.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span>${cname(i.cat)}</span></div>`;
const SC = {sn: 'Sénégal', afrique: 'Afrique', monde: 'Monde'};
const meta = i => `${esc(i.source)} · ${fd(i.date)}${i.scope ? `<span class="dm">${SC[i.scope]}</span>` : ''}${i.demo ? '<span class="dm">DÉMO</span>' : ''}`;
const card = i => `<article class="card"><a href="${url(i)}">${cv(i)}</a><h3><a href="${url(i)}">${esc(i.title)}</a></h3><p>${esc(i.summary)}</p><small>${meta(i)}</small></article>`;
const empty = t => `<div class="msg">${t}</div>`;

function layout() {
  const nv = [['index.html','Accueil'], ...CATS.map(c => [`pages/categorie.html?c=${c[0]}`, c[1]]), ['pages/videos.html','Vidéos'], ['pages/contact.html','Contact']];
  $('#hdr').innerHTML = `<div class="top"><div class="wrap in"><span>${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span><form action="${R}pages/recherche.html" role="search"><input name="q" type="search" placeholder="Titre, mot-clé, rubrique…" aria-label="Rechercher" required><button>OK</button></form></div></div>
  <div class="brandbar"><div class="wrap brand"><a class="logo" href="${R}index.html" aria-label="Group Horizon Media – accueil">${LOGO}<b>GROUP HORIZON<em>MEDIA</em></b></a>${AD('lead','728×90')}</div></div>
  <div class="tk"><strong>FLASH INFO</strong><div class="mq"><div id="mq">Chargement des dernières informations…</div></div></div>
  <nav class="nav" aria-label="Navigation principale"><div class="wrap"><button id="bg" aria-expanded="false">☰ Menu</button><ul id="nl">${nv.map(n => `<li><a href="${R}${n[0]}">${n[1]}</a></li>`).join('')}</ul></div></nav>`;
  $('#bg').onclick = e => { const o = $('#nl').classList.toggle('open'); e.target.setAttribute('aria-expanded', o); };
  $('#ftr').innerHTML = `<footer><div class="wrap"><div><h4>GROUP HORIZON MEDIA (GHM)</h4><p>Média numérique d'information. Les actualités des flux affichés appartiennent à leurs sources : seuls titres et extraits sont repris, avec lien vers l'article original.</p></div><div><h4>Rubriques</h4><ul>${CATS.slice(0,6).map(c => `<li><a href="${R}pages/categorie.html?c=${c[0]}">${c[1]}</a></li>`).join('')}</ul></div><div><h4>GHM</h4><ul><li><a href="${R}pages/a-propos.html">À propos</a></li><li><a href="${R}pages/videos.html">Vidéos</a></li><li><a href="${R}pages/contact.html">Contact</a></li></ul></div></div><div class="cp"><span id="st"></span><br>© ${new Date().getFullYear()} Group Horizon Media – Tous droits réservés</div></footer>`;
}
function ticker() { $('#mq').innerHTML = ITEMS.length ? pick(META && META.flash, 10).map(i => `<a href="${url(i)}">● ${esc(i.title)}</a>`).join('') : 'Aucune information disponible pour le moment.'; }

function block(c, mode) {
  const l = ITEMS.filter(i => (i.cats || [i.cat]).includes(c[0])).slice(0, 5); if (!l.length) return '';
  const [f, ...r] = l;
  return `<section class="blk"><div class="bh"><h2>${c[1]}</h2><a href="${R}pages/categorie.html?c=${c[0]}">Toute la rubrique →</a></div>` + (mode == 'f'
    ? `<div class="feat"><a href="${url(f)}">${cv(f)}<h3>${esc(f.title)}</h3></a><p>${esc(f.summary)}</p><small>${meta(f)}</small></div><ul class="lk">${r.map(i => `<li><a href="${url(i)}">${esc(i.title)}</a></li>`).join('')}</ul>`
    : `<div class="gr">${l.slice(0, 4).map(card).join('')}</div>`) + '</section>';
}
function tvBlock() { return `<section class="tv"><div class="bh"><h2>GHM TV</h2><a href="${R}pages/videos.html" style="color:#fff">Toutes les vidéos →</a></div><div class="box">${CONFIG.liveUrl ? `<iframe src="${esc(CONFIG.liveUrl)}" title="Direct GHM TV" allowfullscreen></iframe>` : 'Aucun direct configuré. Renseignez CONFIG.liveUrl dans assets/js/main.js pour activer la diffusion.'}</div></section>`; }

function home() {
  if (!ITEMS.length) { $('#app').innerHTML = AD('home1','Bannière 970×90') + empty('Les actualités arrivent. Si ce message persiste, les sources ne répondent pas : le site réessaie automatiquement.'); return; }
  const top = pick(META && META.featured, 4);
  const sl = `<div class="sl" aria-roledescription="carrousel">${top.map((i, n) => `<div class="s${n ? '' : ' on'}"><a href="${url(i)}">${cv(i)}<div class="tx"><h2>${esc(i.title)}</h2><p>${esc(i.summary)}</p><small>${meta(i)}</small></div></a></div>`).join('')}<button class="ar p" aria-label="Précédent">❮</button><button class="ar n" aria-label="Suivant">❯</button></div>`;
  const cat = k => CATS.find(c => c[0] == k);
  $('#app').innerHTML = AD('home1','Bannière 970×90') + sl + `<div class="cols"><div>${AD('home2','Bannière 728×90')}${block(cat('politique'),'f')}${block(cat('societe'),'g')}${AD('home3','Bannière 728×90')}${block(cat('economie'),'f')}${tvBlock()}<div class="two">${block(cat('sport'),'f')}${block(cat('culture'),'f')}</div>${block(cat('international'),'g')}</div>
  <aside class="side">${AD('side1','300×250')}<h2>À lire aussi</h2><ol>${ITEMS.filter(i => !top.includes(i)).slice(0, 5).map(i => `<li><a href="${url(i)}">${esc(i.title)}</a></li>`).join('')}</ol>${AD('side2','300×600')}</aside></div>`;
  const s = [...document.querySelectorAll('.sl .s')]; let n = 0;
  const go = d => { s[n].classList.remove('on'); n = (n + d + s.length) % s.length; s[n].classList.add('on'); };
  $('.ar.p').onclick = () => go(-1); $('.ar.n').onclick = () => go(1);
  clearInterval(window._sl); window._sl = setInterval(() => go(1), 6000);
}
function list(l, none) { return l.length ? `<div class="gr">${l.map(card).join('')}</div>` : empty(none); }
function category() { const k = param('c') || 'actualite', n = cname(k); document.title = `${n} – Group Horizon Media`; $('#app').innerHTML = `<div class="pg"><h1>${n}</h1>${AD('cat','Bannière 728×90')}${list(ITEMS.filter(i => k == 'actualite' || (i.cats || [i.cat]).includes(k)), 'Aucune actualité disponible dans cette rubrique pour le moment.')}</div>`; }
function search() { const q = param('q'), t = norm(q).split(/\s+/).filter(Boolean); const l = ITEMS.filter(i => t.every(w => norm(i.title + ' ' + i.summary + ' ' + cname(i.cat)).includes(w))); $('#app').innerHTML = `<div class="pg"><h1>Recherche : « ${esc(q)} »</h1><p>${l.length} résultat(s)</p>${list(l, `Aucun résultat pour « ${esc(q)} ». Essayez un autre mot-clé ou une rubrique.`)}</div>`; }
function article() {
  const i = ITEMS.find(x => x.id == param('id')) || stored('ghm_all').find(x => x.id == param('id')); if (!i) { $('#app').innerHTML = `<div class="pg">${empty('Article introuvable. <a href="' + R + 'index.html">Retour à l\'accueil</a>')}</div>`; return; }
  document.title = `${i.title} – Group Horizon Media`;
  const u = encodeURIComponent(location.href), t = encodeURIComponent(i.title);
  $('#app').innerHTML = `<div class="cols"><article class="pg art"><small>${cname(i.cat)}</small><h1>${esc(i.title)}</h1>${cv(i)}<small>${meta(i)}</small>${i.image ? `<small>Image : ${esc(i.source)}</small>` : ''}<p>${esc(i.summary)}</p>${i.demo ? empty('Contenu de démonstration.') : `<a class="btn" href="${esc(i.link)}" target="_blank" rel="noopener noreferrer">Lire l'article complet sur ${esc(i.source)}</a>`}<div class="sh"><a href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener">Facebook</a><a href="https://twitter.com/intent/tweet?url=${u}&text=${t}" target="_blank" rel="noopener">X</a><a href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener">WhatsApp</a><button id="cp">Copier le lien</button></div>${AD('art','Bannière 728×90')}<h2>Articles similaires</h2>${list(ITEMS.filter(x => x.cat == i.cat && x.id != i.id).slice(0, 4), 'Aucun article similaire.')}</article><aside class="side">${AD('side1','300×250')}</aside></div>`;
  $('#cp').onclick = e => navigator.clipboard.writeText(location.href).then(() => e.target.textContent = 'Lien copié ✓');
}
function videos() {
  const v = CONFIG.videos, sec = (t, ty) => { const l = v.filter(x => ty ? x.type == ty : true); return `<section class="blk"><div class="bh"><h2>${t}</h2></div>${l.length ? `<div class="gr">${l.map(x => `<div class="card"><div class="vid" data-id="${esc(x.id)}" style="background-image:url(https://i.ytimg.com/vi/${esc(x.id)}/hqdefault.jpg)" role="button" tabindex="0" aria-label="Lire ${esc(x.title)}"></div><h3>${esc(x.title)}</h3><small>${fd(x.date)}</small></div>`).join('')}</div>` : empty('Aucune vidéo pour le moment. Ajoutez des identifiants YouTube dans CONFIG.videos (assets/js/main.js).')}</section>`; };
  $('#app').innerHTML = `<div class="pg"><h1>Vidéos & GHM TV</h1></div>${tvBlock()}${sec('Nos dernières vidéos')}${sec('Reportages','reportage')}${sec('Interviews','interview')}`;
  document.querySelectorAll('.vid').forEach(e => { const p = () => { e.style.background = '#000'; e.classList.remove('vid'); e.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(e.dataset.id)}?autoplay=1" allowfullscreen title="Vidéo"></iframe>`; e.style.aspectRatio = '16/9'; }; e.onclick = p; e.onkeydown = k => k.key == 'Enter' && p(); });
}
function contact() {
  $('#app').innerHTML = `<div class="pg"><h1>Contact</h1><p>Écrivez à la rédaction de Group Horizon Media.</p><br><form class="ct" id="ct"><input name="n" placeholder="Votre nom" required><input name="e" type="email" placeholder="Votre e-mail" required><input name="s" placeholder="Sujet" required><textarea name="m" rows="6" placeholder="Votre message" required></textarea><button class="btn">Envoyer</button></form><small>Ce formulaire ouvre votre application e-mail (aucun serveur requis).</small></div>`;
  $('#ct').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(f.get('s'))}&body=${encodeURIComponent(f.get('m') + '\n\n' + f.get('n') + ' <' + f.get('e') + '>')}`; };
}
function about() { $('#app').innerHTML = `<div class="pg"><h1>À propos de Group Horizon Media</h1><p>Group Horizon Media (GHM) est un média numérique d'information : actualités politiques, économiques, sociales, culturelles, sportives et internationales, avec un accent sur le Sénégal et l'Afrique.</p><p>Nos fils d'actualités sont agrégés à partir de sources autorisées. Nous affichons titres et extraits avec un lien vers la source originale.</p></div>`; }

const VIEWS = {home, cat: category, search, art: article, videos, contact, about};
async function render() {
  setBusy(); const n = await load(); LAST = Date.now(); ticker(); status();
  if (FIRST || ['home', 'cat', 'search'].includes(PAGE)) VIEWS[PAGE]();
  FIRST = false; if (n > 0) toast(n);
}
layout(); $('#app').innerHTML = '<div class="msg" role="status">Chargement des actualités…</div>';
render(); setInterval(() => { if (!document.hidden) render(); }, CONFIG.refresh);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - LAST > 60000) render(); });
