import * as THREE from 'three';

/**
 * 通道动线与人体工程学安全检测器 (ClearanceChecker)
 * 实时监测家具与墙体、家具与家具之间的通行净宽
 */
export class ClearanceChecker {
  constructor(scene) {
    this.scene = scene;
    this.alertGroup = new THREE.Group();
    this.alertGroup.name = 'clearance-alerts';
    this.scene.add(this.alertGroup);

    this.warningLineMat = new THREE.LineBasicMaterial({
      color: 0xef4444, // 警告鲜红
      linewidth: 3,
      depthTest: false
    });
  }

  clear() {
    while (this.alertGroup.children.length > 0) {
      const child = this.alertGroup.children[0];
      this.alertGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
  }

  /**
   * 运行空间动线安全评估
   * @param {Array<THREE.Object3D>} items 
   * @param {Object} bounds 
   * @returns {Array<Object>} warnings
   */
  check(items, bounds) {
    this.clear();
    const warnings = [];
    if (!items || items.length === 0) return warnings;

    const bboxes = items.map(item => {
      const b = new THREE.Box3().setFromObject(item);
      return { item, box: b };
    });

    // 1. 检测家具与四面物理墙体的间距
    if (bounds) {
      bboxes.forEach(({ item, box }) => {
        const requiredMinMm = item.userData.clearanceRequirementMm || 600;
        const requiredMinM = requiredMinMm / 1000;

        const wallChecks = [
          { side: '北墙', dist: box.min.z - bounds.minZ, p1: new THREE.Vector3(box.getCenter(new THREE.Vector3()).x, 0.1, box.min.z), p2: new THREE.Vector3(box.getCenter(new THREE.Vector3()).x, 0.1, bounds.minZ) },
          { side: '南墙', dist: bounds.maxZ - box.max.z, p1: new THREE.Vector3(box.getCenter(new THREE.Vector3()).x, 0.1, box.max.z), p2: new THREE.Vector3(box.getCenter(new THREE.Vector3()).x, 0.1, bounds.maxZ) },
          { side: '西墙', dist: box.min.x - bounds.minX, p1: new THREE.Vector3(box.min.x, 0.1, box.getCenter(new THREE.Vector3()).z), p2: new THREE.Vector3(bounds.minX, 0.1, box.getCenter(new THREE.Vector3()).z) },
          { side: '东墙', dist: bounds.maxX - box.max.x, p1: new THREE.Vector3(box.max.x, 0.1, box.getCenter(new THREE.Vector3()).z), p2: new THREE.Vector3(bounds.maxX, 0.1, box.getCenter(new THREE.Vector3()).z) }
        ];

        wallChecks.forEach(w => {
          // 如果间距大于 0.05m (非完全贴墙摆放) 且小于最小通道要求 (通常 600mm)
          if (w.dist > 0.04 && w.dist < requiredMinM) {
            const actualMm = Math.round(w.dist * 1000);
            warnings.push({
              type: 'wall_pinch',
              severity: actualMm < 450 ? 'danger' : 'warning',
              itemName: item.userData.name,
              target: w.side,
              actualMm,
              requiredMm: requiredMinMm,
              message: `【${item.userData.name}】与【${w.side}】通道净宽仅 ${actualMm}mm (标准需 ≥${requiredMinMm}mm)，体感拥挤或受阻。`
            });
            this._drawWarningLine(w.p1, w.p2);
          }
        });
      });
    }

    // 2. 检测家具与家具之间的通行间隙
    for (let i = 0; i < bboxes.length; i++) {
      for (let j = i + 1; j < bboxes.length; j++) {
        const a = bboxes[i];
        const b = bboxes[j];

        // 计算 2D 水平投影上的距离
        const dx = Math.max(0, Math.max(a.box.min.x - b.box.max.x, b.box.min.x - a.box.max.x));
        const dz = Math.max(0, Math.max(a.box.min.z - b.box.max.z, b.box.min.z - a.box.max.z));
        const clearanceM = Math.sqrt(dx * dx + dz * dz);
        const clearanceMm = Math.round(clearanceM * 1000);

        // 如果存在重叠碰撞 (dx === 0 && dz === 0)
        if (dx === 0 && dz === 0) {
          warnings.push({
            type: 'collision',
            severity: 'danger',
            itemName: a.item.userData.name,
            target: b.item.userData.name,
            actualMm: 0,
            requiredMm: 600,
            message: `【${a.item.userData.name}】与【${b.item.userData.name}】发生物理重叠碰撞！`
          });
        } else if (clearanceM > 0.05 && clearanceM < 0.55) {
          // 通道太窄 (小于 550mm)
          warnings.push({
            type: 'furniture_pinch',
            severity: 'warning',
            itemName: a.item.userData.name,
            target: b.item.userData.name,
            actualMm: clearanceMm,
            requiredMm: 600,
            message: `【${a.item.userData.name}】与【${b.item.userData.name}】间距仅 ${clearanceMm}mm，侧身通过困难。`
          });
          const c1 = a.box.getCenter(new THREE.Vector3()); c1.y = 0.1;
          const c2 = b.box.getCenter(new THREE.Vector3()); c2.y = 0.1;
          this._drawWarningLine(c1, c2);
        }
      }
    }

    return warnings;
  }

  _drawWarningLine(p1, p2) {
    const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const line = new THREE.Line(geom, this.warningLineMat);
    this.alertGroup.add(line);
  }
}
