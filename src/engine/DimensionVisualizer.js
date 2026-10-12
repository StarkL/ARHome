import * as THREE from 'three';

/**
 * 文本精灵贴图生成器 (Crisp Canvas Sprite Text)
 * 生成高清晰度、带暗黑半透明毛玻璃底板的工程尺寸标注
 */
function createTextSprite(text, bgColor = 'rgba(15, 23, 42, 0.88)', textColor = '#38bdf8', borderColor = '#0ea5e9') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // 圆角矩形背景框
  const r = 16;
  const x = 10, y = 10, w = 492, h = 108;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  // 标注文案
  ctx.fillStyle = textColor;
  ctx.font = 'bold 44px "JetBrains Mono", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(0.65, 0.16, 1);
  return sprite;
}

/**
 * 3D 尺寸标注与工程线可视化器
 */
export class DimensionVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.vizGroup = new THREE.Group();
    this.vizGroup.name = 'dimension-visualizer';
    this.scene.add(this.vizGroup);

    this.lineMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      linewidth: 2,
      depthTest: false,
      transparent: true,
      opacity: 0.95
    });

    this.collisionLineMat = new THREE.LineBasicMaterial({
      color: 0xef4444, // 碰撞警告亮红
      linewidth: 3,
      depthTest: false,
      transparent: true,
      opacity: 0.95
    });

    this.dashedMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 0.1,
      gapSize: 0.05,
      depthTest: false
    });
  }

  clear() {
    while (this.vizGroup.children.length > 0) {
      const child = this.vizGroup.children[0];
      this.vizGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    }
  }

  /**
   * 为选中的家具渲染 1:1 CAD 三维尺寸线与文字标牌
   * @param {THREE.Object3D} targetGroup 
   * @param {Object} roomBounds 
   * @param {boolean} isColliding 是否与其他家具或柱体碰撞
   */
  update(targetGroup, roomBounds, isColliding = false) {
    this.clear();
    if (!targetGroup) return;

    const bbox = new THREE.Box3().setFromObject(targetGroup);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    const dimsMm = targetGroup.userData.dimensionsMm || {
      width: Math.round(size.x * 1000),
      length: Math.round(size.z * 1000),
      height: Math.round(size.y * 1000)
    };

    // 1. 三维包围盒线框 (正常为 Cyan，碰撞重叠时变 Red)
    const boxGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const edgesGeom = new THREE.EdgesGeometry(boxGeom);
    const currentMat = isColliding ? this.collisionLineMat : this.lineMat;
    const wireframe = new THREE.LineSegments(edgesGeom, currentMat);
    wireframe.position.copy(center);
    this.vizGroup.add(wireframe);

    // 2. 地面投影占地轮廓 (Footprint)
    const footGeom = new THREE.PlaneGeometry(size.x + 0.04, size.z + 0.04);
    const footMat = new THREE.MeshBasicMaterial({
      color: isColliding ? 0xef4444 : 0x06b6d4,
      transparent: true,
      opacity: isColliding ? 0.35 : 0.12,
      depthWrite: false
    });
    const footprint = new THREE.Mesh(footGeom, footMat);
    footprint.rotation.x = -Math.PI / 2;
    footprint.position.set(center.x, 0.008, center.z);
    this.vizGroup.add(footprint);

    // 如果处于碰撞状态，在顶部显著位置增加警示标牌
    if (isColliding) {
      const alertSprite = createTextSprite('⚠️ 空间重叠碰撞', 'rgba(185, 28, 28, 0.95)', '#fecaca', '#ef4444');
      alertSprite.scale.set(0.75, 0.18, 1);
      alertSprite.position.set(center.x, bbox.max.y + 0.32, center.z);
      this.vizGroup.add(alertSprite);
    }

    // 3. 宽度标注 (Width mm) - 沿 X 轴顶端
    const wText = `宽 ${dimsMm.width} mm`;
    const wSprite = createTextSprite(wText, 'rgba(15, 23, 42, 0.9)', '#38bdf8', '#0ea5e9');
    wSprite.position.set(center.x, bbox.max.y + 0.14, bbox.max.z);
    this.vizGroup.add(wSprite);

    // 4. 进深/长度标注 (Length mm) - 沿 Z 轴侧边
    const lText = `长 ${dimsMm.length} mm`;
    const lSprite = createTextSprite(lText, 'rgba(15, 23, 42, 0.9)', '#a7f3d0', '#10b981');
    lSprite.position.set(bbox.max.x + 0.22, bbox.min.y + 0.2, center.z);
    this.vizGroup.add(lSprite);

    // 5. 高度标注 (Height mm) - 沿 Y 轴立柱
    const hText = `高 ${dimsMm.height} mm`;
    const hSprite = createTextSprite(hText, 'rgba(15, 23, 42, 0.9)', '#fde047', '#eab308');
    hSprite.position.set(bbox.min.x - 0.22, center.y, bbox.max.z);
    this.vizGroup.add(hSprite);

    // 6. 占地面积综合标牌 (Area m²)
    const areaSqM = ((dimsMm.width * dimsMm.length) / 1000000).toFixed(2);
    const areaText = `占地: ${areaSqM} ㎡`;
    const areaSprite = createTextSprite(areaText, 'rgba(2, 6, 23, 0.85)', '#f1f5f9', '#64748b');
    areaSprite.scale.set(0.5, 0.12, 1);
    areaSprite.position.set(center.x, 0.02, center.z);
    areaSprite.rotation.x = -Math.PI / 2;
    this.vizGroup.add(areaSprite);

    // 7. 距墙动态测距线 (Wall Distance Rays)
    if (roomBounds) {
      this._renderWallDistances(bbox, center, roomBounds);
    }
  }

  _renderWallDistances(bbox, center, bounds) {
    const dists = [
      // 北墙 (Z min)
      { name: '北', from: new THREE.Vector3(center.x, 0.15, bbox.min.z), to: new THREE.Vector3(center.x, 0.15, bounds.minZ), dist: Math.abs(bbox.min.z - bounds.minZ) },
      // 南墙 (Z max)
      { name: '南', from: new THREE.Vector3(center.x, 0.15, bbox.max.z), to: new THREE.Vector3(center.x, 0.15, bounds.maxZ), dist: Math.abs(bounds.maxZ - bbox.max.z) },
      // 西墙 (X min)
      { name: '西', from: new THREE.Vector3(bbox.min.x, 0.15, center.z), to: new THREE.Vector3(bounds.minX, 0.15, center.z), dist: Math.abs(bbox.min.x - bounds.minX) },
      // 东墙 (X max)
      { name: '东', from: new THREE.Vector3(bbox.max.x, 0.15, center.z), to: new THREE.Vector3(bounds.maxX, 0.15, center.z), dist: Math.abs(bounds.maxX - bbox.max.x) },
    ];

    dists.forEach(d => {
      // 仅在距离小于 1.8 米时显示辅助测距线，避免杂乱
      if (d.dist > 0.02 && d.dist < 2.0) {
        const points = [d.from, d.to];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geom, this.dashedMat);
        line.computeLineDistances();
        this.vizGroup.add(line);

        const mm = Math.round(d.dist * 1000);
        const distSprite = createTextSprite(`距${d.name}墙 ${mm}mm`, 'rgba(0,0,0,0.7)', '#f97316', '#ea580c');
        distSprite.scale.set(0.48, 0.12, 1);
        distSprite.position.lerpVectors(d.from, d.to, 0.5);
        distSprite.position.y += 0.08;
        this.vizGroup.add(distSprite);
      }
    });
  }
}
