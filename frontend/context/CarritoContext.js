import React, { createContext, useContext, useState, useMemo } from 'react';

const CarritoContext = createContext(null);

export function CarritoProvider({ children }) {
  const [items, setItems] = useState([]);

  const agregar = (producto, cantidad = 1) => {
    const cant = Math.max(1, Number(cantidad) || 1);
    const maxStock = Number(producto.stock ?? 999);
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === producto.id);
      if (idx >= 0) {
        const copia = [...prev];
        const nuevaCant = Math.min(maxStock, copia[idx].cantidad + cant);
        copia[idx] = { ...copia[idx], cantidad: nuevaCant, stock: maxStock };
        return copia;
      }
      return [...prev, { ...producto, cantidad: Math.min(maxStock, cant) }];
    });
  };

  const quitar = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const vaciar = () => {
    setItems([]);
  };

  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + Number(item.precio) * Number(item.cantidad), 0);
  }, [items]);

  const cantidadTotal = useMemo(() => {
    return items.reduce((acc, item) => acc + Number(item.cantidad), 0);
  }, [items]);

  return (
    <CarritoContext.Provider
      value={{ items, agregar, quitar, vaciar, total, cantidadTotal }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) {
    throw new Error('useCarrito debe usarse dentro de CarritoProvider');
  }
  return ctx;
}
