import React, { createContext, useContext, useState } from 'react';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [token, setToken] = useState(null);

  const loginAdmin = async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'No se pudo iniciar sesión');
    }
    setAdminUser(data.usuario);
    setToken(data.token);
    return data.usuario;
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    setToken(null);
  };

  const esAdmin = Boolean(adminUser && token && adminUser.rol === 'admin');

  return (
    <AuthContext.Provider value={{ adminUser, token, esAdmin, loginAdmin, logoutAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
