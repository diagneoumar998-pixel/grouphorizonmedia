// Cloudflare Pages Function : GET /api/news
import { getNews, json } from '../../shared/news-core.js';
export async function onRequestGet({ env, waitUntil }) {
  try { return json(await getNews(env, { waitUntil })); }
  catch (e) { return json({ items: [], featured: [], flash: [], sources: [], error: String(e.message || e) }, 200, 'no-store'); }
}
