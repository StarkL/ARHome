/**
 * 标准真实物理尺寸家居库 (1:1 Metric Scale Catalog)
 * 单位：毫米 (mm) | 引擎内自动除以 1000 转换为米 (m)
 * 严格按照中国国家标准家具尺寸及人体工程学规范录入
 */

export const FURNITURE_CATEGORIES = [
  { id: 'all', name: '全部家居' },
  { id: 'bedroom', name: '卧室睡眠' },
  { id: 'living', name: '客厅沙发' },
  { id: 'dining', name: '餐厨桌椅' },
  { id: 'study', name: '书房办公' },
  { id: 'storage', name: '收纳柜体' },
  { id: 'decor', name: '灯具绿植' },
];

export const FURNITURE_ITEMS = [
  // ================= 卧室家具 =================
  {
    id: 'bed-king-1800',
    name: '1.8米现代真皮大双人床',
    category: 'bedroom',
    dimensionsMm: {
      width: 1880,   // 含床侧包边宽度
      length: 2180,  // 含床头靠背厚度总长
      height: 980    // 床头最高处高度
    },
    mattressSizeMm: { width: 1800, length: 2000 },
    clearanceRequirementMm: 600, // 推荐床侧通行净宽
    description: '主卧标准 1.8m×2.0m 规格，舒适高弹软包床头，带床箱储物空间。',
    defaultColor: '#3d3835',
    colorVariants: [
      { name: '冷灰皮革', color: '#4b5563' },
      { name: '暖咖色', color: '#574838' },
      { name: '米白棉麻', color: '#d8d4cb' },
      { name: '墨黑真皮', color: '#1c1917' }
    ],
    priceEstimate: 3899,
    icon: 'BedDouble'
  },
  {
    id: 'bed-queen-1500',
    name: '1.5米极简实木双人床',
    category: 'bedroom',
    dimensionsMm: {
      width: 1560,
      length: 2080,
      height: 920
    },
    mattressSizeMm: { width: 1500, length: 2000 },
    clearanceRequirementMm: 600,
    description: '次卧/紧凑户型标准 1.5m 规格，北美黑胡桃实木框架，悬浮感床底。',
    defaultColor: '#453229',
    colorVariants: [
      { name: '黑胡桃木', color: '#3a2920' },
      { name: '白橡木色', color: '#bfa075' },
      { name: '浅原木色', color: '#d4b791' }
    ],
    priceEstimate: 2980,
    icon: 'Bed'
  },
  {
    id: 'bedside-table-01',
    name: '极简双抽床头柜',
    category: 'bedroom',
    dimensionsMm: {
      width: 480,
      length: 420,
      height: 480
    },
    clearanceRequirementMm: 450,
    description: '标准床头伴侣，静音滑轨双抽屉，岩板台面耐磨防刮。',
    defaultColor: '#2d2825',
    colorVariants: [
      { name: '深胡桃木', color: '#2d2825' },
      { name: '纯白烤漆', color: '#e5e7eb' },
      { name: '雾霾灰', color: '#64748b' }
    ],
    priceEstimate: 450,
    icon: 'Layers'
  },
  {
    id: 'wardrobe-4door-2000',
    name: '4门现代对开定制大衣柜',
    category: 'storage',
    dimensionsMm: {
      width: 2000,
      length: 600,   // 标准柜体深度
      height: 2400   // 适合标准层高顶天立地
    },
    clearanceRequirementMm: 700, // 开门及通行最小尺寸
    description: '四门标准衣柜，包含长衣挂衣区、叠放区、抽屉与顶部被褥收纳区。',
    defaultColor: '#2b2a29',
    colorVariants: [
      { name: '极简暖白', color: '#ece8e1' },
      { name: '深炭灰色', color: '#2b2a29' },
      { name: '轻奢原木', color: '#8c6e4e' }
    ],
    priceEstimate: 5600,
    icon: 'Archive'
  },
  {
    id: 'vanity-dresser-01',
    name: '轻奢梳妆台+圆镜组合',
    category: 'bedroom',
    dimensionsMm: {
      width: 1000,
      length: 450,
      height: 1280
    },
    clearanceRequirementMm: 600,
    description: '带高透触控 LED 环形发光妆镜，单侧翻盖储物格与梳妆凳。',
    defaultColor: '#d6cfc7',
    colorVariants: [
      { name: '雅致米白', color: '#d6cfc7' },
      { name: '复古墨绿', color: '#2d4336' }
    ],
    priceEstimate: 1680,
    icon: 'Sparkles'
  },

  // ================= 客厅家具 =================
  {
    id: 'sofa-sectional-l-2800',
    name: 'L型贵妃位科技布转角沙发',
    category: 'living',
    dimensionsMm: {
      width: 2800,   // 沙发总宽
      length: 1750,  // 贵妃位总深度 (普通位深度 950mm)
      height: 860
    },
    clearanceRequirementMm: 800, // 客厅主通道
    description: '大户型客厅主角，高回弹海绵加羽绒座包，宽大舒适贵妃躺位。',
    defaultColor: '#475569',
    colorVariants: [
      { name: '深海蓝灰', color: '#334155' },
      { name: '暖米白', color: '#d8d4cb' },
      { name: '焦糖暖棕', color: '#7c4d33' }
    ],
    priceEstimate: 4899,
    icon: 'Armchair'
  },
  {
    id: 'sofa-straight-3p-2200',
    name: '3人位现代极简直排沙发',
    category: 'living',
    dimensionsMm: {
      width: 2200,
      length: 920,
      height: 820
    },
    clearanceRequirementMm: 750,
    description: '标准三座直排沙发，极简无多余线条，高脚离地扫地机器人畅行。',
    defaultColor: '#524c44',
    colorVariants: [
      { name: '棉麻暖灰', color: '#524c44' },
      { name: '抹茶豆绿', color: '#5a6b5c' },
      { name: '琥珀棕皮', color: '#68402a' }
    ],
    priceEstimate: 3290,
    icon: 'Armchair'
  },
  {
    id: 'armchair-single-01',
    name: '现代皮艺单人休闲单椅',
    category: 'living',
    dimensionsMm: {
      width: 850,
      length: 820,
      height: 780
    },
    clearanceRequirementMm: 600,
    description: '阳台/客厅转角点睛之笔，人体工学微倾斜靠背，头层牛皮包裹。',
    defaultColor: '#b45309',
    colorVariants: [
      { name: '爱马仕橙', color: '#b45309' },
      { name: '马鞍棕', color: '#5c3826' },
      { name: '千鸟格', color: '#333333' }
    ],
    priceEstimate: 1250,
    icon: 'Armchair'
  },
  {
    id: 'coffee-table-1200',
    name: '现代岩板双层长几',
    category: 'living',
    dimensionsMm: {
      width: 1200,
      length: 600,
      height: 420
    },
    clearanceRequirementMm: 500, // 沙发与茶几推荐距离 400~500mm
    description: '劳伦白金岩板台面，耐高温零渗透，下层开放式杂志储物架。',
    defaultColor: '#1e293b',
    colorVariants: [
      { name: '黑金岩板', color: '#1e293b' },
      { name: '鱼肚白金', color: '#e2e8f0' }
    ],
    priceEstimate: 980,
    icon: 'Square'
  },
  {
    id: 'tv-console-2000',
    name: '悬空极简实木电视地柜',
    category: 'living',
    dimensionsMm: {
      width: 2000,
      length: 380,
      height: 420
    },
    clearanceRequirementMm: 800,
    description: '2米长电视地柜，带三格静音下翻抽屉，隐藏式机顶盒理线槽。',
    defaultColor: '#362b24',
    colorVariants: [
      { name: '深黑胡桃', color: '#2d241e' },
      { name: '奶油白烤漆', color: '#ede8e1' }
    ],
    priceEstimate: 1850,
    icon: 'Tv'
  },
  {
    id: 'wall-tv-65inch',
    name: '65英寸超薄壁挂智能电视',
    category: 'living',
    dimensionsMm: {
      width: 1450,
      length: 75,   // 贴墙厚度
      height: 840
    },
    clearanceRequirementMm: 0,
    description: '4K 120Hz 视网膜护眼大屏，支持贴墙零间隙壁挂。',
    defaultColor: '#111827',
    colorVariants: [
      { name: '星空黑', color: '#0f172a' }
    ],
    priceEstimate: 4299,
    icon: 'Tv'
  },

  // ================= 餐厅与书房 =================
  {
    id: 'dining-table-set-1600',
    name: '现代岩板 6 人餐桌椅组合',
    category: 'dining',
    dimensionsMm: {
      width: 1600,
      length: 850,
      height: 750
    },
    clearanceRequirementMm: 750, // 拉开餐椅后站立所需空间
    description: '1.6米大台面，配4把人体工学皮质餐椅，家庭用餐待客标准配置。',
    defaultColor: '#332923',
    colorVariants: [
      { name: '潘多拉岩板', color: '#2f353b' },
      { name: '雪山白岩板', color: '#e5e7eb' }
    ],
    priceEstimate: 2980,
    icon: 'Utensils'
  },
  {
    id: 'study-desk-1400',
    name: '现代极简书桌/升降电脑桌',
    category: 'study',
    dimensionsMm: {
      width: 1400,
      length: 700,
      height: 750
    },
    clearanceRequirementMm: 700,
    description: '1.4米宽大桌板，实木防刮饰面，搭配隐藏式走线槽。',
    defaultColor: '#382e26',
    colorVariants: [
      { name: '胡桃原木', color: '#382e26' },
      { name: '极简全白', color: '#f1f5f9' },
      { name: '工业深灰', color: '#475569' }
    ],
    priceEstimate: 1380,
    icon: 'Laptop'
  },
  {
    id: 'ergonomic-office-chair',
    name: '人体工学透气网布转椅',
    category: 'study',
    dimensionsMm: {
      width: 650,
      length: 650,
      height: 1120
    },
    clearanceRequirementMm: 650,
    description: '多维腰背支撑，可调节 3D 扶手与铝合金五星脚静音万向轮。',
    defaultColor: '#1e293b',
    colorVariants: [
      { name: '曜石黑', color: '#0f172a' },
      { name: '浅空灰', color: '#64748b' }
    ],
    priceEstimate: 1199,
    icon: 'Compass'
  },
  {
    id: 'bookshelf-display-1200',
    name: '开放式多层大书架展示柜',
    category: 'storage',
    dimensionsMm: {
      width: 1200,
      length: 320,
      height: 1980
    },
    clearanceRequirementMm: 600,
    description: '多层错落隔板，加厚背板抗弯折，适合摆放精装书刊与艺术藏品。',
    defaultColor: '#2d241c',
    colorVariants: [
      { name: '复古深木', color: '#2d241c' },
      { name: '现代浅白', color: '#e2e8f0' }
    ],
    priceEstimate: 1450,
    icon: 'BookOpen'
  },

  // ================= 灯具绿植与装饰 =================
  {
    id: 'floor-arc-lamp-01',
    name: '极简弧形钓鱼落地灯',
    category: 'decor',
    dimensionsMm: {
      width: 450,
      length: 900,
      height: 1850
    },
    clearanceRequirementMm: 400,
    description: '大理石加重底座，金属拉丝电镀弧杆，营造温馨氛围暖光。',
    defaultColor: '#0f172a',
    colorVariants: [
      { name: '哑光曜石黑', color: '#0f172a' },
      { name: '轻奢拉丝金', color: '#b4975a' }
    ],
    priceEstimate: 580,
    icon: 'Sun'
  },
  {
    id: 'plant-fiddle-leaf-fig',
    name: '琴叶榕大型室内绿植盆栽',
    category: 'decor',
    dimensionsMm: {
      width: 600,
      length: 600,
      height: 1650
    },
    clearanceRequirementMm: 450,
    description: '天然净化空气，阔叶舒展，配水泥粗陶花盆，注入生机绿意。',
    defaultColor: '#2d5a27',
    colorVariants: [
      { name: '常绿', color: '#2d5a27' }
    ],
    priceEstimate: 360,
    icon: 'Flower2'
  }
];
