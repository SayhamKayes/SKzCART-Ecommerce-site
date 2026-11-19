import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { realtimeService } from '../services/realtime';
import { apiClient } from '../services/api';
const RealtimeContext = createContext(null);

export const RealtimeProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const refreshData = useCallback(async () => {
    try {
      const [prodsRes, ordersRes, couponsRes, auditRes] = await Promise.all([
        apiClient.getProducts(),
        apiClient.getOrders(),
        apiClient.getCoupons(),
        apiClient.getAuditLogs(),
      ]);
      if (Array.isArray(prodsRes) && prodsRes.length > 0) setProducts(prodsRes);
      if (Array.isArray(ordersRes) && ordersRes.length > 0) setOrders(ordersRes);
      if (Array.isArray(couponsRes) && couponsRes.length > 0) setCoupons(couponsRes);
      if (Array.isArray(auditRes) && auditRes.length > 0) setAuditLogs(auditRes);
    } catch {
      // Backend not responding, fallback is preserved
    }
  }, []);

  useEffect(() => {
    refreshData();

    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type === 'ORDER_CREATED') {
        const newOrder = event.payload;
        if (newOrder && newOrder.id) {
          setOrders((prev) => {
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
        }
        realtimeService.playChime('order');
        refreshData();
      } else if (event.type === 'ORDER_UPDATED') {
        const updatedOrder = event.payload;
        if (updatedOrder && updatedOrder.id) {
          setOrders((prev) =>
            prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          );
        }
        realtimeService.playChime('update');
        refreshData();
      } else if (event.type === 'STOCK_UPDATED') {
        const { productId, stock } = event.payload || {};
        if (productId) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === productId ? { ...p, stock } : p
            )
          );
        }
        refreshData();
      }
    });

    const pollInterval = setInterval(() => {
      refreshData();
    }, 5000);

    const handleFocus = () => refreshData();
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshData]);

  const addOrder = (order) => {
    setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
  };

  const updateProductStock = async (productId, newStock) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );
    try {
      await apiClient.updateProduct(productId, { stock: newStock });
    } catch {}
  };

  const addNewProduct = async (newProd) => {
    try {
      const created = await apiClient.createProduct(newProd);
      setProducts((prev) => [created || newProd, ...prev]);
      refreshData();
    } catch {
      setProducts((prev) => [newProd, ...prev]);
    }
  };

  return (
    <RealtimeContext.Provider
      value={{
        products,
        setProducts,
        orders,
        setOrders,
        coupons,
        auditLogs,
        refreshData,
        addOrder,
        updateProductStock,
        addNewProduct,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
