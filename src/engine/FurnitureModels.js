import * as THREE from 'three';

/**
 * 材质管理单例缓存 (Material & Texture cache)
 * 采用高质量 PBR 物理渲染材质 (MeshStandardMaterial)
 */
const materialsCache = new Map();

function getPBRMaterial(name, params) {
  const key = `${name}_${JSON.stringify(params)}`;
  if (materialsCache.has(key)) {
    return materialsCache.get(key);
  }
  const mat = new THREE.MeshStandardMaterial(params);
  materialsCache.set(key, mat);
  return mat;
}

/**
 * 创建带软倒角感的盒状网格
 */
function createBoxMesh(width, height, depth, material, castShadow = true, receiveShadow = true) {
  const geom = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geom, material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

/**
 * 根据 item 规格与自定义颜色构建 1:1 真实尺寸三维模型
 * 约定：1 个单位 = 1 米 (1.0m)
 * 模型底部对齐 y = 0 地面
 */
export function buildFurnitureModel(item, customColor) {
  const group = new THREE.Group();
  group.name = item.id;
  group.userData = {
    isFurniture: true,
    catalogId: item.id,
    name: item.name,
    category: item.category,
    dimensionsMm: { ...item.dimensionsMm },
    clearanceRequirementMm: item.clearanceRequirementMm,
    priceEstimate: item.priceEstimate,
    color: customColor || item.defaultColor
  };

  const primaryColor = customColor || item.defaultColor;
  const primMat = getPBRMaterial(`prim_${primaryColor}`, {
    color: new THREE.Color(primaryColor),
    roughness: 0.65,
    metalness: 0.1
  });

  const woodMat = getPBRMaterial('wood_walnut', {
    color: new THREE.Color('#382b22'),
    roughness: 0.7,
    metalness: 0.05
  });

  const metalMat = getPBRMaterial('metal_black', {
    color: new THREE.Color('#1e293b'),
    roughness: 0.35,
    metalness: 0.8
  });

  const whiteFabricMat = getPBRMaterial('fabric_white', {
    color: new THREE.Color('#f1f5f9'),
    roughness: 0.9,
    metalness: 0.02
  });

  const stoneMat = getPBRMaterial('stone_slate', {
    color: new THREE.Color('#334155'),
    roughness: 0.4,
    metalness: 0.15
  });

  // 根据 ID 分支生成对应模型
  switch (item.id) {
    case 'bed-king-1800':
    case 'bed-queen-1500': {
      // 1.8m 或 1.5m 床
      const isKing = item.id === 'bed-king-1800';
      const bedW = isKing ? 1.88 : 1.56;
      const bedL = isKing ? 2.18 : 2.08;
      const headH = isKing ? 0.98 : 0.92;
      const mattW = isKing ? 1.80 : 1.50;
      const mattL = 2.00;

      // 床底箱与排骨架底座
      const baseH = 0.28;
      const base = createBoxMesh(bedW, baseH, bedL, primMat);
      base.position.set(0, baseH / 2, 0);
      group.add(base);

      // 床头靠背 (立在床头一侧 -Z)
      const headD = 0.16;
      const headboard = createBoxMesh(bedW, headH, headD, primMat);
      headboard.position.set(0, headH / 2, -bedL / 2 + headD / 2);
      group.add(headboard);

      // 床垫
      const mattH = 0.24;
      const mattress = createBoxMesh(mattW, mattH, mattL, whiteFabricMat);
      mattress.position.set(0, baseH + mattH / 2, (bedL - mattL) / 4);
      group.add(mattress);

      // 枕头 (两个)
      const pillowW = isKing ? 0.72 : 0.60;
      const pillowD = 0.45;
      const pillowH = 0.12;
      const pillowMat = getPBRMaterial('pillow_soft', { color: new THREE.Color('#e2e8f0'), roughness: 0.9 });
      
      const p1 = createBoxMesh(pillowW, pillowH, pillowD, pillowMat);
      p1.position.set(-bedW * 0.23, baseH + mattH + pillowH / 2, -bedL / 2 + headD + pillowD / 2 + 0.05);
      p1.rotation.x = 0.15;
      group.add(p1);

      const p2 = createBoxMesh(pillowW, pillowH, pillowD, pillowMat);
      p2.position.set(bedW * 0.23, baseH + mattH + pillowH / 2, -bedL / 2 + headD + pillowD / 2 + 0.05);
      p2.rotation.x = 0.15;
      group.add(p2);

      // 尾部折叠盖毯
      const blanket = createBoxMesh(mattW + 0.04, 0.04, 0.65, primMat);
      blanket.position.set(0, baseH + mattH + 0.02, bedL / 2 - 0.4);
      group.add(blanket);
      break;
    }

    case 'bedside-table-01': {
      // 尺寸: 480 x 420 x 480 mm
      const w = 0.48, d = 0.42, h = 0.48;
      const body = createBoxMesh(w, h, d, primMat);
      body.position.set(0, h / 2, 0);
      group.add(body);

      // 岩板顶面
      const top = createBoxMesh(w + 0.01, 0.02, d + 0.01, stoneMat);
      top.position.set(0, h + 0.01, 0);
      group.add(top);

      // 抽屉缝与金色把手
      const handleMat = getPBRMaterial('brass_handle', { color: new THREE.Color('#d4af37'), metalness: 0.85, roughness: 0.25 });
      const h1 = createBoxMesh(0.12, 0.015, 0.02, handleMat);
      h1.position.set(0, h * 0.7, d / 2 + 0.01);
      group.add(h1);

      const h2 = createBoxMesh(0.12, 0.015, 0.02, handleMat);
      h2.position.set(0, h * 0.3, d / 2 + 0.01);
      group.add(h2);
      break;
    }

    case 'wardrobe-4door-2000': {
      // 尺寸: 2000 x 600 x 2400 mm
      const w = 2.0, d = 0.6, h = 2.4;
      const body = createBoxMesh(w, h, d, primMat);
      body.position.set(0, h / 2, 0);
      group.add(body);

      // 4 扇门板缝线与金属把手
      const handleMat = metalMat;
      for (let i = 0; i < 4; i++) {
        const xOffset = -w / 2 + (i + 0.5) * (w / 4);
        const handle = createBoxMesh(0.015, 0.6, 0.02, handleMat);
        const handleX = i % 2 === 0 ? xOffset + 0.2 : xOffset - 0.2;
        handle.position.set(handleX, h * 0.45, d / 2 + 0.015);
        group.add(handle);
      }
      break;
    }

    case 'vanity-dresser-01': {
      // 尺寸: 1000 x 450 x 1280 mm
      const w = 1.0, d = 0.45, tableH = 0.75;
      const top = createBoxMesh(w, 0.12, d, primMat);
      top.position.set(0, tableH - 0.06, 0);
      group.add(top);

      // 4根金属腿
      const legGeom = new THREE.CylinderGeometry(0.018, 0.012, tableH - 0.12, 12);
      const legPositions = [
        [-w / 2 + 0.05, -d / 2 + 0.05],
        [w / 2 - 0.05, -d / 2 + 0.05],
        [-w / 2 + 0.05, d / 2 - 0.05],
        [w / 2 - 0.05, d / 2 - 0.05]
      ];
      legPositions.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, metalMat);
        leg.position.set(lx, (tableH - 0.12) / 2, lz);
        leg.castShadow = true;
        group.add(leg);
      });

      // 圆形 LED 发光镜 (直径 0.5m)
      const mirrorGeom = new THREE.CylinderGeometry(0.26, 0.26, 0.02, 32);
      mirrorGeom.rotateX(Math.PI / 2);
      const mirrorMat = getPBRMaterial('mirror_glass', { color: new THREE.Color('#f8fafc'), metalness: 0.95, roughness: 0.05 });
      const mirror = new THREE.Mesh(mirrorGeom, mirrorMat);
      mirror.position.set(0, tableH + 0.28, -d / 2 + 0.06);
      group.add(mirror);
      break;
    }

    case 'sofa-sectional-l-2800': {
      // 尺寸: 2800 x 1750 x 860 mm
      // 主位长 1.9m, 宽 0.95m; 贵妃位长 0.9m, 宽 1.75m
      const seatH = 0.42;
      const totalH = 0.86;
      
      // 主座位垫
      const mainSeat = createBoxMesh(1.9, seatH, 0.95, primMat);
      mainSeat.position.set(-0.45, seatH / 2, 0);
      group.add(mainSeat);

      // 贵妃榻座位
      const chaise = createBoxMesh(0.9, seatH, 1.75, primMat);
      chaise.position.set(0.95, seatH / 2, (1.75 - 0.95) / 2);
      group.add(chaise);

      // 靠背总成
      const backH = totalH - seatH;
      const backMain = createBoxMesh(1.9, backH, 0.22, primMat);
      backMain.position.set(-0.45, seatH + backH / 2, -0.95 / 2 + 0.11);
      group.add(backMain);

      const backChaise = createBoxMesh(0.9, backH, 0.22, primMat);
      backChaise.position.set(0.95, seatH + backH / 2, -0.95 / 2 + 0.11);
      group.add(backChaise);

      // 左扶手
      const armL = createBoxMesh(0.2, 0.62, 0.95, primMat);
      armL.position.set(-1.4 + 0.1, 0.31, 0);
      group.add(armL);

      // 右扶手 (贵妃侧)
      const armR = createBoxMesh(0.2, 0.62, 1.75, primMat);
      armR.position.set(1.4 - 0.1, 0.31, (1.75 - 0.95) / 2);
      group.add(armR);

      // 抱枕
      const pillowMat = getPBRMaterial('accent_cushion', { color: new THREE.Color('#d97706'), roughness: 0.8 });
      const c1 = createBoxMesh(0.42, 0.38, 0.12, pillowMat);
      c1.position.set(-0.9, seatH + 0.2, -0.25);
      c1.rotation.y = 0.2;
      group.add(c1);
      break;
    }

    case 'sofa-straight-3p-2200': {
      // 尺寸: 2200 x 920 x 820 mm
      const w = 2.2, d = 0.92, h = 0.82;
      const seatH = 0.42;

      // 主座垫 (分三格)
      const seat = createBoxMesh(w - 0.36, seatH - 0.12, d - 0.2, primMat);
      seat.position.set(0, (seatH - 0.12) / 2 + 0.12, 0.05);
      group.add(seat);

      // 靠背
      const backH = h - seatH;
      const back = createBoxMesh(w - 0.36, backH, 0.22, primMat);
      back.position.set(0, seatH + backH / 2, -d / 2 + 0.15);
      group.add(back);

      // 左右扶手
      const armW = 0.18;
      const armL = createBoxMesh(armW, 0.62, d, primMat);
      armL.position.set(-w / 2 + armW / 2, 0.31, 0);
      group.add(armL);

      const armR = createBoxMesh(armW, 0.62, d, primMat);
      armR.position.set(w / 2 - armW / 2, 0.31, 0);
      group.add(armR);

      // 4根细金属高腿 (离地12cm)
      const legGeom = new THREE.CylinderGeometry(0.016, 0.01, 0.12, 12);
      const legMat = metalMat;
      const legOffsets = [
        [-w / 2 + 0.1, -d / 2 + 0.1],
        [w / 2 - 0.1, -d / 2 + 0.1],
        [-w / 2 + 0.1, d / 2 - 0.1],
        [w / 2 - 0.1, d / 2 - 0.1]
      ];
      legOffsets.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, legMat);
        leg.position.set(lx, 0.06, lz);
        leg.castShadow = true;
        group.add(leg);
      });
      break;
    }

    case 'armchair-single-01': {
      // 尺寸: 850 x 820 x 780 mm
      const w = 0.85, d = 0.82, h = 0.78;
      const seat = createBoxMesh(0.65, 0.22, 0.6, primMat);
      seat.position.set(0, 0.35, 0.05);
      group.add(seat);

      // 弧形靠背
      const back = createBoxMesh(0.75, 0.45, 0.16, primMat);
      back.position.set(0, 0.35 + 0.22, -0.2);
      back.rotation.x = 0.12;
      group.add(back);

      // 左右扶手
      const armL = createBoxMesh(0.1, 0.26, 0.6, primMat);
      armL.position.set(-0.35, 0.45, 0.05);
      group.add(armL);

      const armR = createBoxMesh(0.1, 0.26, 0.6, primMat);
      armR.position.set(0.35, 0.45, 0.05);
      group.add(armR);

      // 四木腿
      const legGeom = new THREE.CylinderGeometry(0.018, 0.012, 0.24, 12);
      [
        [-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, woodMat);
        leg.position.set(lx, 0.12, lz);
        group.add(leg);
      });
      break;
    }

    case 'coffee-table-1200': {
      // 尺寸: 1200 x 600 x 420 mm
      const w = 1.2, d = 0.6, h = 0.42;
      // 岩板台面
      const top = createBoxMesh(w, 0.024, d, stoneMat);
      top.position.set(0, h - 0.012, 0);
      group.add(top);

      // 下层杂志架
      const shelf = createBoxMesh(w - 0.1, 0.015, d - 0.1, woodMat);
      shelf.position.set(0, 0.15, 0);
      group.add(shelf);

      // 金属框架四脚
      const legGeom = new THREE.BoxGeometry(0.02, h, 0.02);
      [
        [-w / 2 + 0.03, -d / 2 + 0.03],
        [w / 2 - 0.03, -d / 2 + 0.03],
        [-w / 2 + 0.03, d / 2 - 0.03],
        [w / 2 - 0.03, d / 2 - 0.03]
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, metalMat);
        leg.position.set(lx, h / 2, lz);
        leg.castShadow = true;
        group.add(leg);
      });
      break;
    }

    case 'tv-console-2000': {
      // 尺寸: 2000 x 380 x 420 mm
      const w = 2.0, d = 0.38, h = 0.42;
      const body = createBoxMesh(w, h, d, primMat);
      body.position.set(0, h / 2, 0);
      group.add(body);
      break;
    }

    case 'wall-tv-65inch': {
      // 尺寸: 1450 x 75 x 840 mm
      const w = 1.45, d = 0.075, h = 0.84;
      // 电视外框
      const frame = createBoxMesh(w, h, d, metalMat);
      frame.position.set(0, h / 2, 0);
      group.add(frame);

      // 高亮 OLED 屏幕
      const screenMat = getPBRMaterial('oled_screen', {
        color: new THREE.Color('#030712'),
        roughness: 0.1,
        metalness: 0.9
      });
      const screen = createBoxMesh(w - 0.03, h - 0.03, 0.005, screenMat);
      screen.position.set(0, h / 2, d / 2 + 0.003);
      group.add(screen);
      break;
    }

    case 'dining-table-set-1600': {
      // 尺寸: 1600 x 850 x 750 mm
      const w = 1.6, d = 0.85, h = 0.75;
      const top = createBoxMesh(w, 0.03, d, stoneMat);
      top.position.set(0, h - 0.015, 0);
      group.add(top);

      // 4根桌腿
      const legGeom = new THREE.CylinderGeometry(0.025, 0.015, h - 0.03, 16);
      [
        [-w / 2 + 0.1, -d / 2 + 0.1],
        [w / 2 - 0.1, -d / 2 + 0.1],
        [-w / 2 + 0.1, d / 2 - 0.1],
        [w / 2 - 0.1, d / 2 - 0.1]
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, metalMat);
        leg.position.set(lx, (h - 0.03) / 2, lz);
        leg.castShadow = true;
        group.add(leg);
      });

      // 摆放 4 把餐椅
      const chairMat = getPBRMaterial('chair_leather', { color: new THREE.Color('#475569'), roughness: 0.5 });
      const chairPos = [
        [-0.4, 0, -d / 2 - 0.22, 0],
        [0.4, 0, -d / 2 - 0.22, 0],
        [-0.4, 0, d / 2 + 0.22, Math.PI],
        [0.4, 0, d / 2 + 0.22, Math.PI]
      ];
      chairPos.forEach(([cx, cy, cz, rot]) => {
        const chairGroup = new THREE.Group();
        // 座面
        const seat = createBoxMesh(0.42, 0.04, 0.42, chairMat);
        seat.position.set(0, 0.45, 0);
        chairGroup.add(seat);
        // 靠背
        const back = createBoxMesh(0.42, 0.42, 0.04, chairMat);
        back.position.set(0, 0.66, -0.19);
        chairGroup.add(back);
        // 腿
        const clGeom = new THREE.CylinderGeometry(0.012, 0.008, 0.45, 8);
        [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([clx, clz]) => {
          const cl = new THREE.Mesh(clGeom, metalMat);
          cl.position.set(clx, 0.225, clz);
          chairGroup.add(cl);
        });
        chairGroup.position.set(cx, cy, cz);
        chairGroup.rotation.y = rot;
        group.add(chairGroup);
      });
      break;
    }

    case 'study-desk-1400': {
      // 尺寸: 1400 x 700 x 750 mm
      const w = 1.4, d = 0.7, h = 0.75;
      const top = createBoxMesh(w, 0.035, d, woodMat);
      top.position.set(0, h - 0.0175, 0);
      group.add(top);

      // 现代工字形钢架桌腿
      const legGeom = new THREE.BoxGeometry(0.04, h - 0.035, d - 0.1);
      const legL = new THREE.Mesh(legGeom, metalMat);
      legL.position.set(-w / 2 + 0.06, (h - 0.035) / 2, 0);
      group.add(legL);

      const legR = new THREE.Mesh(legGeom, metalMat);
      legR.position.set(w / 2 - 0.06, (h - 0.035) / 2, 0);
      group.add(legR);
      break;
    }

    case 'ergonomic-office-chair': {
      // 尺寸: 650 x 650 x 1120 mm
      const seatH = 0.48;
      // 座椅座包
      const seat = createBoxMesh(0.5, 0.08, 0.48, primMat);
      seat.position.set(0, seatH, 0);
      group.add(seat);

      // 人体工学双背
      const back = createBoxMesh(0.46, 0.58, 0.05, primMat);
      back.position.set(0, seatH + 0.32, -0.22);
      back.rotation.x = 0.1;
      group.add(back);

      // 头枕
      const headrest = createBoxMesh(0.28, 0.14, 0.06, primMat);
      headrest.position.set(0, seatH + 0.65, -0.26);
      group.add(headrest);

      // 气压棒与五星轮底盘
      const cylGeom = new THREE.CylinderGeometry(0.025, 0.025, seatH - 0.08, 12);
      const cyl = new THREE.Mesh(cylGeom, metalMat);
      cyl.position.set(0, (seatH - 0.08) / 2 + 0.05, 0);
      group.add(cyl);

      const baseGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.02, 5);
      const baseMesh = new THREE.Mesh(baseGeom, metalMat);
      baseMesh.position.set(0, 0.05, 0);
      group.add(baseMesh);
      break;
    }

    case 'bookshelf-display-1200': {
      // 尺寸: 1200 x 320 x 1980 mm
      const w = 1.2, d = 0.32, h = 1.98;
      const frame = createBoxMesh(w, h, d, woodMat);
      frame.position.set(0, h / 2, 0);
      group.add(frame);
      break;
    }

    case 'floor-arc-lamp-01': {
      // 尺寸: 450 x 900 x 1850 mm
      const baseGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 32);
      const base = new THREE.Mesh(baseGeom, stoneMat);
      base.position.set(0, 0.02, 0);
      group.add(base);

      // 弧形杆
      const poleGeom = new THREE.CylinderGeometry(0.012, 0.012, 1.85, 16);
      const pole = new THREE.Mesh(poleGeom, metalMat);
      pole.position.set(0, 1.85 / 2, 0);
      group.add(pole);

      // 悬挑横杆与灯罩
      const shadeGeom = new THREE.ConeGeometry(0.18, 0.14, 24, 1, true);
      const shadeMat = getPBRMaterial('lamp_shade', { color: new THREE.Color(primaryColor), roughness: 0.3, side: THREE.DoubleSide });
      const shade = new THREE.Mesh(shadeGeom, shadeMat);
      shade.position.set(0.35, 1.78, 0);
      group.add(shade);

      // 点光源模拟灯光照射
      const lampLight = new THREE.PointLight(0xffedd5, 25, 4.0, 2);
      lampLight.position.set(0.35, 1.72, 0);
      lampLight.castShadow = true;
      lampLight.shadow.bias = -0.001;
      group.add(lampLight);
      break;
    }

    case 'plant-fiddle-leaf-fig': {
      // 尺寸: 600 x 600 x 1650 mm
      // 水泥花盆
      const potGeom = new THREE.CylinderGeometry(0.22, 0.18, 0.45, 24);
      const potMat = getPBRMaterial('pot_ceramic', { color: new THREE.Color('#cbd5e1'), roughness: 0.8 });
      const pot = new THREE.Mesh(potGeom, potMat);
      pot.position.set(0, 0.225, 0);
      group.add(pot);

      // 树干
      const trunkGeom = new THREE.CylinderGeometry(0.02, 0.03, 1.2, 8);
      const trunk = new THREE.Mesh(trunkGeom, woodMat);
      trunk.position.set(0, 0.45 + 0.6, 0);
      group.add(trunk);

      // 琴叶榕宽阔树叶
      const leafMat = getPBRMaterial('plant_leaf', { color: new THREE.Color('#15803d'), roughness: 0.4, side: THREE.DoubleSide });
      const leafCount = 9;
      for (let i = 0; i < leafCount; i++) {
        const leafGeom = new THREE.SphereGeometry(0.18, 8, 8);
        leafGeom.scale(1.2, 0.05, 0.65);
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        const yPos = 0.7 + (i / leafCount) * 0.9;
        const angle = i * 2.4;
        leaf.position.set(Math.cos(angle) * 0.2, yPos, Math.sin(angle) * 0.2);
        leaf.rotation.set(0.2, angle, 0.3);
        group.add(leaf);
      }
      break;
    }

    default: {
      // 兜底通用立方体
      const w = item.dimensionsMm.width / 1000;
      const d = item.dimensionsMm.length / 1000;
      const h = item.dimensionsMm.height / 1000;
      const fallback = createBoxMesh(w, h, d, primMat);
      fallback.position.set(0, h / 2, 0);
      group.add(fallback);
      break;
    }
  }

  return group;
}
