import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

/**
 * Réinitialise complètement la base et charge un jeu de données de
 * démonstration cohérent (18 postes, 10 tables, produits, recettes,
 * stocks, caisse, et un scénario intégré coworking + restaurant).
 *
 * ⚠️ DESTRUCTIF — réservé au développement et aux tests.
 */
export async function resetAndSeedDemo(db: PrismaClient) {
  // --- Nettoyage ordonné (respect des clés étrangères) ---
  await db.invoicePayment.deleteMany();
  await db.invoiceItem.deleteMany();
  await db.invoice.deleteMany();
  await db.payment.deleteMany();
  await db.orderPayment.deleteMany();
  await db.cashMovement.deleteMany();
  await db.cashSession.deleteMany();
  await db.cashRegister.deleteMany();
  await db.kitchenOrderItem.deleteMany();
  await db.kitchenOrder.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.tableReservation.deleteMany();
  await db.restaurantTable.deleteMany();
  await db.restaurantZone.deleteMany();
  await db.checkin.deleteMany();
  await db.reservation.deleteMany();
  await db.workstation.deleteMany();
  await db.coworkingSpace.deleteMany();
  await db.subscriptionUsage.deleteMany();
  await db.subscription.deleteMany();
  await db.stockCountItem.deleteMany();
  await db.stockCount.deleteMany();
  await db.stockLoss.deleteMany();
  await db.inventoryMovement.deleteMany();
  await db.recipeItem.deleteMany();
  await db.recipe.deleteMany();
  await db.goodsReceiptItem.deleteMany();
  await db.goodsReceipt.deleteMany();
  await db.purchaseOrderItem.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.inventoryItem.deleteMany();
  await db.supplier.deleteMany();
  await db.productModifier.deleteMany();
  await db.productVariant.deleteMany();
  await db.product.deleteMany();
  await db.productCategory.deleteMany();
  await db.notification.deleteMany();
  await db.pushSubscription.deleteMany();
  await db.auditLog.deleteMany();
  await db.expense.deleteMany();
  await db.customer.deleteMany();
  await db.user.deleteMany();
  await db.role.deleteMany();
  await db.branding.deleteMany();
  await db.location.deleteMany();
  await db.organization.deleteMany();
  await db.tax.deleteMany();
  await db.discount.deleteMany();
  await db.settings.deleteMany();

  // --- Organisation, site, branding ---
  const org = await db.organization.create({ data: { name: "LAAFI CAFÉ" } });

  await db.branding.create({
    data: {
      organizationId: org.id,
      commercialName: "LAAFI CAFÉ",
      slogan: "Le goût des ambitions.",
      phone: "+226 70 00 00 00",
      email: "contact@laafi.cafe",
      address: "Ouagadougou, Burkina Faso",
      rccm: "BF-OUA-2026-B-0001",
      ifu: "00000001A",
      colorsPrimary: "#96602f",
      colorsSecondary: "#d9a441",
      currency: "XOF",
    },
  });

  const location = await db.location.create({
    data: {
      organizationId: org.id,
      name: "LAAFI CAFÉ — Site Principal",
      address: "Ouagadougou, Burkina Faso",
      phone: "+226 70 00 00 00",
    },
  });

  await db.tax.create({ data: { name: "TVA 18%", rate: 0.18, code: "TVA18", isActive: true } });

  // --- Rôles ---
  const roleDefs = [
    { name: "SUPER_ADMIN", permissions: ["*"] },
    { name: "ADMIN", permissions: ["MANAGE_USERS", "MANAGE_SETTINGS", "VIEW_REPORTS"] },
    { name: "MANAGER", permissions: ["MANAGE_CASH", "MANAGE_STOCK", "VIEW_REPORTS"] },
    { name: "CAISSIER", permissions: ["CREATE_ORDER", "PROCESS_PAYMENT"] },
    { name: "SERVEUR", permissions: ["MANAGE_TABLES", "CREATE_ORDER"] },
    { name: "CUISINIER", permissions: ["VIEW_KITCHEN"] },
    { name: "MAGASINIER", permissions: ["MANAGE_STOCK", "MANAGE_PURCHASES"] },
    { name: "AGENT_COWORKING", permissions: ["MANAGE_RESERVATIONS", "CHECKIN", "CHECKOUT"] },
  ];
  for (const r of roleDefs) await db.role.create({ data: r });

  const superAdminRole = await db.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  const serveurRole = await db.role.findUniqueOrThrow({ where: { name: "SERVEUR" } });

  const admin = await db.user.create({
    data: {
      email: "admin@laafi.cafe",
      passwordHash: await bcrypt.hash("admin123", 12),
      firstName: "Admin",
      lastName: "LAAFI",
      organizationId: org.id,
      roleId: superAdminRole.id,
      preferredChannels: ["EMAIL", "PUSH"],
    },
  });

  await db.user.create({
    data: {
      email: "serveur@laafi.cafe",
      passwordHash: await bcrypt.hash("serveur123", 12),
      firstName: "Salif",
      lastName: "Kaboré",
      organizationId: org.id,
      roleId: serveurRole.id,
    },
  });

  // --- Clients ---
  const jean = await db.customer.create({
    data: {
      organizationId: org.id,
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean.dupont@laafi.test",
      phone: "+226 70 00 00 01",
    },
  });

  const aicha = await db.customer.create({
    data: {
      organizationId: org.id,
      firstName: "Aïcha",
      lastName: "Ouedraogo",
      email: "aicha@laafi.test",
      phone: "+226 70 00 00 02",
    },
  });

  await db.customer.create({
    data: {
      organizationId: org.id,
      firstName: "Responsable",
      lastName: "Achats",
      companyName: "Delta SARL",
      email: "delta@laafi.test",
      phone: "+226 70 00 00 03",
      rccm: "BF-OUA-2025-B-1234",
      ifu: "00001234B",
    },
  });

  // --- Coworking : 18 postes ---
  const space = await db.coworkingSpace.create({
    data: {
      locationId: location.id,
      name: "Espace Coworking LAAFI",
      description: "18 postes de travail équipés",
    },
  });

  const workstations = [];
  for (let i = 1; i <= 18; i++) {
    workstations.push(
      await db.workstation.create({
        data: {
          coworkingSpaceId: space.id,
          number: i,
          name: `POSTE-${String(i).padStart(2, "0")}`,
          type: "FIXED",
          status: i === 8 ? "OCCUPIED" : "AVAILABLE",
          equipment: ["Bureau", "Chaise ergonomique", "Prise 220V", "Wi-Fi"],
          pricePerHour: 500,
          pricePerDay: 3000,
          pricePerMonth: 60000,
        },
      }),
    );
  }

  // --- Restaurant : zone + 10 tables ---
  const zone = await db.restaurantZone.create({
    data: { locationId: location.id, name: "Salle Principale" },
  });

  const tables = [];
  for (let i = 1; i <= 10; i++) {
    tables.push(
      await db.restaurantTable.create({
        data: {
          zoneId: zone.id,
          locationId: location.id,
          number: i,
          capacity: i <= 8 ? 4 : 2,
          status: i === 1 ? "OCCUPIED" : "AVAILABLE",
          x: 15 + ((i - 1) % 5) * 18,
          y: i <= 5 ? 28 : 68,
          width: 80,
          height: 80,
        },
      }),
    );
  }

  // --- Menu ---
  const catCafe = await db.productCategory.create({ data: { name: "CAFÉ" } });
  const catThe = await db.productCategory.create({ data: { name: "THÉ" } });
  const catBoissons = await db.productCategory.create({ data: { name: "BOISSONS" } });
  const catSandwichs = await db.productCategory.create({ data: { name: "SANDWICHS" } });
  const catDesserts = await db.productCategory.create({ data: { name: "DESSERTS" } });

  const latte = await db.product.create({
    data: { categoryId: catCafe.id, name: "Café Latte", code: "CAF-001", price: 1500, unit: "tasse" },
  });
  const espresso = await db.product.create({
    data: { categoryId: catCafe.id, name: "Espresso", code: "CAF-002", price: 1000, unit: "tasse" },
  });
  await db.product.create({
    data: { categoryId: catThe.id, name: "Thé à la menthe", code: "THE-001", price: 800, unit: "verre" },
  });
  await db.product.create({
    data: { categoryId: catBoissons.id, name: "Eau minérale", code: "BOI-001", price: 500, costPrice: 200, unit: "bouteille" },
  });
  const sandwich = await db.product.create({
    data: { categoryId: catSandwichs.id, name: "Sandwich Poulet", code: "SAN-001", price: 3000, unit: "unité" },
  });
  await db.product.create({
    data: { categoryId: catDesserts.id, name: "Tiramisu", code: "DES-001", price: 2000, costPrice: 700, unit: "portion" },
  });

  await db.productVariant.createMany({
    data: [
      { productId: latte.id, name: "Grand format", priceAdj: 500 },
      { productId: espresso.id, name: "Double", priceAdj: 400 },
    ],
  });

  await db.productModifier.createMany({
    data: [
      { productId: latte.id, name: "Sans sucre", priceAdj: 0 },
      { productId: latte.id, name: "Lait végétal", priceAdj: 300 },
      { productId: sandwich.id, name: "Extra fromage", priceAdj: 500 },
    ],
  });

  // --- Fournisseur + stocks ---
  const supplier = await db.supplier.create({
    data: {
      name: "Distri-Ouaga SARL",
      rccm: "BF-OUA-2024-B-5678",
      ifu: "00005678C",
      phone: "+226 25 00 00 00",
      email: "commandes@distri-ouaga.test",
      contactName: "M. Sawadogo",
      paymentTerms: "30 jours fin de mois",
    },
  });

  const cafeArabica = await db.inventoryItem.create({
    data: { locationId: location.id, supplierId: supplier.id, code: "STK-CAF", name: "Café Arabica", category: "RAW_MATERIAL", unit: "kg", currentStock: 25, minStock: 5, unitCost: 4500 },
  });
  const lait = await db.inventoryItem.create({
    data: { locationId: location.id, supplierId: supplier.id, code: "STK-LAIT", name: "Lait", category: "RAW_MATERIAL", unit: "L", currentStock: 12, minStock: 10, unitCost: 600 },
  });
  const sucre = await db.inventoryItem.create({
    data: { locationId: location.id, code: "STK-SUCRE", name: "Sucre blanc", category: "RAW_MATERIAL", unit: "kg", currentStock: 15, minStock: 5, unitCost: 350 },
  });
  const pain = await db.inventoryItem.create({
    data: { locationId: location.id, code: "STK-PAIN", name: "Pain de mie", category: "RAW_MATERIAL", unit: "unité", currentStock: 40, minStock: 10, unitCost: 250 },
  });
  const poulet = await db.inventoryItem.create({
    data: { locationId: location.id, code: "STK-POUL", name: "Poulet", category: "RAW_MATERIAL", unit: "kg", currentStock: 4, minStock: 5, unitCost: 3000 },
  });

  // --- Recettes (déclenchent le calcul du coût de revient) ---
  await db.recipe.create({
    data: {
      productId: latte.id,
      name: "Recette Café Latte",
      instructions: "Extraire le shot, mousser le lait, assembler.",
      yieldQuantity: 1,
      yieldUnit: "portion",
      items: {
        create: [
          { inventoryItemId: cafeArabica.id, quantity: 10, unit: "g" },
          { inventoryItemId: lait.id, quantity: 150, unit: "ml" },
          { inventoryItemId: sucre.id, quantity: 5, unit: "g" },
        ],
      },
    },
  });
  await db.product.update({ where: { id: latte.id }, data: { costPrice: 136.75 } });

  await db.recipe.create({
    data: {
      productId: sandwich.id,
      name: "Recette Sandwich Poulet",
      yieldQuantity: 1,
      yieldUnit: "portion",
      items: {
        create: [
          { inventoryItemId: pain.id, quantity: 2, unit: "unité" },
          { inventoryItemId: poulet.id, quantity: 0.15, unit: "kg" },
        ],
      },
    },
  });
  await db.product.update({ where: { id: sandwich.id }, data: { costPrice: 950 } });

  await db.recipe.create({
    data: {
      productId: espresso.id,
      name: "Recette Espresso",
      yieldQuantity: 1,
      yieldUnit: "portion",
      items: { create: [{ inventoryItemId: cafeArabica.id, quantity: 10, unit: "g" }] },
    },
  });
  await db.product.update({ where: { id: espresso.id }, data: { costPrice: 45 } });

  // --- Caisse ouverte ---
  const register = await db.cashRegister.create({
    data: { locationId: location.id, name: "Caisse 1", active: true },
  });
  const session = await db.cashSession.create({
    data: { registerId: register.id, userId: admin.id, status: "OPEN", initialFund: 20000 },
  });

  // --- Scénario intégré : Jean Dupont, POSTE-08 + restaurant ---
  const reservation = await db.reservation.create({
    data: {
      workstationId: workstations[7]!.id,
      customerId: jean.id,
      locationId: location.id,
      startTime: new Date(Date.UTC(2026, 5, 15, 8, 0, 0)),
      endTime: new Date(Date.UTC(2026, 5, 15, 17, 0, 0)),
      status: "COMPLETED",
      totalPrice: 3000,
      qrCode: "LAAFI-RES-DEMO-08",
    },
  });

  await db.checkin.create({
    data: {
      workstationId: workstations[7]!.id,
      reservationId: reservation.id,
      customerId: jean.id,
      checkInAt: new Date(Date.UTC(2026, 5, 15, 8, 5, 0)),
      checkOutAt: new Date(Date.UTC(2026, 5, 15, 16, 45, 0)),
      realEndTime: new Date(Date.UTC(2026, 5, 15, 16, 45, 0)),
      extraCharge: 0,
    },
  });

  const order = await db.order.create({
    data: {
      tableId: tables[0]!.id,
      customerId: jean.id,
      serverId: admin.id,
      locationId: location.id,
      status: "PAID",
      orderType: "DINE_IN",
      subtotal: 4500,
      taxTotal: 810,
      total: 4500,
      notes: "Client coworking POSTE-08",
    },
  });

  await db.orderItem.createMany({
    data: [
      { orderId: order.id, productId: latte.id, quantity: 1, unitPrice: 1500, total: 1500, status: "SERVED" },
      { orderId: order.id, productId: sandwich.id, quantity: 1, unitPrice: 3000, total: 3000, status: "SERVED" },
    ],
  });

  const kitchenOrder = await db.kitchenOrder.create({
    data: { orderId: order.id, status: "SERVED" },
  });
  await db.kitchenOrderItem.createMany({
    data: [
      { kitchenOrderId: kitchenOrder.id, productId: latte.id, quantity: 1, status: "SERVED" },
      { kitchenOrderId: kitchenOrder.id, productId: sandwich.id, quantity: 1, status: "SERVED" },
    ],
  });

  await db.payment.create({
    data: {
      customerId: jean.id,
      orderId: order.id,
      amount: 4500,
      method: "CASH",
      status: "COMPLETED",
      reference: "PAY-DEMO-01",
    },
  });

  await db.cashMovement.create({
    data: {
      sessionId: session.id,
      type: "SALE",
      amount: 4500,
      reason: `Paiement commande ${order.id}`,
      reference: "PAY-DEMO-01",
    },
  });

  // --- Abonnement + dépense d'exemple ---
  await db.subscription.create({
    data: {
      customerId: aicha.id,
      name: "Pass 10 heures",
      type: "PASS_10H",
      hoursCredit: 10,
      price: 4500,
      status: "ACTIVE",
    },
  });

  await db.expense.create({
    data: {
      locationId: location.id,
      userId: admin.id,
      category: "ENERGY",
      amount: 45000,
      description: "Facture électricité",
      paymentMethod: "BANK_TRANSFER",
    },
  });

  return {
    credentials: { email: "admin@laafi.cafe", password: "admin123" },
    ids: {
      organizationId: org.id,
      locationId: location.id,
      adminId: admin.id,
      jeanId: jean.id,
      aichaId: aicha.id,
      workstation08Id: workstations[7]!.id,
      table1Id: tables[0]!.id,
      latteId: latte.id,
      sandwichId: sandwich.id,
      cafeArabicaId: cafeArabica.id,
      cashSessionId: session.id,
      supplierId: supplier.id,
    },
  };
}
