export type ProductInfo = {
  id: string;
  price: number;
  nameEn: string;
  descEn: string;
  nameHe: string;
  descHe: string;
};

export const PRODUCTS: ProductInfo[] = [
  { id: 'cmfl2eeha000012b6nc9oxk5z', price: 89, nameEn: 'DPNR Development Fundamentals Textbook', descEn: 'Complete guide to development fundamentals', nameHe: 'ספר יסודות הפיתוח של DPNR', descHe: 'מדריך מלא ליסודות הפיתוח' },
  { id: 'cmfl2eehc000112b6tpej6yss', price: 119, nameEn: 'Advanced Development Patterns Textbook', descEn: 'Advanced patterns and best practices', nameHe: 'ספר תבניות פיתוח מתקדמות', descHe: 'תבניות מתקדמות ושיטות עבודה מומלצות' },
  { id: 'cmfl2eehd000212b65ve4sncp', price: 49, nameEn: 'DPNR Practice Exercises Workbook', descEn: 'Hands-on practice exercises', nameHe: 'חוברת תרגול של DPNR', descHe: 'תרגולים מעשיים לחיזוק הידע' },
  { id: 'cmfl2eehe000312b69c0d7fj1', price: 59, nameEn: 'Project Laboratory Workbook', descEn: 'Real-world project exercises', nameHe: 'חוברת מעבדה לפרויקטים', descHe: 'תרגולים בסביבת פרויקטים אמיתית' },
];

