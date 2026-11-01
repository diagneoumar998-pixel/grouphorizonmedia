// Moteur d'agrégation : lecture RSS/Atom/API, classement, doublons, stockage (KV), publication JSON.
import { SOURCES, SETTINGS } from './sources.js';
const MIN = 60000, DAY = 864e5;
let MEM = null, INFLIGHT = null;
export const __reset = () => { MEM = null; INFLIGHT = null; };

const N = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const raw = (x, t) => { const m = x.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, 'i')); return m ? m[1] : ''; };
const text = h => decode(decode(String(h).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const cut = (s, n) => s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '…';
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };
const web = u => /^https?:\/\//i.test(u || '');

const SN = /\b(senegal|senegalais|senegalaise|senegalaises|dakar|thies|touba|saint-louis|kaolack|ziguinchor|casamance|pastef|sonko|diomaye|teranga|mbour|rufisque|guediawaye|pikine|tambacounda|kolda|matam|louga|diourbel|fatick|kedougou|sedhiou|kaffrine)\b/;
const AF = /\b(afrique|africain|africaine|africains|cote d.ivoire|mali|niger|nigeria|burkina|guinee|cameroun|congo|rdc|tchad|togo|benin|gabon|maroc|algerie|tunisie|egypte|ghana|kenya|ethiopie|soudan|somalie|madagascar|mauritanie|rwanda|angola|libye|centrafrique|zimbabwe|mozambique|gambie|liberia|sierra leone)\b/;
const TOPICS = [
  ['sport', /\b(football|foot|match|matchs|lions|championnat|ligue des champions|basket|basketball|lutte|tennis|athletisme|olympique|olympiques|stade|joueur|joueurs|entraineur|sport|sportif|coupe du monde|can \d{4}|mondial|ballon d.or|transfert|gardien|buteur|rugby|cyclisme|natation)\b/],
  ['sante', /\b(sante|hopital|hopitaux|epidemie|pandemie|virus|ebola|paludisme|medecin|medecins|medicament|vaccin|vaccination|cholera|patient|patients|maladie|maladies|cancer|diabete|sida|dengue|mpox|clinique|chirurgie)\b/],
  ['education', /\b(ecole|ecoles|education|universite|universites|etudiant|etudiants|baccalaureat|bac|enseignant|enseignants|eleves|examen|examens|rentree scolaire|bourse|bourses|ucad|bfem|cfee|lycee|college|scolaire|diplome)\b/],
  ['economie', /\b(economie|economique|economiques|financier|finances|banque|bancaire|inflation|budget|petrole|gaz|fmi|banque mondiale|croissance|investissement|investissements|dette|fcfa|entreprise|entreprises|commerce|exportation|exportations|impot|impots|douane|douanes|pib|chomage|emploi|agriculture|peche|mines|minier|bceao|tarif)\b/],
  ['culture', /\b(culture|culturel|culturelle|musique|musical|cinema|film|films|festival|artiste|artistes|livre|livres|roman|concert|theatre|chanteur|chanteuse|rappeur|danse|exposition|patrimoine|fespaco|biennale|album|clip|comedien)\b/],
  ['environnement', /\b(climat|climatique|environnement|environnemental|pollution|ecologie|ecologique|biodiversite|inondation|inondations|pluies|secheresse|erosion|littoral|deforestation|energie solaire|renouvelable|dechets|rechauffement|mangrove)\b/],
  ['technologie', /\b(technologie|technologies|numerique|intelligence artificielle|ia|internet|startup|startups|application mobile|cybersecurite|cyberattaque|informatique|telecom|telecommunications|5g|robot|smartphone|openai|logiciel|reseaux sociaux)\b/],
  ['politique', /\b(politique|politiques|election|elections|electoral|gouvernement|president|presidente|presidentiel|assemblee|ministre|ministres|depute|deputes|pastef|opposition|parti|partis|premier ministre|loi|constitution|conseil des ministres|coalition|diplomatie|sommet|senat|scrutin|referendum|coup d.etat|junte|campagne)\b/],
  ['societe', /\b(societe|justice|police|gendarmerie|tribunal|accident|incendie|faits divers|arrestation|religion|magal|gamou|tabaski|migration|migrants|syndicat|greve|famille|crime|meurtre|proces|detenu|prison|violence)\b/],
];
const FOREIGN_TOPICS = ['sport', 'sante', 'economie', 'culture', 'environnement', 'technologie'];
// Rubrique = thème ayant le plus de mots-clés (titre compté double) ; à égalité, l'ordre de TOPICS décide.
const topicOf = (a, b) => {
  const n = (re, t) => (t.match(new RegExp(re.source, 'g')) || []).length, A = N(a), B = N(b);
  let best = ['', 0]; for (const [k, re] of TOPICS) { const v = 2 * n(re, A) + n(re, B); if (v > best[1]) best = [k, v]; }
  return best[0];
};

export function classify(it, s) {
  const t = N(it.title + ' ' + it.summary), topic = topicOf(it.title, it.summary);
  const scope = s.country === 'sn' || SN.test(t) ? 'sn' : (s.country === 'afrique' || AF.test(t) ? 'afrique' : 'monde');
  const cats = scope === 'sn' ? [topic || s.cat || 'societe'] : ['international', ...(FOREIGN_TOPICS.includes(topic) ? [topic] : [])];
  return { scope, topic, cats, cat: cats[0] };
}

function imgOf(x) {
  const c = [x.match(/<media:content[^>]*url=["']([^"']+)["']/i), x.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i),
    x.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i) || x.match(/<enclosure[^>]*type=["']image[^>]*url=["']([^"']+)["']/i),
    decode(x).match(/<img[^>]+src=["']([^"']+)["']/i)];
  const u = c.map(m => m && decode(m[1])).find(web);
  return u ? u.replace(/^http:/i, 'https:') : '';
}

