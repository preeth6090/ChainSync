// Client-only cart storage. There's no persistent server-side "Cart" model in the schema —
// only StockReservation, which holds warehouse stock for 15 minutes once a line is added
// (see addToCartAction) but doesn't represent the cart itself. localStorage is the
// pragmatic, correct choice for pre-checkout cart state here.

export interface CartLine {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
}

const CART_KEY = 'chainsync_cart_v1';

export function readCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    // private browsing / storage disabled — cart just won't persist across reloads
  }
}

export function addToCart(line: CartLine): CartLine[] {
  const cart = readCart();
  const existing = cart.find((l) => l.productId === line.productId);
  if (existing) {
    existing.quantity += line.quantity;
  } else {
    cart.push(line);
  }
  writeCart(cart);
  return cart;
}

export function clearCart(): void {
  writeCart([]);
}
