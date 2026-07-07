import type {
  TitleCatalogItem,
  TitleCategory,
  TitleIconType,
  TitleRarity,
} from "@/types/title";

type TitleSeed = readonly [
  slug: string,
  rarity: TitleRarity,
  level: number,
  i18nSuffix: string,
  iconType: TitleIconType,
];

const TITLE_SEEDS: Record<TitleCategory, readonly TitleSeed[]> = {
  growth: [
    ["sprout-partner", "common", 1, "sproutPartner", "plant"],
    ["reliable-partner", "common", 2, "reliablePartner", "plant"],
    ["steady-contributor", "common", 3, "steadyContributor", "plant"],
    ["progress-star", "rare", 4, "progressStar", "star"],
    ["excellent-partner", "rare", 5, "excellentPartner", "star"],
    ["store-backbone", "rare", 6, "storeBackbone", "plant"],
    ["benchmark", "epic", 7, "benchmark", "plant"],
    ["team-core", "epic", 8, "teamCore", "plant"],
    ["role-model", "epic", 9, "roleModel", "star"],
    ["zhao-star", "epic", 10, "zhaoStar", "star"],
  ],
  front: [
    ["smile-host", "common", 1, "smileHost", "smile"],
    ["service-helper", "common", 2, "serviceHelper", "smile"],
    ["customer-favorite", "rare", 3, "customerFavorite", "smile"],
    ["floor-rhythm", "rare", 4, "floorRhythm", "girl"],
    ["table-turnover", "rare", 5, "tableTurnover", "smile"],
    ["service-vibe", "rare", 6, "serviceVibe", "smile"],
    ["control-expert", "epic", 7, "controlExpert", "girl"],
    ["complaint-closer", "epic", 8, "complaintCloser", "trusted"],
    ["commander", "epic", 9, "commander", "trusted"],
    ["store-face", "legendary", 10, "storeFace", "prestige"],
  ],
  kitchen: [
    ["output-guardian", "common", 1, "outputGuardian", "cooking"],
    ["prep-helper", "common", 2, "prepHelper", "chef"],
    ["heat-controller", "rare", 3, "heatController", "cooking"],
    ["steady-king", "rare", 4, "steadyKing", "cooking"],
    ["cutting-efficiency", "rare", 5, "cuttingEfficiency", "chef"],
    ["quality-gatekeeper", "rare", 6, "qualityGatekeeper", "trusted"],
    ["rhythm-master", "epic", 7, "rhythmMaster", "cooking"],
    ["serving-accelerator", "epic", 8, "servingAccelerator", "plant"],
    ["core", "epic", 9, "core", "cooking"],
    ["taste-guardian", "legendary", 10, "tasteGuardian", "prestige"],
  ],
  management: [
    ["coach-captain", "common", 1, "coachCaptain", "trusted"],
    ["shift-lead", "common", 2, "shiftLead", "trusted"],
    ["goal-executor", "rare", 3, "goalExecutor", "prestige"],
    ["schedule-planner", "rare", 4, "schedulePlanner", "prestige"],
    ["cost-observer", "rare", 5, "costObserver", "plant"],
    ["team-engine", "rare", 6, "teamEngine", "prestige"],
    ["rising-star", "epic", 7, "risingStar", "star"],
    ["operator", "epic", 8, "operator", "prestige"],
    ["store-strategist", "epic", 9, "storeStrategist", "prestige"],
    ["champion-manager", "legendary", 10, "championManager", "prestige"],
  ],
  fun: [
    ["never-drops", "common", 1, "neverDrops", "trusted"],
    ["today-reliable", "common", 2, "todayReliable", "smile"],
    ["store-anchor", "rare", 3, "storeAnchor", "trusted"],
    ["rescue-hero", "rare", 4, "rescueHero", "flash"],
    ["peak-warrior", "epic", 5, "peakWarrior", "flash"],
    ["zero-complaint-guardian", "rare", 6, "zeroComplaintGuardian", "trusted"],
    ["fill-master", "rare", 7, "fillMaster", "flash"],
    ["universal-screw", "epic", 8, "universalScrew", "flash"],
    ["clear-minded", "epic", 9, "clearMinded", "prestige"],
    ["zhao-ace", "legendary", 10, "zhaoAce", "prestige"],
  ],
  premium: [
    ["five-star-partner", "rare", 1, "fiveStarPartner", "star"],
    ["gold-partner", "rare", 2, "goldPartner", "prestige"],
    ["honor-partner", "epic", 3, "honorPartner", "prestige"],
    ["excellent-manager", "epic", 4, "excellentManager", "diamond"],
    ["ace-manager", "epic", 5, "aceManager", "diamond"],
    ["peak-manager", "legendary", 6, "peakManager", "prestige"],
    ["champion-manager", "legendary", 7, "championManager", "prestige"],
    ["legend-manager", "legendary", 8, "legendManager", "prestige"],
    ["brand-guardian", "legendary", 9, "brandGuardian", "diamond"],
    ["zhao-crown", "legendary", 10, "zhaoCrown", "prestige"],
  ],
};

function createTitleItems(category: TitleCategory): TitleCatalogItem[] {
  return TITLE_SEEDS[category].map(([slug, rarity, level, i18nSuffix, iconType]) => ({
    id: `${category}-${slug}`,
    category,
    rarity,
    level,
    i18nKey: `titles.${category}.${i18nSuffix}`,
    iconType,
    unlockHintKey: `titles.unlock.${category}Level${level}`,
  }));
}

export const titleCatalog: readonly TitleCatalogItem[] = [
  ...createTitleItems("growth"),
  ...createTitleItems("front"),
  ...createTitleItems("kitchen"),
  ...createTitleItems("management"),
  ...createTitleItems("fun"),
  ...createTitleItems("premium"),
] as const;

export function findTitleById(titleId: string): TitleCatalogItem | undefined {
  return titleCatalog.find((item) => item.id === titleId);
}
