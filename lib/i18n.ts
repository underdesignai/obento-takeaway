export type Lang = "es" | "en";

export interface MonitorTranslations {
  title: string;
  pedidos: string;
  reservas: string;
  sinPedidos: string;
  sinReservas: string;
  todos: string;
  sushi: string;
  calientes: string;
  entrantes: string;
  nuevo: string;
  preparar: string;
  listo: string;
  entregado: string;
  cobrar: string;
  avisar: string;
  recogida: string;
  personas: string;
  verDetalle: string;
  enVivo: string;
  pedidosActivos: string;
  monitorFooter: string;
  detalles: string;
  comentarios: string;
  sinComentarios: string;
  productos: string;
  total: string;
  ayer: string;
  hoy: string;
  manana: string;
  pasado: string;
  semana: string;
  mes: string;
  imprimir: string;
  volver: string;
  pagado: string;
  pagoLocal: string;
  retrasado: string;
  quedan: string;
  cerrarSesion: string;

  // Saturación
  saturacionLabel: string;
  saturacionActivo: string;
  saturacionLimitado: string;
  saturacionHasta: string;
  saturacionLimitar: string;
  saturacionDesactivarHoy: string;
  saturacionReactivar: string;
  saturacionPopupTitle: string;
  saturacion1h: string;
  saturacion2h: string;
  saturacion3h: string;
  saturacion4h: string;
  saturacionCierre: string;
  saturacionCancelar: string;
  saturacionPor: string;
  saturacionAuto: string;
  activar: string;
  desactivar: string;
}

const es: { monitor: MonitorTranslations } = {
  monitor: {
    title: "Monitor de Cocina — Obento Japanese Food",
    pedidos: "Pedidos activos",
    reservas: "Reservas de hoy",
    sinPedidos: "Sin pedidos activos",
    sinReservas: "Sin reservas para hoy",
    todos: "Todos",
    sushi: "Sushi",
    calientes: "Calientes",
    entrantes: "Entrantes",
    nuevo: "Nuevos",
    preparar: "Preparar",
    listo: "Listos",
    entregado: "Entregado",
    cobrar: "Cobrar",
    avisar: "Avisar cliente",
    recogida: "Recogida",
    personas: "personas",
    verDetalle: "Ver detalle",
    enVivo: "En vivo",
    pedidosActivos: "Pedidos activos",
    monitorFooter: "OBENTO Japanese Food · La Ñora, Murcia · Monitor de Cocina KDS",
    detalles: "Detalles",
    comentarios: "Comentarios",
    sinComentarios: "Sin notas especiales",
    productos: "Productos",
    total: "Total",
    ayer: "Ayer",
    hoy: "Hoy",
    manana: "Mañana",
    pasado: "Pasado",
    semana: "Semana",
    mes: "Mes",
    imprimir: "Imprimir ticket",
    volver: "Volver",
    pagado: "✓ Pagado",
    pagoLocal: "💵 En mano",
    retrasado: "Retrasado",
    quedan: "Quedan",
    cerrarSesion: "Cerrar sesión",

    // Saturación
    saturacionLabel: "PEDIDOS ONLINE",
    saturacionActivo: "ACTIVOS",
    saturacionLimitado: "ALTA DEMANDA",
    saturacionHasta: "Hasta",
    saturacionLimitar: "Limitar",
    saturacionDesactivarHoy: "Desactivar hoy",
    saturacionReactivar: "Reactivar",
    saturacionPopupTitle: "¿Cuánto tiempo limitar?",
    saturacion1h: "1 hora",
    saturacion2h: "2 horas",
    saturacion3h: "3 horas",
    saturacion4h: "4 horas",
    saturacionCierre: "Hasta cierre",
    saturacionCancelar: "Cancelar",
    saturacionPor: "Activado por",
    saturacionAuto: "sistema automático",
    activar: "ACTIVAR",
    desactivar: "DESACTIVAR",
  },
};

const en: { monitor: MonitorTranslations } = {
  monitor: {
    title: "Kitchen Monitor — Obento Japanese Food",
    pedidos: "Active orders",
    reservas: "Today's reservations",
    sinPedidos: "No active orders",
    sinReservas: "No reservations today",
    todos: "All",
    sushi: "Sushi",
    calientes: "Hot Dishes",
    entrantes: "Starters",
    nuevo: "New",
    preparar: "Prepare",
    listo: "Ready",
    entregado: "Delivered",
    cobrar: "Collect",
    avisar: "Notify customer",
    recogida: "Pick-up",
    personas: "guests",
    verDetalle: "View detail",
    enVivo: "Live",
    pedidosActivos: "Active orders",
    monitorFooter: "OBENTO Japanese Food · La Ñora, Murcia · Operations Monitor",
    detalles: "Details",
    comentarios: "Comments",
    sinComentarios: "No special notes",
    productos: "Products",
    total: "Total",
    ayer: "Yesterday",
    hoy: "Today",
    manana: "Tomorrow",
    pasado: "Day after",
    semana: "This week",
    mes: "This month",
    imprimir: "Print ticket",
    volver: "Back",
    pagado: "✓ Paid",
    pagoLocal: "💵 Pay on pickup",
    retrasado: "Delayed",
    quedan: "Left",
    cerrarSesion: "Logout",

    // Saturación
    saturacionLabel: "ONLINE ORDERS",
    saturacionActivo: "ACTIVE",
    saturacionLimitado: "HIGH DEMAND",
    saturacionHasta: "Until",
    saturacionLimitar: "Limit",
    saturacionDesactivarHoy: "Disable today",
    saturacionReactivar: "Reactivate",
    saturacionPopupTitle: "How long to limit?",
    saturacion1h: "1 hour",
    saturacion2h: "2 hours",
    saturacion3h: "3 hours",
    saturacion4h: "4 hours",
    saturacionCierre: "Until close",
    saturacionCancelar: "Cancel",
    saturacionPor: "Activated by",
    saturacionAuto: "automatic system",
    activar: "ACTIVATE",
    desactivar: "DEACTIVATE",
  },
};

const t = { es, en };
export default t;
