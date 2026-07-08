"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createProductApi,
  createSupplierApi,
  deleteProductApi,
  deleteSupplierApi,
  fetchSupplier,
  fetchProductsBySupplier,
  fetchSuppliers,
  updateProductApi,
  updateSupplierApi,
} from "@/features/suppliers/services/suppliersApi";

export function useSuppliersList() {
  const [suppliers, setSuppliers] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const list = await fetchSuppliers();
      setSuppliers(list);
      // Load counts lazily in parallel, best-effort.
      const entries = await Promise.all(
        list.map(async (s) => {
          try {
            const items = await fetchProductsBySupplier(s.id);
            return [s.id, items.length];
          } catch {
            return [s.id, 0];
          }
        }),
      );
      setProductCounts(Object.fromEntries(entries));
    } catch (err) {
      setError(err?.message || "load_failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addSupplier = useCallback(
    async (data) => {
      const created = await createSupplierApi(data);
      await refresh();
      return created;
    },
    [refresh],
  );

  const removeSupplier = useCallback(
    async (id) => {
      await deleteSupplierApi(id);
      await refresh();
    },
    [refresh],
  );

  return {
    suppliers,
    productCounts,
    isLoading,
    error,
    refresh,
    addSupplier,
    removeSupplier,
  };
}

export function useSupplierDetail(supplierId) {
  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!supplierId) return;
    setIsLoading(true);
    setError("");
    try {
      const [found, items] = await Promise.all([
        fetchSupplier(supplierId),
        fetchProductsBySupplier(supplierId),
      ]);
      setSupplier(found || null);
      setProducts(items);
    } catch (err) {
      setError(err?.message || "load_failed");
    } finally {
      setIsLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveInfo = useCallback(
    async (patch) => {
      const updated = await updateSupplierApi(supplierId, patch);
      setSupplier(updated);
    },
    [supplierId],
  );

  const addProduct = useCallback(
    async (data) => {
      await createProductApi(supplierId, data);
      const items = await fetchProductsBySupplier(supplierId);
      setProducts(items);
    },
    [supplierId],
  );

  const updateProduct = useCallback(
    async (productId, patch) => {
      await updateProductApi(productId, patch);
      const items = await fetchProductsBySupplier(supplierId);
      setProducts(items);
    },
    [supplierId],
  );

  const removeProduct = useCallback(async (productId) => {
    await deleteProductApi(productId);
    setProducts((prev) => prev.filter((p) => p.id !== String(productId)));
  }, []);

  return {
    supplier,
    products,
    isLoading,
    error,
    refresh,
    saveInfo,
    addProduct,
    updateProduct,
    removeProduct,
  };
}
