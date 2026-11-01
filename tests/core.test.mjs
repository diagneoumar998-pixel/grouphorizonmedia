import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES } from '../shared/sources.js';
import * as core from '../shared/news-core.js';

const rss = l => `<?xml version="1.0"?><rss xmlns:media="http://search.yahoo.com/mrss/"><channel>${l.map(i => `<item><title><![CDATA[${i.t}]]></title><link>${i.l}</link><description><![CDATA[${i.d || ''}]]></description><pubDate>${new Date(Date.now() - (i.h || 1) * 36e5).toUTCString()}</pubDate>${i.img ? `<enclosure url="${i.img}" type="image/jpeg"/>` : ''}</item>`).join('')}</channel></rss>`;
let snDown = false;
globalThis.fetch = async u => {
  u = String(u);
  if (u.includes('sn.test/feed')) return snDown ? new Response('x', { status: 503 }) : new Response(rss([
    { t: 'Football : les Lions du Sénégal battent le Mali', l: 'https://sn.test/a', img: 'http://img.test/a.jpg', h: 1 },
    { t: 'Assemblée nationale : le gouvernement présente son budget', l: 'https://sn.test/b', h: 2 },
    { t: 'Dakar : ouverture d\'un nouvel hôpital', l: 'https://sn.test/c', h: 3 }]));
  if (u.includes('world.test/rss')) return new Response(rss([
    { t: 'Élection présidentielle au Ghana : résultats attendus', l: 'https://world.test/1', h: 1 },
    { t: 'Football : le Real Madrid gagne le clasico', l: 'https://world.test/2', h: 2 },
    { t: 'Les Lions du Sénégal battent le Mali en football', l: 'https://world.test/3', h: 1 },
    { t: 'Dakar accueille un sommet sur la dette', l: 'https://world.test/4', d: 'Économie et finances', h: 4 }]));
  if (u === 'https://disc.test/') return new Response('<html><link rel="alternate" type="application/rss+xml" href="/custom.xml"></html>');
  if (u.includes('disc.test/custom.xml')) return new Response(`<feed><entry><title>Entrée Atom culture festival</title><link href="https://disc.test/e1"/><updated>${new Date().toISOString()}</updated><summary>Un festival</summary></entry></feed>`);
  return new Response('x', { status: 404 });
};
SOURCES.splice(0, SOURCES.length,
  { id: 'sn', name: 'SN Média', url: 'https://sn.test/feed', country: 'sn', cat: 'societe', weight: 8 },
  { id: 'world', name: 'World', url: 'https://world.test/rss', country: 'monde', weight: 5 },
  { id: 'disc', name: 'Disc', site: 'https://disc.test/', country: 'sn', weight: 3 },
  { id: 'api', name: 'API', type: 'newsdata', requiresKey: 'KEY', country: 'sn' });

test('récupération, classement, doublons, images', async () => {
  core.__reset();
  const r = core.publish(await core.refresh({}));
  const by = t => r.items.find(i => i.title.includes(t));
  assert.deepEqual(by('Lions du Sénégal battent le Mali').cats, ['sport']);
  assert.equal(by('Lions du Sénégal battent le Mali').image, 'https://img.test/a.jpg');
  assert.equal(r.items.filter(i => /Lions du S/.test(i.title)).length, 1, 'doublon inter-sources supprimé');
  assert.deepEqual(by('budget').cats, ['politique']);
  assert.deepEqual(by('hôpital').cats, ['sante']);
  assert.deepEqual(by('Ghana').cats, ['international']);
  assert.deepEqual(by('Real Madrid').cats, ['international', 'sport']);
  assert.equal(by('sommet sur la dette').scope, 'sn', 'article étranger parlant de Dakar => Sénégal');
  assert.ok(by('Entrée Atom'), 'flux détecté automatiquement + Atom');
  assert.equal(r.sources.find(s => s.id === 'api').ok, null, 'API sans clé ignorée proprement');
  assert.ok(r.featured.length && r.flash.length);
  assert.equal(by('Lions du Sénégal battent le Mali').id, r.featured[0], 'Sénégal + image + récent => à la une');
});
test('une source en panne ne fait rien disparaître', async () => {
  snDown = true;
  const r = core.publish(await core.refresh({}));
  assert.equal(r.sources.find(s => s.id === 'sn').ok, false);
  assert.ok(r.items.some(i => i.title.includes('budget')), 'articles précédents conservés');
  snDown = false;
});
test('getNews : première visite déclenche la récupération', async () => {
  core.__reset();
  assert.ok((await core.getNews({})).items.length > 3);
});
