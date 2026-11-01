// POST /api/refresh  (en-tête  Authorization: Bearer <ADMIN_TOKEN>)  -> force une récupération immédiate (test/dépannage)
import { refresh, publish, json } from '../../shared/news-core.js';
export async function onRequestPost({ env, request }) {
  if (!env.ADMIN_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: 'non autorisé' }, 403, 'no-store');
  const r = publish(await refresh(env));
  return json({ updated: r.updated, items: r.items.length, sources: r.sources }, 200, 'no-store');
}
