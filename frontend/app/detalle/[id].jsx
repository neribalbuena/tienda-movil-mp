import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { API_BASE_URL } from '../../config/api';
import { useCarrito } from '../../context/CarritoContext';
import PressableScale from '../../components/PressableScale';

export default function DetalleProductoScreen() {
  const params = useLocalSearchParams();
  const idNumerico = Number(params.id);
  const { agregar, cantidadTotal } = useCarrito();

  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarDetalle = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/productos/${idNumerico}`);
      if (!res.ok) {
        throw new Error('No se pudo obtener el detalle del producto');
      }
      const data = await res.json();
      setProducto(data);
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setCargando(false);
    }
  }, [idNumerico]);

  useFocusEffect(
    useCallback(() => {
      if (!Number.isNaN(idNumerico)) {
        cargarDetalle();
      } else {
        setError('ID inválido');
        setCargando(false);
      }
    }, [idNumerico, cargarDetalle])
  );

  const handleAgregar = () => {
    if (!producto) return;
    if (producto.stock <= 0) {
      Alert.alert('Sin stock', 'Este producto no tiene stock disponible.');
      return;
    }
    agregar(producto, 1);
    Alert.alert('Agregado', `${producto.nombre} se sumó al carrito.`, [
      { text: 'Seguir viendo', style: 'cancel' },
      { text: 'Ir al carrito', onPress: () => router.push('/carrito') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#c084fc" />
          <Text style={styles.textoSecundario}>Cargando detalle...</Text>
        </View>
      ) : error ? (
        <View style={styles.centrado}>
          <Text style={styles.textoError}>{error}</Text>
          <PressableScale
            activeScale={1.06}
            style={styles.btnPrimario}
            onPress={cargarDetalle}
          >
            <Text style={styles.btnTexto}>Reintentar</Text>
          </PressableScale>
        </View>
      ) : producto ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Image source={{ uri: producto.imagen }} style={styles.imagen} />
          <View style={styles.info}>
            <Text style={styles.categoria}>
              {producto.categoria} · ID #{idNumerico}
            </Text>
            <Text style={styles.nombre}>{producto.nombre}</Text>
            <Text style={styles.precio}>
              ${Number(producto.precio).toLocaleString('es-AR')}
            </Text>
            <Text style={styles.stock}>
              Stock disponible: {producto.stock}
            </Text>
            <Text style={styles.descripcion}>{producto.descripcion}</Text>

            <PressableScale
              activeScale={1.08}
              style={[styles.btnPrimario, producto.stock <= 0 && styles.btnDeshabilitado]}
              onPress={handleAgregar}
            >
              <Text style={styles.btnTexto}>
                {producto.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
              </Text>
            </PressableScale>

            <PressableScale
              activeScale={1.04}
              style={styles.btnSecundario}
              onPress={() => router.push('/carrito')}
            >
              <Text style={styles.btnTexto}>Ver carrito ({cantidadTotal})</Text>
            </PressableScale>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#120f1d',
  },
  scroll: {
    padding: 16,
  },
  imagen: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    backgroundColor: '#231c38',
  },
  info: {
    marginTop: 16,
  },
  categoria: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  nombre: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  precio: {
    color: '#34d399',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
  },
  stock: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  descripcion: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  btnPrimario: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDeshabilitado: {
    backgroundColor: '#475569',
  },
  btnSecundario: {
    backgroundColor: '#2e254a',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  btnTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  textoSecundario: {
    color: '#cbd5e1',
    marginTop: 10,
  },
  textoError: {
    color: '#fca5a5',
    textAlign: 'center',
    fontSize: 15,
  },
});
