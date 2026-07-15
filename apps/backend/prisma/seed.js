const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const HOLDING_RESTAURANT = {
  name: 'ZHAO Groupe',
  address: '169 avenue de Choisy 75013',
  photoUrl: null,
};
const LOCAL_SUPER_ADMIN_EMAIL = 'admin@zhao-family.local';

const PERMISSIONS = [
  {
    key: 'system.permission.manage',
    description: 'Manage system role assignments',
  },
  {
    key: 'employee.job_role.manage_store',
    description: 'Manage job roles for employees in the same store',
  },
  {
    key: 'training.material.read',
    description: 'Read training material metadata',
  },
  {
    key: 'training.material.play',
    description: 'Open and play training materials',
  },
  {
    key: 'training.material.create',
    description: 'Create training materials',
  },
  {
    key: 'training.material.update',
    description: 'Update training materials',
  },
  {
    key: 'training.material.delete',
    description: 'Delete training materials',
  },
  {
    key: 'training.position.manage',
    description: 'Manage training positions',
  },
  {
    key: 'training.progress.view_store',
    description: 'View store training progress',
  },
  {
    key: 'training.badge.manage',
    description: 'Manage training badge definitions and requirements',
  },
  {
    key: 'training.title.manage',
    description: 'Assign and revoke employee training titles',
  },
  {
    key: 'recruitment.request.manage',
    description: 'Manage recruitment requests from stores',
  },
  {
    key: 'abc.score.read',
    description: 'View ABC score cycles and leaderboard',
  },
  {
    key: 'abc.score.fill_marketing',
    description: 'Fill ABC marketing scores for stores',
  },
  {
    key: 'abc.score.fill_operations',
    description: 'Fill ABC operations (audit) scores and upload reports',
  },
  {
    key: 'abc.score.publish',
    description: 'Publish the ABC score leaderboard',
  },
  {
    key: 'case.share.review',
    description: 'Review (approve/reject) shared cases from partners',
  },
  {
    key: 'catalog.product.manage',
    description: 'Create, update, and delete products',
  },
  {
    key: 'catalog.supplier.manage',
    description: 'Create, update, and delete suppliers',
  },
  {
    key: 'catalog.restaurant.manage',
    description: 'Create, update, and delete restaurants',
  },
  {
    key: 'inventory.movement.create',
    description: 'Record manual inventory stock movements',
  },
  {
    key: 'screen_security.audit',
    description: 'View screen security audit log (screenshot and recording events)',
  },
  {
    key: 'screen_security.delete',
    description: 'Delete screen security event records',
  },
  {
    key: 'recipe.manage',
    description: 'Create, update, publish, and delete recipes',
  },
];

