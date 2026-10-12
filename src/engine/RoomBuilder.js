import * as THREE from 'three';

/**
 * 动态生成高质量水泥毛坯材质贴图 (Procedural Concrete Texture)
 * 零外链依赖，纯离线极速生成，具备粗糙度、颗粒杂色与施工墨线感
 */
function createProceduralConcreteTexture(isFloor = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 水泥基底色
  const baseGray = isFloor ? 120 : 135;
  ctx.fillStyle = `rgb(${baseGray}, ${baseGray}, ${baseGray})`;
  ctx.fillRect(0, 0, 512, 512);

  // 噪点与水泥斑驳质感
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 35;
    const v = Math.min(255, Math.max(0, data[i] + noise));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  ctx.putImageData(imgData, 0, 0);

  // 如果是地面，绘制弱可见的 1 米标准工程基准方格墨线 (1m Grid Construction Marks)
  if (isFloor) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, 512, 512);

    // 细分刻度
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(256, 0); ctx.lineTo(256, 512);
    ctx.moveTo(0, 256); ctx.lineTo(512, 256);
    ctx.stroke();

    // 施工墨线编号
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.font = '14px monospace';
    ctx.fillText('REF-1M', 10, 24);
  } else {
    // 墙面脱模接缝墨线与水渍感
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 256); ctx.lineTo(512, 256);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * 房间构建器 (RoomBuilder)
 * 渲染真实的毛坯房几何空间，支持：
 * 1. 基础单矩形参数化毛坯房
 * 2. 户型图纸自动解析生成的多房间、任意转角与内隔墙 1:1 三维毛坯场景
 * 3. 3D 地面工程图纸半透明投影对照层 (Blueprint Floor Overlay)
 */
export class RoomBuilder {
  constructor(scene) {
    this.scene = scene;
    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'raw-room';
    this.scene.add(this.roomGroup);

    this.floorTexture = createProceduralConcreteTexture(true);
    this.wallTexture = createProceduralConcreteTexture(false);

    this.scanGridGroup = new THREE.Group();
    this.scanGridGroup.name = 'lidar-scan-grid';
    this.scene.add(this.scanGridGroup);

    this.southWalls = [];
    this.ceilings = [];
    this.beams = [];
    this.blueprintOverlayMesh = null;
    this.isBlueprintOverlayVisible = true;
    this.blueprintOverlayOpacity = 0.65;

    this.currentConfig = {
      width: 5.0,
      depth: 4.2,
      height: 2.8,
      wallFinish: 'concrete', // 'concrete' | 'skimcoat'
      windowWall: 'north',
      floorPlan: null
    };
  }

