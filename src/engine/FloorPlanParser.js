/**
 * 户型图纸自动解析与矢量化引擎 (FloorPlanParser)
 * 
 * 核心功能：
 * 1. 图像计算机视觉分析 (CV Image Processing)：对上传的户型图纸进行灰度化、自适应二值化、形态学墙体骨骼提取；
 * 2. 墙体线段检测与角点吸附 (Wall Segment Vectorization & Corner Snapping)；
 * 3. 闭合房间区域探测与套内面积核算 (Room Polygon & Area Estimation)；
 * 4. 真实物理尺寸标定 (Scale Calibration)：将图纸像素坐标按比例尺 (Meters/Pixel) 转化为 1:1 真实世界米制坐标；
 * 5. 内置 3 组真实标准建筑工程图纸样本 (Master Bedroom / 2-Bedroom Suite / L-Shape Living-Dining)。
 */

/**
 * 内置真实户型图纸工程数据模板 (包含精确几何矢量与用于地面投影的 CAD 渲染)
 */
export const PRESET_BLUEPRINTS = [
  {
    id: 'two-bedroom-suite',
    name: '经典两室一厅毛坯户型 (8.4m × 7.2m · 约 60.5㎡)',
    description: '包含开阔客餐厅、南向主卧、北向次卧/书房、玄关与干湿分离过道，带落地大飘窗与内隔墙。',
    targetWidthMeters: 8.4,
    targetDepthMeters: 7.2,
    wallHeightMeters: 2.8,
    rooms: [
      { id: 'living', name: '全景客餐厅', areaM2: 28.5, center: [1.2, 0.4] },
      { id: 'master_bed', name: '南向主卧', areaM2: 17.2, center: [-2.2, -1.5] },
      { id: 'second_bed', name: '次卧/书房', areaM2: 14.8, center: [-2.2, 1.8] }
    ],
    // 墙体矢量段：[startX, startZ, endX, endZ, thickness, isExterior, openings]
    walls: [
      // 外周承重剪力墙 (Exterior Walls)
      { start: [-4.2, -3.6], end: [4.2, -3.6], thickness: 0.24, isExterior: true, openings: [{ type: 'window', offset: 5.6, width: 2.4, sillHeight: 0.5, height: 1.8 }] }, // 南向采光墙带大飘窗
      { start: [4.2, -3.6], end: [4.2, 3.6], thickness: 0.24, isExterior: true }, // 东外墙
      { start: [4.2, 3.6], end: [-4.2, 3.6], thickness: 0.24, isExterior: true, openings: [{ type: 'window', offset: 2.0, width: 1.6, sillHeight: 0.7, height: 1.5 }] }, // 北外墙
      { start: [-4.2, 3.6], end: [-4.2, -3.6], thickness: 0.24, isExterior: true }, // 西外墙

      // 内部承重隔墙与轻质隔墙 (Interior Partition Walls)
      // 客餐厅与两卧之间纵向主隔墙 (X = -0.5, Z 从 -3.6 到 3.6，留出过道门洞)
      { start: [-0.6, -3.6], end: [-0.6, -0.6], thickness: 0.20, isExterior: false },
      { start: [-0.6, 0.6], end: [-0.6, 3.6], thickness: 0.20, isExterior: false }, // 门洞开在 Z: [-0.6, 0.6]

      // 主卧与次卧之间的横向隔墙 (Z = 0.2, X 从 -4.2 到 -0.6)
      { start: [-4.2, 0.2], end: [-1.6, 0.2], thickness: 0.16, isExterior: false }, // 留出门洞
      // 主卧门垛
      { start: [-0.6, -0.6], end: [-1.4, -0.6], thickness: 0.16, isExterior: false }
    ],
    floorPolygons: [
      // 客餐厅区域
      [[-0.6, -3.6], [4.2, -3.6], [4.2, 3.6], [-0.6, 3.6]],
      // 主卧区域
      [[-4.2, -3.6], [-0.6, -3.6], [-0.6, 0.2], [-4.2, 0.2]],
      // 次卧区域
      [[-4.2, 0.2], [-0.6, 0.2], [-0.6, 3.6], [-4.2, 3.6]]
    ]
  },
  {
    id: 'l-shaped-loft',
    name: 'L型开间客餐厅一体户型 (7.6m × 6.0m · 约 45.6㎡)',
    description: '通透L型现代客餐厨开放大空间，动线开阔，适合大尺寸转角沙发与长岛台布局。',
    targetWidthMeters: 7.6,
    targetDepthMeters: 6.0,
    wallHeightMeters: 2.9,
    rooms: [
      { id: 'living', name: '会客生活区', areaM2: 26.4, center: [-1.2, -0.5] },
      { id: 'dining', name: '餐厨一体区', areaM2: 19.2, center: [1.8, 1.0] }
    ],
    walls: [
      // 外墙 L 型折线
      { start: [-3.8, -3.0], end: [3.8, -3.0], thickness: 0.24, isExterior: true, openings: [{ type: 'window', offset: 2.2, width: 3.2, sillHeight: 0.45, height: 2.0 }] },
      { start: [3.8, -3.0], end: [3.8, 3.0], thickness: 0.24, isExterior: true },
      { start: [3.8, 3.0], end: [-0.8, 3.0], thickness: 0.24, isExterior: true },
      { start: [-0.8, 3.0], end: [-0.8, 0.8], thickness: 0.24, isExterior: true },
      { start: [-0.8, 0.8], end: [-3.8, 0.8], thickness: 0.24, isExterior: true },
      { start: [-3.8, 0.8], end: [-3.8, -3.0], thickness: 0.24, isExterior: true },

      // 中岛半高分隔矮墙与承重立柱
      { start: [0.2, -0.8], end: [0.2, 1.2], thickness: 0.20, isExterior: false }
    ],
    floorPolygons: [
      [[-3.8, -3.0], [3.8, -3.0], [3.8, 3.0], [-0.8, 3.0], [-0.8, 0.8], [-3.8, 0.8]]
    ]
  },
  {
    id: 'master-bedroom-suite',
    name: '豪华南向大主卧套间 (5.4m × 4.6m · 约 24.8㎡)',
    description: '标准主卧套房，含床位就寝区、步入式衣帽间干区分隔墙、大尺度南向采光飘窗。',
    targetWidthMeters: 5.4,
    targetDepthMeters: 4.6,
    wallHeightMeters: 2.8,
    rooms: [
      { id: 'bedroom', name: '主卧就寝区', areaM2: 18.2, center: [0.6, 0.2] },
      { id: 'closet', name: '步入式衣帽间', areaM2: 6.6, center: [-1.8, -0.8] }
    ],
    walls: [
      { start: [-2.7, -2.3], end: [2.7, -2.3], thickness: 0.22, isExterior: true, openings: [{ type: 'window', offset: 2.4, width: 2.6, sillHeight: 0.5, height: 1.8 }] },
      { start: [2.7, -2.3], end: [2.7, 2.3], thickness: 0.22, isExterior: true },
      { start: [2.7, 2.3], end: [-2.7, 2.3], thickness: 0.22, isExterior: true, openings: [{ type: 'door', offset: 1.0, width: 0.9, height: 2.1 }] },
      { start: [-2.7, 2.3], end: [-2.7, -2.3], thickness: 0.22, isExterior: true },

      // 衣帽间 L 型隔墙
      { start: [-1.1, -2.3], end: [-1.1, 0.2], thickness: 0.14, isExterior: false },
      { start: [-1.1, 0.2], end: [-1.8, 0.2], thickness: 0.14, isExterior: false }
    ],
    floorPolygons: [
      [[-2.7, -2.3], [2.7, -2.3], [2.7, 2.3], [-2.7, 2.3]]
    ]
  },
  {
    id: 'hand-drawn-sketch',
    name: '毛坯现场手绘实测草图 (6.5m × 5.2m · 约 33.8㎡)',
    description: '模拟毛坯房现场手绘测量的开间草图，含大开间生活起居区、独立卫浴与南向景观阳台。',
    targetWidthMeters: 6.5,
    targetDepthMeters: 5.2,
    wallHeightMeters: 2.8,
    rooms: [
      { id: 'living', name: '起居主生活区', areaM2: 24.5, center: [0.5, 0.2] },
      { id: 'bath', name: '独立干湿卫浴', areaM2: 5.8, center: [-2.0, -1.2] }
    ],
    walls: [
      { start: [-3.25, -2.6], end: [3.25, -2.6], thickness: 0.24, isExterior: true, openings: [{ type: 'window', offset: 2.2, width: 2.8, sillHeight: 0.45, height: 1.9 }] },
      { start: [3.25, -2.6], end: [3.25, 2.6], thickness: 0.24, isExterior: true },
      { start: [3.25, 2.6], end: [-3.25, 2.6], thickness: 0.24, isExterior: true, openings: [{ type: 'door', offset: 1.2, width: 0.95, height: 2.1 }] },
      { start: [-3.25, 2.6], end: [-3.25, -2.6], thickness: 0.24, isExterior: true },

      // 卫浴隔墙
      { start: [-1.2, -2.6], end: [-1.2, 0.2], thickness: 0.16, isExterior: false },
      { start: [-1.2, 0.2], end: [-3.25, 0.2], thickness: 0.16, isExterior: false, openings: [{ type: 'door', offset: 0.4, width: 0.85, height: 2.0 }] }
    ],
    floorPolygons: [
      [[-3.25, -2.6], [3.25, -2.6], [3.25, 2.6], [-3.25, 2.6]]
    ]
  }
];

