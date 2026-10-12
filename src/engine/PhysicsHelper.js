import * as THREE from 'three';

/**
 * 物理边界限制、智能磁吸贴墙与家具重叠检测核心算法
 */
/**
 * 2D 矩形与线段墙体几何碰撞检测 (带厚度与安全边距)
 */
export function checkWallBoxCollision(x, z, halfX, halfZ, wall, clearance = 0.05) {
  if (!wall?.start || !wall?.end) return false;
  const x1 = wall.start[0], z1 = wall.start[1];
  const x2 = wall.end[0], z2 = wall.end[1];
  const dx = x2 - x1, dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 0.0001) return false;

  // 投影点在墙线段上的参数 u [0, 1]
  const u = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / lenSq));
  const px = x1 + u * dx;
  const pz = z1 + u * dz;

  // 如果墙体包含门洞，且投影点位于门洞有效跨度内，则允许家具临时通行
  if (wall.openings && wall.openings.length > 0) {
    const distAlong = Math.hypot(px - x1, pz - z1);
    for (const op of wall.openings) {
      if (distAlong >= (op.offset || 0) && distAlong <= (op.offset || 0) + (op.width || 0.9)) {
        return false;
      }
    }
  }

  // 家具 AABB 上距墙体最近点
  const bx1 = x - halfX;
  const bx2 = x + halfX;
  const bz1 = z - halfZ;
  const bz2 = z + halfZ;

  const cx = Math.max(bx1, Math.min(bx2, px));
  const cz = Math.max(bz1, Math.min(bz2, pz));

  const distSq = (px - cx) * (px - cx) + (pz - cz) * (pz - cz);
  const wallThick = wall.thickness || 0.2;
  const minDist = (wallThick / 2) + clearance;

  return distSq < (minDist * minDist);
}

/**
 * 墙体穿透排斥推开向量计算
 */
export function getWallPushVector(x, z, halfX, halfZ, wall) {
  if (!wall?.start || !wall?.end) return null;
  const x1 = wall.start[0], z1 = wall.start[1];
  const x2 = wall.end[0], z2 = wall.end[1];
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  if (len < 0.01) return null;

  const nx = -dz / len;
  const nz = dx / len;

  const mx = (x1 + x2) / 2;
  const mz = (z1 + z2) / 2;
  const dot = (x - mx) * nx + (z - mz) * nz;
  const sign = dot >= 0 ? 1 : -1;

  const pushDist = ((wall.thickness || 0.2) / 2) + Math.min(halfX, halfZ) * 0.4 + 0.06;
  return { x: nx * sign * pushDist, z: nz * sign * pushDist };
}

/**
 * 物理边界限制、智能磁吸贴墙与家具重叠检测核心算法
 */