export function parseFeed(xml, s) {
  const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map(m => m[0]).slice(0, SETTINGS.perSource);
  return blocks.map(x => {
    const title = text(raw(x, 'title'));
    const link = text(raw(x, 'link')) || (x.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || text(raw(x, 'guid'));
    const d = new Date(text(raw(x, 'pubDate') || raw(x, 'published') || raw(x, 'updated') || raw(x, 'dc:date')));
    let summary = cut(text(raw(x, 'description') || raw(x, 'summary') || raw(x, 'content:encoded')), 240);
    if (N(summary) === N(title)) summary = '';
    return { title, link: decode(link), summary, date: isNaN(d) ? new Date() : new Date(Math.min(+d, Date.now())), image: imgOf(x), source: s.name };
  });
}

async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(SETTINGS.timeoutMs), headers: { 'User-Agent': SETTINGS.userAgent, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json;q=0.9, */*;q=0.5' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}
async function feedXml(s) {
  if (s.url) return get(s.url);
  const home = await get(s.site), l = home.match(/<link[^>]*(?:rss|atom)\+xml[^>]*>/i), m = l && l[0].match(/href=["']([^"']+)["']/i);
  const tries = [m && new URL(decode(m[1]), s.site).href, ...['/feed', '/rss', '/rss.xml'].map(p => new URL(p, s.site).href)].filter(Boolean);
  for (const u of tries) { try { const x = await get(u); if (/<(rss|feed|rdf:RDF)[\s>]/i.test(x)) return x; } catch (_) { /* essai suivant */ } }
  throw new Error('aucun flux RSS trouvé sur ce site');
}
async function newsdata(s, env) {
  const key = env[s.requiresKey]; if (!key) return null;
  const u = new URL('https://newsdata.io/api/1/latest'); u.searchParams.set('apikey', key);
  Object.entries(s.params || {}).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = JSON.parse(await get(u.href)); if (j.status && j.status !== 'success') throw new Error('API : ' + (j.results && j.results.message || j.status));
  return (j.results || []).slice(0, SETTINGS.perSource).map(a => ({ title: String(a.title || '').trim(), link: a.link, summary: cut(String(a.description || '').replace(/\s+/g, ' ').trim(), 240), date: new Date(String(a.pubDate).replace(' ', 'T') + 'Z'), image: a.image_url || '', source: a.source_name || s.name }));
}
export async function pull(s, env = {}) {
  const list = s.type === 'newsdata' ? await newsdata(s, env) : parseFeed(await feedXml(s), s);
  if (list === null) return null;
  return list.filter(i => i.title && web(i.link)).map(i => {
    const c = classify(i, s);
    return { id: hash(i.link), title: i.title, summary: i.summary, link: i.link, source: i.source, sourceId: s.id, weight: s.weight || 0, date: new Date(isNaN(i.date) ? Date.now() : i.date).toISOString(), image: s.images === false ? '' : i.image, ...c };
  });
}

