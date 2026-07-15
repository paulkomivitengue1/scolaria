import type { PricingConfig, ClassPricing } from './types';
import { CLASS_LIST } from './types';
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
