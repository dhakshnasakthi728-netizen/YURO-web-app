import { db } from './db.js';

export function serializeProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    image: row.image,
    description: row.description,
    featured: Boolean(row.featured),
    newArrival: Boolean(row.new_arrival),
    stock: row.stock,
    active: Boolean(row.active),
    shopId: row.shop_id,
    shopName: row.shop_name || row.owner_shop_name,
    shopSlug: row.shop_slug,
    shopStatus: row.shop_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeShop(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    status: row.status,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name || null,
    ownerEmail: row.owner_email || null,
    productCount: row.product_count == null ? undefined : row.product_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeApplication(row) {
  return {
    id: row.id,
    reference: row.reference,
    userId: row.user_id,
    applicantName: row.applicant_name || null,
    applicantEmail: row.applicant_email || null,
    shopName: row.shop_name,
    description: row.description,
    category: row.category,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    websiteUrl: row.website_url,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    status: row.status,
    rejectionReason: row.rejection_reason || '',
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

function loadOrderItems(orderId) {
  return db
    .prepare(
      `SELECT oi.*, s.name AS shop_name, s.slug AS shop_slug
       FROM order_items oi
       JOIN shops s ON s.id = oi.shop_id
       WHERE oi.order_id = ?
       ORDER BY oi.id`,
    )
    .all(orderId)
    .map((item) => ({
      id: item.id,
      productId: item.product_id,
      shopId: item.shop_id,
      shopName: item.shop_name,
      shopSlug: item.shop_slug,
      name: item.name,
      category: item.category,
      image: item.image,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      lineTotal: item.line_total,
    }));
}

function loadOrderEvents(orderId) {
  return db
    .prepare(
      `SELECT * FROM order_events WHERE order_id = ? ORDER BY id`,
    )
    .all(orderId)
    .map((event) => ({
      id: event.id,
      groupId: event.group_id,
      status: event.status,
      note: event.note,
      createdAt: event.created_at,
    }));
}

export function serializeOrder(row, options = {}) {
  const { includeEvents = true, shopId = null } = options;
  const items = loadOrderItems(row.id);
  const events = includeEvents ? loadOrderEvents(row.id) : [];
  const groupRows = db
    .prepare('SELECT * FROM order_groups WHERE order_id = ? ORDER BY id')
    .all(row.id)
    .filter((group) => !shopId || group.shop_id === shopId);

  const groups = groupRows.map((group) => ({
    id: group.id,
    shopId: group.shop_id,
    shopName: group.shop_name,
    shopSlug: group.shop_slug,
    status: group.status,
    updatedAt: group.updated_at,
    items: items.filter((item) => item.shopId === group.shop_id),
    events: events.filter((event) => event.groupId === group.id),
  }));

  const filteredItems = shopId
    ? items.filter((item) => item.shopId === shopId)
    : items;

  return {
    id: row.id,
    reference: row.reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    promoCode: row.promo_code,
    subtotal: row.subtotal,
    discount: row.discount,
    shipping: row.shipping,
    total: row.total,
    customer: {
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
    },
    shippingAddress: {
      address: row.address,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
    },
    items: filteredItems,
    groups,
    events,
  };
}

export function serializeSellerOrder(row, group) {
  const items = db
    .prepare(
      `SELECT * FROM order_items
       WHERE order_id = ? AND order_group_id = ?
       ORDER BY id`,
    )
    .all(row.id, group.id)
    .map((item) => ({
      id: item.id,
      productId: item.product_id,
      name: item.name,
      category: item.category,
      image: item.image,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      lineTotal: item.line_total,
    }));

  const events = db
    .prepare(
      `SELECT * FROM order_events
       WHERE order_id = ? AND group_id = ?
       ORDER BY id`,
    )
    .all(row.id, group.id)
    .map((event) => ({
      id: event.id,
      status: event.status,
      note: event.note,
      createdAt: event.created_at,
    }));

  return {
    id: row.id,
    reference: row.reference,
    createdAt: row.created_at,
    paymentStatus: row.payment_status,
    customer: {
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
    },
    shippingAddress: {
      address: row.address,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
    },
    group: {
      id: group.id,
      status: group.status,
      updatedAt: group.updated_at,
      items,
      events,
      subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
    },
  };
}