const TRAINING_POSITIONS = [
  {
    code: 'ALL',
    nameZh: '全岗通用',
    nameEn: 'All positions',
    nameFr: 'Tous les postes',
    parentCode: null,
    sortOrder: 0,
  },
  {
    code: 'FOH',
    nameZh: '前厅',
    nameEn: 'Front of House',
    nameFr: 'Salle',
    parentCode: null,
    sortOrder: 10,
  },
  {
    code: 'FRONT_HOST',
    nameZh: '迎宾',
    nameEn: 'Host',
    nameFr: 'Accueil',
    parentCode: 'FOH',
    sortOrder: 11,
  },
  {
    code: 'FRONT_CASHIER',
    nameZh: '收银',
    nameEn: 'Cashier',
    nameFr: 'Caisse',
    parentCode: 'FOH',
    sortOrder: 12,
  },
  {
    code: 'FRONT_SERVER',
    nameZh: '服务生',
    nameEn: 'Server',
    nameFr: 'Serveur',
    parentCode: 'FOH',
    sortOrder: 13,
  },
  {
    code: 'FRONT_PACKER',
    nameZh: '打包',
    nameEn: 'Packing',
    nameFr: 'Emballage',
    parentCode: 'FOH',
    sortOrder: 14,
  },
  {
    code: 'FRONT_BAR',
    nameZh: '吧台',
    nameEn: 'Bar',
    nameFr: 'Bar',
    parentCode: 'FOH',
    sortOrder: 15,
  },
  {
    code: 'BOH',
    nameZh: '后厨',
    nameEn: 'Back of House',
    nameFr: 'Cuisine',
    parentCode: null,
    sortOrder: 20,
  },
  {
    code: 'BACK_DISHWASHER',
    nameZh: '洗碗',
    nameEn: 'Dishwasher',
    nameFr: 'Plonge',
    parentCode: 'BOH',
    sortOrder: 21,
  },
  {
    code: 'BACK_NOODLE',
    nameZh: '面区',
    nameEn: 'Noodle station',
    nameFr: 'Nouilles',
    parentCode: 'BOH',
    sortOrder: 22,
  },
  {
    code: 'BACK_HOT_APPETIZER',
    nameZh: '热前菜',
    nameEn: 'Hot appetizers',
    nameFr: 'Entrées chaudes',
    parentCode: 'BOH',
    sortOrder: 23,
  },
  {
    code: 'BACK_COLD_APPETIZER',
    nameZh: '冷前菜',
    nameEn: 'Cold appetizers',
    nameFr: 'Entrées froides',
    parentCode: 'BOH',
    sortOrder: 24,
  },
  {
    code: 'BACK_RICE',
    nameZh: '饭区',
    nameEn: 'Rice station',
    nameFr: 'Riz',
    parentCode: 'BOH',
    sortOrder: 25,
  },
  {
    code: 'CASH',
    nameZh: '收银',
    nameEn: 'Cashier',
    nameFr: 'Caisse',
    parentCode: null,
    sortOrder: 30,
  },
  {
    code: 'SM',
    nameZh: '店长',
    nameEn: 'Store Manager',
    nameFr: 'Responsable boutique',
    parentCode: null,
    sortOrder: 40,
  },
  {
    code: 'RM',
    nameZh: '区域经理',
    nameEn: 'Regional Manager',
    nameFr: 'Responsable régional',
    parentCode: null,
    sortOrder: 50,
  },
  {
    code: 'HOLDING',
    nameZh: '总部',
    nameEn: 'Holding',
    nameFr: 'Holding',
    parentCode: null,
    sortOrder: 60,
  },
];

const TRAINING_JOB_ROLE_POSITIONS = [
  {
    jobRole: 'holding',
    positionCode: 'HOLDING',
    includeDescendants: false,
    grantsAllPositions: true,
  },
  {
    jobRole: 'regional-manager',
    positionCode: 'RM',
    includeDescendants: false,
    grantsAllPositions: true,
  },
  {
    jobRole: 'store-manager',
    positionCode: 'SM',
    includeDescendants: false,
    grantsAllPositions: true,
  },
  {
    jobRole: 'front-manager',
    positionCode: 'FOH',
    includeDescendants: true,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-manager',
    positionCode: 'BOH',
    includeDescendants: true,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-assistant',
    positionCode: 'FOH',
    includeDescendants: true,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-assistant',
    positionCode: 'BOH',
    includeDescendants: true,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-of-house',
    positionCode: 'FOH',
    includeDescendants: true,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-of-house',
    positionCode: 'BOH',
    includeDescendants: true,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-host',
    positionCode: 'FRONT_HOST',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-cashier',
    positionCode: 'FRONT_CASHIER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-server',
    positionCode: 'FRONT_SERVER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-packer',
    positionCode: 'FRONT_PACKER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'front-bar',
    positionCode: 'FRONT_BAR',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-dishwasher',
    positionCode: 'BACK_DISHWASHER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-noodle',
    positionCode: 'BACK_NOODLE',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-hot-appetizer',
    positionCode: 'BACK_HOT_APPETIZER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-cold-appetizer',
    positionCode: 'BACK_COLD_APPETIZER',
    includeDescendants: false,
    grantsAllPositions: false,
  },
  {
    jobRole: 'back-rice',
    positionCode: 'BACK_RICE',
    includeDescendants: false,
    grantsAllPositions: false,
  },
];

