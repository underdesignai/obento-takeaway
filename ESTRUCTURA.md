# Estructura Completa — Obento Monitor Takeaway

> Monitor en tiempo real de pedidos de take away para el personal de cocina de **OBENTO Japanese Food** (La Ñora, Murcia). Funciona como una pantalla KDS (Kitchen Display System).

---

## DESCRIPCIÓN GENERAL

Aplicación Next.js 16 diseñada para mostrarse en una pantalla de cocina. Muestra los pedidos activos organizados por estado, temporizadores de cuenta atrás hasta la recogida, gestión de alta demanda/saturación y notificaciones al cliente. Corre en el puerto `3630`.

---

## PÁGINAS

### 1. LOGIN (`/login`) — `app/login/page.tsx`
- Tarjeta centrada con logo OBENTO (`/images/logo-obento.png`) + subtítulo "Monitor de Cocina & Take Away"
- Campo: Nombre de usuario (`admin`)
- Campo: Contraseña (`admin`)
- Botón Submit con estado de carga
- Mensaje de error visual si las credenciales fallan
- `POST /api/admin/auth/login` → cookie JWT (8h, httpOnly) → redirección a `/`

### 2. MONITOR PRINCIPAL (`/`) — `app/page.tsx`

#### Header
- **Logo** OBENTO Japanese Food con subtítulo "Monitor KDS / Cocina Take Away"
- **SaturacionWidget:** indicador de demanda
  - Punto verde = activo (normal)
  - Punto rojo = limitado (alta demanda)
  - Botón Activar/Desactivar → abre popup con duraciones: 1h, 2h, 3h, 4h, hasta cierre, hoy
- **Reloj en vivo** (actualización cada 1s con segundos)
- **Fecha en vivo** (día de la semana + número + mes)
- **Selector de idioma** (ES 🇪🇸 / EN 🇬🇧)
- **Indicador de conexión en vivo** (punto verde con glow)
- **Botón Logout**

#### Barra de estadísticas
- Icono de bolsa de compra + contadores por columna (Nuevos · Preparando · Listos)
- Navegación de fechas:
  - Chips rápidos: Ayer · Hoy · Mañana · Pasado
  - Flechas ◀ ▶ para navegar día a día
  - Vistas: semana / mes

#### Layout principal — 3 columnas
- **Nuevo** (Azul `#60a5fa`): Pedido pagado/recibido, pendiente de preparar
- **Preparando** (Naranja `#f97316`): En cocina / sushiman trabajando
- **Listo** (Verde `#4ade80`): Preparado, esperando recogida en tienda

#### Tarjeta de Pedido (PedidoCard)
- **ID del pedido:** `#OB-0001`
- **Nombre del cliente** y teléfono
- **Método de pago:** `✓ Pagado` (Stripe) | `💵 En mano` (pago en caja)
- **Hora de recogida**
- **Cuenta atrás en tiempo real (1s):**
  - Azul: tiempo suficiente (> 20 min)
  - Naranja: menos de 20 min
  - Ámbar: menos de 5 min
  - Rojo: retrasado (tiempo cumplido)
  - Verde: listo
- **Items del pedido:**
  - Thumbnail de imagen real (44×44px con border radius)
  - Cantidad (`2×`)
  - Nombre ES / EN
- **Comentarios especiales de cocina:** botón con animación `pulseBlink` dorado
- **Total en Euros**
- **Botones de acción:**
  - `🖨️ Imprimir ticket`
  - `👨‍🍳 Preparar` / `← Volver` / `🔔 Listo` / `✉️ Avisar` / `🙌 Entregado / 💵 Cobrar`

---

## BASE DE DATOS & SEEDING

- **Base de datos:** PostgreSQL `localhost:5432/obento_admin`
- **Modelos:**
  - `Pedido`: pedidos con cliente, items JSON, total, estado, recogida, notas, método de pago.
  - `MenuItem`: carta completa de Obento con nombres ES/EN, precio, concepto y foto.
  - `Configuracion`: ajustes clave-valor (saturación, IVA 10%, umbrales).
