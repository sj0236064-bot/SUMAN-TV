const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'public');
const VIDEO_DIR = path.join(__dirname, 'uploads');
const PORT = Number(process.env.PORT) || 10000;

fs.mkdirSync(VIDEO_DIR, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');

  if (u.pathname === '/healthz') {
    res.writeHead(200, {'Content-Type':'text/plain'});
    return res.end('SUMAN TV ONLINE');
  }

  if (u.pathname === '/api/videos') {
    try {
      const list = fs.readdirSync(VIDEO_DIR)
        .filter(f => /\.(mp4|webm)$/i.test(f));

      res.writeHead(200, {
        'Content-Type': 'application/json'
      });

      return res.end(JSON.stringify(list));
    } catch (e) {
      res.writeHead(500);
      return res.end('Video storage error');
    }
  }

  if (u.pathname === '/api/upload') {
    res.writeHead(403);
    return res.end('Admin upload is not enabled.');
  }

  if (u.pathname.startsWith('/videos/')) {
    let name;

    try {
      name = path.basename(decodeURIComponent(u.pathname.slice(8)));
    } catch {
      res.writeHead(400);
      return res.end();
    }

    const file = path.join(VIDEO_DIR, name);

    if (!fs.existsSync(file)) {
      res.writeHead(404);
      return res.end('Video not found');
    }

    const stat = fs.statSync(file);
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mime[path.extname(file)]);

    if (range) {
      const [a, b] = range.replace(/bytes=/, '').split('-');
      const start = Number(a);
      const end = b ? Math.min(Number(b), stat.size - 1) : stat.size - 1;

      if (!Number.isInteger(start) || start < 0 ||
          start >= stat.size || end < start) {
        res.writeHead(416);
        return res.end();
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': end - start + 1
      });

      return fs.createReadStream(file, {start, end}).pipe(res);
    }

    res.writeHead(200, {'Content-Length': stat.size});
    return fs.createReadStream(file).pipe(res);
  }

  const requested = u.pathname === '/'
    ? 'index.html'
    : decodeURIComponent(u.pathname.slice(1));

  const file = path.resolve(ROOT, requested);

  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }

    res.writeHead(200, {
      'Content-Type': mime[path.extname(file)] || 'application/octet-stream'
    });

    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('SUMAN TV INDIA ONLINE');
  console.log('PORT:', PORT);
});