const TRAINING_BADGES = [
  // ── General ──
  {
    code: 'general_onboarding_certification',
    nameZh: '入职培训完成认证',
    nameEn: 'Onboarding Certification',
    nameFr: 'Certification integration',
    descriptionZh: '完成入职必修资料并通过对应测验后自动获得。',
    descriptionEn:
      'Earned after completing required onboarding materials and passing the related quiz.',
    descriptionFr:
      'Obtenue apres les formations obligatoires et le quiz associe.',
    track: 'general',
    rarity: 'common',
    level: null,
    iconType: 'training',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 10,
  },
  {
    code: 'general_food_safety_basic',
    nameZh: '食品安全基础认证',
    nameEn: 'Food Safety Basic',
    nameFr: 'Securite alimentaire base',
    descriptionZh: '验证食品安全基础知识和日常执行标准。',
    descriptionEn:
      'Validates basic food-safety knowledge and daily standards.',
    descriptionFr:
      'Valide les bases de securite alimentaire et les standards quotidiens.',
    track: 'safety',
    rarity: 'rare',
    level: null,
    iconType: 'safety',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 20,
  },
  {
    code: 'general_hygiene_standard',
    nameZh: '卫生规范认证',
    nameEn: 'Hygiene Standard',
    nameFr: 'Standard hygiene',
    descriptionZh: '验证个人卫生、清洁和交叉污染预防标准。',
    descriptionEn:
      'Validates hygiene, cleaning, and contamination-prevention standards.',
    descriptionFr:
      'Valide hygiene, nettoyage et prevention des contaminations.',
    track: 'hygiene',
    rarity: 'common',
    level: null,
    iconType: 'hygiene',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 30,
  },
  {
    code: 'general_store_rules',
    nameZh: '门店规章基础认证',
    nameEn: 'Store Rules Basic',
    nameFr: 'Regles magasin de base',
    descriptionZh: '验证门店基本规章制度的理解和遵守。',
    descriptionEn:
      'Validates understanding of basic store rules and policies.',
    descriptionFr:
      'Valide la comprehension des regles de base du magasin.',
    track: 'general',
    rarity: 'common',
    level: null,
    iconType: 'book',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 40,
  },
  {
    code: 'general_teamwork_basic',
    nameZh: '团队协作基础认证',
    nameEn: 'Teamwork Basic',
    nameFr: 'Travail d equipe base',
    descriptionZh: '验证团队协作意识和基础沟通能力。',
    descriptionEn:
      'Validates teamwork awareness and basic communication skills.',
    descriptionFr:
      'Valide la conscience du travail d equipe et les competences de communication.',
    track: 'general',
    rarity: 'common',
    level: null,
    iconType: 'team',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 50,
  },

  // ── Front of House ──
  {
    code: 'front_level_1_service_certification',
    nameZh: '前厅 Level 1 基础服务认证',
    nameEn: 'FOH Level 1 Service',
    nameFr: 'Salle niveau 1',
    descriptionZh: '完成前厅基础服务资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing basic front-of-house training and assessment.',
    descriptionFr:
      'Obtenue apres la formation salle de base et son evaluation.',
    track: 'front',
    rarity: 'common',
    level: 1,
    iconType: 'service',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 100,
  },
  {
    code: 'front_level_2_independent_service',
    nameZh: '前厅 Level 2 独立服务认证',
    nameEn: 'FOH Level 2 Independent Service',
    nameFr: 'Salle niveau 2 service independant',
    descriptionZh: '完成前厅独立服务资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing independent service training and assessment.',
    descriptionFr:
      'Obtenue apres la formation service independant et son evaluation.',
    track: 'front',
    rarity: 'rare',
    level: 2,
    iconType: 'bell',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 110,
  },
  {
    code: 'front_level_3_peak_service',
    nameZh: '前厅 Level 3 高峰服务认证',
    nameEn: 'FOH Level 3 Peak Service',
    nameFr: 'Salle niveau 3 service pointe',
    descriptionZh: '完成前厅高峰服务资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing peak-service training and assessment.',
    descriptionFr:
      'Obtenue apres la formation service en periode de pointe.',
    track: 'front',
    rarity: 'rare',
    level: 3,
    iconType: 'clock',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 120,
  },
  {
    code: 'front_level_4_shift_lead',
    nameZh: '前厅 Level 4 领班认证',
    nameEn: 'FOH Level 4 Shift Lead',
    nameFr: 'Salle niveau 4 chef de quart',
    descriptionZh: '完成前厅领班管理资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing shift-lead training and assessment.',
    descriptionFr:
      'Obtenue apres la formation chef de quart et son evaluation.',
    track: 'front',
    rarity: 'epic',
    level: 4,
    iconType: 'target',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 130,
  },
  {
    code: 'front_level_5_assistant_intern',
    nameZh: '前厅 Level 5 助理实习认证',
    nameEn: 'FOH Level 5 Assistant Intern',
    nameFr: 'Salle niveau 5 assistant stagiaire',
    descriptionZh: '完成前厅助理实习资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing assistant intern training and assessment.',
    descriptionFr:
      'Obtenue apres la formation assistant stagiaire et son evaluation.',
    track: 'front',
    rarity: 'epic',
    level: 5,
    iconType: 'star',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 140,
  },
  {
    code: 'front_level_5_assistant_certified',
    nameZh: '前厅 Level 5 助理认证',
    nameEn: 'FOH Level 5 Assistant Certified',
    nameFr: 'Salle niveau 5 assistant certifie',
    descriptionZh: '完成前厅助理认证资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing assistant certification training and assessment.',
    descriptionFr:
      'Obtenue apres la formation assistant certifie et son evaluation.',
    track: 'front',
    rarity: 'epic',
    level: 5,
    iconType: 'certificate',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 150,
  },
  {
    code: 'front_level_5_manager_certification',
    nameZh: '前厅 Level 5 经理认证',
    nameEn: 'FOH Level 5 Manager Certification',
    nameFr: 'Salle niveau 5 gestionnaire',
    descriptionZh: '完成前厅经理管理资料并通过考核后获得。要求分数 88 分以上。',
    descriptionEn:
      'Earned after completing manager training and assessment. Requires a score of 88+.',
    descriptionFr:
      'Obtenue apres la formation gestionnaire. Score requis de 88+.',
    track: 'front',
    rarity: 'legendary',
    level: 5,
    iconType: 'crown',
    requiredScore: 88,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 160,
  },

  // ── Kitchen ──
  {
    code: 'kitchen_level_1_output_certification',
    nameZh: '厨房 Level 1 基础出品认证',
    nameEn: 'Kitchen Level 1 Output',
    nameFr: 'Cuisine niveau 1',
    descriptionZh: '完成厨房基础出品资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing basic kitchen output training and assessment.',
    descriptionFr:
      'Obtenue apres la formation cuisine de base et son evaluation.',
    track: 'kitchen',
    rarity: 'common',
    level: 1,
    iconType: 'bowl',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 200,
  },
  {
    code: 'kitchen_level_2_prep_certification',
    nameZh: '厨房 Level 2 备料认证',
    nameEn: 'Kitchen Level 2 Prep',
    nameFr: 'Cuisine niveau 2 preparation',
    descriptionZh: '完成厨房备料资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing kitchen prep training and assessment.',
    descriptionFr:
      'Obtenue apres la formation preparation cuisine et son evaluation.',
    track: 'kitchen',
    rarity: 'rare',
    level: 2,
    iconType: 'kitchen',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 210,
  },
  {
    code: 'kitchen_level_3_independent_serving',
    nameZh: '厨房 Level 3 独立出餐认证',
    nameEn: 'Kitchen Level 3 Independent Serving',
    nameFr: 'Cuisine niveau 3 service independant',
    descriptionZh: '完成厨房独立出餐资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing independent serving training and assessment.',
    descriptionFr:
      'Obtenue apres la formation service independant en cuisine.',
    track: 'kitchen',
    rarity: 'rare',
    level: 3,
    iconType: 'flame',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 220,
  },
  {
    code: 'kitchen_level_4_quality_stability',
    nameZh: '厨房 Level 4 品质稳定认证',
    nameEn: 'Kitchen Level 4 Quality Stability',
    nameFr: 'Cuisine niveau 4 stabilite qualite',
    descriptionZh: '完成厨房品质稳定资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing quality-stability training and assessment.',
    descriptionFr:
      'Obtenue apres la formation stabilite qualite et son evaluation.',
    track: 'kitchen',
    rarity: 'epic',
    level: 4,
    iconType: 'steam',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 230,
  },
  {
    code: 'kitchen_level_5_assistant_intern',
    nameZh: '厨房 Level 5 助理实习认证',
    nameEn: 'Kitchen Level 5 Assistant Intern',
    nameFr: 'Cuisine niveau 5 assistant stagiaire',
    descriptionZh: '完成厨房助理实习资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing assistant intern training and assessment.',
    descriptionFr:
      'Obtenue apres la formation assistant stagiaire en cuisine.',
    track: 'kitchen',
    rarity: 'epic',
    level: 5,
    iconType: 'star',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 240,
  },
  {
    code: 'kitchen_level_5_assistant_certified',
    nameZh: '厨房 Level 5 助理认证',
    nameEn: 'Kitchen Level 5 Assistant Certified',
    nameFr: 'Cuisine niveau 5 assistant certifie',
    descriptionZh: '完成厨房助理认证资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing assistant certification training and assessment.',
    descriptionFr:
      'Obtenue apres la formation assistant certifie en cuisine.',
    track: 'kitchen',
    rarity: 'epic',
    level: 5,
    iconType: 'certificate',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 250,
  },
  {
    code: 'kitchen_level_5_manager_certification',
    nameZh: '厨房 Level 5 经理认证',
    nameEn: 'Kitchen Level 5 Manager Certification',
    nameFr: 'Cuisine niveau 5 gestionnaire',
    descriptionZh: '完成厨房经理管理资料并通过考核后获得。要求分数 88 分以上。',
    descriptionEn:
      'Earned after completing manager training and assessment. Requires a score of 88+.',
    descriptionFr:
      'Obtenue apres la formation gestionnaire cuisine. Score requis de 88+.',
    track: 'kitchen',
    rarity: 'legendary',
    level: 5,
    iconType: 'crown',
    requiredScore: 88,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 260,
  },

  // ── Management ──
  {
    code: 'management_coaching_certification',
    nameZh: '教练认证',
    nameEn: 'Coaching Certification',
    nameFr: 'Certification coaching',
    descriptionZh: '完成教练培训资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing coaching training and assessment.',
    descriptionFr:
      'Obtenue apres la formation coaching et son evaluation.',
    track: 'management',
    rarity: 'rare',
    level: null,
    iconType: 'team',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 300,
  },
  {
    code: 'management_scheduling_basic',
    nameZh: '排班基础认证',
    nameEn: 'Scheduling Basic',
    nameFr: 'Planification de base',
    descriptionZh: '完成排班管理资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing scheduling training and assessment.',
    descriptionFr:
      'Obtenue apres la formation planification et son evaluation.',
    track: 'management',
    rarity: 'epic',
    level: null,
    iconType: 'clock',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 310,
  },
  {
    code: 'management_cost_awareness',
    nameZh: '成本意识认证',
    nameEn: 'Cost Awareness',
    nameFr: 'Sensibilisation aux couts',
    descriptionZh: '完成成本控制资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing cost-awareness training and assessment.',
    descriptionFr:
      'Obtenue apres la formation sensibilisation aux couts.',
    track: 'management',
    rarity: 'epic',
    level: null,
    iconType: 'chart',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 320,
  },
  {
    code: 'management_inventory',
    nameZh: '库存管理认证',
    nameEn: 'Inventory Management',
    nameFr: 'Gestion des stocks',
    descriptionZh: '完成库存管理资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing inventory management training and assessment.',
    descriptionFr:
      'Obtenue apres la formation gestion des stocks et son evaluation.',
    track: 'management',
    rarity: 'epic',
    level: null,
    iconType: 'book',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 330,
  },
  {
    code: 'management_team_communication',
    nameZh: '团队沟通认证',
    nameEn: 'Team Communication',
    nameFr: 'Communication d equipe',
    descriptionZh: '完成团队沟通资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing team communication training and assessment.',
    descriptionFr:
      'Obtenue apres la formation communication d equipe.',
    track: 'management',
    rarity: 'epic',
    level: null,
    iconType: 'team',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 340,
  },
  {
    code: 'management_store_operations_basic',
    nameZh: '门店运营基础认证',
    nameEn: 'Store Operations Basic',
    nameFr: 'Operations magasin base',
    descriptionZh: '验证门店运营、协作和执行基础能力。',
    descriptionEn:
      'Validates basic store operations, teamwork, and execution.',
    descriptionFr:
      'Valide les bases des operations, de la coordination et de la execution.',
    track: 'management',
    rarity: 'epic',
    level: null,
    iconType: 'target',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 350,
  },
  {
    code: 'management_store_manager_intern',
    nameZh: '店长实习认证',
    nameEn: 'Store Manager Intern',
    nameFr: 'Stage directeur magasin',
    descriptionZh: '完成店长实习资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing store manager intern training and assessment.',
    descriptionFr:
      'Obtenue apres la formation stage directeur et son evaluation.',
    track: 'management',
    rarity: 'epic',
    level: null,
    iconType: 'management',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 360,
  },
  {
    code: 'management_store_manager_certified',
    nameZh: '店长认证',
    nameEn: 'Store Manager Certified',
    nameFr: 'Directeur magasin certifie',
    descriptionZh: '完成店长认证资料并通过考核后获得。要求分数 90 分以上。',
    descriptionEn:
      'Earned after completing store manager certification. Requires a score of 90+.',
    descriptionFr:
      'Obtenue apres la formation directeur certifie. Score requis de 90+.',
    track: 'management',
    rarity: 'legendary',
    level: null,
    iconType: 'crown',
    requiredScore: 90,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 370,
  },

  // ── Certification ──
  {
    code: 'certification_five_star_partner',
    nameZh: '五星合伙人认证',
    nameEn: 'Five-Star Partner',
    nameFr: 'Associe cinq etoiles',
    descriptionZh: '完成五星合伙人进阶资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing advanced five-star partner training and assessment.',
    descriptionFr:
      'Obtenue apres la formation avancee associe cinq etoiles.',
    track: 'certification',
    rarity: 'epic',
    level: null,
    iconType: 'star',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 400,
  },
  {
    code: 'certification_gold_partner',
    nameZh: '金牌合伙人认证',
    nameEn: 'Gold Partner',
    nameFr: 'Associe or',
    descriptionZh: '完成金牌合伙人进阶资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing advanced gold partner training and assessment.',
    descriptionFr:
      'Obtenue apres la formation avancee associe or.',
    track: 'certification',
    rarity: 'epic',
    level: null,
    iconType: 'laurel',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 410,
  },
  {
    code: 'certification_excellent_manager',
    nameZh: '优秀经理认证',
    nameEn: 'Excellent Manager',
    nameFr: 'Gestionnaire excellent',
    descriptionZh: '完成优秀经理进阶资料并通过考核后获得。',
    descriptionEn:
      'Earned after completing advanced excellent manager training and assessment.',
    descriptionFr:
      'Obtenue apres la formation avancee gestionnaire excellent.',
    track: 'certification',
    rarity: 'epic',
    level: null,
    iconType: 'certificate',
    requiredScore: 80,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 420,
  },
  {
    code: 'certification_champion_store_manager',
    nameZh: '冠军店长认证',
    nameEn: 'Champion Store Manager',
    nameFr: 'Directeur champion',
    descriptionZh: '完成冠军店长进阶资料并通过考核后获得。要求分数 92 分以上。',
    descriptionEn:
      'Earned after completing champion manager training. Requires a score of 92+.',
    descriptionFr:
      'Obtenue apres la formation directeur champion. Score requis de 92+.',
    track: 'certification',
    rarity: 'legendary',
    level: null,
    iconType: 'crown',
    requiredScore: 92,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 430,
  },
  {
    code: 'certification_brand_guardian',
    nameZh: '品牌守护者认证',
    nameEn: 'Brand Guardian',
    nameFr: 'Gardien de la marque',
    descriptionZh: '完成品牌守护者进阶资料并通过考核后获得。要求分数 92 分以上。',
    descriptionEn:
      'Earned after completing brand guardian training. Requires a score of 92+.',
    descriptionFr:
      'Obtenue apres la formation gardien de la marque. Score requis de 92+.',
    track: 'certification',
    rarity: 'legendary',
    level: null,
    iconType: 'shield',
    requiredScore: 92,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 440,
  },
  {
    code: 'certification_zhao_honor',
    nameZh: '赵氏荣誉认证',
    nameEn: 'Zhao Honor',
    nameFr: 'Honneur Zhao',
    descriptionZh: '完成赵氏荣誉进阶资料并通过考核后获得。要求分数 95 分以上。',
    descriptionEn:
      'Earned after completing Zhao Honor training. Requires a score of 95+.',
    descriptionFr:
      'Obtenue apres la formation Honneur Zhao. Score requis de 95+.',
    track: 'certification',
    rarity: 'legendary',
    level: null,
    iconType: 'crown',
    requiredScore: 95,
    requiredCompletionRate: 100,
    isActive: true,
    sortOrder: 450,
  },
];

