// Stripe価格IDの設定
export const STRIPE_PRICE_IDS = {
  starter: 'price_1RUyVaJMSst4ePfaZ3zVfT5x',
  creator: 'price_1RUyXHJMSst4ePfalObZIQhz', 
  pro: 'price_1RUyaUJMSst4ePfaCQhcSQAo'
} as const;

export type PlanKey = keyof typeof STRIPE_PRICE_IDS;