  build(config = {}) {
    this.currentConfig = { ...this.currentConfig, ...config };
    const { wallFinish, floorPlan } = this.currentConfig;

    // 清理旧网格与元素引用
    while (this.roomGroup.children.length > 0) {
      const obj = this.roomGroup.children[0];
      this.roomGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    this.southWalls = [];
    this.ceilings = [];
    this.beams = [];
    this.blueprintOverlayMesh = null;

    // 材质准备
    const isSkimCoat = wallFinish === 'skimcoat';
    const floorColor = '#737373';
    const wallColor = isSkimCoat ? '#f1f5f9' : '#888888';

    const floorMat = new THREE.MeshStandardMaterial({
      map: this.floorTexture,
      color: new THREE.Color(floorColor),
      roughness: 0.85,
      metalness: 0.05
    });

    const wallMat = new THREE.MeshStandardMaterial({
      map: isSkimCoat ? null : this.wallTexture,
      color: new THREE.Color(wallColor),
      roughness: isSkimCoat ? 0.95 : 0.8,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#666666'),
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    // 核心分支：如果是图纸驱动的多房间场景 (Floor Plan Mode)
    if (floorPlan && Array.isArray(floorPlan.walls) && floorPlan.walls.length > 0) {
      this._buildFromFloorPlan(floorPlan, wallFinish, floorMat, wallMat, ceilingMat);
    } else {
      // 常规单房间参数化构建 (Legacy Box Mode)
      this._buildBoxRoom(floorMat, wallMat, ceilingMat);
    }

    // 初始应用当前模式的顶板/南墙可见性
    if (this.currentViewMode) {
      this.setViewMode(this.currentViewMode);
    }
  }

  /**
   * 基于户型图纸矢量数据构建 1:1 三维房间场景 (Extruded Floor Plan Scene)
   */
  _buildFromFloorPlan(floorPlan, wallFinish, floorMat, wallMat, ceilingMat) {
    const w = floorPlan.targetWidthMeters || this.currentConfig.width;
    const d = floorPlan.targetDepthMeters || this.currentConfig.depth;
    const h = floorPlan.wallHeightMeters || this.currentConfig.height;

    this.floorTexture.repeat.set(Math.max(w, 4), Math.max(d, 4));
    this.wallTexture.repeat.set(Math.max(w, d), h);

    // 1. 建造地面
    const floorGeom = new THREE.PlaneGeometry(w, d);
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    floor.userData = { isFloor: true };
    this.roomGroup.add(floor);

    // 2. 建造天花板 (全景设计模式下隐藏)
    const ceilingGeom = new THREE.PlaneGeometry(w, d);
    const ceiling = new THREE.Mesh(ceilingGeom, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, h, 0);
    ceiling.receiveShadow = true;
    this.ceilings.push(ceiling);
    this.roomGroup.add(ceiling);

    // 3. 地面图纸投影对照层 (Blueprint Floor Projection Overlay)
    if (floorPlan.overlayImage || floorPlan.blueprintCanvas) {
      this._buildBlueprintOverlay(floorPlan, w, d);
    }

    // 4. 逐一构建墙体线段 (支持门洞、窗洞、开间内隔墙)
    floorPlan.walls.forEach(wall => {
      this._buildWallSegment(wall, h, wallMat);
    });

    // 5. 自然采光城市天际线远景
    this._buildOutdoorBackdrop(w, d, h);

    // 6. LiDAR 空间扫描点阵
    this._buildLidarScanMesh(w, d, h);
  }

  /**
   * 构建单段墙体 (带开洞与玻璃框处理)
   */
  _buildWallSegment(wall, totalH, wallMat) {
    const x1 = wall.start[0];
    const z1 = wall.start[1];
    const x2 = wall.end[0];
    const z2 = wall.end[1];
    const thickness = wall.thickness || 0.2;

    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.05) return;

    const angle = Math.atan2(dz, dx);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;

    // 判断是否为南面外墙 (在设计视角下剖切隐藏以便观察)
    const isSouthWall = wall.isExterior && Math.abs(midZ - (this.currentConfig.depth || 4) / 2) < 0.8;

    // 玻璃与窗框材质
    const frameMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3, metalness: 0.8 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transmission: 0.9,
      opacity: 1,
      transparent: true,
      roughness: 0.1,
      ior: 1.5
    });

    // 如果墙体包含门窗开洞 (Openings)
    if (wall.openings && wall.openings.length > 0) {
      wall.openings.forEach(op => {
        const opOffset = op.offset || 0;
        const opWidth = Math.min(op.width || 1.8, length * 0.9);
        const opH = op.height || 1.8;
        const sillH = op.type === 'window' ? (op.sillHeight || 0.5) : 0;
        const topH = Math.max(0.1, totalH - (sillH + opH));

        // 墙体拆分为局部 Group 并统一旋转
        const wallGroup = new THREE.Group();
        wallGroup.position.set(x1, 0, z1);
        wallGroup.rotation.y = -angle;

        // A. 开洞前段实体墙
        if (opOffset > 0.05) {
          const preGeom = new THREE.BoxGeometry(opOffset, totalH, thickness);
          const preMesh = new THREE.Mesh(preGeom, wallMat);
          preMesh.position.set(opOffset / 2, totalH / 2, 0);
          preMesh.receiveShadow = true;
          preMesh.castShadow = true;
          wallGroup.add(preMesh);
        }

        // B. 开洞后段实体墙
        const postStart = opOffset + opWidth;
        const postLen = length - postStart;
        if (postLen > 0.05) {
          const postGeom = new THREE.BoxGeometry(postLen, totalH, thickness);
          const postMesh = new THREE.Mesh(postGeom, wallMat);
          postMesh.position.set(postStart + postLen / 2, totalH / 2, 0);
          postMesh.receiveShadow = true;
          postMesh.castShadow = true;
          wallGroup.add(postMesh);
        }

        // C. 开洞上方过梁实体 (Header)
        if (topH > 0.05) {
          const topGeom = new THREE.BoxGeometry(opWidth, topH, thickness);
          const topMesh = new THREE.Mesh(topGeom, wallMat);
          topMesh.position.set(opOffset + opWidth / 2, totalH - topH / 2, 0);
          topMesh.receiveShadow = true;
          topMesh.castShadow = true;
          wallGroup.add(topMesh);
        }

        // D. 窗台下部实体 (Sill) - 仅窗户有
        if (op.type === 'window' && sillH > 0.05) {
          const sillGeom = new THREE.BoxGeometry(opWidth, sillH, thickness);
          const sillMesh = new THREE.Mesh(sillGeom, wallMat);
          sillMesh.position.set(opOffset + opWidth / 2, sillH / 2, 0);
          sillMesh.receiveShadow = true;
          sillMesh.castShadow = true;
          wallGroup.add(sillMesh);

          // 窗户极简铝合金框架与高透物理玻璃
          const glass = new THREE.Mesh(new THREE.PlaneGeometry(opWidth * 0.98, opH * 0.98), glassMat);
          glass.position.set(opOffset + opWidth / 2, sillH + opH / 2, 0);
          wallGroup.add(glass);
        }

        wallGroup.userData = { isWall: true, isSouthWall, wallData: wall };
        if (isSouthWall) this.southWalls.push(wallGroup);
        this.roomGroup.add(wallGroup);
      });
    } else {
      // 完整无孔实体墙
      const wallGeom = new THREE.BoxGeometry(length, totalH, thickness);
      const wallMesh = new THREE.Mesh(wallGeom, wallMat);
      wallMesh.position.set(midX, totalH / 2, midZ);
      wallMesh.rotation.y = -angle;
      wallMesh.receiveShadow = true;
      wallMesh.castShadow = true;
      wallMesh.userData = { isWall: true, isSouthWall, wallData: wall };
      if (isSouthWall) this.southWalls.push(wallMesh);
      this.roomGroup.add(wallMesh);
    }
  }

