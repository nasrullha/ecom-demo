"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// The cart lives in the visitor's browser (localStorage) and only stores
// variant ids and quantities. Prices and stock are always looked up fresh, and
// the database re-checks everything when the order is placed.

export interface CartLine {
  variantId: string;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  /** false until the saved cart has been read from the browser */
  ready: boolean;
  count: number;
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const STORAGE_KEY = "shop-cart-v1";
const UUID = /^[0-9a-f-]{36}$/i;

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const lines: CartLine[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as CartLine).variantId === "string" &&
        UUID.test((item as CartLine).variantId) &&
        Number.isInteger((item as CartLine).quantity) &&
        (item as CartLine).quantity >= 1
      ) {
        lines.push({
          variantId: (item as CartLine).variantId,
          quantity: Math.min(99, (item as CartLine).quantity),
        });
      }
    }
    return lines.slice(0, 50);
  } catch {
    return [];
  }
}

function writeStorage(lines: CartLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* private mode or storage full: the cart just won't persist */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(readStorage());
    setReady(true);

    // keep several open tabs in sync
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setLines(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (current: CartLine[]) => CartLine[]) => {
    setLines((current) => {
      const next = fn(current);
      writeStorage(next);
      return next;
    });
  }, []);

  const add = useCallback(
    (variantId: string, quantity = 1) =>
      update((current) => {
        const existing = current.find((l) => l.variantId === variantId);
        if (existing) {
          return current.map((l) =>
            l.variantId === variantId ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l
          );
        }
        return [...current, { variantId, quantity: Math.min(99, Math.max(1, quantity)) }].slice(0, 50);
      }),
    [update]
  );

  const setQuantity = useCallback(
    (variantId: string, quantity: number) =>
      update((current) =>
        quantity < 1
          ? current.filter((l) => l.variantId !== variantId)
          : current.map((l) =>
              l.variantId === variantId ? { ...l, quantity: Math.min(99, Math.floor(quantity)) } : l
            )
      ),
    [update]
  );

  const remove = useCallback(
    (variantId: string) => update((current) => current.filter((l) => l.variantId !== variantId)),
    [update]
  );

  const clear = useCallback(() => update(() => []), [update]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, ready, add, setQuantity, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
