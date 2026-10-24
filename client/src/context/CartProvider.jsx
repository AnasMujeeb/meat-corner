import { useReducer, useEffect } from "react";
import { CartContext } from "./cartContextDef.js";

function reducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const key = `${action.item._id}__${JSON.stringify(action.item.selectedOptions ?? {})}`;
      const idx = state.findIndex((i) => i._cartKey === key);
      if (idx >= 0) {
        return state.map((i, n) => (n === idx ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...state, { ...action.item, qty: 1, _cartKey: key }];
    }
    case "REMOVE":
      return state.filter((i) => i._cartKey !== action.key);
    case "SET_QTY":
      return state
        .map((i) => (i._cartKey === action.key ? { ...i, qty: action.qty } : i))
        .filter((i) => i.qty > 0);
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

const STORAGE_KEY = "mc_cart";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, [], load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.qty * (i.price + (i._extraPrice ?? 0)), 0);

  function addItem(item) {
    dispatch({ type: "ADD", item });
  }
  function removeItem(key) {
    dispatch({ type: "REMOVE", key });
  }
  function setQty(key, qty) {
    dispatch({ type: "SET_QTY", key, qty });
  }
  function clear() {
    dispatch({ type: "CLEAR" });
  }

  return (
    <CartContext.Provider
      value={{ items, totalQty, totalPrice, addItem, removeItem, setQty, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export default CartProvider;
