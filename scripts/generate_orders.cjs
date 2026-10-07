const { Client } = require("pg");

const DISH_CATALOG = [
  // Entrantes
  { id: "e1", name: "Edamame", cat: "entrantes", price: 4.50 },
  { id: "e2", name: "Gyozas de pollo (4 und)", cat: "entrantes", price: 4.50 },
  { id: "e3", name: "Gyozas de verdura (4 und)", cat: "entrantes", price: 4.50 },
  { id: "e4", name: "Gyozas de langostino (4 und)", cat: "entrantes", price: 5.50 },
  { id: "e5", name: "Samosas (3 und)", cat: "entrantes", price: 6.50 },
  { id: "e6", name: "Takoyaki (3 und)", cat: "entrantes", price: 4.50 },
  { id: "e7", name: "Ensalada wakame", cat: "entrantes", price: 6.90 },
  { id: "e8", name: "Ebi Fry (3 und)", cat: "entrantes", price: 5.50 },

  // Nigiris
  { id: "n1", name: "Nigiri de atún", cat: "sushi", price: 6.20 },
  { id: "n2", name: "Nigiri de atún con foie", cat: "sushi", price: 7.80 },
  { id: "n3", name: "Nigiri de salmón", cat: "sushi", price: 5.50 },
  { id: "n4", name: "Nigiri de salmón flambeado", cat: "sushi", price: 6.20 },
  { id: "n5", name: "Nigiri de chutoro", cat: "sushi", price: 10.50 },
  { id: "n6", name: "Nigiri de vieira", cat: "sushi", price: 9.90 },
  { id: "n7", name: "Nigiri de anguila", cat: "sushi", price: 7.20 },
  { id: "n8", name: "Nigiri de hamachi", cat: "sushi", price: 8.90 },
  { id: "n9", name: "Nigiri atún toro con trufa", cat: "sushi", price: 10.90 },

  // Uramakis
  { id: "u1", name: "Jōnetsu Tuna (8 uds)", cat: "sushi", price: 14.20 },
  { id: "u2", name: "Sakura Roll (8 uds)", cat: "sushi", price: 12.50 },
  { id: "u3", name: "Chicken roll (8 uds)", cat: "sushi", price: 11.50 },
  { id: "u4", name: "Aurora Roll (Vegetal)", cat: "sushi", price: 10.50 },
  { id: "u5", name: "Black Dragon (8 uds)", cat: "sushi", price: 15.20 },
  { id: "u6", name: "Shinigami Crab (8 uds)", cat: "sushi", price: 11.50 },
  { id: "u7", name: "Rollo Tartar de salmón", cat: "sushi", price: 11.30 },
  { id: "u8", name: "Rollo Tartar de atún", cat: "sushi", price: 13.80 },
  { id: "u9", name: "Rollo Tartar de lubina", cat: "sushi", price: 11.90 },

  // Futomakis & Makis
  { id: "f1", name: "Futomaki de salmón (8 und)", cat: "sushi", price: 9.90 },
  { id: "f2", name: "Futomaki de gamba trufada (12 und)", cat: "sushi", price: 12.20 },
  { id: "f3", name: "Futomaki karaage (12 und)", cat: "sushi", price: 10.50 },
  { id: "m1", name: "Maki de salmón (8 und)", cat: "sushi", price: 6.20 },
  { id: "m2", name: "Maki de chutoro", cat: "sushi", price: 10.50 },
  { id: "m3", name: "Maki de atún", cat: "sushi", price: 7.20 },
  { id: "m4", name: "Maki de aguacate", cat: "sushi", price: 5.20 },

  // Calientes
  { id: "c3", name: "Arroz con ternera", cat: "calientes", price: 12.50 },
  { id: "c4", name: "Arroz con pollo", cat: "calientes", price: 11.20 },
  { id: "c5", name: "Yakisoba de langostino", cat: "calientes", price: 13.20 },
  { id: "c6", name: "Yakisoba de ternera", cat: "calientes", price: 12.90 },
  { id: "c7", name: "Yakisoba de pollo", cat: "calientes", price: 11.90 },

  // Postres
  { id: "p1", name: "Mochi de tarta de queso", cat: "postres", price: 4.50 },
  { id: "p2", name: "Mochi de mango", cat: "postres", price: 4.50 },
  { id: "p3", name: "Mochi de chocolate", cat: "postres", price: 4.50 },

  // Bebidas
  { id: "b1", name: "Coca-Cola Zero", cat: "bebidas", price: 2.20 },
  { id: "b6", name: "Cerveza Asahi", cat: "bebidas", price: 3.50 },
  { id: "b7", name: "Cerveza Kirin", cat: "bebidas", price: 3.50 },
];

const NOMBRES = [
  "Alejandro García", "María López", "Carlos Martínez", "Lucía Fernández",
  "Javier Sánchez", "Paula Gómez", "David Navarro", "Sara Romero",
  "Daniel Torres", "Elena Ruiz", "Marcos Gil", "Carmen Serrano",
  "Adrián Morales", "Marta Ortiz", "Hugo Castro", "Alba Molina",
  "Lucas Delgado", "Sofía Rubio", "Mateo Marín", "Laura Medina",
  "Álvaro Castillo", "Irene Ramos", "Pablo Cano", "Claudia Reyes",
  "Diego Cruz", "Valeria Prieto", "Gonzalo Flores", "Andrea Vega",
  "Manuel Fuentes", "Natalia Cabrera", "Jorge Campos", "Silvia Carrillo",
  "Iván Peña", "Rocío Calvo", "Raúl León", "Julia Gallego",
  "Rubén Márquez", "Nerea Vidal", "Héctor Nieto", "Marina Santana"
];

