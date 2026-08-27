import { PrismaClient } from "@prisma/client";
import { resetAndSeedDemo } from "./seed-demo";

const db = new PrismaClient();

async function main() {
  const result = await resetAndSeedDemo(db);

  console.log("✅ Seed de démonstration chargé");
  console.log("   Organisation : LAAFI CAFÉ");
  console.log("   Postes coworking : 18 (POSTE-01 → POSTE-18)");
  console.log("   Tables restaurant : 10");
  console.log("   Produits : 6 · Recettes : 3 · Articles stock : 5");
  console.log("   Caisse : 1 session ouverte (fonds 20 000 F)");
  console.log("");
  console.log(`   Connexion : ${result.credentials.email} / ${result.credentials.password}`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur de seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
