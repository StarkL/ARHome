/**
 * 样板间预设布局数据 (Sample Layout Presets)
 * 供用户一键载入不同房型下的 1:1 试摆方案
 */

export const SAMPLE_PRESETS = [
  {
    id: 'master-bedroom',
    name: '经典主卧软装方案 (4.5m × 3.8m)',
    description: '1.8米大床居中摆放，双侧床头柜，进门大衣柜与窗前梳妆台。测试床侧动线与开门余量。',
    roomConfig: {
      width: 4.5,
      depth: 3.8,
      height: 2.8,
      wallFinish: 'concrete',
      windowPosition: 'north'
    },
    items: [
      {
        uid: 'preset-bed-1',
        modelId: 'bed-king-1800',
        position: [0.1, 0, -0.4],
        rotationY: 0,
        colorVariant: '#3d3835'
      },
      {
        uid: 'preset-nightstand-l',
        modelId: 'bedside-table-01',
        position: [-1.2, 0, -1.2],
        rotationY: 0,
        colorVariant: '#2d2825'
      },
      {
        uid: 'preset-nightstand-r',
        modelId: 'bedside-table-01',
        position: [1.4, 0, -1.2],
        rotationY: 0,
        colorVariant: '#2d2825'
      },
      {
        uid: 'preset-wardrobe-1',
        modelId: 'wardrobe-4door-2000',
        position: [-1.8, 0, 0.5],
        rotationY: Math.PI / 2, // 靠左侧墙
        colorVariant: '#2b2a29'
      },
      {
        uid: 'preset-plant-1',
        modelId: 'plant-fiddle-leaf-fig',
        position: [1.7, 0, 1.2],
        rotationY: 0,
        colorVariant: '#2d5a27'
      }
    ]
  },
  {
    id: 'living-dining-combo',
    name: '大开间客餐厅一体方案 (7.2m × 4.2m)',
    description: '全景大客厅配置 L 型沙发、大岩板茶几、悬空电视柜与 6 人餐桌椅，体验开阔公区动线。',
    roomConfig: {
      width: 7.2,
      depth: 4.2,
      height: 2.85,
      wallFinish: 'concrete',
      windowPosition: 'north'
    },
    items: [
      {
        uid: 'preset-sofa-1',
        modelId: 'sofa-sectional-l-2800',
        position: [-1.4, 0, 0.8],
        rotationY: 0,
        colorVariant: '#475569'
      },
      {
        uid: 'preset-coffee-table-1',
        modelId: 'coffee-table-1200',
        position: [-1.4, 0, -0.2],
        rotationY: 0,
        colorVariant: '#1e293b'
      },
      {
        uid: 'preset-tv-console-1',
        modelId: 'tv-console-2000',
        position: [-1.4, 0, -1.8],
        rotationY: 0,
        colorVariant: '#362b24'
      },
      {
        uid: 'preset-tv-wall-1',
        modelId: 'wall-tv-65inch',
        position: [-1.4, 1.1, -2.0],
        rotationY: 0,
        colorVariant: '#111827'
      },
      {
        uid: 'preset-dining-table-1',
        modelId: 'dining-table-set-1600',
        position: [2.0, 0, 0.2],
        rotationY: Math.PI / 2,
        colorVariant: '#332923'
      },
      {
        uid: 'preset-floor-lamp-1',
        modelId: 'floor-arc-lamp-01',
        position: [-3.0, 0, 1.4],
        rotationY: Math.PI / 4,
        colorVariant: '#0f172a'
      },
      {
        uid: 'preset-plant-living',
        modelId: 'plant-fiddle-leaf-fig',
        position: [3.1, 0, -1.5],
        rotationY: 0,
        colorVariant: '#2d5a27'
      }
    ]
  },
  {
    id: 'empty-raw-room',
    name: '纯净毛坯房空间 (5.0m × 4.0m)',
    description: '空置水泥地面与裸墙结构，无任何预置家具，完全由您从左侧家居库中自由拖入试摆。',
    roomConfig: {
      width: 5.0,
      depth: 4.0,
      height: 2.8,
      wallFinish: 'concrete',
      windowPosition: 'north'
    },
    items: []
  }
];
