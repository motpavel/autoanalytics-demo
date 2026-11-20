import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('api-static', { recursive: true });
writeFileSync('api-static/index.html', '<!doctype html><html lang="ru"><meta charset="utf-8"><title>AutoAnalytics API</title><p>Сервер ИИ-аналитика AutoAnalytics.</p></html>');
