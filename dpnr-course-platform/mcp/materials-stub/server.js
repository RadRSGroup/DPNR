const http = require('http');

const PORT = process.env.PORT || 7070;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (url.pathname === '/signed-url' && req.method === 'GET') {
    const id = url.searchParams.get('id') || 'demo';
    // Demo-only stub URL
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id, url: `https://example.com/material/${id}?token=demo` }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`MCP materials stub listening on :${PORT}`);
});

