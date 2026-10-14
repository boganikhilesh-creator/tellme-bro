if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// In cPanel / LiteSpeed / Phusion Passenger:
// PORT is passed as 'passenger' or a unix domain socket string or number.
// Do NOT parseInt() because that converts 'passenger' or socket path to NaN!
const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
    .once('error', (err) => {
      console.error('Server boot error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> TellmeBro successfully running on ${port}`);
    });
});