const ROLES = [
  {
    name: 'super-admin',
    description: 'Full first-version system administration access',
    permissions: PERMISSIONS.map((permission) => permission.key),
  },
  {
    name: 'store-manager',
    description: 'Store manager baseline access',
    // No `recruitment.request.manage`: store managers SEND recruitment requests
    // (scoped to their own store) — only HQ reviewers hold the manage permission.
    permissions: [
      'employee.job_role.manage_store',
      'training.material.read',
      'training.material.play',
      'training.progress.view_store',
      'inventory.movement.create',
      'recipe.manage',
    ],
  },
  {
    name: 'training-admin',
    description: 'Can manage training materials',
    permissions: [
      'training.material.read',
      'training.material.play',
      'training.material.create',
      'training.material.update',
      'training.material.delete',
      'training.position.manage',
      'training.progress.view_store',
      'training.badge.manage',
      'training.title.manage',
      'recipe.manage',
    ],
  },
  {
    name: 'training-viewer',
    description: 'Can view and play training materials',
    permissions: ['training.material.read', 'training.material.play'],
  },
  {
    name: 'marketing-admin',
    description: 'Marketing department: fills ABC marketing scores',
    permissions: ['abc.score.read', 'abc.score.fill_marketing'],
  },
  {
    name: 'operations-admin',
    description:
      'Operations department: fills ABC audit scores and uploads reports',
    permissions: ['abc.score.read', 'abc.score.fill_operations'],
  },
];

