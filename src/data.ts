import type { PricingConfig, ClassPricing, UniformStockItem, BookStockItem, UniformCycle, UniformSize, BookClass, BookSubject } from './types';
import { CLASS_LIST, UNIFORM_CYCLES, UNIFORM_SIZES, BOOK_CLASSES, BOOK_SUBJECTS } from './types';
const P: Record<string,ClassPricing> = {
  'Jardin':      {scolarite:135000,cantine:90000,transport:63000},
  '1ère année':  {scolarite:162000,cantine:90000,transport:63000},
  '2ème année':  {scolarite:162000,cantine:90000,transport:63000},
  '3ème année':  {scolarite:180000,cantine:108000,transport:72000},
  '4ème année':  {scolarite:180000,cantine:108000,transport:72000},
  '5ème année':  {scolarite:198000,cantine:108000,transport:72000},
  '6ème année':  {scolarite:225000,cantine:108000,transport:72000},
  '7ème année':  {scolarite:252000,cantine:126000,transport:81000},
  '8ème année':  {scolarite:270000,cantine:126000,transport:81000},
  '9ème année':  {scolarite:315000,cantine:126000,transport:81000},
};
export const DEFAULT_PRICING: PricingConfig = Object.fromEntries(CLASS_LIST.map(c => [c, {...P[c]}])) as PricingConfig;
export const STUDENTS: never[] = [];

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const initialUniforms: { cycle: UniformCycle; size: UniformSize; oldStock: number; newStock: number; sold: number; price: number }[] = [
  { cycle: 'maternelle', size: '4', oldStock: 12, newStock: 8, sold: 5, price: 5000 },
  { cycle: 'maternelle', size: '6', oldStock: 10, newStock: 6, sold: 7, price: 5000 },
  { cycle: 'maternelle', size: '8', oldStock: 8, newStock: 4, sold: 2, price: 5000 },
  { cycle: 'maternelle', size: '10', oldStock: 6, newStock: 3, sold: 1, price: 5000 },
  { cycle: 'cycle1', size: '8', oldStock: 14, newStock: 10, sold: 8, price: 6000 },
  { cycle: 'cycle1', size: '10', oldStock: 12, newStock: 8, sold: 9, price: 6000 },
  { cycle: 'cycle1', size: '12', oldStock: 10, newStock: 6, sold: 4, price: 6000 },
  { cycle: 'cycle2', size: 'S', oldStock: 10, newStock: 6, sold: 3, price: 7000 },
  { cycle: 'cycle2', size: 'M', oldStock: 8, newStock: 4, sold: 2, price: 7000 },
  { cycle: 'cycle2', size: 'L', oldStock: 6, newStock: 2, sold: 2, price: 7000 },
  { cycle: 'cycle2', size: 'XL', oldStock: 4, newStock: 2, sold: 0, price: 7000 },
];

export const DEFAULT_UNIFORM_STOCK: UniformStockItem[] = initialUniforms.map((u) => ({
  id: uid('u'), ...u,
}));

const initialBooks: { className: BookClass; subject: BookSubject; inStock: number; sold: number; price: number }[] = [
  { className: 'Jardin', subject: 'Lecture', inStock: 30, sold: 12, price: 2000 },
  { className: 'Jardin', subject: 'Calcul', inStock: 25, sold: 10, price: 2000 },
  { className: 'Jardin', subject: 'Écriture', inStock: 20, sold: 8, price: 2000 },
  { className: '1ère année', subject: 'Lecture', inStock: 35, sold: 18, price: 2000 },
  { className: '1ère année', subject: 'Calcul', inStock: 30, sold: 15, price: 2000 },
  { className: '1ère année', subject: 'Dictée', inStock: 20, sold: 9, price: 2000 },
  { className: '2ème année', subject: 'Lecture', inStock: 28, sold: 14, price: 2000 },
  { className: '2ème année', subject: 'Calcul', inStock: 26, sold: 12, price: 2000 },
  { className: '2ème année', subject: 'Grammaire', inStock: 18, sold: 6, price: 2000 },
  { className: '3ème année', subject: 'Lecture', inStock: 24, sold: 11, price: 2000 },
  { className: '3ème année', subject: 'Calcul', inStock: 22, sold: 10, price: 2000 },
  { className: '3ème année', subject: 'Histoire-Géo', inStock: 15, sold: 4, price: 2000 },
  { className: '4ème année', subject: 'Lecture', inStock: 20, sold: 8, price: 2000 },
  { className: '4ème année', subject: 'Calcul', inStock: 20, sold: 7, price: 2000 },
  { className: '4ème année', subject: 'Sciences', inStock: 14, sold: 3, price: 2000 },
  { className: '5ème année', subject: 'Calcul', inStock: 18, sold: 9, price: 2000 },
  { className: '5ème année', subject: 'Histoire-Géo', inStock: 16, sold: 5, price: 2000 },
  { className: '5ème année', subject: 'Anglais', inStock: 12, sold: 4, price: 2000 },
  { className: '6ème année', subject: 'Calcul', inStock: 16, sold: 6, price: 2000 },
  { className: '6ème année', subject: 'Grammaire', inStock: 14, sold: 5, price: 2000 },
  { className: '6ème année', subject: 'Sciences', inStock: 12, sold: 2, price: 2000 },
  { className: '7ème année', subject: 'Calcul', inStock: 14, sold: 7, price: 2000 },
  { className: '7ème année', subject: 'Histoire-Géo', inStock: 12, sold: 4, price: 2000 },
  { className: '7ème année', subject: 'Anglais', inStock: 10, sold: 3, price: 2000 },
  { className: '8ème année', subject: 'Calcul', inStock: 12, sold: 5, price: 2000 },
  { className: '8ème année', subject: 'Conjugaison', inStock: 10, sold: 4, price: 2000 },
  { className: '8ème année', subject: 'Sciences', inStock: 8, sold: 1, price: 2000 },
  { className: '9ème année', subject: 'Calcul', inStock: 10, sold: 4, price: 2000 },
  { className: '9ème année', subject: 'Histoire-Géo', inStock: 8, sold: 2, price: 2000 },
  { className: '9ème année', subject: 'Anglais', inStock: 6, sold: 1, price: 2000 },
];

export const DEFAULT_BOOK_STOCK: BookStockItem[] = initialBooks.map((b) => ({
  id: uid('b'), ...b,
}));

export const newUniformItem = (cycle: UniformCycle, size: UniformSize): UniformStockItem => ({
  id: uid('u'), cycle, size, oldStock: 0, newStock: 0, sold: 0, price: 5000,
});

export const newBookItem = (className: BookClass, subject: BookSubject): BookStockItem => ({
  id: uid('b'), className, subject, inStock: 0, sold: 0, price: 2000,
});

export { UNIFORM_CYCLES, UNIFORM_SIZES, BOOK_CLASSES, BOOK_SUBJECTS };
