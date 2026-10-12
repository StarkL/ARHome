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
 * 渲染真实的毛坯房几何空间，包括水泥地面、立柱、横梁、落地采光窗和门洞
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

    this.currentConfig = {
      width: 5.0,
      depth: 4.2,
      height: 2.8,
      wallFinish: 'concrete', // 'concrete' | 'skimcoat'
      windowWall: 'north'
    };
  }

  build(config = {}) {
    this.currentConfig = { ...this.currentConfig, ...config };
    const { width, depth, height, wallFinish } = this.currentConfig;

    // 清理旧网格
    while (this.roomGroup.children.length > 0) {
      const obj = this.roomGroup.children[0];
      this.roomGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    // 设置贴图平铺重复次数 (每米重复一次)
    this.floorTexture.repeat.set(width, depth);
    this.wallTexture.repeat.set(Math.max(width, depth), height);

    // 材质
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

    // 1. 水泥地面 (接收所有真实阴影)
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
    this.ceiling = ceiling;
    this.roomGroup.add(ceiling);

    // 3. 结构承重梁 (Structural Ceiling Beam)
    const beamGeom = new THREE.BoxGeometry(0.35, 0.45, depth);
    const beam = new THREE.Mesh(beamGeom, ceilingMat);
    beam.position.set(width / 4, height - 0.225, 0);
    beam.castShadow = true;
    beam.receiveShadow = true;
    this.beam = beam;
    this.roomGroup.add(beam);

    // 4. 角落承重柱 (Corner Pillar 400x400mm - 毛坯房经典构造)
    const pillarGeom = new THREE.BoxGeometry(0.42, height, 0.42);
    const pillar = new THREE.Mesh(pillarGeom, wallMat);
    pillar.position.set(-width / 2 + 0.21, height / 2, -depth / 2 + 0.21);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    pillar.userData = { isObstacle: true, isPillar: true };
    this.roomGroup.add(pillar);

    // 5. 四面墙体 (带窗洞与门洞的逼真构建)
    this._buildWalls(width, depth, height, wallMat);

    // 6. 重建 LiDAR 扫描网格层
    this._buildLidarScanMesh(width, depth, height);

    // 初始应用当前模式的顶板/南墙可见性
    if (this.currentViewMode) {
      this.setViewMode(this.currentViewMode);
    }
  }

  setViewMode(mode) {
    this.currentViewMode = mode;
    const isOrbit = mode === 'orbit';
    if (this.ceiling) this.ceiling.visible = !isOrbit;
    if (this.beam) this.beam.visible = !isOrbit;
    if (this.southWall) this.southWall.visible = !isOrbit;
  }

  _buildWalls(w, d, h, wallMat) {
    const wallThickness = 0.2;

    // 南墙 (设计模式下可剖切隐藏，漫游时完整显示)
    const southWallGeom = new THREE.BoxGeometry(w, h, wallThickness);
    const southWall = new THREE.Mesh(southWallGeom, wallMat);
    southWall.position.set(0, h / 2, d / 2 + wallThickness / 2);
    southWall.receiveShadow = true;
    southWall.userData = { isWall: true, side: 'south' };
    this.southWall = southWall;
    this.roomGroup.add(southWall);

    // 东墙 (完整承重墙)
    const eastWallGeom = new THREE.BoxGeometry(wallThickness, h, d);
    const eastWall = new THREE.Mesh(eastWallGeom, wallMat);
    eastWall.position.set(w / 2 + wallThickness / 2, h / 2, 0);
    eastWall.receiveShadow = true;
    eastWall.userData = { isWall: true, side: 'east' };
    this.roomGroup.add(eastWall);

    // 西墙 (完整承重墙)
    const westWallGeom = new THREE.BoxGeometry(wallThickness, h, d);
    const westWall = new THREE.Mesh(westWallGeom, wallMat);
    westWall.position.set(-w / 2 - wallThickness / 2, h / 2, 0);
    westWall.receiveShadow = true;
    westWall.userData = { isWall: true, side: 'west' };
    this.roomGroup.add(westWall);

    // 北墙：带落地大窗户 (模拟真实采光窗)
    // 窗宽占北墙的 60%
    const winW = Math.min(w * 0.7, 3.2);
    const winH = h * 0.75;
    const sillH = 0.45; // 窗台高度

    // 北墙窗台下实体部分
    const sillGeom = new THREE.BoxGeometry(w, sillH, wallThickness);
    const sill = new THREE.Mesh(sillGeom, wallMat);
    sill.position.set(0, sillH / 2, -d / 2 - wallThickness / 2);
    sill.receiveShadow = true;
    this.roomGroup.add(sill);

    // 北墙窗顶梁部分
    const topH = h - (sillH + winH);
    const topGeom = new THREE.BoxGeometry(w, topH, wallThickness);
    const topWall = new THREE.Mesh(topGeom, wallMat);
    topWall.position.set(0, h - topH / 2, -d / 2 - wallThickness / 2);
    topWall.receiveShadow = true;
    this.roomGroup.add(topWall);

    // 北墙左右两侧垛子
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

    // 落地窗透明玻璃与黑色极简断桥铝合金框
    const frameMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3, metalness: 0.8 });
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

    // 窗外自然采光与城市天空远景天幕
    this._buildOutdoorBackdrop(w, d, h);
  }

  _buildOutdoorBackdrop(w, d, h) {
    // 窗外日光与开阔天际线画卷
    const backdropGeom = new THREE.PlaneGeometry(16, 10);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // 天空渐变与阳光
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#38bdf8');   // 天蓝
    grad.addColorStop(0.6, '#bae6fd'); // 柔和地平线
    grad.addColorStop(1, '#94a3b8');   // 城市轮廓灰
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // 远山与现代楼群剪影
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

    // 创建 LiDAR 空间网格 (Spatial Mesh Grid)
    // 模拟 Apple RoomPlan / Quest 3 扫描房间时在地面与墙面浮现的绿色/青色点阵扫描线
    const gridHelper = new THREE.GridHelper(Math.max(w, d) * 1.2, Math.round(Math.max(w, d) * 4), 0x06b6d4, 0x0e7490);
    gridHelper.position.set(0, 0.005, 0); // 略微浮于地面 5mm
    this.scanGridGroup.add(gridHelper);

    this.scanGridGroup.visible = false;
  }

  setLidarScanVisible(visible) {
    this.scanGridGroup.visible = visible;
  }

  getWallBounds() {
    const { width, depth } = this.currentConfig;
    return {
      minX: -width / 2,
      maxX: width / 2,
      minZ: -depth / 2,
      maxZ: depth / 2
    };
  }
}