async function upsertPermissions() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }
}

async function upsertRoles() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: {
        name: role.name,
        description: role.description,
      },
    });
  }
}

async function replaceRolePermissions() {
  for (const roleConfig of ROLES) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: roleConfig.name },
      select: { id: true },
    });
    const permissions = await prisma.permission.findMany({
      where: {
        key: {
          in: roleConfig.permissions,
        },
      },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      if (permissions.length === 0) {
        return;
      }

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    });
  }
}

async function upsertTrainingPositions() {
  for (const position of TRAINING_POSITIONS) {
    await prisma.trainingPosition.upsert({
      where: { code: position.code },
      update: {
        nameZh: position.nameZh,
        nameEn: position.nameEn,
        nameFr: position.nameFr,
        parentCode: position.parentCode,
        isActive: true,
        sortOrder: position.sortOrder,
      },
      create: {
        ...position,
        isActive: true,
      },
    });
  }
}

async function upsertJobRolePositions() {
  for (const mapping of TRAINING_JOB_ROLE_POSITIONS) {
    await prisma.trainingJobRolePosition.upsert({
      where: { jobRole: mapping.jobRole },
      update: {
        positionCode: mapping.positionCode,
        includeDescendants: mapping.includeDescendants,
        grantsAllPositions: mapping.grantsAllPositions,
      },
      create: mapping,
    });
  }
}