const tok = t => new Set(N(t).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3));
const jac = (a, b) => { let n = 0; a.forEach(w => b.has(w) && n++); return n / (a.size + b.size - n || 1); };
export function dedupe(list) {
  const out = [], links = new Set();
  for (const it of list) {
    if (links.has(it.link)) continue;
    const a = tok(it.title), k = N(it.title);
    const dup = out.find(o => (N(o.title) === k) || (a.size >= 4 && o._t.size >= 4 && Math.abs(new Date(o.date) - new Date(it.date)) < 3 * DAY && jac(a, o._t) >= .7));
    if (dup) { if (!dup.image && it.image) dup.image = it.image; continue; }
    it._t = a; out.push(it); links.add(it.link);
  }
  return out.map(({ _t, ...o }) => o);
}

const readDb = async env => env.NEWS ? env.NEWS.get('db', 'json') : MEM;
const writeDb = async (env, db) => { if (env.NEWS) await env.NEWS.put('db', JSON.stringify(db)); else MEM = db; };

export function refresh(env = {}) {
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = (async () => {
    const prev = (await readDb(env)) || { items: [], sources: [] }, list = SOURCES.filter(s => s.enabled !== false), now = new Date().toISOString();
    const res = await Promise.allSettled(list.map(s => pull(s, env)));
    const sources = [], fresh = [];
    res.forEach((r, i) => {
      const s = list[i], old = prev.sources.find(x => x.id === s.id) || {};
      if (r.status === 'fulfilled' && r.value === null) sources.push({ id: s.id, name: s.name, ok: null, note: 'clé API non configurée', lastOk: null });
      else if (r.status === 'fulfilled') { fresh.push(...r.value); sources.push({ id: s.id, name: s.name, ok: true, count: r.value.length, lastOk: now }); }
      else sources.push({ id: s.id, name: s.name, ok: false, error: String(r.reason && r.reason.message || r.reason), lastOk: old.lastOk || null, count: 0 });
    });
    const cut0 = Date.now() - SETTINGS.maxAgeDays * DAY;
    const items = dedupe([...fresh, ...prev.items].filter(i => +new Date(i.date) > cut0).sort((a, b) => b.date.localeCompare(a.date))).slice(0, SETTINGS.maxItems);
    const db = { items, sources, updated: now }; await writeDb(env, db); return db;
  })().finally(() => { INFLIGHT = null; });
  return INFLIGHT;
}

const score = i => Math.round(Math.max(0, 48 - (Date.now() - new Date(i.date)) / 36e5) + (i.scope === 'sn' ? 30 : 0) + (i.image ? 10 : 0) + (i.weight || 0));
export function publish(db) {
  const items = db.items.map(i => ({ ...i, score: score(i) }));
  const per = {}, featured = [];
  for (const i of [...items].sort((a, b) => b.score - a.score)) { if ((per[i.sourceId] = (per[i.sourceId] || 0) + 1) <= 2 && featured.length < 6) featured.push(i.id); }
  const flash = [...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(i => i.id);
  return { items, featured, flash, updated: db.updated, sources: db.sources, refreshMinutes: 10 };
}
export async function getNews(env = {}, ctx) {
  let db = await readDb(env); const age = db ? Date.now() - new Date(db.updated) : Infinity;
  if (!db) db = await refresh(env);
  else if (age > SETTINGS.staleMinutes * MIN) { const p = refresh(env).catch(() => {}); if (ctx && ctx.waitUntil) ctx.waitUntil(p); else { await p; db = (await readDb(env)) || db; } }
  return publish(db);
}
export const json = (body, status = 200, cache = 'public, max-age=60, s-maxage=120') => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache } });
