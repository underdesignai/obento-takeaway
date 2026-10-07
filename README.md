# OBENTO Japanese Food — Monitor de Cocina (KDS Take Away)

> Sistema de pantalla de cocina KDS (Kitchen Display System) en tiempo real para pedidos Take Away del restaurante **OBENTO Japanese Food** (La Ñora, Murcia).

---

## 🚀 Inicio Rápido

### 1. Iniciar en desarrollo
```bash
npm run dev
```
La aplicación se abrirá en `http://localhost:3630`.

### 2. Iniciar en producción
```bash
npm run build
npm run start
```

---

## 🔑 Credenciales por Defecto

- **URL:** `http://localhost:3630/login`
- **Usuario:** `admin`
- **Contraseña:** `admin`
*(Configurables en el archivo `.env`)*

---

## 📋 Características Principales

1. **Pantalla KDS en Tiempo Real:**
   - 3 Columnas principales: **Nuevos** (azul), **Preparando** (naranja), **Listos** (verde).
   - Polling automático cada 5 segundos con actualizaciones optimistas instantáneas.
   - Cuenta atrás en vivo por pedido con aviso cromático según cercanía de la hora de recogida:
     - 🔵 Azul: Más de 20 minutos restantes.
     - 🟠 Naranja: Menos de 20 minutos restantes.
     - 🟡 Ámbar: Menos de 5 minutos restantes.
     - 🔴 Rojo: Pedido retrasado (tiempo vencido).
     - 🟢 Verde: Pedido completado / listo para entrega.

2. **Comandas Integrales y Claras:**
   - La pantalla muestra los pedidos completos con todos sus platos (sushi, entrantes, calientes, postres y bebidas) para que cocina prepare la comanda en su totalidad sin filtros confusos.

3. **Gestión de Alta Demanda (Saturación):**
   - Control de saturación para bloquear/limitar nuevos pedidos online en momentos de pico.
   - Activación manual con opciones de duración: 1h, 2h, 3h, 4h, hasta cierre o desactivar hoy.
   - Activación automática si hay más de 35 pedidos activos simultáneos.
   - Indicador visual luminoso (verde normal / rojo alta demanda).

4. **Impresión de Tickets de Cocina:**
   - Botón directo `🖨️` en cada tarjeta.
   - Genera recibo térmico optimizado (340px) con el logo de Obento, número `#OB-XXXX`, cliente, hora de recogida, desglose de platos, comentarios destacados, IVA 10% y datos fiscales.

5. **Notificación al Cliente por Email:**
   - Botón `✉️ Avisar` en la columna de pedidos listos para enviar email automático al cliente indicando que su pedido está listo para recoger en C. Amargura, 3 (La Ñora).

6. **Bilingüe (Español / Inglés):**
   - Selector en cabecera con persistencia en `localStorage`.

---

## 🛠️ Tecnologías

- **Framework:** Next.js 16 (App Router + Turbopack)
- **UI:** React 19 + Tailwind CSS v4 + Lucide Icons
- **Base de Datos:** PostgreSQL local (`localhost:5432/obento_admin`) con Prisma ORM 7
- **Autenticación:** JWT con cookies seguras httpOnly (8 horas de sesión)
- **Emails:** Nodemailer con plantillas responsive bilingües
