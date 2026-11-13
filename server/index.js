import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { PORT, ROOT_DIR, UPLOADS_DIR } from './config.js';
import { authenticate, verifyRequestOrigin } from './auth.js';
import { ApiError } from './validation.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { ordersRouter } from './routes/orders.js';
import { accountRouter } from './routes/account.js';
import { sellerRouter } from './routes/seller.js';
import { adminRouter } from './routes/admin.js';
import { uploadsRouter } from './routes/uploads.js';

const app = express();
const isDev = process.env.YURO_DEV === '1';

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use(express.json({ limit: '3mb' }));
app.use(verifyRequestOrigin);
app.use(authenticate);

app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    index: false,
    fallthrough: false,
    maxAge: '7d',
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);

app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/account', accountRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/admin', adminRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api', publicRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

if (!isDev) {
  const distDir = path.join(ROOT_DIR, 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET') {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res
        .status(503)
        .type('text')
        .send('YURO is not built yet. Run npm run build, then start the server.');
    });
  }
} else {
  app.get('/', (_req, res) => {
    res
      .status(200)
      .type('text')
      .send('YURO API is running. Open the Vite dev server to use the storefront.');
  });
}

app.use((error, req, res, _next) => {
  if (res.headersSent) return;

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    });
    return;
  }

  if (error?.type === 'entity.too.large') {
    res.status(413).json({ error: 'The uploaded data is too large.' });
    return;
  }

  if (
    Number.isInteger(error?.status) &&
    error.status >= 400 &&
    error.status < 500 &&
    typeof error.message === 'string'
  ) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error?.code === 'ENOENT') {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  console.error(`[${req.method} ${req.originalUrl}]`, error);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const server = app.listen(PORT, () => {
  console.log(`YURO marketplace server listening on http://localhost:${PORT}`);
  console.log(`Environment: ${isDev ? 'development API' : 'production build'}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
