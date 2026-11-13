import catalog from '../../shared/catalog.json';
import type { Product } from '../types';

type SeedProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  featured: boolean;
  newArrival: boolean;
};

export const products: Product[] = (catalog as SeedProduct[]).map((product) => ({
  ...product,
  stock: 50,
  active: true,
  shopId: 1,
  shopName: 'YURO Studio',
  shopSlug: 'yuro-studio',
  shopStatus: 'approved',
}));

export const categories = [
  'ALL',
  ...Array.from(new Set(products.map((product) => product.category))),
];

export const collections = [
  {
    category: 'APPAREL',
    title: 'Apparel',
    subtitle: 'Quiet layers',
    image:
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80',
  },
  {
    category: 'HOME',
    title: 'Home',
    subtitle: 'Objects for living',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
  },
  {
    category: 'ACCESSORIES',
    title: 'Accessories',
    subtitle: 'Finishing touches',
    image:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80',
  },
  {
    category: 'FOOTWEAR',
    title: 'Footwear',
    subtitle: 'Everyday movement',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  },
];