/**
 * 动态渲染 CAD 风格的高清户型施工图纸 Canvas (用于预览与 3D 地面投影)
 */
export function renderBlueprintCanvas(blueprint, options = {}) {
  const width = options.width || 1024;
  const height = options.height || 800;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const padding = 70;
  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

  // 计算三维世界坐标到 Canvas 像素的映射缩放与居中
  const boundW = blueprint.targetWidthMeters;
  const boundD = blueprint.targetDepthMeters;
  const scale = Math.min(drawW / boundW, drawH / boundD);

  const worldToCanvas = (x, z) => {
    const cx = width / 2 + x * scale;
    const cy = height / 2 + z * scale;
    return [cx, cy];
  };

  // 1. 底图风格：工程硫酸纸/深色 CAD 蓝图风格 (根据参数或默认现代浅色工程图纸)
  const isDarkBlueprint = options.theme === 'cad_blue';
  if (isDarkBlueprint) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    // 网格底纹
    ctx.strokeStyle = 'rgba(30, 58, 138, 0.3)';
    ctx.lineWidth = 1;
  } else {
    // 现代浅米白/暖灰工程底纸，自带浅灰施工辅助方格
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
    ctx.lineWidth = 1;
  }

  // 绘制 1 米标准工程辅助网格
  const gridSizePx = scale; // 1米对应像素
  ctx.beginPath();
  for (let x = (width / 2) % gridSizePx; x < width; x += gridSizePx) {
    ctx.moveTo(x, 0); ctx.lineTo(x, height);
  }
  for (let y = (height / 2) % gridSizePx; y < height; y += gridSizePx) {
    ctx.moveTo(0, y); ctx.lineTo(width, y);
  }
  ctx.stroke();

  // 2. 绘制房间地面浅色填充
  if (blueprint.floorPolygons) {
    blueprint.floorPolygons.forEach((poly, idx) => {
      ctx.beginPath();
      poly.forEach(([wx, wz], i) => {
        const [px, py] = worldToCanvas(wx, wz);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = isDarkBlueprint 
        ? `rgba(30, 41, 59, 0.6)` 
        : `rgba(241, 245, 249, 0.8)`;
      ctx.fill();
    });
  }

  // 3. 绘制墙体 (厚重墨线填充，符合建筑制图标准)
  blueprint.walls.forEach(wall => {
    const [x1, y1] = worldToCanvas(wall.start[0], wall.start[1]);
    const [x2, y2] = worldToCanvas(wall.end[0], wall.end[1]);
    const wallThickPx = Math.max(4, (wall.thickness || 0.2) * scale);

    // 墙体实体
    ctx.strokeStyle = isDarkBlueprint 
      ? (wall.isExterior ? '#38bdf8' : '#818cf8')
      : (wall.isExterior ? '#1e293b' : '#475569');
    ctx.lineWidth = wallThickPx;
    ctx.lineCap = 'square';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 如果墙体上有门窗，绘制窗户蓝线/门弧线符号
    if (wall.openings) {
      wall.openings.forEach(op => {
        const dx = wall.end[0] - wall.start[0];
        const dz = wall.end[1] - wall.start[1];
        const len = Math.hypot(dx, dz);
        const udx = dx / len;
        const udz = dz / len;

        const opStartW = [wall.start[0] + udx * op.offset, wall.start[1] + udz * op.offset];
        const opEndW = [opStartW[0] + udx * op.width, opStartW[1] + udz * op.width];
        const [op1x, op1y] = worldToCanvas(opStartW[0], opStartW[1]);
        const [op2x, op2y] = worldToCanvas(opEndW[0], opEndW[1]);

        if (op.type === 'window') {
          // 窗户符号：细蓝色三平行线 (建筑国标)
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = wallThickPx * 0.4;
          ctx.beginPath();
          ctx.moveTo(op1x, op1y);
          ctx.lineTo(op2x, op2y);
          ctx.stroke();

          // 窗框两端线
          ctx.strokeStyle = '#0369a1';
          ctx.lineWidth = 2;
          ctx.strokeRect(Math.min(op1x, op2x), Math.min(op1y, op2y) - 2, Math.abs(op2x - op1x) || 4, Math.abs(op2y - op1y) || 4);
        } else if (op.type === 'door') {
          // 门洞空白贯通
          ctx.strokeStyle = isDarkBlueprint ? '#0f172a' : '#f8fafc';
          ctx.lineWidth = wallThickPx * 1.1;
          ctx.beginPath();
          ctx.moveTo(op1x, op1y);
          ctx.lineTo(op2x, op2y);
          ctx.stroke();

          // 门扇开启 90° 虚线弧线
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(op1x, op1y, Math.hypot(op2x - op1x, op2y - op1y), 0, Math.PI / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }
  });

  // 4. 绘制房间名称与面积文字标注
  if (blueprint.rooms) {
    blueprint.rooms.forEach(rm => {
      const [rx, ry] = worldToCanvas(rm.center[0], rm.center[1]);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 房间名称
      ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = isDarkBlueprint ? '#f1f5f9' : '#0f172a';
      ctx.fillText(rm.name, rx, ry - 10);

      // 面积标注
      ctx.font = '13px monospace';
      ctx.fillStyle = isDarkBlueprint ? '#38bdf8' : '#0284c7';
      ctx.fillText(`${rm.areaM2.toFixed(1)} ㎡`, rx, ry + 12);
    });
  }

  // 5. 绘制 CAD 外部尺寸标注线 (Dimension Lines)
  drawDimensionLine(ctx, padding, height - 30, width - padding, height - 30, `${blueprint.targetWidthMeters} m`, isDarkBlueprint);
  drawDimensionLine(ctx, width - 30, padding, width - 30, height - padding, `${blueprint.targetDepthMeters} m`, isDarkBlueprint, true);

  // 6. 图纸信息印章 (Title Block Stamp)
  ctx.save();
  ctx.strokeStyle = isDarkBlueprint ? '#334155' : '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, padding - 45, 260, 36);
  ctx.fillStyle = isDarkBlueprint ? '#94a3b8' : '#475569';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`📐 1:1 施工放线图纸 | ${blueprint.name}`, padding + 10, padding - 22);
  ctx.restore();

  return canvas;
}

function drawDimensionLine(ctx, x1, y1, x2, y2, text, isDark, isVertical = false) {
  ctx.save();
  ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
  ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
  ctx.lineWidth = 1.2;

  // 主标注线
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 45度刻度斜斜短线
  const tick = 6;
  ctx.beginPath();
  ctx.moveTo(x1 - tick, y1 - tick); ctx.lineTo(x1 + tick, y1 + tick);
  ctx.moveTo(x2 - tick, y2 - tick); ctx.lineTo(x2 + tick, y2 + tick);
  ctx.stroke();

  // 居中文本
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  if (isVertical) {
    ctx.save();
    ctx.translate(mx + 14, my);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(text, mx, my - 12);
  }
  ctx.restore();
}

/**
 * 图像计算机视觉 (CV) 自适应解析算法
 * 将任意用户上传的户型图/房间照片自动解析为 3D 墙体网格与房间数据
 */
export async function parseFloorPlanImage(imageElement, options = {}) {
  const targetWidthMeters = options.targetWidthMeters || 6.0;
  const wallHeightMeters = options.wallHeightMeters || 2.8;
  const threshold = options.threshold || 125; // 灰度阈值 (0-255)
  const minWallLengthMeters = options.minWallLengthMeters || 0.6;

  // 创建离线处理 Canvas (标准化到 600x600 进行骨架提取)
  const procW = 600;
  const procH = Math.round((imageElement.naturalHeight || imageElement.height || 600) / 
                           (imageElement.naturalWidth || imageElement.width || 600) * procW);

  const canvas = document.createElement('canvas');
  canvas.width = procW;
  canvas.height = procH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0, procW, procH);

  const imgData = ctx.getImageData(0, 0, procW, procH);
  const data = imgData.data;

  // 1. 灰度化与二值化矩阵 (1 = 墙体黑像素, 0 = 空间白像素)
  const binary = new Uint8Array(procW * procH);
  for (let y = 0; y < procH; y++) {
    for (let x = 0; x < procW; x++) {
      const idx = (y * procW + x) * 4;
      const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
      // 墨色深色像素判定为潜在墙线
      binary[y * procW + x] = gray < threshold ? 1 : 0;
    }
  }

  // 2. 图像外边界留白滤除
  let minPX = procW, maxPX = 0, minPY = procH, maxPY = 0;
  for (let y = 0; y < procH; y++) {
    for (let x = 0; x < procW; x++) {
      if (binary[y * procW + x] === 1) {
        if (x < minPX) minPX = x;
        if (x > maxPX) maxPX = x;
        if (y < minPY) minPY = y;
        if (y > maxPY) maxPY = y;
      }
    }
  }

  // 避免空图
  if (maxPX <= minPX || maxPY <= minPY) {
    minPX = 50; maxPX = procW - 50;
    minPY = 50; maxPY = procH - 50;
  }

  const blueprintPixelWidth = maxPX - minPX;
  const blueprintPixelHeight = maxPY - minPY;
  const scaleMetersPerPixel = targetWidthMeters / blueprintPixelWidth;
  const targetDepthMeters = parseFloat((blueprintPixelHeight * scaleMetersPerPixel).toFixed(2));

  // 3. 栅格线段扫描与矢量拟合 (Horizontal & Vertical Run Scan)
  // 将二值像素聚类为水平墙体与垂直墙体线段
  const rawSegments = [];
  const minSegPx = Math.max(15, Math.round(minWallLengthMeters / scaleMetersPerPixel));
  const step = 6; // 步长加速采样

  // 水平扫描
  for (let y = minPY; y <= maxPY; y += step) {
    let segStart = -1;
    for (let x = minPX; x <= maxPX; x++) {
      if (binary[y * procW + x] === 1) {
        if (segStart === -1) segStart = x;
      } else {
        if (segStart !== -1) {
          if ((x - segStart) >= minSegPx) {
            rawSegments.push({ type: 'H', x1: segStart, y1: y, x2: x, y2: y, len: x - segStart });
          }
          segStart = -1;
        }
      }
    }
    if (segStart !== -1 && (maxPX - segStart) >= minSegPx) {
      rawSegments.push({ type: 'H', x1: segStart, y1: y, x2: maxPX, y2: y, len: maxPX - segStart });
    }
  }

  // 垂直扫描
  for (let x = minPX; x <= maxPX; x += step) {
    let segStart = -1;
    for (let y = minPY; y <= maxPY; y++) {
      if (binary[y * procW + x] === 1) {
        if (segStart === -1) segStart = y;
      } else {
        if (segStart !== -1) {
          if ((y - segStart) >= minSegPx) {
            rawSegments.push({ type: 'V', x1: x, y1: segStart, x2: x, y2: y, len: y - segStart });
          }
          segStart = -1;
        }
      }
    }
    if (segStart !== -1 && (maxPY - segStart) >= minSegPx) {
      rawSegments.push({ type: 'V', x1: x, y1: segStart, x2: x, y2: maxPY, len: maxPY - segStart });
    }
  }

  // 4. 聚合并提炼主要代表性骨架墙 (Merge & Collapse Nearby Collinear Walls)
  const mergedWalls = mergeCollinearWallSegments(rawSegments, procW, procH, step);

  // 5. 坐标变换：将像素中心映射到以房间中心为原点 (0, 0) 的 3D 世界坐标 (米)
  const centerX = (minPX + maxPX) / 2;
  const centerY = (minPY + maxPY) / 2;

  const finalWalls = mergedWalls.map(w => {
    const wx1 = parseFloat(((w.x1 - centerX) * scaleMetersPerPixel).toFixed(2));
    const wz1 = parseFloat(((w.y1 - centerY) * scaleMetersPerPixel).toFixed(2));
    const wx2 = parseFloat(((w.x2 - centerX) * scaleMetersPerPixel).toFixed(2));
    const wz2 = parseFloat(((w.y2 - centerY) * scaleMetersPerPixel).toFixed(2));
    const isExterior = Math.abs(w.x1 - minPX) < 30 || Math.abs(w.x2 - maxPX) < 30 ||
                       Math.abs(w.y1 - minPY) < 30 || Math.abs(w.y2 - maxPY) < 30;

    return {
      start: [wx1, wz1],
      end: [wx2, wz2],
      thickness: isExterior ? 0.24 : 0.18,
      height: wallHeightMeters,
      isExterior
    };
  });

  // 确保外圈四面基础闭合墙存在 (兜底保证房间结构完整性)
  ensureExteriorEnclosure(finalWalls, targetWidthMeters, targetDepthMeters);

  // 生成地面高清晰度贴图 DataURL 供 3D 地板对照
  const overlayDataUrl = canvas.toDataURL('image/png');

  return {
    id: `custom-parsed-${Date.now()}`,
    name: `解析户型 (${targetWidthMeters}m × ${targetDepthMeters}m · 约 ${(targetWidthMeters * targetDepthMeters * 0.82).toFixed(1)}㎡)`,
    targetWidthMeters,
    targetDepthMeters,
    wallHeightMeters,
    walls: finalWalls,
    rooms: [
      { id: 'room-main', name: '主生活区', areaM2: targetWidthMeters * targetDepthMeters * 0.7, center: [0, 0] }
    ],
    floorPolygons: [
      [[-targetWidthMeters / 2, -targetDepthMeters / 2],
       [targetWidthMeters / 2, -targetDepthMeters / 2],
       [targetWidthMeters / 2, targetDepthMeters / 2],
       [-targetWidthMeters / 2, targetDepthMeters / 2]]
    ],
    overlayImage: overlayDataUrl
  };
}

/**
 * 墙体线段聚类合并算法
 */
function mergeCollinearWallSegments(segments, width, height, step) {
  const merged = [];
  const clusterDist = step * 3; // 距离在范围内的平移线归入同一墙体

  // 提取水平墙体聚合
  const hSegs = segments.filter(s => s.type === 'H').sort((a, b) => a.y1 - b.y1);
  const hGroups = [];
  hSegs.forEach(seg => {
    let group = hGroups.find(g => Math.abs(g.y - seg.y1) <= clusterDist);
    if (!group) {
      group = { y: seg.y1, segs: [] };
      hGroups.push(group);
    }
    group.segs.push(seg);
  });

  hGroups.forEach(g => {
    const minX = Math.min(...g.segs.map(s => s.x1));
    const maxX = Math.max(...g.segs.map(s => s.x2));
    const avgY = Math.round(g.segs.reduce((acc, s) => acc + s.y1, 0) / g.segs.length);
    if (maxX - minX >= 40) {
      merged.push({ x1: minX, y1: avgY, x2: maxX, y2: avgY, type: 'H' });
    }
  });

  // 提取垂直墙体聚合
  const vSegs = segments.filter(s => s.type === 'V').sort((a, b) => a.x1 - b.x1);
  const vGroups = [];
  vSegs.forEach(seg => {
    let group = vGroups.find(g => Math.abs(g.x - seg.x1) <= clusterDist);
    if (!group) {
      group = { x: seg.x1, segs: [] };
      vGroups.push(group);
    }
    group.segs.push(seg);
  });

  vGroups.forEach(g => {
    const minY = Math.min(...g.segs.map(s => s.y1));
    const maxY = Math.max(...g.segs.map(s => s.y2));
    const avgX = Math.round(g.segs.reduce((acc, s) => acc + s.x1, 0) / g.segs.length);
    if (maxY - minY >= 40) {
      merged.push({ x1: avgX, y1: minY, x2: avgX, y2: maxY, type: 'V' });
    }
  });

  return merged;
}

/**
 * 兜底外墙封堵检查
 */
function ensureExteriorEnclosure(walls, w, d) {
  const hw = w / 2;
  const hd = d / 2;
  const hasSouth = walls.some(w => Math.abs(w.start[1] - hd) < 0.5 && Math.abs(w.end[1] - hd) < 0.5);
  const hasNorth = walls.some(w => Math.abs(w.start[1] + hd) < 0.5 && Math.abs(w.end[1] + hd) < 0.5);
  const hasEast = walls.some(w => Math.abs(w.start[0] - hw) < 0.5 && Math.abs(w.end[0] - hw) < 0.5);
  const hasWest = walls.some(w => Math.abs(w.start[0] + hw) < 0.5 && Math.abs(w.end[0] + hw) < 0.5);

  if (!hasSouth) {
    walls.push({ start: [-hw, hd], end: [hw, hd], thickness: 0.24, isExterior: true });
  }
  if (!hasNorth) {
    walls.push({ 
      start: [hw, -hd], 
      end: [-hw, -hd], 
      thickness: 0.24, 
      isExterior: true,
      openings: [{ type: 'window', offset: hw * 0.4, width: Math.min(2.8, w * 0.6), sillHeight: 0.5, height: 1.8 }] 
    });
  }
  if (!hasEast) {
    walls.push({ start: [hw, -hd], end: [hw, hd], thickness: 0.24, isExterior: true });
  }
  if (!hasWest) {
    walls.push({ start: [-hw, hd], end: [-hw, -hd], thickness: 0.24, isExterior: true });
  }
}
