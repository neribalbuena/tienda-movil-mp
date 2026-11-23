import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import PressableScale from '../components/PressableScale';

export default function AdminLoginScreen() {
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('neri@tienda.com');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos incompletos', 'Ingresá tu correo y contraseña de admin.');
      return;
    }
    setEnviando(true);
    try {
      await loginAdmin(email.trim(), password);
      router.replace('/admin-productos');
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.titulo}>Acceso Administrador</Text>
        <Text style={styles.subtitulo}>
          Los clientes no necesitan cuenta para comprar. Este acceso es solo para gestionar productos y categorías.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Correo de administrador"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {enviando ? (
          <ActivityIndicator size="large" color="#c084fc" style={{ marginVertical: 14 }} />
        ) : (
          <PressableScale
            activeScale={1.05}
            style={styles.btnPrimario}
            onPress={handleLogin}
          >
            <Text style={styles.btnTexto}>Entrar al Panel Admin</Text>
          </PressableScale>
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
    padding: 18,
  },
  titulo: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitulo: {
    color: '#cbd5e1',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#1d1730',
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#3b2d63',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  btnPrimario: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  btnTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
