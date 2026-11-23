import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInRight, LinearTransition } from 'react-native-reanimated';
import { API_BASE_URL } from '../config/api';
import { useCarrito } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';
import PressableScale from '../components/PressableScale';

export default function CatalogoScreen() {
  const { cantidadTotal, total } = useCarrito();
  const { esAdmin, logoutAdmin } = useAuth();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (busqueda.trim()) params.append('q', busqueda.trim());
      if (categoriaActiva && categoriaActiva !== 'Todas') {
        params.append('categoria', categoriaActiva);
      }
      if (precioMin.trim()) params.append('minPrecio', precioMin.trim());
      if (precioMax.trim()) params.append('maxPrecio', precioMax.trim());

      const qs = params.toString();
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_BASE_URL}/productos${qs ? `?${qs}` : ''}`),
        fetch(`${API_BASE_URL}/categorias`),
      ]);

      if (!prodRes.ok) {
        throw new Error(`Error al cargar productos (${prodRes.status})`);
      }
      const prodData = await prodRes.json();
      setProductos(Array.isArray(prodData) ? prodData : []);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategorias(Array.isArray(catData) ? catData : []);
      }
    } catch (err) {
      setError(err.message || 'No se pudo conectar con el backend');
    } finally {
      setCargando(false);
    }
  }, [busqueda, categoriaActiva, precioMin, precioMax]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarDatos();
    }, 180);
    return () => clearTimeout(timer);
  }, [busqueda, categoriaActiva, precioMin, precioMax, cargarDatos]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaActiva('Todas');
    setPrecioMin('');
    setPrecioMax('');
  };

  const renderItem = ({ item, index }) => (
    <Animated.View
      entering={FadeInRight.delay(Math.min(index * 30, 220)).springify()}
      layout={LinearTransition.springify()}
      style={styles.card}
    >
      <Image source={{ uri: item.imagen }} style={styles.imagen} />
      <View style={styles.cardInfo}>
        <Text style={styles.categoria}>{item.categoria}</Text>
        <Text style={styles.nombre} numberOfLines={2}>{item.nombre}</Text>
        <Text style={styles.precio}>${Number(item.precio).toLocaleString('es-AR')}</Text>
        <Text style={styles.meta}>Stock: {item.stock}</Text>
        <View style={styles.acciones}>
          <PressableScale
            activeScale={1.05}
            style={styles.btnDetalle}
            onPress={() => router.push(`/detalle/${item.id}`)}
          >
            <Text style={styles.btnTexto}>Ver detalle</Text>
          </PressableScale>
        </View>
      </View>
    </Animated.View>
  );

  const listaCategorias = ['Todas', ...categorias];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        <View style={styles.filaSuperior}>
          <Text style={styles.resumenCarrito}>
            Carrito: {cantidadTotal} · ${Number(total).toLocaleString('es-AR')}
          </Text>
          <View style={styles.barraBotones}>
            {esAdmin ? (
              <>
                <PressableScale
                  activeScale={1.06}
                  style={styles.btnAdmin}
                  onPress={() => router.push('/admin-productos')}
                >
                  <Text style={styles.btnTexto}>Panel Admin</Text>
                </PressableScale>
                <PressableScale
                  activeScale={1.06}
                  style={styles.btnSecundarioTop}
                  onPress={logoutAdmin}
                >
                  <Text style={styles.btnTexto}>Salir</Text>
                </PressableScale>
              </>
            ) : (
              <PressableScale
                activeScale={1.06}
                style={styles.btnSecundarioTop}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.btnTexto}>Admin</Text>
              </PressableScale>
            )}

            <PressableScale
              activeScale={1.08}
              style={styles.btnCarrito}
              onPress={() => router.push('/carrito')}
            >
              <Text style={styles.btnTexto}>Carrito ({cantidadTotal})</Text>
            </PressableScale>
          </View>
        </View>

        <TextInput
          style={styles.buscador}
          placeholder="Buscar producto por nombre o descripción..."
          placeholderTextColor="#94a3b8"
          value={busqueda}
          onChangeText={setBusqueda}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {listaCategorias.map((cat) => {
            const activa = categoriaActiva.toLowerCase() === cat.toLowerCase();
            return (
              <PressableScale
                key={cat}
                activeScale={1.05}
                style={[styles.chip, activa && styles.chipActiva]}
                onPress={() => setCategoriaActiva(cat)}
              >
                <Text style={[styles.chipTexto, activa && styles.chipTextoActiva]}>
                  {cat}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        <View style={styles.filaPrecios}>
          <TextInput
            style={styles.inputPrecio}
            placeholder="Precio mín."
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={precioMin}
            onChangeText={setPrecioMin}
          />
          <TextInput
            style={styles.inputPrecio}
            placeholder="Precio máx."
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={precioMax}
            onChangeText={setPrecioMax}
          />
          <PressableScale
            activeScale={1.05}
            style={styles.btnLimpiar}
            onPress={limpiarFiltros}
          >
            <Text style={styles.btnTexto}>Limpiar</Text>
          </PressableScale>
        </View>
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#c084fc" />
          <Text style={styles.textoSecundario}>Cargando productos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centrado}>
          <Text style={styles.textoError}>{error}</Text>
          <PressableScale
            activeScale={1.06}
            style={styles.btnReintentar}
            onPress={cargarDatos}
          >
            <Text style={styles.btnTexto}>Reintentar</Text>
          </PressableScale>
        </View>
      ) : productos.length === 0 ? (
        <View style={styles.centrado}>
          <Text style={styles.textoSecundario}>
            No hay productos que coincidan con ese filtro.
          </Text>
          <PressableScale
            activeScale={1.06}
            style={styles.btnReintentar}
            onPress={limpiarFiltros}
          >
            <Text style={styles.btnTexto}>Ver todos</Text>
          </PressableScale>
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#120f1d',
  },
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1b162b',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2447',
  },
  filaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  resumenCarrito: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  barraBotones: {
    flexDirection: 'row',
    gap: 8,
  },
  btnCarrito: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnAdmin: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnSecundarioTop: {
    backgroundColor: '#334155',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buscador: {
    backgroundColor: '#120f1d',
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#3b2d63',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 8,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    backgroundColor: '#251e3d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b2d63',
  },
  chipActiva: {
    backgroundColor: '#7c3aed',
    borderColor: '#c084fc',
  },
  chipTexto: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextoActiva: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filaPrecios: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputPrecio: {
    flex: 1,
    backgroundColor: '#120f1d',
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#3b2d63',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
  },
  btnLimpiar: {
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  lista: {
    padding: 14,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1d1730',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2e254a',
    alignItems: 'center',
  },
  imagen: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: '#2a2242',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  categoria: {
    color: '#c084fc',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  nombre: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  precio: {
    color: '#34d399',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 3,
  },
  meta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  acciones: {
    flexDirection: 'row',
    marginTop: 8,
  },
  btnDetalle: {
    backgroundColor: '#3b2d63',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnReintentar: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  btnTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
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
    fontSize: 14,
    textAlign: 'center',
  },
  textoError: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
  },
});