const SAMPLE_QUIZ_QUESTIONS = [
  {
    type: 'single',
    prompt: '处理生熟食材时，正确的做法是？',
    options: [
      { key: 'a', label: '使用同一块砧板节省时间' },
      { key: 'b', label: '生熟分开，使用不同砧板和刀具' },
      { key: 'c', label: '只要看起来干净即可' },
    ],
    correctKeys: ['b'],
    explanation: '生熟分开可避免交叉污染，是食品安全的基本要求。',
    sortOrder: 1,
  },
  {
    type: 'multiple',
    prompt: '以下哪些属于洗手的关键时刻？（多选）',
    options: [
      { key: 'a', label: '接触生肉后' },
      { key: 'b', label: '上洗手间后' },
      { key: 'c', label: '处理即食食品前' },
      { key: 'd', label: '下班离店时' },
    ],
    correctKeys: ['a', 'b', 'c'],
    explanation: '接触污染源后和接触即食食品前都必须洗手。',
    sortOrder: 2,
  },
  {
    type: 'boolean',
    prompt: '冷藏区温度应保持在 4°C 或以下。',
    options: [
      { key: 'true', label: '正确' },
      { key: 'false', label: '错误' },
    ],
    correctKeys: ['true'],
    explanation: '冷藏温度应保持在 4°C 或以下以抑制细菌繁殖。',
    sortOrder: 3,
  },
];

