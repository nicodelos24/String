// Servidor de desarrollo local. No requiere paquetes externos.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = __dirname;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'
};

function createServer() {
  return http.createServer(async (request, response) => {
    const send = (status, message) => {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : message);
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      return send(405, 'Método no permitido.');
    }
    let pathname;
    try { pathname = decodeURIComponent(request.url.split('?')[0]); }
    catch { return send(400, 'Dirección inválida.'); }
    const segments = pathname.split('/');
    if (!pathname.startsWith('/') || /[\\:\0]/.test(pathname) ||
        segments.some(segment => segment.startsWith('.'))) {
      return send(403, 'Acceso no permitido.');
    }
    const filename = path.join(root, pathname === '/' ? 'index.html' : pathname);
    try {
      const real = await fs.realpath(filename);
      const relative = path.relative(root, real);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return send(403, 'Acceso no permitido.');
      if (!(await fs.stat(real)).isFile()) return send(404, 'Archivo no encontrado.');
      const body = await fs.readFile(real);
      response.writeHead(200, {
        'Content-Type': types[path.extname(real)] || 'application/octet-stream',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      send(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500, 'No se pudo abrir el archivo.');
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? 'El puerto 8000 está ocupado. Cerrá el otro servidor y volvé a ejecutar npm start.'
      : `No se pudo iniciar el servidor: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(8000, '127.0.0.1', () => {
    console.log('String: http://127.0.0.1:8000\nMantén esta terminal abierta. Para detener: Ctrl+C.');
  });
}

module.exports = { createServer };
