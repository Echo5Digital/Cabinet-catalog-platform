"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const QuoteContext = createContext(null);

const STORAGE_KEY = "quote_items";

export function QuoteProvider({ children }) {
  const [items, setItems] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // localStorage unavailable or corrupt — start fresh
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on every change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or unavailable
    }
  }, [items, hydrated]);

  const addItem = useCallback((item) => {
    // item: { sku, name, finish_id, finish_code, finish_name, quantity, line_slug, swatch_url }
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.sku === item.sku && i.finish_id === item.finish_id
      );
      if (existing) {
        return prev.map((i) =>
          i.sku === item.sku && i.finish_id === item.finish_id
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
    setPanelOpen(true);
  }, []);

  const removeItem = useCallback((sku, finishId) => {
    setItems((prev) =>
      prev.filter((i) => !(i.sku === sku && i.finish_id === finishId))
    );
  }, []);

  const updateItem = useCallback((sku, finishId, updates) => {
    setItems((prev) =>
      prev.map((i) =>
        i.sku === sku && i.finish_id === finishId ? { ...i, ...updates } : i
      )
    );
  }, []);

  const clearQuote = useCallback(() => {
    setItems([]);
    setPanelOpen(false);
    setModalOpen(false);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <QuoteContext.Provider
      value={{
        items,
        totalItems,
        panelOpen,
        setPanelOpen,
        modalOpen,
        setModalOpen,
        addItem,
        removeItem,
        updateItem,
        clearQuote,
        hydrated,
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote() {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used inside QuoteProvider");
  return ctx;
}
