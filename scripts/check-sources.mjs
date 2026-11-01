// Test réel de vos sources depuis votre ordinateur :  npm run check   (NEWSDATA_API_KEY=xxx npm run check pour l'API)
import { SOURCES } from '../shared/sources.js';
import { pull } from '../shared/news-core.js';
for (const s of SOURCES.filter(x => x.enabled !== false)) {
  try {
    const r = await pull(s, process.env);
    console.log(r === null ? `⚪ ${s.name.padEnd(14)} clé API absente` : `✅ ${s.name.padEnd(14)} ${String(r.length).padStart(2)} articles · ${r.filter(i => i.image).length} images · dernier : ${r[0] ? r[0].date.slice(0, 16) : '-'} · ex. ${r[0] ? r[0].title.slice(0, 50) : ''}`);
  } catch (e) { console.log(`❌ ${s.name.padEnd(14)} ${e.message}`); }
}