export function clampAndSnapItemPosition(item, wallBounds, otherItems = [], walls = []) {
  if (!item || !wallBounds) return false;

  const dimsMm = item.userData?.dimensionsMm || { width: 1000, length: 1000 };
  const w = (dimsMm.width || 1000) / 1000;
  const d = (dimsMm.length || 1000) / 1000;
  const rotY = item.rotation?.y || 0;

  // 旋转后在世界坐标 XZ 平面上的投影半宽与半长 (AABB Projection)
  const halfX = (Math.abs(Math.cos(rotY)) * w + Math.abs(Math.sin(rotY)) * d) / 2;
  const halfZ = (Math.abs(Math.sin(rotY)) * w + Math.abs(Math.cos(rotY)) * d) / 2;

  // 严禁穿透外围墙体
  const minAllowX = wallBounds.minX + halfX;
  const maxAllowX = wallBounds.maxX - halfX;
  const minAllowZ = wallBounds.minZ + halfZ;
  const maxAllowZ = wallBounds.maxZ - halfZ;

  let targetX = item.position.x;
  let targetZ = item.position.z;

  // 1. 墙体智能磁吸对齐 (距离外墙面在 10cm 以内时自动吸附)
  const snapThreshold = 0.10;
  if (Math.abs(targetX - minAllowX) < snapThreshold) targetX = minAllowX;
  else if (Math.abs(targetX - maxAllowX) < snapThreshold) targetX = maxAllowX;

  if (Math.abs(targetZ - minAllowZ) < snapThreshold) targetZ = minAllowZ;
  else if (Math.abs(targetZ - maxAllowZ) < snapThreshold) targetZ = maxAllowZ;

  // 2. 严格限制在外围室内范围
  if (minAllowX <= maxAllowX) {
    targetX = Math.max(minAllowX, Math.min(maxAllowX, targetX));
  } else {
    targetX = (minAllowX + maxAllowX) / 2;
  }

  if (minAllowZ <= maxAllowZ) {
    targetZ = Math.max(minAllowZ, Math.min(maxAllowZ, targetZ));
  } else {
    targetZ = (minAllowZ + maxAllowZ) / 2;
  }

  // 3. 内部实体隔墙碰撞检测与阻挡 (多房间户型支持)
  let collidesWithWall = false;
  if (walls && walls.length > 0) {
    for (const wall of walls) {
      if (checkWallBoxCollision(targetX, targetZ, halfX, halfZ, wall, 0.04)) {
        collidesWithWall = true;
        const pushVec = getWallPushVector(targetX, targetZ, halfX, halfZ, wall);
        if (pushVec) {
          targetX += pushVec.x;
          targetZ += pushVec.z;
        }
      }
    }
  }

  // 4. 承重柱障碍物检测与规避 (Corner Pillar)
  const pillarHalf = 0.21;
  const pillarMinX = wallBounds.minX;
  const pillarMaxX = wallBounds.minX + pillarHalf * 2;
  const pillarMinZ = wallBounds.minZ;
  const pillarMaxZ = wallBounds.minZ + pillarHalf * 2;

  let collidesWithPillar = false;
  if (
    targetX - halfX < pillarMaxX &&
    targetX + halfX > pillarMinX &&
    targetZ - halfZ < pillarMaxZ &&
    targetZ + halfZ > pillarMinZ
  ) {
    collidesWithPillar = true;
    const overlapX = pillarMaxX - (targetX - halfX);
    const overlapZ = pillarMaxZ - (targetZ - halfZ);
    if (overlapX < overlapZ && targetX + overlapX <= maxAllowX) {
      targetX += overlapX;
    } else if (targetZ + overlapZ <= maxAllowZ) {
      targetZ += overlapZ;
    }
  }

  // 5. 与其他家具的碰撞重叠检测
  let hasFurnitureCollision = false;
  for (const other of otherItems) {
    const otherGroup = other.group || other;
    if (otherGroup === item || other === item) continue;
    if (otherGroup?.userData?.catalogId === 'wall-tv-65inch' || item.userData?.catalogId === 'wall-tv-65inch') continue;

    const otherDims = otherGroup?.userData?.dimensionsMm || { width: 1000, length: 1000 };
    const ow = (otherDims.width || 1000) / 1000;
    const od = (otherDims.length || 1000) / 1000;
    const orot = otherGroup?.rotation?.y || 0;
    const oHalfX = (Math.abs(Math.cos(orot)) * ow + Math.abs(Math.sin(orot)) * od) / 2;
    const oHalfZ = (Math.abs(Math.sin(orot)) * ow + Math.abs(Math.cos(orot)) * od) / 2;

    const oMinX = otherGroup.position.x - oHalfX;
    const oMaxX = otherGroup.position.x + oHalfX;
    const oMinZ = otherGroup.position.z - oHalfZ;
    const oMaxZ = otherGroup.position.z + oHalfZ;

    const overlapX = Math.min(targetX + halfX, oMaxX) - Math.max(targetX - halfX, oMinX);
    const overlapZ = Math.min(targetZ + halfZ, oMaxZ) - Math.max(targetZ - halfZ, oMinZ);

    if (overlapX > 0.02 && overlapZ > 0.02) {
      hasFurnitureCollision = true;
      break;
    }
  }

  item.position.x = targetX;
  item.position.z = targetZ;
  item.position.y = 0;

  return collidesWithPillar || hasFurnitureCollision || collidesWithWall;
}

/**
 * 一键吸附到最近物理墙体
 */
export function snapSelectedItemToNearestWall(item, wallBounds) {
  if (!item || !wallBounds) return;

  const dimsMm = item.userData.dimensionsMm || { width: 1000, length: 1000 };
  const w = (dimsMm.width || 1000) / 1000;
  const d = (dimsMm.length || 1000) / 1000;
  const rot = item.rotation.y || 0;
  const halfX = (Math.abs(Math.cos(rot)) * w + Math.abs(Math.sin(rot)) * d) / 2;
  const halfZ = (Math.abs(Math.sin(rot)) * w + Math.abs(Math.cos(rot)) * d) / 2;
  const pos = item.position;

  const dists = [
    { side: 'north', dist: Math.abs(pos.z - (wallBounds.minZ + halfZ)), targetZ: wallBounds.minZ + halfZ, rot: Math.PI },
    { side: 'south', dist: Math.abs((wallBounds.maxZ - halfZ) - pos.z), targetZ: wallBounds.maxZ - halfZ, rot: 0 },
    { side: 'west', dist: Math.abs(pos.x - (wallBounds.minX + halfX)), targetX: wallBounds.minX + halfX, rot: Math.PI / 2 },
    { side: 'east', dist: Math.abs((wallBounds.maxX - halfX) - pos.x), targetX: wallBounds.maxX - halfX, rot: -Math.PI / 2 }
  ];

  dists.sort((a, b) => a.dist - b.dist);
  const closest = dists[0];

  if (closest.targetZ !== undefined) pos.z = closest.targetZ;
  if (closest.targetX !== undefined) pos.x = closest.targetX;
  item.rotation.y = closest.rot;
}

/**
 * 智能安全家具生成点计算算法 (根据户型图纸功能房间、动线、现有墙体与家具自动寻找开阔点)
 */
