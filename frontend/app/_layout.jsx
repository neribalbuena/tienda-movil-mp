import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { CarritoProvider } from '../context/CarritoContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CarritoProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#171324' },
            headerTintColor: '#f8fafc',
            contentStyle: { backgroundColor: '#120f1d' },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Catálogo' }} />
          <Stack.Screen name="login" options={{ title: 'Acceso Admin' }} />
          <Stack.Screen name="admin-productos" options={{ title: 'Panel Admin' }} />
          <Stack.Screen name="detalle/[id]" options={{ title: 'Detalle del producto' }} />
          <Stack.Screen name="carrito" options={{ title: 'Comprar con Mercado Pago' }} />
        </Stack>
      </CarritoProvider>
    </AuthProvider>
  );
}
