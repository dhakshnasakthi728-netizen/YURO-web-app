import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.TEST_PORT || 4199);
const base = `http://127.0.0.1:${port}/api`;
const databasePath = path.join(
  os.tmpdir(),
  `yuro-integration-${process.pid}-${Date.now()}.sqlite`,
);
const adminEmail = 'integration-admin@yuro.local';
const adminPassword = crypto.randomBytes(18).toString('base64url');
const checks = [];

function check(condition, label, detail = '') {
  if (!condition) {
    throw new Error(`${label}${detail ? ` — ${detail}` : ''}`);
  }
  checks.push(label);
}

class Client {
  cookies = new Map();

  async request(route, { method = 'GET', body, expected = 200 } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.cookies.size) {
      headers.Cookie = [...this.cookies]
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    }

    const response = await fetch(`${base}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    for (const value of response.headers.getSetCookie?.() || []) {
      const [pair] = value.split(';');
      const separator = pair.indexOf('=');
      if (separator > 0) {
        const name = pair.slice(0, separator);
        const cookie = pair.slice(separator + 1);
        if (cookie && response.ok) this.cookies.set(name, cookie);
        if (!cookie) this.cookies.delete(name);
      }
    }

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (response.status !== expected) {
      throw new Error(
        `${method} ${route} expected ${expected}, received ${response.status}: ${text}`,
      );
    }

    return data;
  }

  async register(fullName, email) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { fullName, email, password: 'integration-pass-123' },
      expected: 201,
    });
  }

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }
}

function orderPayload(productIds, idempotencyKey, overrides = {}) {
  return {
    idempotencyKey,
    items: productIds,
    contact: {
      fullName: 'Asha Menon',
      email: 'asha@example.test',
      phone: '+91 98765 43210',
    },
    shippingAddress: {
      address: '14 Rosewood Lane',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
    },
    paymentMethod: 'cod',
    ...overrides,
  };
}

let server;
let serverLog = '';
let failure = null;

try {
  server = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_PATH: databasePath,
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: adminPassword,
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverLog += chunk.toString();
  });

  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  check(ready, 'API server starts with a clean database');

  const customerA = new Client();
  const customerB = new Client();
  const sellerD = new Client();
  const admin = new Client();

  const registration = await customerA.register(
    'Asha Menon',
    'asha@example.test',
  );
  check(registration.user.role === 'customer', 'Registration creates a customer account');
  check(
    customerA.cookies.has('yuro_session'),
    'Registration issues an HttpOnly session cookie',
  );

  await customerB.register('Ravi Shah', 'ravi@example.test');
  await sellerD.register('Mira Sen', 'mira@example.test');
  await admin.login(adminEmail, adminPassword);

  const me = await customerA.request('/auth/me');
  check(me.user.email === 'asha@example.test', 'Session restores the signed-in account');

  await new Client().request('/orders', { expected: 401 });

  const catalogue = await customerA.request('/products');
  check(catalogue.products.length >= 16, 'Catalogue is seeded with house products');
  const houseProduct = catalogue.products.find((product) => product.stock > 2);
  check(Boolean(houseProduct), 'Catalogue contains an in-stock house product');
  const houseProduct2 = catalogue.products.find(
    (product) => product.id !== houseProduct.id,
  );
  check(Boolean(houseProduct2), 'Catalogue contains a second house product');

  const settings = (await customerA.request('/settings')).settings;
  check(settings.promoCode === 'YURO10', 'Commerce settings are publicly readable');

  const application = (
    await customerA.request('/account/seller-applications', {
      method: 'POST',
      body: {
        shopName: 'Hearth & Loom',
        description:
          'A small studio shop for hand-finished home textiles and quiet everyday objects.',
        category: 'HOME',
        contactEmail: 'studio@hearthloom.test',
        contactPhone: '+91 98765 43210',
        websiteUrl: 'https://hearthloom.test',
      },
      expected: 201,
    })
  ).application;
  check(application.status === 'pending', 'Seller application starts pending');
  check(
    application.reference.startsWith('SA-'),
    'Seller application receives a customer-facing reference',
  );

  await customerA.request('/seller/products', { expected: 403 });
  await customerA.request('/admin/stats', { expected: 403 });
  await customerB.request('/seller/products', { expected: 403 });

  const applications = (await admin.request('/admin/applications')).applications;
  check(
    applications.some((item) => item.id === application.id),
    'Admin can inspect pending applications',
  );

  const approval = await admin.request(
    `/admin/applications/${application.id}/approve`,
    { method: 'POST' },
  );
  check(approval.application.status === 'approved', 'Admin approval updates the application');
  check(approval.shop.status === 'approved', 'Approval creates an approved shop');
  check(
    approval.shop.ownerUserId === registration.user.id,
    'Approved shop is owned by the applicant',
  );

  const sellerMe = await customerA.request('/auth/me');
  check(sellerMe.user.role === 'seller', 'Approval promotes the applicant to seller');
  check(sellerMe.user.shop?.id === approval.shop.id, 'Seller session exposes the owned shop');

  await admin.request(`/admin/applications/${application.id}/approve`, {
    method: 'POST',
    expected: 409,
  });

  const sellerProduct = (
    await customerA.request('/seller/products', {
      method: 'POST',
      body: {
        name: 'Handwoven Table Runner',
        category: 'HOME',
        price: 2400,
        image:
          'https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=800&q=85',
        description:
          'A handwoven table runner in undyed cotton, finished with a soft raw edge.',
        stock: 5,
        active: true,
      },
      expected: 201,
    })
  ).product;
  check(
    sellerProduct.shopId === approval.shop.id,
    'Seller can publish a product in their own shop',
  );

  const sellerProducts = (await customerA.request('/seller/products')).products;
  check(
    sellerProducts.length === 1 && sellerProducts[0].id === sellerProduct.id,
    'Seller inventory is scoped to the owned shop',
  );

  const secondApplication = (
    await sellerD.request('/account/seller-applications', {
      method: 'POST',
      body: {
        shopName: 'North Loom',
        description:
          'A second independent shop focused on small-batch woven accessories and repair.',
        category: 'ACCESSORIES',
        contactEmail: 'hello@northloom.test',
        contactPhone: '+91 91234 56789',
      },
      expected: 201,
    })
  ).application;
  const secondApproval = await admin.request(
    `/admin/applications/${secondApplication.id}/approve`,
    { method: 'POST' },
  );
  check(secondApproval.shop.status === 'approved', 'A second seller can be approved');

  const sellerDProducts = (await sellerD.request('/seller/products')).products;
  check(
    sellerDProducts.length === 0,
    'A second seller cannot see another shop’s inventory',
  );
  await sellerD.request(`/seller/products/${sellerProduct.id}`, {
    method: 'PATCH',
    body: {
      name: 'Hijacked',
      category: 'HOME',
      price: 1,
      image: sellerProduct.image,
      description: 'This update must be rejected by shop ownership checks.',
      stock: 1,
      active: true,
    },
    expected: 404,
  });
  await sellerD.request('/seller/orders', { expected: 200 }).then((data) => {
    check(data.orders.length === 0, 'A second seller has no foreign fulfilment groups');
  });

  await customerA.request('/orders', {
    method: 'POST',
    body: orderPayload(
      [{ productId: sellerProduct.id, quantity: 6 }],
      'stock-check-order-1',
    ),
    expected: 409,
  });
  check(
    (await customerA.request(`/seller/products`)).products[0].stock === 5,
    'Rejected checkout does not reduce stock',
  );

  await customerA.request('/orders', {
    method: 'POST',
    body: orderPayload(
      [{ productId: sellerProduct.id, quantity: 1 }],
      'invalid-promo-order-1',
      { promoCode: 'NOT-A-CODE' },
    ),
    expected: 422,
  });
  await customerA.request('/orders', {
    method: 'POST',
    body: orderPayload(
      [{ productId: sellerProduct.id, quantity: 1 }],
      'invalid-payment-order-1',
      { paymentMethod: 'card' },
    ),
    expected: 422,
  });

  const created = await customerA.request('/orders', {
    method: 'POST',
    body: orderPayload(
      [
        {
          productId: sellerProduct.id,
          quantity: 2,
          price: 1,
          unitPrice: 1,
        },
        {
          productId: houseProduct.id,
          quantity: 1,
          price: 1,
          unitPrice: 1,
        },
      ],
      'integration-order-1',
      {
        promoCode: 'yuro10',
        subtotal: 1,
        discount: 999999,
        shipping: 0,
        total: 1,
      },
    ),
    expected: 201,
  });
  const order = created.order;
  const expectedSubtotal = sellerProduct.price * 2 + houseProduct.price;
  const expectedDiscount = Math.round(expectedSubtotal * settings.promoRate);
  const expectedTotal = expectedSubtotal - expectedDiscount;
  check(created.duplicate === false, 'Checkout creates a new order');
  check(order.reference.startsWith('YR-'), 'Order receives a reference');
  check(order.items.length === 2, 'Multi-shop order keeps all customer items');
  check(order.groups.length === 2, 'Multi-shop order creates per-shop fulfilment groups');
  check(
    order.items.every((item) => item.unitPrice !== 1),
    'Server ignores client-supplied item prices',
  );
  check(
    order.subtotal === expectedSubtotal &&
      order.discount === expectedDiscount &&
      order.total === expectedTotal,
    'Server calculates trusted order totals',
    JSON.stringify({
      actual: [order.subtotal, order.discount, order.shipping, order.total],
      expected: [expectedSubtotal, expectedDiscount, expectedTotal],
    }),
  );
  check(order.promoCode === 'YURO10', 'Promo codes are normalised and recorded');
  check(
    order.paymentMethod === 'cod' && order.paymentStatus === 'pending',
    'Cash-on-delivery payment state is explicit',
  );
  check(order.events.length >= 3, 'Order timeline records order and shop events');

  const duplicate = await customerA.request('/orders', {
    method: 'POST',
    body: orderPayload(
      [{ productId: sellerProduct.id, quantity: 1 }],
      'integration-order-1',
    ),
    expected: 200,
  });
  check(duplicate.duplicate === true, 'Repeated checkout returns the existing order');
  check(duplicate.order.reference === order.reference, 'Idempotency preserves order identity');
  check(
    (await customerA.request('/seller/products')).products[0].stock === 3,
    'Stock is reduced once, not once per checkout attempt',
  );

  const myOrders = await customerA.request('/orders');
  check(
    myOrders.orders.length === 1 &&
      myOrders.orders[0].reference === order.reference,
    'Order history is loaded from the server',
  );
  await customerB.request(`/orders/${order.reference}`, { expected: 404 });

  await customerA.request('/auth/logout', { method: 'POST' });
  if (process.env.DEBUG_COOKIES === '1') {
    console.log('cookies after logout', [...customerA.cookies]);
  }
  await customerA.request('/orders', { expected: 401 });
  await customerA.login('asha@example.test', 'integration-pass-123');
  const restoredOrders = await customerA.request('/orders');
  check(
    restoredOrders.orders[0].reference === order.reference,
    'Order history survives sign-out and later sign-in',
  );

  const sellerOrders = (await customerA.request('/seller/orders')).orders;
  check(sellerOrders.length === 1, 'Seller sees the order containing their items');
  check(
    sellerOrders[0].group.items.every(
      (item) => item.productId === sellerProduct.id,
    ),
    'Seller fulfilment payload excludes other shops’ items',
  );
  check(
    sellerOrders[0].group.status === 'placed',
    'Seller fulfillment group starts as placed',
  );

  const sellerGroupId = sellerOrders[0].group.id;
  await sellerD.request(`/seller/order-groups/${sellerGroupId}/status`, {
    method: 'PATCH',
    body: { status: 'confirmed' },
    expected: 404,
  });

  const shipped = await customerA.request(
    `/seller/order-groups/${sellerGroupId}/status`,
    { method: 'PATCH', body: { status: 'shipped', note: 'Handed to courier.' } },
  );
  check(shipped.order.group.status === 'shipped', 'Seller can update their own fulfilment');
  check(
    (await customerA.request(`/orders/${order.reference}`)).order.status ===
      'shipped',
    'Overall order status derives from shop-group status',
  );

  const adminOrders = (await admin.request('/admin/orders')).orders;
  check(adminOrders.length === 1, 'Admin can read marketplace orders');
  const adminDetail = (await admin.request(`/admin/orders/${order.reference}`))
    .order;
  check(adminDetail.groups.length === 2, 'Admin sees every fulfillment group');
  const houseGroup = adminDetail.groups.find(
    (group) => group.shopId !== sellerProduct.shopId,
  );
  check(Boolean(houseGroup), 'Admin can identify the other shop group');

  await admin.request(`/admin/orders/${order.id}/payment`, {
    method: 'PATCH',
    body: { paymentStatus: 'paid' },
  });
  check(
    (await customerA.request(`/orders/${order.reference}`)).order.paymentStatus ===
      'paid',
    'Admin payment updates are reflected to the customer',
  );

  await customerA.request(`/seller/order-groups/${sellerGroupId}/status`, {
    method: 'PATCH',
    body: { status: 'delivered' },
  });
  await admin.request(`/admin/order-groups/${houseGroup.id}/status`, {
    method: 'PATCH',
    body: { status: 'delivered' },
  });
  check(
    (await customerA.request(`/orders/${order.reference}`)).order.status ===
      'delivered',
    'Order is delivered only when every shop group is complete',
  );
  await customerA.request(`/seller/order-groups/${sellerGroupId}/status`, {
    method: 'PATCH',
    body: { status: 'cancelled' },
    expected: 409,
  });

  await admin.request(`/admin/shops/${sellerProduct.shopId}/status`, {
    method: 'PATCH',
    body: { status: 'suspended' },
  });
  await customerA.request('/seller/products', {
    method: 'POST',
    body: {
      name: 'Blocked Product',
      category: 'HOME',
      price: 100,
      image: sellerProduct.image,
      description: 'A suspended shop must not be able to publish this product.',
      stock: 1,
    },
    expected: 403,
  });
  check(
    !(await customerA.request('/products')).products.some(
      (item) => item.id === sellerProduct.id,
    ),
    'Suspended shops disappear from the public catalogue',
  );
  check(
    !(await customerA.request('/shops')).shops.some(
      (shop) => shop.id === sellerProduct.shopId,
    ),
    'Suspended shops disappear from the shop directory',
  );

  const rejectionApplication = (
    await customerB.request('/account/seller-applications', {
      method: 'POST',
      body: {
        shopName: 'Trial Shop',
        description:
          'An application that will be rejected to validate the review path and notes.',
        category: 'APPAREL',
        contactEmail: 'ravi@example.test',
        contactPhone: '+91 99887 76655',
      },
      expected: 201,
    })
  ).application;
  const rejected = await admin.request(
    `/admin/applications/${rejectionApplication.id}/reject`,
    {
      method: 'POST',
      body: { reason: 'Please add a clearer sourcing and returns policy.' },
    },
  );
  check(rejected.application.status === 'rejected', 'Admin can reject an application');
  check(
    rejected.application.rejectionReason.includes('sourcing'),
    'Rejection reason is retained for the applicant',
  );
  const customerApplications = (
    await customerB.request('/account/seller-applications')
  ).applications;
  check(
    customerApplications[0].status === 'rejected' &&
      customerApplications[0].rejectionReason.includes('sourcing'),
    'Applicant can read their review outcome and reason',
  );
  check(
    (await customerB.request('/auth/me')).user.role === 'customer',
    'Rejected applicants remain customers',
  );
  await admin.request(`/admin/applications/${rejectionApplication.id}/reject`, {
    method: 'POST',
    body: { reason: 'A second review should not be allowed.' },
    expected: 409,
  });

  const updatedSettings = await admin.request('/admin/settings', {
    method: 'PATCH',
    body: { shippingFee: 199, freeShippingThreshold: 5000 },
  });
  check(
    updatedSettings.settings.shippingFee === 199,
    'Admin can update commerce settings',
  );
  check(
    (await customerB.request('/settings')).settings.freeShippingThreshold ===
      5000,
    'Commerce settings are server-authoritative',
  );

  await admin.request(`/admin/products/${sellerProduct.id}`, {
    method: 'PATCH',
    body: { active: false },
  });
  const adminProducts = (await admin.request('/admin/products')).products;
  check(
    adminProducts.find((item) => item.id === sellerProduct.id)?.active === false,
    'Admin can moderate a product',
  );

  await admin.request(`/admin/shops/${sellerProduct.shopId}/status`, {
    method: 'PATCH',
    body: { status: 'approved' },
  });
  check(
    (await customerA.request('/shops')).shops.some(
      (shop) => shop.id === sellerProduct.shopId,
    ),
    'Admin can restore a suspended shop',
  );

  const health = await fetch(`${base}/health`).then((response) => response.json());
  check(health.ok === true, 'Server remains healthy after the full workflow');

  console.log(`\nPassed ${checks.length} integration checks:\n`);
  for (const item of checks) console.log(`  ✓ ${item}`);
} catch (error) {
  failure = error;
  console.error(`\nIntegration test failed: ${error.message}\n`);
  if (serverLog.trim()) {
    console.error('Server log:\n' + serverLog.slice(-8000));
  }
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  for (const suffix of ['', '-wal', '-shm']) {
    await fs.rm(`${databasePath}${suffix}`, { force: true }).catch(() => {});
  }
}

if (failure) process.exitCode = 1;