export function findSafeSpawnPosition(catalogItem, roomConfig, placedItems = [], wallBounds) {
  const dimsMm = catalogItem.dimensionsMm || { width: 1000, length: 1000 };
  const w = (dimsMm.width || 1000) / 1000;
  const d = (dimsMm.length || 1000) / 1000;
  const halfX = w / 2;
  const halfZ = d / 2;

  const walls = roomConfig?.floorPlan?.walls || [];
  const rooms = roomConfig?.floorPlan?.rooms || [];

  // 1. 查找最适宜的首选功能房间 (智能房间分类匹配)
  let primaryCenter = [0, 0];
  const cat = catalogItem.category || '';
  const itemId = catalogItem.id || '';

  if (cat === 'bedroom' || itemId.includes('bed') || itemId.includes('wardrobe') || itemId.includes('vanity') || itemId.includes('nightstand')) {
    const bedRoom = rooms.find(r => r.id.includes('bed') || r.name.includes('卧'));
    if (bedRoom && bedRoom.center) primaryCenter = bedRoom.center;
  } else if (cat === 'living' || cat === 'dining' || itemId.includes('sofa') || itemId.includes('tv') || itemId.includes('table') || itemId.includes('chair')) {
    const livingRoom = rooms.find(r => r.id.includes('living') || r.id.includes('dining') || r.name.includes('客') || r.name.includes('起居') || r.name.includes('餐'));
    if (livingRoom && livingRoom.center) primaryCenter = livingRoom.center;
  } else if (rooms.length > 0) {
    const largest = [...rooms].sort((a, b) => (b.areaM2 || 0) - (a.areaM2 || 0))[0];
    if (largest && largest.center) primaryCenter = largest.center;
  }

  // 候选搜索中心列表 (优先首选房间，其次其他房间)
  const centerList = [primaryCenter];
  rooms.forEach(r => {
    if (r.center && (r.center[0] !== primaryCenter[0] || r.center[1] !== primaryCenter[1])) {
      centerList.push(r.center);
    }
  });

  const checkCollisionAt = (cx, cz) => {
    // 检查外墙限制
    if (wallBounds) {
      if (cx - halfX < wallBounds.minX + 0.15 || cx + halfX > wallBounds.maxX - 0.15) return true;
      if (cz - halfZ < wallBounds.minZ + 0.15 || cz + halfZ > wallBounds.maxZ - 0.15) return true;
    }

    // 检查所有内墙与隔墙
    for (const wall of walls) {
      if (checkWallBoxCollision(cx, cz, halfX, halfZ, wall, 0.15)) {
        return true;
      }
    }

    // 检查与其他已放置家具的重叠
    for (const other of placedItems) {
      const otherGroup = other.group || other;
      if (!otherGroup?.userData) continue;
      if (otherGroup.userData.catalogId === 'wall-tv-65inch' || catalogItem.id === 'wall-tv-65inch') continue;

      const otherDims = otherGroup.userData.dimensionsMm || { width: 1000, length: 1000 };
      const ow = (otherDims.width || 1000) / 1000;
      const od = (otherDims.length || 1000) / 1000;
      const oRot = otherGroup.rotation?.y || 0;
      const oHalfX = (Math.abs(Math.cos(oRot)) * ow + Math.abs(Math.sin(oRot)) * od) / 2;
      const oHalfZ = (Math.abs(Math.sin(oRot)) * ow + Math.abs(Math.cos(oRot)) * od) / 2;

      const oMinX = otherGroup.position.x - oHalfX;
      const oMaxX = otherGroup.position.x + oHalfX;
      const oMinZ = otherGroup.position.z - oHalfZ;
      const oMaxZ = otherGroup.position.z + oHalfZ;

      const overlapX = Math.min(cx + halfX, oMaxX) - Math.max(cx - halfX, oMinX);
      const overlapZ = Math.min(cz + halfZ, oMaxZ) - Math.max(cz - halfZ, oMinZ);

      if (overlapX > -0.1 && overlapZ > -0.1) {
        return true;
      }
    }

    return false;
  };

  // 螺旋尝试搜索安全开阔落脚点
  for (const center of centerList) {
    if (!checkCollisionAt(center[0], center[1])) {
      return [center[0], 0, center[1]];
    }

    const maxRadius = Math.max(roomConfig?.width || 5, roomConfig?.depth || 5) / 2;
    for (let r = 0.35; r <= maxRadius; r += 0.35) {
      const steps = Math.max(8, Math.round(r * 10));
      for (let s = 0; s < steps; s++) {
        const theta = (s / steps) * Math.PI * 2;
        const candX = parseFloat((center[0] + Math.cos(theta) * r).toFixed(2));
        const candZ = parseFloat((center[1] + Math.sin(theta) * r).toFixed(2));
        if (!checkCollisionAt(candX, candZ)) {
          return [candX, 0, candZ];
        }
      }
    }
  }

  // 兜底返回主中心
  return [primaryCenter[0], 0, primaryCenter[1]];
}
