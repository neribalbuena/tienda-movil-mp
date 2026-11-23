const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

const dbDir = path.join(__dirname, '..', 'database');
const productosPath = path.join(dbDir, 'productos.json');
const categoriasPath = path.join(dbDir, 'categorias.json');
const usuariosPath = path.join(dbDir, 'usuarios.json');
const ordenesPath = path.join(dbDir, 'ordenes.json');

function leerJson(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function guardarJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

const sesiones = new Map();

function autenticarAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token || !sesiones.has(token)) {
    return res.status(401).json({ error: 'Iniciá sesión como administrador' });
  }
  const userId = sesiones.get(token);
  const usuarios = leerJson(usuariosPath, []);
  const usuario = usuarios.find((u) => u.id === userId);
  if (!usuario || usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido al administrador' });
  }
  req.usuario = usuario;
  next();
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    mpConfigured: Boolean(process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN.trim()),
  });
});

// Login del admin
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Ingresá correo y contraseña' });
  }
  const emailNormalizado = String(email).trim().toLowerCase();
  const usuarios = leerJson(usuariosPath, []);
  const usuario = usuarios.find(
    (u) => u.email.toLowerCase() === emailNormalizado && u.passwordHash === hashPassword(password)
  );
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, usuario.id);

  res.json({
    ok: true,
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol || 'admin',
    },
  });
});

// Categorías públicas (creadas desde el panel admin)
app.get('/categorias', (req, res) => {
  const categorias = leerJson(categoriasPath, []);
  const productos = leerJson(productosPath, []);
  const combinadas = Array.from(
    new Set([
      ...categorias.map((c) => String(c).trim()).filter(Boolean),
      ...productos.map((p) => String(p.categoria || '').trim()).filter(Boolean),
    ])
  );
  res.json(combinadas);
});

// Crear nueva categoría (solo admin)
app.post('/categorias', autenticarAdmin, (req, res) => {
  const { nombre } = req.body || {};
  const limpia = String(nombre || '').trim();
  if (!limpia) {
    return res.status(400).json({ error: 'Escribí un nombre de categoría válido' });
  }
  const categorias = leerJson(categoriasPath, []);
  const yaExiste = categorias.some((c) => String(c).toLowerCase() === limpia.toLowerCase());
  if (!yaExiste) {
    categorias.push(limpia);
    guardarJson(categoriasPath, categorias);
  }
  res.status(201).json({ ok: true, categorias });
});

// Catálogo público con búsqueda, categoría y rango de precios
app.get('/productos', (req, res) => {
  let productos = leerJson(productosPath, []);
  const q = String(req.query.q || '').trim().toLowerCase();
  const categoria = String(req.query.categoria || '').trim();
  const minPrecio = req.query.minPrecio !== undefined && String(req.query.minPrecio).trim() !== ''
    ? Number(req.query.minPrecio)
    : null;
  const maxPrecio = req.query.maxPrecio !== undefined && String(req.query.maxPrecio).trim() !== ''
    ? Number(req.query.maxPrecio)
    : null;

  if (q) {
    productos = productos.filter(
      (p) =>
        String(p.nombre || '').toLowerCase().includes(q) ||
        String(p.descripcion || '').toLowerCase().includes(q) ||
        String(p.categoria || '').toLowerCase().includes(q)
    );
  }

  if (categoria && categoria.toLowerCase() !== 'todas') {
    productos = productos.filter(
      (p) => String(p.categoria || '').toLowerCase() === categoria.toLowerCase()
    );
  }

  if (minPrecio !== null && Number.isFinite(minPrecio)) {
    productos = productos.filter((p) => Number(p.precio) >= minPrecio);
  }

  if (maxPrecio !== null && Number.isFinite(maxPrecio)) {
    productos = productos.filter((p) => Number(p.precio) <= maxPrecio);
  }

  res.json(productos);
});

app.get('/productos/:id', (req, res) => {
  const id = Number(req.params.id);
  const productos = leerJson(productosPath, []);
  const producto = productos.find((item) => item.id === id);
  if (!producto) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.json(producto);
});

// Crear producto (solo admin)
app.post('/productos', autenticarAdmin, (req, res) => {
  const { nombre, descripcion, precio, imagen, categoria, stock } = req.body || {};
  const precioNum = Number(precio);
  const stockNum = Number(stock);

  if (!nombre || !String(nombre).trim() || !descripcion || !String(descripcion).trim()) {
    return res.status(400).json({ error: 'Nombre y descripción son obligatorios' });
  }
  if (!Number.isFinite(precioNum) || precioNum <= 0) {
    return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
  }
  if (!Number.isFinite(stockNum) || stockNum < 0) {
    return res.status(400).json({ error: 'El stock debe ser 0 o mayor' });
  }

  const categoriaLimpia = categoria && String(categoria).trim() ? String(categoria).trim() : 'General';
  const categorias = leerJson(categoriasPath, []);
  if (!categorias.some((c) => String(c).toLowerCase() === categoriaLimpia.toLowerCase())) {
    categorias.push(categoriaLimpia);
    guardarJson(categoriasPath, categorias);
  }

  const productos = leerJson(productosPath, []);
  const nuevoId = productos.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
  const urlImagen =
    imagen && String(imagen).trim().length > 0
      ? String(imagen).trim()
      : `https://picsum.photos/seed/prod${nuevoId}/600/600`;

  const nuevoProducto = {
    id: nuevoId,
    nombre: String(nombre).trim(),
    descripcion: String(descripcion).trim(),
    precio: precioNum,
    imagen: urlImagen,
    categoria: categoriaLimpia,
    stock: Math.floor(stockNum),
  };

  productos.push(nuevoProducto);
  guardarJson(productosPath, productos);

  res.status(201).json(nuevoProducto);
});

