import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Linking,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  LinearTransition,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { API_BASE_URL } from '../config/api';
import { useCarrito } from '../context/CarritoContext';
import PressableScale from '../components/PressableScale';

export default function CarritoScreen() {
  const { items, quitar, vaciar, total } = useCarrito();

  const [nombreApellido, setNombreApellido] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [pagando, setPagando] = useState(false);
  const [comprobante, setComprobante] = useState(null);

  const handleComprar = async () => {
    if (items.length === 0) {
      Alert.alert('Carrito vacío', 'Agregá al menos un producto antes de comprar.');
      return;
    }
    if (
      !nombreApellido.trim() ||
      !email.trim() ||
      !direccion.trim() ||
      !localidad.trim() ||
      !codigoPostal.trim()
    ) {
      Alert.alert(
        'Datos incompletos',
        'Completá nombre y apellido, Gmail/correo, dirección, localidad y código postal.'
      );
      return;
    }

    setPagando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comprador: {
            nombreApellido: nombreApellido.trim(),
            email: email.trim(),
            direccion: direccion.trim(),
            localidad: localidad.trim(),
            codigoPostal: codigoPostal.trim(),
          },
          items: items.map((i) => ({ id: i.id, cantidad: i.cantidad })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo generar el pago con Mercado Pago');
      }

      setComprobante(data);
      vaciar();

      if (data.checkoutUrl) {
        await Linking.openURL(data.checkoutUrl);
      }
    } catch (err) {
      Alert.alert('Error al comprar', err.message || 'Error de conexión con el servidor');
    } finally {
      setPagando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.titulo}>Tu carrito</Text>

        {items.length === 0 ? (
          <View style={styles.vacioBox}>
            <Text style={styles.vacioTexto}>Tu carrito está vacío.</Text>
            <PressableScale
              activeScale={1.06}
              style={styles.btnSecundario}
              onPress={() => router.push('/')}
            >
              <Text style={styles.btnTexto}>Ir al catálogo</Text>
            </PressableScale>
          </View>
        ) : (
          <>
            {items.map((item) => (
              <Animated.View
                key={item.id}
                entering={FadeInRight.springify()}
                exiting={FadeOutLeft.duration(120)}
                layout={LinearTransition.springify()}
                style={styles.itemCard}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemNombre}>{item.nombre}</Text>
                  <Text style={styles.itemDetalle}>
                    Cantidad: {item.cantidad} · Subtotal: $
                    {(Number(item.precio) * Number(item.cantidad)).toLocaleString('es-AR')}
                  </Text>
                </View>
                <PressableScale
                  activeScale={1.08}
                  style={styles.btnQuitar}
                  onPress={() => quitar(item.id)}
                >
                  <Text style={styles.btnTexto}>Quitar</Text>
                </PressableScale>
              </Animated.View>
            ))}

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValor}>
                ${Number(total).toLocaleString('es-AR')}
              </Text>
            </View>

            <Text style={styles.seccionTitulo}>
              Datos para la compra (sin registro previo)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre y apellido"
              placeholderTextColor="#94a3b8"
              value={nombreApellido}
              onChangeText={setNombreApellido}
            />
            <TextInput
              style={styles.input}
              placeholder="Gmail o correo electrónico"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Dirección (calle y altura)"
              placeholderTextColor="#94a3b8"
              value={direccion}
              onChangeText={setDireccion}
            />
            <TextInput
              style={styles.input}
              placeholder="Localidad"
              placeholderTextColor="#94a3b8"
              value={localidad}
              onChangeText={setLocalidad}
            />
            <TextInput
              style={styles.input}
              placeholder="Código postal"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={codigoPostal}
              onChangeText={setCodigoPostal}
            />

            {pagando ? (
              <View style={styles.pagandoBox}>
                <ActivityIndicator size="large" color="#c084fc" />
                <Text style={styles.textoSecundario}>
                  Generando orden en Mercado Pago y descontando stock...
                </Text>
              </View>
            ) : (
              <PressableScale
                activeScale={1.06}
                style={styles.btnPagar}
                onPress={handleComprar}
              >
                <Text style={styles.btnTexto}>Comprar con Mercado Pago</Text>
              </PressableScale>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={Boolean(comprobante)}
        transparent
        animationType="fade"
        onRequestClose={() => setComprobante(null)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Orden creada en Mercado Pago</Text>
            {comprobante && (
              <>
                <Text style={styles.modalTexto}>
                  Orden N°: {comprobante.numeroOrden}
                </Text>
                <Text style={styles.modalTexto}>
                  Total: ${Number(comprobante.total).toLocaleString('es-AR')}
                </Text>
                {comprobante.checkoutUrl && (
                  <PressableScale
                    activeScale={1.05}
                    style={styles.btnLink}
                    onPress={() => Linking.openURL(comprobante.checkoutUrl)}
                  >
                    <Text style={styles.btnTexto}>Abrir enlace de Mercado Pago</Text>
                  </PressableScale>
                )}
              </>
            )}
            <PressableScale
              activeScale={1.06}
              style={styles.btnPagar}
              onPress={() => {
                setComprobante(null);
                router.push('/');
              }}
            >
              <Text style={styles.btnTexto}>Aceptar</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
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
    marginBottom: 14,
  },
  vacioBox: {
    backgroundColor: '#1d1730',
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  vacioTexto: {
    color: '#cbd5e1',
    fontSize: 15,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1d1730',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2e254a',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 10,
  },
  itemNombre: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 15,
  },
  itemDetalle: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 4,
  },
  btnQuitar: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1b162b',
    padding: 14,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 18,
  },
  totalLabel: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  totalValor: {
    color: '#34d399',
    fontSize: 20,
    fontWeight: '800',
  },
  seccionTitulo: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
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
  pagandoBox: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  textoSecundario: {
    color: '#cbd5e1',
    marginTop: 8,
    textAlign: 'center',
  },
  btnPagar: {
    backgroundColor: '#009ee3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnLink: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  btnSecundario: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 14,
  },
  btnTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1d1730',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#009ee3',
  },
  modalTitulo: {
    color: '#38bdf8',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalTexto: {
    color: '#f8fafc',
    fontSize: 15,
    marginBottom: 6,
  },
});
