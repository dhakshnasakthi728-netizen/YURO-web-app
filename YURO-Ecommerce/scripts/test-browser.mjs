import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4182';
const chromePath =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = Number(process.env.CHROME_PORT || 9223);
const profile = path.join(os.tmpdir(), `yuro-browser-${process.pid}-${Date.now()}`);
const runId = Date.now().toString(36);
const customerEmail = `ui-${runId}@example.test`;
const shopName = `Test Atelier ${runId}`;
const checks = [];
const runtimeErrors = [];

function check(condition, label, detail = '') {
  if (!condition) throw new Error(`${label}${detail ? ` — ${detail}` : ''}`);
  checks.push(label);
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) {
        listener(message.params);
      }
    });
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(listener);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws?.close();
  }
}

async function waitForHttp(url, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Chrome is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

let chrome;
let cdp;
let failure;

try {
  const page = await fetch(`${baseUrl}/`).then((response) => {
    check(response.ok, 'Production storefront responds', String(response.status));
    return response;
  });
  const html = await page.text();
  check(html.includes('YURO'), 'Production build is served');
  check(!/demo checkout|concept store/i.test(html), 'No demo copy remains in the built HTML');

  chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      '--remote-allow-origins=*',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      '--window-size=1440,1000',
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const targets = await fetch(
    `http://127.0.0.1:${debugPort}/json/list`,
  ).then((response) => response.json());
  const target = targets.find((entry) => entry.type === 'page');
  check(Boolean(target), 'Chrome exposes a controllable page target');

  cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.connect();

  let loadWaiter = null;
  cdp.on('Page.loadEventFired', () => {
    loadWaiter?.();
    loadWaiter = null;
  });
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    runtimeErrors.push(
      exceptionDetails.exception?.description ||
        exceptionDetails.text ||
        'Unknown runtime exception',
    );
  });

  await Promise.all([
    cdp.send('Page.enable'),
    cdp.send('Runtime.enable'),
    cdp.send('Network.enable'),
    cdp.send('Log.enable'),
  ]);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const waitLoad = () =>
    new Promise((resolve) => {
      loadWaiter = resolve;
      setTimeout(resolve, 8000);
    });

  async function navigate(url) {
    const loaded = waitLoad();
    await cdp.send('Page.navigate', { url });
    await loaded;
    await waitFor('document.readyState === "complete"');
  }

  async function evaluate(expression) {
    const result = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text ||
          expression,
      );
    }
    return result.result.value;
  }

  async function waitFor(expression, timeout = 8000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await evaluate(`Boolean(${expression})`)) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  }

  async function click(selector) {
    const clicked = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return false;
      element.click();
      return true;
    })()`);
    check(clicked, `Element exists for click: ${selector}`);
  }

  async function clickText(selector, text) {
    const clicked = await evaluate(`(() => {
      const element = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find((candidate) => candidate.textContent.trim().includes(${JSON.stringify(text)}));
      if (!element) return false;
      element.click();
      return true;
    })()`);
    check(clicked, `Element exists for click: ${selector} “${text}”`);
  }

  async function setValue(selector, value) {
    const changed = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return false;
      const prototype = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      setter?.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.blur();
      return true;
    })()`);
    check(changed, `Field exists for value: ${selector}`);
  }

  async function pageMetrics(label) {
    const metrics = await evaluate(`(() => {
      const grid = document.querySelector('.product-grid');
      const header = document.querySelector('.header-inner');
      const card = document.querySelector('.product-card');
      const panel = document.querySelector('.sell-form, .panel, .detail-card, .order-card');
      return {
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        productColumns: grid
          ? getComputedStyle(grid).gridTemplateColumns.split(' ').length
          : null,
        headerBackdrop: header ? getComputedStyle(header).backdropFilter : 'none',
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        cardBackground: card ? getComputedStyle(card).backgroundColor : 'none',
        glassBackdrop: panel ? getComputedStyle(panel).backdropFilter : 'none',
        cssAccent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      };
    })()`);
    check(
      metrics.scrollWidth <= metrics.width + 2,
      `${label} has no horizontal overflow`,
      JSON.stringify(metrics),
    );
    check(
      metrics.headerBackdrop.includes('blur'),
      `${label} keeps blur on navigation chrome`,
      metrics.headerBackdrop,
    );
    check(
      metrics.glassBackdrop === 'none',
      `${label} keeps ordinary panels opaque`,
      metrics.glassBackdrop,
    );
    return metrics;
  }

  await navigate(`${baseUrl}/shop`);
  await waitFor(`document.querySelectorAll('.product-card').length >= 16`);
  await waitFor(`document.querySelector('.account-signin')`);

  const desktop = await pageMetrics('Desktop catalogue');
  check(desktop.productColumns === 4, 'Desktop catalogue uses four columns', String(desktop.productColumns));
  check(desktop.cssAccent !== '', 'Accent token is resolved');
  check(
    await evaluate(`localStorage.getItem('yuro.theme.v2') !== null`),
    'Theme preference is persisted locally',
  );

  await click('[aria-label="Appearance settings"]');
  await waitFor(`document.querySelector('.theme-panel')`);
  await clickText('.theme-mode', 'Dark');
  await waitFor(`document.documentElement.dataset.theme === 'dark'`);
  await clickText('.accent-swatch', 'Terracotta');
  await waitFor(`document.documentElement.dataset.accent === 'terracotta'`);
  check(
    (await evaluate(
      `JSON.parse(localStorage.getItem('yuro.theme.v2')).accent`,
    )) === 'terracotta',
    'Accent choice is persisted locally',
  );
  await navigate(`${baseUrl}/shop`);
  await waitFor(`document.querySelectorAll('.product-card').length >= 16`);
  check(
    (await evaluate(`document.documentElement.dataset.theme`)) === 'dark',
    'Dark mode survives a reload',
  );
  check(
    (await evaluate(`document.documentElement.dataset.accent`)) === 'terracotta',
    'Accent survives a reload',
  );

  await click('[aria-label="Appearance settings"]');
  await waitFor(`document.querySelector('.theme-panel')`);
  await clickText('.theme-mode', 'System');
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'dark' }],
  });
  await waitFor(`document.documentElement.dataset.theme === 'dark'`);
  check(true, 'System theme follows a dark colour-scheme preference');
  await navigate(`${baseUrl}/shop`);
  await waitFor(`document.querySelectorAll('.product-card').length >= 16`);
  check(
    (await evaluate(`document.documentElement.dataset.theme`)) === 'dark',
    'System theme remains resolved after reload',
  );

  await click('[aria-label="Appearance settings"]');
  await waitFor(`document.querySelector('.theme-panel')`);
  await clickText('.theme-mode', 'Light');
  await clickText('.accent-swatch', 'Sage');
  await waitFor(
    `document.documentElement.dataset.theme === 'light' && document.documentElement.dataset.accent === 'sage'`,
  );
  await cdp.send('Emulation.setEmulatedMedia', { features: [] });
  check(true, 'Light mode and sage accent can be restored');

  await click('.account-signin');
  await waitFor(`document.querySelector('.auth-modal')`);
  const authMetrics = await evaluate(`(() => {
    const rect = document.querySelector('.auth-modal').getBoundingClientRect();
    return { width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
  })()`);
  check(
    authMetrics.width <= authMetrics.viewportWidth &&
      authMetrics.height <= authMetrics.viewportHeight,
    'Authentication dialog fits the desktop viewport',
    JSON.stringify(authMetrics),
  );
  await clickText('.auth-tabs button', 'Create account');
  await setValue('#auth-full-name', 'UI Test Customer');
  await setValue('#auth-email', customerEmail);
  await setValue('#auth-password', 'ui-test-password-123');
  await click('.auth-submit');
  await waitFor(`document.querySelector('.account-trigger')`);
  check(
    !(await evaluate(`document.querySelector('.auth-modal')`)),
    'Successful registration closes the auth dialog',
  );

  await click('.card-add-button');
  await waitFor(`document.querySelector('.bag-count')?.textContent.trim() === '1'`);
  check(
    (await evaluate(`JSON.parse(localStorage.getItem('yuro.cart.v2')).length`)) >
      0,
    'Adding an item persists the local bag',
  );
  await click('.bag-button');
  await waitFor(`location.pathname === '/cart'`);
  await waitFor(`document.querySelector('.cart-page')`);
  await click('.cart-checkout');
  await waitFor(`document.querySelector('.checkout-screen')`);

  await setValue('#phone', '+91 98765 43210');
  await click('.checkout-step button[type="submit"]');
  await waitFor(`document.body.textContent.includes('Step 2 of 4')`);
  await setValue('#address', '14 Rosewood Lane');
  await setValue('#city', 'Bengaluru');
  await setValue('#state', 'Karnataka');
  await setValue('#postalCode', '560001');
  await setValue('#country', 'India');
  await click('.checkout-step button[type="submit"]');
  await waitFor(`document.body.textContent.includes('Step 3 of 4')`);

  await setValue('#promo-code', 'YURO10');
  await clickText('.promo-form button', 'Apply');
  await waitFor(`document.querySelector('.promo-applied')`);
  check(true, 'Promotion can be applied in checkout');
  await click('.checkout-step button[type="submit"]');
  await waitFor(`document.body.textContent.includes('Step 4 of 4')`);
  await click('.checkbox-field input');
  await click('.checkout-step button[type="submit"]');
  await waitFor(`location.pathname.startsWith('/orders/')`);
  await waitFor(`document.querySelector('.order-confirmation-banner')`);
  check(
    (await evaluate(`localStorage.getItem('yuro.cart.v2')`)) === '[]',
    'Successful checkout clears the bag',
  );
  check(
    (await evaluate(`document.querySelectorAll('.fulfilment-group').length`)) >=
      1,
    'Order detail renders fulfilment groups',
  );
  const orderPath = await evaluate('location.pathname + location.search');
  await pageMetrics('Desktop order detail');

  await navigate(`${baseUrl}/orders`);
  await waitFor(`document.querySelectorAll('.order-card').length >= 1`);
  check(true, 'Order history renders server-backed orders after reload');
  await navigate(`${baseUrl}${orderPath}`);
  await waitFor(`document.querySelector('.order-confirmation-banner')`);
  check(
    (await evaluate(`document.querySelectorAll('.fulfilment-item').length`)) >= 1,
    'Reloaded order detail retains its items',
  );

  await navigate(`${baseUrl}/sell`);
  await waitFor(`document.querySelector('.sell-form')`);
  await setValue('#shop-name', shopName);
  await setValue(
    '#shop-description',
    'A browser-tested independent atelier offering considered home objects and small textiles.',
  );
  await setValue('#shop-category', 'HOME');
  await setValue('#shop-email', 'atelier@example.test');
  await setValue('#shop-phone', '+91 98765 43210');
  await click('.sell-submit button[type="submit"]');
  await waitFor(`document.querySelector('.application-status-card')`);
  const applicationReference = await evaluate(
    `document.querySelector('.application-reference')?.textContent.trim()`,
  );
  check(
    applicationReference?.startsWith('SA-'),
    'Seller application appears with its review reference',
    String(applicationReference),
  );
  await pageMetrics('Desktop seller application');

  await click('.account-trigger');
  await waitFor(`document.querySelector('.account-signout')`);
  await click('.account-signout');
  await waitFor(`document.querySelector('.account-signin')`);

  await click('.account-signin');
  await waitFor(`document.querySelector('.auth-modal')`);
  await setValue('#auth-email', process.env.ADMIN_EMAIL || 'visual-admin@yuro.local');
  await setValue(
    '#auth-password',
    process.env.ADMIN_PASSWORD || 'visual-admin-pass',
  );
  await click('.auth-submit');
  await waitFor(`document.querySelector('.account-trigger')`);

  await navigate(`${baseUrl}/admin`);
  await waitFor(`document.querySelector('.admin-page')`);
  await waitFor(`document.querySelectorAll('.admin-stats .stat-card').length >= 3`);
  await pageMetrics('Desktop admin dashboard');
  await clickText('.dashboard-tabs button', 'Applications');
  await waitFor(`document.querySelectorAll('.admin-application').length >= 1`);
  const approvedInUi = await evaluate(`(() => {
    const card = [...document.querySelectorAll('.admin-application')]
      .find((candidate) => candidate.textContent.includes(${JSON.stringify(shopName)}));
    const button = card
      ? [...card.querySelectorAll('button')]
          .find((candidate) => candidate.textContent.includes('Approve and open shop'))
      : null;
    if (!button) return false;
    button.click();
    return true;
  })()`);
  check(approvedInUi, 'Admin can find the submitted application');
  await waitFor(`document.querySelector('.inline-notice')`);
  check(true, 'Admin can approve an application in the interface');

  await click('.account-trigger');
  await waitFor(`document.querySelector('.account-signout')`);
  await click('.account-signout');
  await waitFor(`document.querySelector('.account-signin')`);
  await click('.account-signin');
  await waitFor(`document.querySelector('.auth-modal')`);
  await setValue('#auth-email', customerEmail);
  await setValue('#auth-password', 'ui-test-password-123');
  await click('.auth-submit');
  await waitFor(`document.querySelector('.account-trigger')`);

  await navigate(`${baseUrl}/seller`);
  await waitFor(`document.querySelector('.dashboard-page')`);
  await waitFor(`document.querySelectorAll('.dashboard-stats .stat-card').length >= 4`);
  await pageMetrics('Desktop seller dashboard');
  await clickText('.dashboard-tabs button', 'Products');
  await waitFor(`document.body.textContent.includes('Add product')`);
  await clickText('.dashboard-toolbar button', 'Add product');
  await waitFor(`document.querySelector('.product-editor')`);
  await setValue('#seller-product-name', 'Browser Test Vase');
  await setValue('#seller-product-category', 'HOME');
  await setValue('#seller-product-price', '1850');
  await setValue('#seller-product-stock', '4');
  await setValue(
    '#seller-product-description',
    'A wheel-thrown stoneware vase with a soft matte glaze, tested through the seller interface.',
  );
  await clickText('.image-field .text-link', 'Use URL');
  await waitFor(`document.querySelector('#seller-product-image')`);
  await setValue(
    '#seller-product-image',
    'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=800&q=85',
  );
  await click('.product-editor button[type="submit"]');
  await waitFor(`document.querySelectorAll('.seller-product').length >= 1`);
  check(true, 'Seller can publish a product through the interface');

  await clickText('.dashboard-tabs button', 'Orders');
  await waitFor(
    `document.querySelector('.seller-order') || document.body.textContent.includes('No orders yet')`,
  );
  check(true, 'Seller order view renders its fulfilment scope');

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await navigate(`${baseUrl}/shop`);
  await waitFor(`document.querySelectorAll('.product-card').length >= 16`);
  const mobile = await pageMetrics('Mobile catalogue');
  check(mobile.productColumns === 2, 'Mobile catalogue uses two columns', String(mobile.productColumns));
  await waitFor(`document.querySelector('.account-trigger')`);
  await click('.account-trigger');
  await waitFor(`document.querySelector('.account-panel')`);
  const panelMetrics = await evaluate(`(() => {
    const rect = document.querySelector('.account-panel').getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: innerWidth };
  })()`);
  check(
    panelMetrics.left >= 0 && panelMetrics.right <= panelMetrics.width,
    'Mobile account menu stays inside the viewport',
    JSON.stringify(panelMetrics),
  );
  await evaluate(`document.body.click()`);
  await navigate(`${baseUrl}${orderPath}`);
  await waitFor(`document.querySelector('.order-confirmation-banner')`);
  await pageMetrics('Mobile order detail');
  await navigate(`${baseUrl}/admin`);
  await waitFor(`document.querySelector('.access-state')`);
  check(true, 'Protected admin route blocks a customer session');

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await navigate(`${baseUrl}/shop`);
  await waitFor(`document.querySelectorAll('.product-card').length >= 16`);
  check(
    await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`),
    'Reduced-motion preference is visible to the app',
  );
  const motion = await evaluate(`(() => {
    const card = getComputedStyle(document.querySelector('.product-card'));
    const page = getComputedStyle(document.querySelector('.catalogue-page'));
    return { transition: card.transitionDuration, animation: page.animationDuration };
  })()`);
  check(
    Number.parseFloat(motion.transition) <= 0.001 &&
      Number.parseFloat(motion.animation) <= 0.001,
    'Reduced motion suppresses decorative transitions',
    JSON.stringify(motion),
  );

  check(
    runtimeErrors.length === 0,
    'No uncaught frontend runtime errors occurred',
    runtimeErrors.join('\n'),
  );

  console.log(`\nPassed ${checks.length} browser checks:\n`);
  for (const item of checks) console.log(`  ✓ ${item}`);
} catch (error) {
  failure = error;
  console.error(`\nBrowser test failed: ${error.message}\n`);
  if (cdp) {
    try {
      const snapshot = await cdp.send('Runtime.evaluate', {
        expression: `({
          url: location.href,
          title: document.title,
          text: document.body.innerText.slice(0, 1600),
          html: document.body.innerHTML.slice(0, 1200),
        })`,
        returnByValue: true,
      });
      console.error(JSON.stringify(snapshot.result?.value, null, 2));
    } catch {
      // Page may be closed.
    }
  }
} finally {
  cdp?.close();
  chrome?.kill();
  await new Promise((resolve) => setTimeout(resolve, 400));
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}

if (failure) process.exitCode = 1;
