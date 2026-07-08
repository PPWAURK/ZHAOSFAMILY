import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BADGE_IMAGES: Record<string, string> = {
  kitchen_level_1_output_certification: 'guo.svg',
  kitchen_level_2_prep_certification: 'knife.svg',
  kitchen_level_3_independent_serving: 'noodle.svg',
  kitchen_level_4_quality_stability: 'marmite.svg',
  kitchen_level_5_assistant_intern: 'spatule.svg',
  kitchen_level_5_assistant_certified: 'planche.svg',
  kitchen_level_5_manager_certification: 'badge-chef.svg',
  general_onboarding_certification: 'badge.svg',
  general_food_safety_basic: 'safety.svg',
  general_hygiene_standard: 'hygiene.svg',
  general_store_rules: 'badge-growth.svg',
  general_teamwork_basic: 'smile.svg',
  front_level_1_service_certification: 'caisse.svg',
  front_level_2_independent_service: 'caisse.svg',
  front_level_3_peak_service: 'couvercle.svg',
  front_level_4_shift_lead: 'couvercle.svg',
  front_level_5_assistant_intern: 'reception.svg',
  front_level_5_assistant_certified: 'reception.svg',
  front_level_5_manager_certification: 'reception.svg',
  management_coaching_certification: 'stonk.svg',
  management_scheduling_basic: 'stonk.svg',
  management_cost_awareness: 'stonk.svg',
  management_inventory: 'board.svg',
  management_team_communication: 'board.svg',
  management_store_operations_basic: 'badge-store.svg',
  management_store_manager_intern: 'badge-store.svg',
  management_store_manager_certified: 'badge-store.svg',
  certification_five_star_partner: 'gold.svg',
  certification_gold_partner: 'gold.svg',
  certification_excellent_manager: 'argent.svg',
  certification_champion_store_manager: 'argent.svg',
  certification_brand_guardian: 'bronze.svg',
  certification_zhao_honor: 'bronze.svg',
};

async function main() {
  console.log('Seeding badge image file names...');

  for (const [code, fileName] of Object.entries(BADGE_IMAGES)) {
    const badge = await prisma.trainingBadge.findUnique({ where: { code } });
    if (!badge) {
      console.warn(`  Badge not found: ${code}`);
      continue;
    }
    if (badge.imageFileName) {
      console.log(`  Skipping ${code} — already has imageFileName: ${badge.imageFileName}`);
      continue;
    }
    await prisma.trainingBadge.update({
      where: { code },
      data: { imageFileName: fileName },
    });
    console.log(`  Set ${code} → ${fileName}`);
  }

  const updatedCount = await prisma.trainingBadge.count({
    where: { imageFileName: { not: null } },
  });
  const totalCount = await prisma.trainingBadge.count();
  console.log(`\nDone. ${updatedCount}/${totalCount} badges have imageFileName.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