const NOTAS_POSIBLES = [
  null,
  null,
  null,
  "Wasabi y jengibre extra por favor",
  "Sin sésamo en el sushi",
  "Palillos dobles y mucha salsa de soja",
  "Fideos de arroz (sin gluten) si es posible",
  "Sin cebollino ni cebolla",
  "Alérgico al marisco, preparar con cuidado",
  "Llamar al llegar si es a domicilio",
  "Traerá cambio de 50€ para pagar en caja",
  "Por favor bien caliente",
  "Picante moderado en los platos calientes"
];

const CLIENT_EMAILS = [
  "cliente.murcia@gmail.com",
  "pedidos.takeaway@hotmail.com",
  "usuario.obento@yahoo.es",
  "sushi.lover@outlook.com",
  "foodie.nora@gmail.com",
  null
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/obento_db";
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Connected to obento_db. Preparing 3 months of orders (40 orders/day)...");

  // Determine current starting order sequence
  const resMax = await client.query("SELECT COALESCE(MAX(id), 0) as max_id FROM pedidos");
  let orderSeq = (resMax.rows[0].max_id || 0) + 1;

  const totalDays = 90; // 3 months
  const ordersPerDay = 40;
  const now = new Date(); // 2026-10-06

  let totalInsertedOrders = 0;
  let totalInsertedItems = 0;

  // We loop day by day, from 89 days ago up to day 0 (today)
  for (let dayOffset = totalDays - 1; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().slice(0, 10);

    const isToday = (dayOffset === 0);
    const isYesterday = (dayOffset === 1);

    for (let orderIndex = 0; orderIndex < ordersPerDay; orderIndex++) {
      // Pick state across the 3 requested states: nuevos (recibido), preparando y listos
      let estado_pedido;
      const r = orderIndex % 3;
      if (r === 0) estado_pedido = "recibido";   // nuevo
      else if (r === 1) estado_pedido = "preparando";
      else estado_pedido = "listo";

      // Timestamp for this day between 18:00 and 23:30
      const orderHour = 18 + Math.floor((orderIndex / ordersPerDay) * 5.5);
      const orderMin = (orderIndex * 7) % 60;
      const createdAt = new Date(targetDate);
      createdAt.setHours(orderHour, orderMin, getRandomInt(0, 59), 0);

      // Pickup time is usually 25-45 mins after order
      const pickupHour = (orderHour + Math.floor((orderMin + 30) / 60)) % 24;
      const pickupMin = (orderMin + 30) % 60;
      const pad = (n) => String(n).padStart(2, "0");
      const hora_recogida = `${pad(pickupHour)}:${pad(pickupMin)}h`;

      const numStr = `OB-${String(10000 + orderSeq)}`;
      const nombre = getRandomElem(NOMBRES);
      const telefono = `6${getRandomInt(10, 99)} ${getRandomInt(100, 999)} ${getRandomInt(100, 999)}`;
      const email = getRandomElem(CLIENT_EMAILS);
      const tipo_entrega = Math.random() > 0.3 ? "recogida_local" : "domicilio";
      const metodo_pago = Math.random() > 0.4 ? "stripe" : "restaurante";
      const estado_pago = metodo_pago === "stripe" ? "pagado" : "pendiente_local";
      const notas = getRandomElem(NOTAS_POSIBLES);

      // Pick 2 to 4 items
      const numItems = getRandomInt(2, 4);
      const selectedDishes = [];
      const usedIds = new Set();
      while (selectedDishes.length < numItems) {
        const dish = getRandomElem(DISH_CATALOG);
        if (!usedIds.has(dish.id)) {
          usedIds.add(dish.id);
          selectedDishes.push({
            dish_id: dish.id,
            nombre: dish.name,
            categoria: dish.cat,
            precio_unitario: dish.price,
            cantidad: getRandomInt(1, 2),
            subtotal: 0
          });
        }
      }

      let total = 0;
      for (const it of selectedDishes) {
        it.subtotal = parseFloat((it.precio_unitario * it.cantidad).toFixed(2));
        total += it.subtotal;
      }
      total = parseFloat(total.toFixed(2));

      // Insert pedido
      const insertOrderSql = `
        INSERT INTO pedidos (
          numero_pedido, cliente_nombre, cliente_telefono, cliente_email,
          tipo_entrega, hora_recogida, notas, metodo_pago,
          estado_pago, estado_pedido, total, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING id
      `;

      const orderRes = await client.query(insertOrderSql, [
        numStr, nombre, telefono, email,
        tipo_entrega, hora_recogida, notas, metodo_pago,
        estado_pago, estado_pedido, total, createdAt, createdAt
      ]);

      const pedidoId = orderRes.rows[0].id;
      totalInsertedOrders++;
      orderSeq++;

      // Insert items for this order
      for (const it of selectedDishes) {
        const insertItemSql = `
          INSERT INTO pedido_items (
            pedido_id, dish_id, nombre, categoria,
            precio_unitario, cantidad, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await client.query(insertItemSql, [
          pedidoId, it.dish_id, it.nombre, it.categoria,
          it.precio_unitario, it.cantidad, it.subtotal
        ]);
        totalInsertedItems++;
      }
    }

    if (dayOffset % 10 === 0) {
      console.log(`Progress: generated up to ${dateStr} (Total orders so far: ${totalInsertedOrders})`);
    }
  }

  await client.end();
  console.log(`\n🎉 SUCCESS! Generated ${totalInsertedOrders} orders and ${totalInsertedItems} items across 90 days in obento_db.`);
}

main().catch(err => {
  console.error("Error generating orders:", err);
  process.exit(1);
});
