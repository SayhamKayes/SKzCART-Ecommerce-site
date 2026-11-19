import React, { createContext, useContext, useState, useEffect } from 'react';
import { marketingTracker } from '../services/marketing';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('amardokan_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(undefined);

  useEffect(() => {
    try {
      localStorage.setItem('amardokan_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  const addToCart = (product, variant) => {
    if (!product || product.isOutOfStock || (product.stock !== undefined && Number(product.stock) <= 0)) {
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.variant === variant
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}`,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          variant,
          price: product.price,
          quantity: 1,
          image: product.images ? product.images[0] : product.image,
        },
      ];
    });

    marketingTracker.track('AddToCart', {
      productId: product.id,
      name: product.name,
      value: product.price,
    });

    setIsCartOpen(true);
  };

  const updateQuantity = (id, qty) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: qty } : item))
    );
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        isCartOpen,
        setIsCartOpen,
        appliedCoupon,
        setAppliedCoupon,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        totalItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