async function upsertTrainingBadges() {
  for (const badge of TRAINING_BADGES) {
    await prisma.trainingBadge.upsert({
      where: { code: badge.code },
      update: {
        nameZh: badge.nameZh,
        nameEn: badge.nameEn,
        nameFr: badge.nameFr,
        descriptionZh: badge.descriptionZh,
        descriptionEn: badge.descriptionEn,
        descriptionFr: badge.descriptionFr,
        track: badge.track,
        rarity: badge.rarity,
        level: badge.level,
        iconType: badge.iconType,
        requiredScore: badge.requiredScore,
        requiredCompletionRate: badge.requiredCompletionRate,
        isActive: badge.isActive,
        sortOrder: badge.sortOrder,
      },
      create: badge,
    });
  }
}

// Attaches a demo quiz to the first required "ALL" material that has none, so
// the mobile quiz flow can be exercised once at least one material exists.
async function seedSampleQuiz() {
  const material = await prisma.trainingMaterial.findFirst({
    where: { positionId: 'ALL', isRequired: true, quiz: { is: null } },
    orderBy: { id: 'asc' },
    select: { id: true, title: true },
  });

  if (!material) {
    console.log(
      '[seed] no eligible ALL material without a quiz; sample quiz skipped',
    );
    return;
  }

  const quiz = await prisma.trainingQuiz.create({
    data: {
      materialId: material.id,
      passingScore: 80,
      maxAttempts: null,
      questions: { create: SAMPLE_QUIZ_QUESTIONS },
    },
  });

  console.log(
    `[seed] attached sample quiz ${quiz.id} to material ${material.id} ("${material.title}")`,
  );
}

