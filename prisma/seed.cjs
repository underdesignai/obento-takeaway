const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/obento_admin";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Obento database...");

  // 1. Configuracion
  await prisma.configuracion.upsert({
    where: { clave: "takeaway_modo" },
    update: { valor: "activo" },
    create: { clave: "takeaway_modo", valor: "activo" },
  });
  await prisma.configuracion.upsert({
    where: { clave: "takeaway_iva" },
    update: { valor: "10" },
    create: { clave: "takeaway_iva", valor: "10" },
  });
  await prisma.configuracion.upsert({
    where: { clave: "takeaway_umbral_pedidos" },
    update: { valor: "35" },
    create: { clave: "takeaway_umbral_pedidos", valor: "35" },
  });
  await prisma.configuracion.upsert({
    where: { clave: "takeaway_umbral_minutos" },
    update: { valor: "60" },
    create: { clave: "takeaway_umbral_minutos", valor: "60" },
  });
  await prisma.configuracion.upsert({
    where: { clave: "takeaway_manual_override" },
    update: { valor: "false" },
    create: { clave: "takeaway_manual_override", valor: "false" },
  });

  // 2. Menu Items
  const menuItems = [
    // Entrantes
    { nombre: "Ensalada wakame", nombreEn: "Wakame Salad", precio: 6.90, categoria: "entrantes", concepto: "entrantes", imagen: "/images/ensaladawakame.jpg", descripcion: "Alga wakame marinada en salsa aojiso, salmón y toque de sésamo." },
    { nombre: "Ebi Fry (3 und)", nombreEn: "Crispy Ebi Fry (3 pcs)", precio: 5.50, categoria: "entrantes", concepto: "entrantes", imagen: "/images/ebifry.jpg", descripcion: "Langostinos empanados crujientes con salsa Sweetchili verde." },
    { nombre: "Edamame", nombreEn: "Edamame", precio: 4.50, categoria: "entrantes", concepto: "entrantes", imagen: "/images/edamame.jpg", descripcion: "Vainas de soja salteadas con aceite de humo y sal en escamas." },
    { nombre: "Gyozas de pollo (4 und)", nombreEn: "Chicken Gyozas (4 pcs)", precio: 4.50, categoria: "entrantes", concepto: "entrantes", imagen: "/images/gyozaspollo.jpg", descripcion: "Empanadillas japonesas a la plancha rellenas de pollo." },
    { nombre: "Gyozas de verdura (4 und)", nombreEn: "Veggie Gyozas (4 pcs)", precio: 4.50, categoria: "entrantes", concepto: "entrantes", imagen: "/images/gyozasverdura.jpg", descripcion: "Empanadillas japonesas a la plancha de relleno vegetal." },
    { nombre: "Gyozas de langostino (4 und)", nombreEn: "Prawn Gyozas (4 pcs)", precio: 5.50, categoria: "entrantes", concepto: "entrantes", imagen: "/images/gyozaslangostino.jpg", descripcion: "Empanadillas japonesas a la plancha de langostino." },
    { nombre: "Samosas (3 und)", nombreEn: "Curry Samosas (3 pcs)", precio: 6.50, categoria: "entrantes", concepto: "entrantes", imagen: "/images/samosas.jpg", descripcion: "Crujientes de hojaldre con relleno de pollo al curry y mayo buldak miel." },
    { nombre: "Takoyaki (3 und)", nombreEn: "Takoyaki Octopus Balls", precio: 4.50, categoria: "entrantes", concepto: "entrantes", imagen: "/images/takoyaki.jpg", descripcion: "Bolitas de pulpo rebozadas, salsa takoyaki y katsuobushi." },

    // Sushi - Nigiris
    { nombre: "Nigiri de atún", nombreEn: "Tuna Nigiri (2 pcs)", precio: 6.20, categoria: "sushi", concepto: "sushi", imagen: "/images/nigiriatun.jpg", descripcion: "Atún Rojo Ricardo Fuentes (2und)." },
    { nombre: "Nigiri de atún con foie", nombreEn: "Tuna & Foie Nigiri (2 pcs)", precio: 7.80, categoria: "sushi", concepto: "sushi", imagen: "/images/nigiriatunfoie.jpg", descripcion: "Atún Rojo con foie, sal marinada y teriyaki." },
    { nombre: "Nigiri de salmón", nombreEn: "Salmon Nigiri (2 pcs)", precio: 5.50, categoria: "sushi", concepto: "sushi", imagen: "/images/nigirisalmon.jpg", descripcion: "Salmón noruego seleccionado (2und)." },
    { nombre: "Nigiri de salmón flambeado", nombreEn: "Flamed Salmon Nigiri (2 pcs)", precio: 6.20, categoria: "sushi", concepto: "sushi", imagen: "/images/nigirisalmonf.jpg", descripcion: "Salmón sellado al soplete con salsa kimchi y azúcar moreno." },
    { nombre: "Nigiri de chutoro", nombreEn: "Chutoro Nigiri (2 pcs)", precio: 10.50, categoria: "sushi", concepto: "sushi", imagen: "/images/nigirichutoro.jpg", descripcion: "Atún sellado al soplete con sal en escamas y cebolleta." },
    { nombre: "Nigiri de vieira", nombreEn: "Scallop Nigiri (2 pcs)", precio: 9.90, categoria: "sushi", concepto: "sushi", imagen: "/images/nigirivieira.jpg", descripcion: "Vieira sellada con soplete, mayo kimchi y lima." },
    { nombre: "Nigiri de anguila", nombreEn: "Unagi Eel Nigiri (2 pcs)", precio: 7.20, categoria: "sushi", concepto: "sushi", imagen: "/images/nigirianguila.jpg", descripcion: "Anguila glaseada en salsa teriyaki y cebolleta fina." },
    { nombre: "Nigiri de hamachi", nombreEn: "Hamachi Yellowtail (2 pcs)", precio: 8.90, categoria: "sushi", concepto: "sushi", imagen: "/images/nigirihamachi.jpg", descripcion: "Pez limón seleccionado (2und)." },
    { nombre: "Nigiri atún toro con trufa", nombreEn: "Toro Tuna with Truffle", precio: 10.90, categoria: "sushi", concepto: "sushi", imagen: "/images/atuntoro.jpg", descripcion: "Mayo trufada, cebolleta fina y atún toro rojo." },

    // Sushi - Uramakis
    { nombre: "Jōnetsu Tuna (8 uds)", nombreEn: "Jonetsu Tuna Roll (8 pcs)", precio: 14.20, categoria: "sushi", concepto: "sushi", imagen: "/images/rolloatun.jpg", descripcion: "Arroz con sésamo kimchi, atún y foie flambeado." },
    { nombre: "Sakura Roll (8 uds)", nombreEn: "Sakura Salmon Roll (8 pcs)", precio: 12.50, categoria: "sushi", concepto: "sushi", imagen: "/images/uramakisalmon.jpg", descripcion: "Queso crema, salmón flambeado y mayo kimchi." },
    { nombre: "Chicken roll (8 uds)", nombreEn: "Chicken Roll (8 pcs)", precio: 11.50, categoria: "sushi", concepto: "sushi", imagen: "/images/uramakipollo.jpg", descripcion: "Pollo karaage, queso crema, aguacate y salsa acebichada." },
    { nombre: "Black Dragon (8 uds)", nombreEn: "Black Dragon Roll (8 pcs)", precio: 15.20, categoria: "sushi", concepto: "sushi", imagen: "/images/rolloblack.jpg", descripcion: "Gamba tempurizada, atún, mayo buldak y boniato crujiente." },
    { nombre: "Shinigami Crab (8 uds)", nombreEn: "Shinigami Crab (8 pcs)", precio: 11.50, categoria: "sushi", concepto: "sushi", imagen: "/images/uramakicangrejo.jpg", descripcion: "Arroz negro, cangrejo real, lubina y spicy mango." },
    { nombre: "Rollo Tartar de salmón", nombreEn: "Salmon Tartare Roll (8 pcs)", precio: 11.30, categoria: "sushi", concepto: "sushi", imagen: "/images/rollosalmon1.jpg", descripcion: "Aguacate, queso crema con tartar de salmón y salsa Aojiso." },
    { nombre: "Rollo Tartar de atún", nombreEn: "Tuna Tartare Roll (8 pcs)", precio: 13.80, categoria: "sushi", concepto: "sushi", imagen: "/images/rolloatun1.jpg", descripcion: "Aguacate, queso crema con tartar de atún y mayo kimchi." },

    // Sushi - Futomakis & Makis
    { nombre: "Futomaki de salmón (8 und)", nombreEn: "Salmon Futomaki (8 pcs)", precio: 9.90, categoria: "sushi", concepto: "sushi", imagen: "/images/futomaki.jpg", descripcion: "Salmón, queso crema y salsa aojiso." },
    { nombre: "Futomaki de gamba trufada (12 und)", nombreEn: "Truffle Prawn Futomaki (12 pcs)", precio: 12.20, categoria: "sushi", concepto: "sushi", imagen: "/images/rollogamba.jpg", descripcion: "Gamba en tempura, ikura y mayonesa trufada." },
    { nombre: "Futomaki karaage (12 und)", nombreEn: "Karaage Futomaki (12 pcs)", precio: 10.50, categoria: "sushi", concepto: "sushi", imagen: "/images/futokara.jpg", descripcion: "Pollo karaage, mango y mayo buldak miel." },
    { nombre: "Maki de salmón (8 und)", nombreEn: "Salmon Maki (8 pcs)", precio: 6.20, categoria: "sushi", concepto: "sushi", imagen: "/images/maki2.jpg", descripcion: "Salmón noruego (8 piezas)." },
    { nombre: "Maki de ventresca chutoro", nombreEn: "Chutoro Maki (8 pcs)", precio: 10.50, categoria: "sushi", concepto: "sushi", imagen: "/images/makichu.jpg", descripcion: "Ventresca de atún rojo Ricardo Fuentes." },

    // Calientes
    { nombre: "Arroz salteado con ternera", nombreEn: "Beef Fried Rice", precio: 12.50, categoria: "calientes", concepto: "calientes", imagen: "/images/arrozternera.jpg", descripcion: "Arroz salteado con ternera, pimientos y espárragos." },
    { nombre: "Arroz salteado con pollo", nombreEn: "Chicken Fried Rice", precio: 11.20, categoria: "calientes", concepto: "calientes", imagen: "/images/arrozpollo.jpg", descripcion: "Arroz salteado con pollo y verduras frescas al wok." },
    { nombre: "Yakisoba de langostino", nombreEn: "Prawn Yakisoba Noodles", precio: 13.20, categoria: "calientes", concepto: "calientes", imagen: "/images/yakisobalangostino.jpg", descripcion: "Fideos yakisoba salteados con langostinos y sésamo." },
    { nombre: "Yakisoba de ternera", nombreEn: "Beef Yakisoba Noodles", precio: 12.90, categoria: "calientes", concepto: "calientes", imagen: "/images/yakisobaternera.jpg", descripcion: "Fideos salteados con ternera, col, aceite de sésamo y soja." },
    { nombre: "Yakisoba de pollo", nombreEn: "Chicken Yakisoba Noodles", precio: 11.90, categoria: "calientes", concepto: "calientes", imagen: "/images/yakisobapollo.jpg", descripcion: "Fideos salteados con pollo al wok y verduras." },

    // Postres
    { nombre: "Mochi de tarta de queso", nombreEn: "Cheesecake Mochi", precio: 4.50, categoria: "postres", concepto: "postres", imagen: "/images/mochifresa.jpg", descripcion: "Masa de arroz artesana con helado de tarta de queso." },
    { nombre: "Mochi de mango", nombreEn: "Mango Mochi", precio: 4.50, categoria: "postres", concepto: "postres", imagen: "/images/mochimango.jpg", descripcion: "Masa de fruta de la pasión con helado de mango." },
    { nombre: "Mochi de chocolate", nombreEn: "Chocolate Mochi", precio: 4.50, categoria: "postres", concepto: "postres", imagen: "/images/mochichocolate.jpg", descripcion: "Masa rellena de helado de chocolate belga." },
  ];

  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({ where: { nombre: item.nombre } });
    if (!existing) {
      await prisma.menuItem.create({ data: item });
    }
  }

  // 3. Crear pedidos de muestra para Obento
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timeInMins = (offset) => {
    const d = new Date(now.getTime() + offset * 60000);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const sampleOrders = [
    {
      nombre: "Carlos Martínez",
      telefono: "611 223 344",
      email: "carlos.m@example.com",
      horaRecogida: timeInMins(12),
      total: 34.60,
      estado: "nuevo",
      metodoPago: "stripe",
      notas: "Sin gluten en los fideos si es posible y extra jengibre.",
      items: [
        { id: "1", name: "Jōnetsu Tuna (8 uds)", nameEn: "Jonetsu Tuna Roll (8 pcs)", qty: 1, price: 14.20, concepto: "sushi", image: "/images/rolloatun.jpg" },
        { id: "2", name: "Nigiri de salmón flambeado", nameEn: "Flamed Salmon Nigiri (2 pcs)", qty: 2, price: 6.20, concepto: "sushi", image: "/images/nigirisalmonf.jpg" },
        { id: "3", name: "Gyozas de pollo (4 und)", nameEn: "Chicken Gyozas (4 pcs)", qty: 1, price: 4.50, concepto: "entrantes", image: "/images/gyozaspollo.jpg" },
        { id: "4", name: "Mochi de mango", nameEn: "Mango Mochi", qty: 1, price: 3.50, concepto: "postres", image: "/images/mochimango.jpg" }
      ]
    },
    {
      nombre: "Laura Gómez",
      telefono: "654 987 321",
      email: "laura.gomez@example.com",
      horaRecogida: timeInMins(5),
      total: 41.30,
      estado: "preparando",
      metodoPago: "stripe",
      notas: "Wasabi aparte, por favor.",
      items: [
        { id: "5", name: "Sakura Roll (8 uds)", nameEn: "Sakura Salmon Roll (8 pcs)", qty: 1, price: 12.50, concepto: "sushi", image: "/images/uramakisalmon.jpg" },
        { id: "6", name: "Black Dragon (8 uds)", nameEn: "Black Dragon Roll (8 pcs)", qty: 1, price: 15.20, concepto: "sushi", image: "/images/rolloblack.jpg" },
        { id: "7", name: "Edamame", nameEn: "Edamame", qty: 1, price: 4.50, concepto: "entrantes", image: "/images/edamame.jpg" },
        { id: "8", name: "Mochi de tarta de queso", nameEn: "Cheesecake Mochi", qty: 2, price: 4.50, concepto: "postres", image: "/images/mochifresa.jpg" }
      ]
    },
    {
      nombre: "Alejandro Ruiz",
      telefono: "677 889 900",
      email: "aruiz@example.com",
      horaRecogida: timeInMins(-3),
      total: 26.40,
      estado: "listo",
      metodoPago: "local",
      notas: "Traerá cambio de 50€ para pagar en caja.",
      items: [
        { id: "9", name: "Yakisoba de langostino", nameEn: "Prawn Yakisoba Noodles", qty: 1, price: 13.20, concepto: "calientes", image: "/images/yakisobalangostino.jpg" },
        { id: "10", name: "Takoyaki (3 und)", nameEn: "Takoyaki Octopus Balls", qty: 1, price: 4.50, concepto: "entrantes", image: "/images/takoyaki.jpg" },
        { id: "11", name: "Nigiri atún toro con trufa", nameEn: "Toro Tuna with Truffle", qty: 1, price: 8.70, concepto: "sushi", image: "/images/atuntoro.jpg" }
      ]
    },
    {
      nombre: "Elena Navarro",
      telefono: "622 334 455",
      email: "elena.navarro@example.com",
      horaRecogida: timeInMins(25),
      total: 49.80,
      estado: "nuevo",
      metodoPago: "stripe",
      notas: "Todo bien empacado para llevar en moto.",
      items: [
        { id: "12", name: "Futomaki de gamba trufada (12 und)", nameEn: "Truffle Prawn Futomaki (12 pcs)", qty: 1, price: 12.20, concepto: "sushi", image: "/images/rollogamba.jpg" },
        { id: "13", name: "Arroz salteado con ternera", nameEn: "Beef Fried Rice", qty: 1, price: 12.50, concepto: "calientes", image: "/images/arrozternera.jpg" },
        { id: "14", name: "Rollo Tartar de salmón", nameEn: "Salmon Tartare Roll (8 pcs)", qty: 1, price: 11.30, concepto: "sushi", image: "/images/rollosalmon1.jpg" },
        { id: "15", name: "Ebi Fry (3 und)", nameEn: "Crispy Ebi Fry (3 pcs)", qty: 1, price: 5.50, concepto: "entrantes", image: "/images/ebifry.jpg" },
        { id: "16", name: "Mochi de chocolate", nameEn: "Chocolate Mochi", qty: 1, price: 4.50, concepto: "postres", image: "/images/mochichocolate.jpg" }
      ]
    }
  ];

  const countOrders = await prisma.pedido.count();
  if (countOrders === 0) {
    for (const ord of sampleOrders) {
      await prisma.pedido.create({ data: ord });
    }
    console.log("Created 4 sample orders for Obento Takeaway!");
  }

  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
