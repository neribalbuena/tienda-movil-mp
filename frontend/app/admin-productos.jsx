import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import PressableScale from '../components/PressableScale';

export default function AdminProductosScreen() {
  const { adminUser, token, esAdmin } = useAuth();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [imagen, setImagen] = useState('');
  const [categoria, setCategoria] = useState('');
  const [stock, setStock] = useState('');

  const limpiarFormulario = () => {
    setEditandoId(null);
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setImagen('');
    setCategoria('');
    setStock('');
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_BASE_URL}/productos`),
        fetch(`${API_BASE_URL}/categorias`),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      if (prodRes.ok && Array.isArray(prodData)) {
        setProductos(prodData);
      }
      if (catRes.ok && Array.isArray(catData)) {
        setCategorias(catData);
        if (!categoria && catData.length > 0) {
          setCategoria(catData[0]);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar los datos del panel');
    } finally {
      setCargando(false);
    }
  }, [categoria]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  if (!esAdmin) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <View style={styles.centrado}>
          <Text style={styles.textoAviso}>
            Iniciá sesión como administrador para crear categorías y gestionar productos.
          </Text>
          <PressableScale
            activeScale={1.06}
            style={styles.btnPrimario}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.btnTexto}>Ir a login de admin</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  const handleCrearCategoria = async () => {
    if (!nuevaCategoria.trim()) {
      Alert.alert('Categoría vacía', 'Escribí el nombre de la nueva categoría.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/categorias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre: nuevaCategoria.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear la categoría');
      }
      const actualizada = Array.isArray(data.categorias) ? data.categorias : categorias;
      setCategorias(actualizada);
      setCategoria(nuevaCategoria.trim());
      setNuevaCategoria('');
      Alert.alert('Categoría creada', 'Ya aparece en los filtros del catálogo.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleGuardarProducto = async () => {
    if (!nombre.trim() || !descripcion.trim() || !precio.trim() || !stock.trim()) {
      Alert.alert('Datos incompletos', 'Completá nombre, descripción, precio y stock.');
      return;
    }

    setGuardando(true);
    try {
      const url = editandoId
        ? `${API_BASE_URL}/productos/${editandoId}`
        : `${API_BASE_URL}/productos`;
      const method = editandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          precio: Number(precio),
          imagen: imagen.trim(),
          categoria: (categoria || 'General').trim(),
          stock: Number(stock),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el producto');
      }

      Alert.alert(
        'Listo',
        editandoId ? 'Producto actualizado.' : 'Producto agregado al catálogo.'
      );
      limpiarFormulario();
      cargarDatos();
    } catch (err) {
      Alert.alert('Error', err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (prod) => {
    setEditandoId(prod.id);
    setNombre(prod.nombre);
    setDescripcion(prod.descripcion);
    setPrecio(String(prod.precio));
    setImagen(prod.imagen || '');
    setCategoria(prod.categoria || '');
    setStock(String(prod.stock));
  };

  const handleEliminar = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/productos/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar');
      }
      if (editandoId === id) {
        limpiarFormulario();
      }
      cargarDatos();
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo eliminar');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.titulo}>Panel del Administrador</Text>
        <Text style={styles.subtitulo}>Sesión activa: {adminUser?.nombre}</Text>

        {/* Crear nueva categoría */}
        <Text style={styles.seccionTitulo}>Nueva categoría para el catálogo</Text>
        <View style={styles.filaCat}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Ej. Gaming, Celulares, Ofertas"
            placeholderTextColor="#94a3b8"
            value={nuevaCategoria}
            onChangeText={setNuevaCategoria}
          />
          <PressableScale
            activeScale={1.05}
            style={styles.btnCat}
            onPress={handleCrearCategoria}
          >
            <Text style={styles.btnTexto}>Crear</Text>
          </PressableScale>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {categorias.map((cat) => {
            const seleccionada = categoria.toLowerCase() === cat.toLowerCase();
            return (
              <PressableScale
                key={cat}
                activeScale={1.05}
                style={[styles.chip, seleccionada && styles.chipActiva]}
                onPress={() => setCategoria(cat)}
              >
                <Text style={styles.chipTexto}>{cat}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* Formulario de producto */}
        <Text style={styles.seccionTitulo}>
          {editandoId ? `Editando producto #${editandoId}` : 'Subir nuevo producto'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nombre del producto"
          placeholderTextColor="#94a3b8"
          value={nombre}
          onChangeText={setNombre}
        />
        <TextInput
          style={styles.input}
          placeholder="Descripción"
          placeholderTextColor="#94a3b8"
          value={descripcion}
          onChangeText={setDescripcion}
        />
        <TextInput
          style={styles.input}
          placeholder="Precio en pesos (ej. 55000)"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={precio}
          onChangeText={setPrecio}
        />
        <TextInput
          style={styles.input}
          placeholder="Categoría (tocá una arriba o escribí una nueva)"
          placeholderTextColor="#94a3b8"
          value={categoria}
          onChangeText={setCategoria}
        />
        <TextInput
          style={styles.input}
          placeholder="Stock disponible (ej. 10)"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={stock}
          onChangeText={setStock}
        />
        <TextInput
          style={styles.input}
          placeholder="URL de imagen (opcional)"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          value={imagen}
          onChangeText={setImagen}
        />

        {guardando ? (
          <ActivityIndicator size="large" color="#c084fc" style={{ marginVertical: 12 }} />
        ) : (
          <View style={styles.filaForm}>
            <PressableScale
              activeScale={1.05}
              style={styles.btnPrimario}
              onPress={handleGuardarProducto}
            >
              <Text style={styles.btnTexto}>
                {editandoId ? 'Guardar cambios' : 'Subir producto'}
              </Text>
            </PressableScale>
            {editandoId && (
              <PressableScale
                activeScale={1.05}
                style={styles.btnCancelar}
                onPress={limpiarFormulario}
              >
                <Text style={styles.btnTexto}>Cancelar</Text>
              </PressableScale>
            )}
          </View>
        )}

        <Text style={styles.seccionTitulo}>Productos cargados ({productos.length})</Text>

        {cargando ? (
          <ActivityIndicator size="large" color="#c084fc" />
        ) : (
          productos.map((prod) => (
            <Animated.View
              key={prod.id}
              entering={FadeInRight.springify()}
              exiting={FadeOutLeft.duration(120)}
              layout={LinearTransition.springify()}
              style={styles.itemCard}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.itemNombre}>{prod.nombre}</Text>
                <Text style={styles.itemMeta}>
                  ${Number(prod.precio).toLocaleString('es-AR')} · Stock: {prod.stock} · {prod.categoria}
                </Text>
              </View>
              <View style={styles.itemAcciones}>
                <PressableScale
                  activeScale={1.06}
                  style={styles.btnEditar}
                  onPress={() => iniciarEdicion(prod)}
                >
                  <Text style={styles.btnTexto}>Editar</Text>
                </PressableScale>
                <PressableScale
                  activeScale={1.06}
                  style={styles.btnEliminar}
                  onPress={() => handleEliminar(prod.id)}
                >
                  <Text style={styles.btnTexto}>Baja</Text>
                </PressableScale>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
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
  titulo: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitulo: {
    color: '#c084fc',
    fontSize: 13,
    marginTop: 4,
  },
  seccionTitulo: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 10,
  },
  filaCat: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  btnCat: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 10,
  },
  chip: {
    backgroundColor: '#251e3d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3b2d63',
  },
  chipActiva: {
    backgroundColor: '#7c3aed',
    borderColor: '#c084fc',
  },
  chipTexto: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#1d1730',
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#3b2d63',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    fontSize: 14,
  },
  filaForm: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btnPrimario: {
    flex: 1,
    backgroundColor: '#7c3aed',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancelar: {
    backgroundColor: '#475569',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1d1730',
    borderWidth: 1,
    borderColor: '#2e254a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  itemNombre: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 15,
  },
  itemMeta: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 3,
  },
  itemAcciones: {
    flexDirection: 'row',
    gap: 8,
  },
  btnEditar: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnEliminar: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
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
  textoAviso: {
    color: '#f8fafc',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 14,
  },
});
