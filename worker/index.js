// Cloudflare Worker : récupération automatique planifiée (cron) + lecture directe pour test.
import { refresh, getNews, json } from '../shared/news-core.js';
export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(refresh(env)); },
  async fetch(request, env, ctx) { return json(await getNews(env, ctx)); },
};
