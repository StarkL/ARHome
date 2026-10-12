import * as THREE from 'three';

/**
 * 物理边界限制、智能磁吸贴墙与家具重叠检测核心算法
 */
export function clampAndSnapItemPosition(item, wallBounds, otherItems = []) {
  if (!item || !wallBounds) return false;

  const dimsMm = item.userData.dimensionsMm || { width: 1000, length: 1000 };
  const w = (dimsMm.width || 1000) / 1000;
  const d = (dimsMm.length || 1000) / 1000;
  const rotY = item.rotation.y || 0;

  // 旋转后在世界坐标 XZ 平面上的投影半宽与半长 (AABB Projection)
  const halfX = (Math.abs(Math.cos(rotY)) * w + Math.abs(Math.sin(rotY)) * d) / 2;
  const halfZ = (Math.abs(Math.sin(rotY)) * w + Math.abs(Math.cos(rotY)) * d) / 2;

  // 严禁穿透墙体，硬阻挡有效活动范围
  const minAllowX = wallBounds.minX + halfX;
  const maxAllowX = wallBounds.maxX - halfX;
  const minAllowZ = wallBounds.minZ + halfZ;
  const maxAllowZ = wallBounds.maxZ - halfZ;

  let targetX = item.position.x;
  let targetZ = item.position.z;

  // 1. 墙体智能磁吸对齐 (距离墙面在 10cm 以内时自动吸附紧贴墙体内壁)
  const snapThreshold = 0.10;
  if (Math.abs(targetX - minAllowX) < snapThreshold) targetX = minAllowX;
  else if (Math.abs(targetX - maxAllowX) < snapThreshold) targetX = maxAllowX;

  if (Math.abs(targetZ - minAllowZ) < snapThreshold) targetZ = minAllowZ;
  else if (Math.abs(targetZ - maxAllowZ) < snapThreshold) targetZ = maxAllowZ;

  // 2. 严格限制在室内范围 (严防穿入四面水泥墙)
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

  // 3. 承重柱障碍物检测与规避 (Corner Pillar at -width/2 + 0.21, -depth/2 + 0.21)
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

  // 4. 与其他家具的碰撞重叠检测
  let hasFurnitureCollision = false;
  for (const other of otherItems) {
    if (other === item) continue;
    if (other.userData.catalogId === 'wall-tv-65inch' || item.userData.catalogId === 'wall-tv-65inch') continue;

    const otherDims = other.userData.dimensionsMm || { width: 1000, length: 1000 };
    const ow = (otherDims.width || 1000) / 1000;
    const od = (otherDims.length || 1000) / 1000;
    const orot = other.rotation.y || 0;
    const oHalfX = (Math.abs(Math.cos(orot)) * ow + Math.abs(Math.sin(orot)) * od) / 2;
    const oHalfZ = (Math.abs(Math.sin(orot)) * ow + Math.abs(Math.cos(orot)) * od) / 2;

    const oMinX = other.position.x - oHalfX;
    const oMaxX = other.position.x + oHalfX;
    const oMinZ = other.position.z - oHalfZ;
    const oMaxZ = other.position.z + oHalfZ;

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

  return collidesWithPillar || hasFurnitureCollision;
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