  /**
   * 3D 地面工程图纸半透明投影对照层 (Blueprint Floor Projection Overlay)
   */
  _buildBlueprintOverlay(floorPlan, w, d) {
    let texture = null;
    if (floorPlan.blueprintCanvas) {
      texture = new THREE.CanvasTexture(floorPlan.blueprintCanvas);
    } else if (floorPlan.overlayImage) {
      const loader = new THREE.TextureLoader();
      texture = loader.load(floorPlan.overlayImage);
    }

    if (!texture) return;

    const overlayGeom = new THREE.PlaneGeometry(w, d);
    const overlayMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.blueprintOverlayOpacity,
      depthWrite: false
    });

    const overlayMesh = new THREE.Mesh(overlayGeom, overlayMat);
    overlayMesh.rotation.x = -Math.PI / 2;
    overlayMesh.position.set(0, 0.003, 0); // 微浮于地面 3mm，绝不发生 Z-fighting 闪烁
    overlayMesh.visible = this.isBlueprintOverlayVisible;
    this.blueprintOverlayMesh = overlayMesh;
    this.roomGroup.add(overlayMesh);
  }

  /**
   * 设置地面图纸对照层可见性
   */
  setBlueprintOverlayVisible(visible) {
    this.isBlueprintOverlayVisible = visible;
    if (this.blueprintOverlayMesh) {
      this.blueprintOverlayMesh.visible = visible;
    }
  }

  /**
   * 设置地面图纸对照层透明度 (0.0 - 1.0)
   */
  setBlueprintOverlayOpacity(opacity) {
    this.blueprintOverlayOpacity = opacity;
    if (this.blueprintOverlayMesh && this.blueprintOverlayMesh.material) {
      this.blueprintOverlayMesh.material.opacity = opacity;
    }
  }

  /**
   * 单矩形常规毛坯房构建 (Legacy Box Room)
   */
  _buildBoxRoom(floorMat, wallMat, ceilingMat) {
    const { width, depth, height } = this.currentConfig;

    this.floorTexture.repeat.set(width, depth);
    this.wallTexture.repeat.set(Math.max(width, depth), height);

    // 1. 水泥地面
    const floorGeom = new THREE.PlaneGeometry(width, depth);
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    floor.userData = { isFloor: true };
    this.roomGroup.add(floor);

    // 2. 水泥天花板
    const ceilingGeom = new THREE.PlaneGeometry(width, depth);
    const ceiling = new THREE.Mesh(ceilingGeom, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, height, 0);
    ceiling.receiveShadow = true;
    this.ceilings.push(ceiling);
    this.roomGroup.add(ceiling);

    // 3. 结构承重梁
    const beamGeom = new THREE.BoxGeometry(0.35, 0.45, depth);
    const beam = new THREE.Mesh(beamGeom, ceilingMat);
    beam.position.set(width / 4, height - 0.225, 0);
    beam.castShadow = true;
    beam.receiveShadow = true;
    this.beams.push(beam);
    this.roomGroup.add(beam);

    // 4. 角落承重柱
    const pillarGeom = new THREE.BoxGeometry(0.42, height, 0.42);
    const pillar = new THREE.Mesh(pillarGeom, wallMat);
    pillar.position.set(-width / 2 + 0.21, height / 2, -depth / 2 + 0.21);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    pillar.userData = { isObstacle: true, isPillar: true };
    this.roomGroup.add(pillar);

    // 5. 四面墙体
    this._buildWalls(width, depth, height, wallMat);

    // 6. 重建 LiDAR 扫描网格层
    this._buildLidarScanMesh(width, depth, height);
  }

  _buildWalls(w, d, h, wallMat) {
    const wallThickness = 0.2;

    // 南墙 (设计模式下可剖切隐藏，漫游时完整显示)
    const southWallGeom = new THREE.BoxGeometry(w, h, wallThickness);
    const southWall = new THREE.Mesh(southWallGeom, wallMat);
    southWall.position.set(0, h / 2, d / 2 + wallThickness / 2);
    southWall.receiveShadow = true;
    southWall.userData = { isWall: true, side: 'south' };
    this.southWalls.push(southWall);
    this.roomGroup.add(southWall);

    // 东墙
    const eastWallGeom = new THREE.BoxGeometry(wallThickness, h, d);
    const eastWall = new THREE.Mesh(eastWallGeom, wallMat);
    eastWall.position.set(w / 2 + wallThickness / 2, h / 2, 0);
    eastWall.receiveShadow = true;
    eastWall.userData = { isWall: true, side: 'east' };
    this.roomGroup.add(eastWall);

    // 西墙
    const westWallGeom = new THREE.BoxGeometry(wallThickness, h, d);
    const westWall = new THREE.Mesh(westWallGeom, wallMat);
    westWall.position.set(-w / 2 - wallThickness / 2, h / 2, 0);
    westWall.receiveShadow = true;
    westWall.userData = { isWall: true, side: 'west' };
    this.roomGroup.add(westWall);

    // 北墙：带落地大窗户
    const winW = Math.min(w * 0.7, 3.2);
    const winH = h * 0.75;
    const sillH = 0.45;

    const sillGeom = new THREE.BoxGeometry(w, sillH, wallThickness);
    const sill = new THREE.Mesh(sillGeom, wallMat);
    sill.position.set(0, sillH / 2, -d / 2 - wallThickness / 2);
    sill.receiveShadow = true;
    this.roomGroup.add(sill);

    const topH = h - (sillH + winH);
    const topGeom = new THREE.BoxGeometry(w, topH, wallThickness);
    const topWall = new THREE.Mesh(topGeom, wallMat);
    topWall.position.set(0, h - topH / 2, -d / 2 - wallThickness / 2);
    topWall.receiveShadow = true;
    this.roomGroup.add(topWall);

    const sideW = (w - winW) / 2;
    if (sideW > 0.05) {
      const leftGeom = new THREE.BoxGeometry(sideW, winH, wallThickness);
      const leftMesh = new THREE.Mesh(leftGeom, wallMat);
      leftMesh.position.set(-w / 2 + sideW / 2, sillH + winH / 2, -d / 2 - wallThickness / 2);
      this.roomGroup.add(leftMesh);

      const rightGeom = new THREE.BoxGeometry(sideW, winH, wallThickness);
      const rightMesh = new THREE.Mesh(rightGeom, wallMat);
      rightMesh.position.set(w / 2 - sideW / 2, sillH + winH / 2, -d / 2 - wallThickness / 2);
      this.roomGroup.add(rightMesh);
    }

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transmission: 0.9,
      opacity: 1,
      transparent: true,
      roughness: 0.1,
      ior: 1.5
    });

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), glassMat);
    glass.position.set(0, sillH + winH / 2, -d / 2);
    this.roomGroup.add(glass);

    this._buildOutdoorBackdrop(w, d, h);
  }

  _buildOutdoorBackdrop(w, d, h) {
    const backdropGeom = new THREE.PlaneGeometry(16, 10);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.6, '#bae6fd');
    grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = '#64748b';
    for (let x = 0; x < 512; x += 32) {
      const bh = 30 + Math.random() * 45;
      ctx.fillRect(x, 256 - bh, 28, bh);
    }

    const backdropTexture = new THREE.CanvasTexture(canvas);
    const backdropMat = new THREE.MeshBasicMaterial({ map: backdropTexture });
    const backdrop = new THREE.Mesh(backdropGeom, backdropMat);
    backdrop.position.set(0, 3.5, -d / 2 - 4.5);
    this.roomGroup.add(backdrop);
  }

  _buildLidarScanMesh(w, d, h) {
    while (this.scanGridGroup.children.length > 0) {
      const obj = this.scanGridGroup.children[0];
      this.scanGridGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }

    const gridHelper = new THREE.GridHelper(Math.max(w, d) * 1.2, Math.round(Math.max(w, d) * 4), 0x06b6d4, 0x0e7490);
    gridHelper.position.set(0, 0.005, 0);
    this.scanGridGroup.add(gridHelper);

    this.scanGridGroup.visible = false;
  }

  setViewMode(mode) {
    this.currentViewMode = mode;
    const isOrbit = mode === 'orbit';
    this.ceilings.forEach(c => { if (c) c.visible = !isOrbit; });
    this.beams.forEach(b => { if (b) b.visible = !isOrbit; });
    this.southWalls.forEach(w => { if (w) w.visible = !isOrbit; });
  }

  setLidarScanVisible(visible) {
    this.scanGridGroup.visible = visible;
  }

  getWallBounds() {
    const { floorPlan } = this.currentConfig;
    if (floorPlan) {
      const w = floorPlan.targetWidthMeters || this.currentConfig.width;
      const d = floorPlan.targetDepthMeters || this.currentConfig.depth;
      return {
        minX: -w / 2,
        maxX: w / 2,
        minZ: -d / 2,
        maxZ: d / 2,
        wallSegments: floorPlan.walls || []
      };
    }

    const { width, depth } = this.currentConfig;
    return {
      minX: -width / 2,
      maxX: width / 2,
      minZ: -depth / 2,
      maxZ: depth / 2,
      wallSegments: []
    };
  }
}
