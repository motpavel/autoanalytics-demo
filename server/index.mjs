import { createServer } from 'node:http';
import { existsSync, readFileSync, createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { handleApi } from './api.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const production = process.argv.includes('--production');
// Read only on the server; never put API secrets into VITE_* or frontend code.
function getConfig() {
  let config = {};
  for (const name of ['.env', '.env.local']) {
    const path = resolve(root, name);
    if (existsSync(path)) config = { ...config, ...parseEnv(readFileSync(path, 'utf8')) };
  }
  return { ...config, ...process.env };
}
const config = getConfig();
const port = Number(config.PORT || 5182);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT должен быть целым числом от 1024 до 65535.');
const host = '127.0.0.1';
let vite;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${host}:${port}`);
  if (url.pathname.startsWith('/api/')) { await handleApi(req, res, getConfig()); return; }
  if (vite) { vite.middlewares(req, res); return; }
  const dist = resolve(root, 'dist');
  let path;
  try { path = resolve(dist, '.' + decodeURIComponent(url.pathname)); } catch { res.writeHead(400).end(); return; }
  if (path !== dist && !path.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
  if (!existsSync(path) || !extname(path)) path = resolve(dist, 'index.html');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
  const stream = createReadStream(path);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
});
if (production && !existsSync(resolve(root, 'dist/index.html'))) throw new Error('Сначала выполните npm run build.');
if (!production) {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({ root, server: { middlewareMode: true, hmr: { server, host } }, appType: 'spa' });
}
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Порт ${port} уже занят. Проверьте открытое демо или задайте другой PORT.` : 'Не удалось запустить локальный сервер.');
  process.exit(1);
});
server.listen(port, host, () => {
  console.log(`\nAutoAnalytics: http://localhost:${port}\nТолько на этом компьютере. Ctrl+C — остановить.\nGPT: ${config.AI_MODE === 'mock' ? 'демо без GPT' : config.OPENAI_API_KEY ? 'ключ настроен' : 'ожидает подключения ключа'}\n`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  await vite?.close();
  server.close();
  server.closeAllConnections();
  process.exit(0);
});