// Editar producto (solo admin)
app.put('/productos/:id', autenticarAdmin, (req, res) => {
  const id = Number(req.params.id);
  const productos = leerJson(productosPath, []);
  const idx = productos.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  const actual = productos[idx];
  const { nombre, descripcion, precio, imagen, categoria, stock } = req.body || {};
  const precioNum = precio !== undefined ? Number(precio) : actual.precio;
  const stockNum = stock !== undefined ? Number(stock) : actual.stock;

  if (!Number.isFinite(precioNum) || precioNum <= 0) {
    return res.status(400).json({ error: 'Precio inválido' });
  }
  if (!Number.isFinite(stockNum) || stockNum < 0) {
    return res.status(400).json({ error: 'Stock inválido' });
  }

  const categoriaLimpia =
    categoria !== undefined && String(categoria).trim() ? String(categoria).trim() : actual.categoria;
  const categorias = leerJson(categoriasPath, []);
  if (!categorias.some((c) => String(c).toLowerCase() === categoriaLimpia.toLowerCase())) {
    categorias.push(categoriaLimpia);
    guardarJson(categoriasPath, categorias);
  }

  const actualizado = {
    ...actual,
    nombre: nombre !== undefined && String(nombre).trim() ? String(nombre).trim() : actual.nombre,
    descripcion:
      descripcion !== undefined && String(descripcion).trim()
        ? String(descripcion).trim()
        : actual.descripcion,
    precio: precioNum,
    imagen: imagen !== undefined && String(imagen).trim() ? String(imagen).trim() : actual.imagen,
    categoria: categoriaLimpia,
    stock: Math.floor(stockNum),
  };

  productos[idx] = actualizado;
  guardarJson(productosPath, productos);

  res.json(actualizado);
});

// Dar de baja producto (solo admin)
app.delete('/productos/:id', autenticarAdmin, (req, res) => {
  const id = Number(req.params.id);
  const productos = leerJson(productosPath, []);
  const idx = productos.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  productos.splice(idx, 1);
  guardarJson(productosPath, productos);

  res.json({ ok: true, eliminadoId: id });
});

// Checkout público (sin registro previo) con datos de envío + Mercado Pago
app.post('/checkout', async (req, res) => {
  try {
    const { comprador, items } = req.body || {};
    const nombreApellido = String(comprador?.nombreApellido || '').trim();
    const email = String(comprador?.email || '').trim();
    const direccion = String(comprador?.direccion || '').trim();
    const localidad = String(comprador?.localidad || '').trim();
    const codigoPostal = String(comprador?.codigoPostal || '').trim();

    if (!nombreApellido || !email || !direccion || !localidad || !codigoPostal) {
      return res.status(400).json({
        error: 'Completá nombre y apellido, Gmail/correo, dirección, localidad y código postal',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const productos = leerJson(productosPath, []);
    let totalCalculado = 0;
    const itemsValidados = [];

    for (const item of items) {
      const prod = productos.find((p) => p.id === Number(item.id));
      const cantidad = Math.floor(Number(item.cantidad || 1));
      if (!prod || cantidad <= 0) {
        return res.status(400).json({ error: 'Ítem inválido en el carrito' });
      }
      if (prod.stock < cantidad) {
        return res.status(400).json({
          error: `Stock insuficiente para "${prod.nombre}" (disponible: ${prod.stock})`,
        });
      }
      totalCalculado += Number(prod.precio) * cantidad;
      itemsValidados.push({
        id: prod.id,
        nombre: prod.nombre,
        precio: Number(prod.precio),
        cantidad,
      });
    }

    const mpToken = (process.env.MP_ACCESS_TOKEN || '').trim();
    if (!mpToken) {
      return res.status(503).json({
        error: 'Falta configurar MP_ACCESS_TOKEN en backend/.env para cobrar con tu cuenta de Mercado Pago',
      });
    }

    const numeroOrden = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const prefBody = {
      items: itemsValidados.map((it) => ({
        title: it.nombre,
        quantity: it.cantidad,
        unit_price: Number(it.precio),
        currency_id: 'ARS',
      })),
      payer: {
        name: nombreApellido,
        email,
        address: {
          street_name: direccion,
          zip_code: codigoPostal,
        },
      },
      external_reference: numeroOrden,
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpToken}`,
      },
      body: JSON.stringify(prefBody),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      return res.status(502).json({
        error: mpData.message || 'Mercado Pago rechazó la creación de la preferencia de pago',
      });
    }

    const checkoutUrl = mpData.init_point || mpData.sandbox_init_point || null;
    if (!checkoutUrl) {
      return res.status(502).json({
        error: 'Mercado Pago no devolvió un enlace de pago válido',
      });
    }

    for (const valItem of itemsValidados) {
      const idx = productos.findIndex((p) => p.id === valItem.id);
      if (idx >= 0) {
        productos[idx].stock = Math.max(0, Number(productos[idx].stock) - valItem.cantidad);
      }
    }
    guardarJson(productosPath, productos);

    const orden = {
      numeroOrden,
      total: totalCalculado,
      comprador: {
        nombreApellido,
        email,
        direccion,
        localidad,
        codigoPostal,
      },
      items: itemsValidados,
      modoPago: 'mercadopago',
      mpPreferenceId: mpData.id || null,
      mpCheckoutUrl: checkoutUrl,
      fecha: new Date().toISOString(),
    };

    const ordenes = leerJson(ordenesPath, []);
    ordenes.push(orden);
    guardarJson(ordenesPath, ordenes);

    res.status(201).json({
      ok: true,
      ...orden,
      checkoutUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno al generar el pago con Mercado Pago' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT} y en red local puerto ${PORT}`);
});
