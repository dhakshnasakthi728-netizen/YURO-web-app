import { products as fallbackProducts } from '../data/products';
import type { Product } from '../types';

let catalogue: Product[] = fallbackProducts;

export function setCatalogue(next: Product[]): void {
  if (Array.isArray(next)) {
    catalogue = next;
  }
}

export function getCatalogue(): Product[] {
  return catalogue;
}

export function findProduct(productId: number): Product | undefined {
  return catalogue.find((product) => product.id === productId);
}
