import type { Product } from '../types';

export type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc';

export type CatalogueAnchor =
  | 'shop-top'
  | 'recommendations'
  | 'shop'
  | 'shop-results';

export type OpenCatalogueOptions = {
  category?: string;
  sort?: SortOption;
  search?: string;
  anchor?: CatalogueAnchor;
};

export type CatalogueFilters = {
  search: string;
  category: string;
  sort: SortOption;
};

/**
 * Applies the same search rules across the shop page and any catalogue view.
 * Search is intentionally global: a category is only applied when the visitor
 * explicitly chooses one.
 */
export function filterProducts(
  products: Product[],
  { search, category, sort }: CatalogueFilters,
) {
  const query = search.trim().toLowerCase();
  const result = products.filter((product) => {
    const matchesCategory = category === 'ALL' || product.category === category;
    const matchesSearch =
      query.length === 0 ||
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.shopName.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  if (sort === 'price-asc') {
    return [...result].sort(
      (a, b) => a.price - b.price || a.name.localeCompare(b.name),
    );
  }
  if (sort === 'price-desc') {
    return [...result].sort(
      (a, b) => b.price - a.price || a.name.localeCompare(b.name),
    );
  }
  if (sort === 'newest') {
    return [...result].sort(
      (a, b) => Number(b.newArrival) - Number(a.newArrival) || b.id - a.id,
    );
  }
  return result;
}

export function categoryOptions(products: Product[]) {
  return ['ALL', ...Array.from(new Set(products.map((product) => product.category)))];
}

type RecommendationOptions = {
  limit?: number;
  wishlist?: number[];
  recent?: number[];
};

export type RecommendationResult = {
  products: Product[];
  preferredCategory: string | null;
  signalCount: number;
};

/**
 * Builds a deterministic "for you" edit from real activity.
 *
 * Saved pieces carry the strongest signal, followed by recently viewed
 * pieces. If there is no activity yet, the featured and new-arrival flags from
 * the server catalogue provide the starting point. Saved pieces are excluded
 * from the first pass so the edit surfaces something new, then used as a
 * fallback when the catalogue is too small.
 */
export function recommendProducts(
  products: Product[],
  { limit = 4, wishlist = [], recent = [] }: RecommendationOptions = {},
): RecommendationResult {
  const byId = new Map(products.map((product) => [product.id, product]));
  const weights = new Map<string, number>();
  let signalCount = 0;

  for (const id of new Set(wishlist)) {
    const product = byId.get(id);
    if (!product) continue;
    signalCount += 1;
    weights.set(product.category, (weights.get(product.category) ?? 0) + 4);
  }

  for (const [index, id] of recent.entries()) {
    const product = byId.get(id);
    if (!product) continue;
    signalCount += 1;
    weights.set(
      product.category,
      (weights.get(product.category) ?? 0) + Math.max(0.75, 2.6 - index * 0.45),
    );
  }

  const preferredCategory =
    [...weights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const saved = new Set(wishlist);

  const score = (product: Product) =>
    (weights.get(product.category) ?? 0) +
    (product.featured ? 1.8 : 0) +
    (product.newArrival ? 0.9 : 0) +
    (product.stock > 0 ? 0.4 : -100);

  const ranked = [...products].sort(
    (a, b) =>
      score(b) - score(a) ||
      Number(b.featured) - Number(a.featured) ||
      Number(b.newArrival) - Number(a.newArrival) ||
      a.name.localeCompare(b.name),
  );

  const fresh = ranked.filter((product) => !saved.has(product.id));
  const recommendations = fresh.slice(0, limit);

  if (recommendations.length < limit) {
    for (const product of ranked) {
      if (recommendations.includes(product)) continue;
      recommendations.push(product);
      if (recommendations.length === limit) break;
    }
  }

  return { products: recommendations, preferredCategory, signalCount };
}
