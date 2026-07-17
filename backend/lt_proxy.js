import http from 'http';
import httpProxy from 'http-proxy';
import localtunnel from 'localtunnel';

// Create a proxy server that:
// 1. Rewrites the Host header so Next.js accepts the request
// 2. Adds bypass-tunnel-reminder header to skip loca.lt warning page
const proxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:9002',
  changeOrigin: true,
});

proxy.on('proxyReq', function(proxyReq) {
  proxyReq.setHeader('Host', 'localhost:9002');
  proxyReq.setHeader('bypass-tunnel-reminder', 'true');
});

proxy.on('error', function (_err, _req, res) {
  res.writeHead(502, { 'Content-Type': 'text/plain' });
  res.end('Collectra Proxy Error: Is the Next.js dev server running on port 9002?');
});

// Listen on 9003, forward every request to 9002
const server = http.createServer(function(req, res) {
  proxy.web(req, res);
});

server.listen(9003, async () => {
  console.log('[Collectra Tunnel] Proxy started on port 9003 → forwarding to port 9002');

  try {
    const tunnel = await localtunnel({ port: 9003 });

    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║            COLLECTRA TUNNEL IS ACTIVE                 ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  PUBLIC URL:                                          ║');
    console.log(`║  ${tunnel.url.padEnd(52)}║`);
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  INSTRUCTIONS:                                        ║');
    console.log('║  1. Copy the URL above                                ║');
    console.log('║  2. Update PUBLIC_APP_URL in backend/.env             ║');
    console.log('║  3. Restart the backend (npm run dev)                 ║');
    console.log('║  4. Keep this window open while testing               ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');

    tunnel.on('close', () => {
      console.log('[Collectra Tunnel] Tunnel closed.');
    });

    tunnel.on('error', (err) => {
      console.error('[Collectra Tunnel] Tunnel error:', err.message);
      console.log('[Collectra Tunnel] Restarting in 5 seconds...');
      setTimeout(() => process.exit(1), 5000);
    });

  } catch (err) {
    console.error('[Collectra Tunnel] Failed to start localtunnel:', err.message);
    process.exit(1);
  }
});