async function upsertHoldingRestaurant() {
  const existing = await prisma.restaurant.findUnique({
    where: { name: HOLDING_RESTAURANT.name },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  // Only bootstrap the synthetic holding store on a fresh/empty database.
  // On an already-populated DB the real HQ restaurant already exists, so
  // creating "ZHAO Holding" here would just add an orphan row.
  const restaurantCount = await prisma.restaurant.count();

  if (restaurantCount > 0) {
    return null;
  }

  return prisma.restaurant.create({
    data: {
      ...HOLDING_RESTAURANT,
      updatedAt: new Date(),
    },
    select: { id: true },
  });
}

async function assignSuperAdminRole() {
  const superAdminEmail = (
    process.env.SUPER_ADMIN_EMAIL || LOCAL_SUPER_ADMIN_EMAIL
  )
    .trim()
    .toLowerCase();

  if (!superAdminEmail) {
    return;
  }

  const [user, role, holdingRestaurant] = await Promise.all([
    prisma.user.findUnique({
      where: { email: superAdminEmail },
      select: { id: true },
    }),
    prisma.role.findUnique({
      where: { name: 'super-admin' },
      select: { id: true },
    }),
    upsertHoldingRestaurant(),
  ]);

  if (!user || !role) {
    return;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        ...(holdingRestaurant ? { restaurantId: holdingRestaurant.id } : {}),
        jobRole: 'holding',
      },
    }),
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    }),
  ]);
}

async function removeSuperAdminRoleFromStoreUsers() {
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'super-admin' },
    select: { id: true },
  });

  if (!superAdminRole) {
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      jobRole: {
        not: 'holding',
      },
      userRoles: {
        some: {
          roleId: superAdminRole.id,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (users.length === 0) {
    return;
  }

  await prisma.userRole.deleteMany({
    where: {
      roleId: superAdminRole.id,
      userId: {
        in: users.map((user) => user.id),
      },
    },
  });
}

async function removeStoreManagerRoleFromNonManagers() {
  const storeManagerRole = await prisma.role.findUnique({
    where: { name: 'store-manager' },
    select: { id: true },
  });

  if (!storeManagerRole) {
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        {
          jobRole: {
            not: {
              contains: 'store-manager',
            },
          },
        },
        {
          jobRole: {
            not: {
              contains: 'regional-manager',
            },
          },
        },
      ],
      userRoles: {
        some: {
          roleId: storeManagerRole.id,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (users.length === 0) {
    return;
  }

  await prisma.userRole.deleteMany({
    where: {
      roleId: storeManagerRole.id,
      userId: {
        in: users.map((user) => user.id),
      },
    },
  });
}

async function main() {
  await upsertHoldingRestaurant();
  await upsertPermissions();
  await upsertRoles();
  await replaceRolePermissions();
  await upsertTrainingPositions();
  await upsertJobRolePositions();
  await upsertTrainingBadges();
  await seedSampleQuiz();
  await assignSuperAdminRole();
  await removeSuperAdminRoleFromStoreUsers();
  await removeStoreManagerRoleFromNonManagers();
}

main().finally(async () => {
  await prisma.$disconnect();
});
