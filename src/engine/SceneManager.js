import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomBuilder } from './RoomBuilder.js';
import { buildFurnitureModel } from './FurnitureModels.js';
import { DimensionVisualizer } from './DimensionVisualizer.js';
import { ClearanceChecker } from './ClearanceChecker.js';
import { FirstPersonWalkController } from './FirstPersonWalkController.js';

export class SceneManager {
  constructor(canvasContainer, callbacks = {}) {
    this.container = canvasContainer;
    this.callbacks = callbacks; // onSelect, onWarningsChange, onLockChange

    this.viewMode = 'orbit'; // 'orbit' | 'walk' | 'ar_pov'
    this.placedItems = [];
    this.selectedItem = null;

    this.clock = new THREE.Clock();
    this._initThree();
    this._initLighting();
    this._initControllers();
    this._initModules();
    this._initRaycasting();
    this._initWebcam();

    this._animate = this._animate.bind(this);
    this.animId = requestAnimationFrame(this._animate);

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  _initThree() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);

    // 摄像机
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    this.camera.position.set(0, 4.2, 5.2);

    // 渲染器 (高质量物理光影)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);
  }

  _initLighting() {
    this.lightsGroup = new THREE.Group();
    this.scene.add(this.lightsGroup);

    // 环境柔光 (天空与地面漫反射)
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.9);
    this.hemiLight.position.set(0, 10, 0);
    this.lightsGroup.add(this.hemiLight);

    // 落地大窗射入的真实日光 (主阴影投射源)
    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    this.sunLight.position.set(1.5, 5.5, -4.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 25;
    this.sunLight.shadow.camera.left = -6;
    this.sunLight.shadow.camera.right = 6;
    this.sunLight.shadow.camera.top = 6;
    this.sunLight.shadow.camera.bottom = -6;
    this.sunLight.shadow.bias = -0.0005;
    this.lightsGroup.add(this.sunLight);

    // 室内补光
    this.fillLight = new THREE.PointLight(0xffe4cb, 10, 12, 1.5);
    this.fillLight.position.set(0, 2.6, 0);
    this.lightsGroup.add(this.fillLight);
  }

  setSunlightTime(timeOfDay) {
    // 'morning' | 'noon' | 'sunset' | 'night'
    switch (timeOfDay) {
      case 'morning':
        this.sunLight.position.set(3.5, 3.2, -4.0);
        this.sunLight.intensity = 2.0;
        this.sunLight.color.setHex(0xffedd5);
        this.hemiLight.intensity = 0.8;
        this.scene.background.setHex(0x0f172a);
        break;
      case 'noon':
        this.sunLight.position.set(0.5, 6.0, -3.5);
        this.sunLight.intensity = 2.8;
        this.sunLight.color.setHex(0xffffff);
        this.hemiLight.intensity = 1.0;
        this.scene.background.setHex(0x0284c7);
        break;
      case 'sunset':
        this.sunLight.position.set(-4.0, 1.8, -4.0);
        this.sunLight.intensity = 2.4;
        this.sunLight.color.setHex(0xf97316);
        this.hemiLight.intensity = 0.6;
        this.scene.background.setHex(0x431407);
        break;
      case 'night':
        this.sunLight.intensity = 0.05;
        this.hemiLight.intensity = 0.2;
        this.scene.background.setHex(0x030712);
        break;
    }
  }

  _initControllers() {
    // 1. OrbitControls 自由俯视设计视角
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.02; // 禁止穿入地板下方
    this.orbitControls.minDistance = 1.0;
    this.orbitControls.maxDistance = 20.0;
    this.orbitControls.target.set(0, 1.0, 0);

    // 2. FirstPersonWalkController 真人第一人称走动
    this.walkController = new FirstPersonWalkController(
      this.camera,
      this.renderer.domElement,
      (isLocked) => {
        if (this.callbacks.onLockChange) this.callbacks.onLockChange(isLocked);
      }
    );

    // 3. TransformControls 用于在 3D 空间拖动与微调家具
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.size = 0.85;
    this.transformControls.setMode('translate');
    this.transformControls.showY = false;  // 锁定垂直高度 (严防离地或沉入地面)
    this.transformControls.showX = true;
    this.transformControls.showZ = true;
    this.transformControls.showXZ = true; // 允许地面水平面上自由拖动
    this.scene.add(this.transformControls.getHelper());

    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
      if (!event.value && this.selectedItem) {
        // 拖动释放时，完成精准贴墙吸附与边界修正
        const isColliding = this._clampAndSnapItemPosition(this.selectedItem);
        this.dimensionVisualizer.update(this.selectedItem, this.roomBuilder.getWallBounds(), isColliding);
        this._onItemMoved();
      }
    });

    this.transformControls.addEventListener('change', () => {
      if (this.selectedItem) {
        // 实时拖动过程中：强制防穿墙限制 + 智能磁吸吸附 + 实时碰撞检测
        const isColliding = this._clampAndSnapItemPosition(this.selectedItem);
        this.dimensionVisualizer.update(this.selectedItem, this.roomBuilder.getWallBounds(), isColliding);
      }
    });
  }

  _initModules() {
    // 房间构建器
    this.roomBuilder = new RoomBuilder(this.scene);
    this.roomBuilder.build();
    this.roomBuilder.setViewMode(this.viewMode);

    // 尺寸线可视化器
    this.dimensionVisualizer = new DimensionVisualizer(this.scene);

    // 通道动线检测器
    this.clearanceChecker = new ClearanceChecker(this.scene);
  }

  _initRaycasting() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      // 只有在 Orbit 模式且未激活 TransformControls 拖拽时才允许点击拾取
      if (this.viewMode !== 'orbit' || this.transformControls.dragging) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.placedItems, true);

      if (intersects.length > 0) {
        // 递归找到顶层家具 Group
        let obj = intersects[0].object;
        while (obj && obj.parent && !obj.userData.isFurniture) {
          obj = obj.parent;
        }
        if (obj && obj.userData.isFurniture) {
          this.selectItem(obj);
          return;
        }
      }

      // 点击空白处，如果点击到地板，取消选择
      const floorIntersects = this.raycaster.intersectObject(this.roomBuilder.roomGroup, true);
      if (floorIntersects.length > 0 && !intersects.length) {
        this.deselectItem();
      }
    });
  }

  _initWebcam() {
    this.webcamVideo = document.createElement('video');
    this.webcamVideo.setAttribute('playsinline', '');
    this.webcamVideo.autoplay = true;
    this.isWebcamActive = false;
  }

  async toggleWebcamPassthrough(enable) {
    if (enable && !this.isWebcamActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        this.webcamVideo.srcObject = stream;
        await this.webcamVideo.play();
        this.webcamTexture = new THREE.VideoTexture(this.webcamVideo);
        this.scene.background = this.webcamTexture;
        this.isWebcamActive = true;
        return true;
      } catch (err) {
        console.warn('Webcam passthrough failed:', err);
        return false;
      }
    } else if (!enable && this.isWebcamActive) {
      if (this.webcamVideo.srcObject) {
        this.webcamVideo.srcObject.getTracks().forEach(t => t.stop());
      }
      this.scene.background = new THREE.Color(0x0a0f1d);
      this.isWebcamActive = false;
      return false;
    }
    return this.isWebcamActive;
  }

  // ================= 模式切换 =================
  setViewMode(mode) {
    this.viewMode = mode;
    this.deselectItem();
    this.roomBuilder.setViewMode(mode);

    if (mode === 'orbit') {
      this.walkController.enabled = false;
      this.walkController.exitLock();
      this.orbitControls.enabled = true;
      this.camera.position.set(0, 5.4, 5.2);
      this.orbitControls.target.set(0, 0.6, 0);
      this.orbitControls.update();
    } else if (mode === 'walk') {
      this.orbitControls.enabled = false;
      this.walkController.enabled = true;
      // 设置到靠近房间南侧门口的真实人体站立位置
      const bounds = this.roomBuilder.getWallBounds();
      this.walkController.setPosition(0, bounds.maxZ - 0.6);
      this.walkController.yaw = 0; // 面朝北窗
      this.walkController.pitch = 0;
      this.walkController._updateCameraRotation();
    } else if (mode === 'ar_pov') {
      this.orbitControls.enabled = false;
      this.walkController.enabled = true;
      // AR 眼镜主视视角
      const bounds = this.roomBuilder.getWallBounds();
      this.walkController.setPosition(0, bounds.maxZ - 0.8);
      this.walkController.yaw = 0;
      this.walkController.pitch = -0.1;
      this.walkController._updateCameraRotation();
    }
  }

  // ================= 物理防穿墙与智能吸附引擎 =================
  /**
   * 物理防穿墙限制、智能磁吸贴墙与家具间碰撞重叠检测
   * @param {THREE.Object3D} item 
   * @returns {boolean} hasCollision 是否与其他家具或承重立柱发生重叠
   */
  _clampAndSnapItemPosition(item) {
    if (!item) return false;

    const bounds = this.roomBuilder.getWallBounds();
    const dimsMm = item.userData.dimensionsMm || { width: 1000, length: 1000, height: 1000 };
    const w = (dimsMm.width || 1000) / 1000;
    const d = (dimsMm.length || 1000) / 1000;
    const rotY = item.rotation.y || 0;

    // 计算旋转后在世界坐标 X 和 Z 轴的投影有效半宽 (AABB)
    const halfX = (Math.abs(Math.cos(rotY)) * w + Math.abs(Math.sin(rotY)) * d) / 2;
    const halfZ = (Math.abs(Math.sin(rotY)) * w + Math.abs(Math.cos(rotY)) * d) / 2;

    // 严禁穿透墙体，硬阻挡有效活动范围
    const minAllowX = bounds.minX + halfX;
    const maxAllowX = bounds.maxX - halfX;
    const minAllowZ = bounds.minZ + halfZ;
    const maxAllowZ = bounds.maxZ - halfZ;

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
    const pillarMinX = bounds.minX;
    const pillarMaxX = bounds.minX + pillarHalf * 2;
    const pillarMinZ = bounds.minZ;
    const pillarMaxZ = bounds.minZ + pillarHalf * 2;

    let collidesWithPillar = false;
    if (
      targetX - halfX < pillarMaxX &&
      targetX + halfX > pillarMinX &&
      targetZ - halfZ < pillarMaxZ &&
      targetZ + halfZ > pillarMinZ
    ) {
      collidesWithPillar = true;
      // 向远离柱子的方向微调
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
    const otherItems = this.placedItems.filter(other => other !== item);
    for (const other of otherItems) {
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
    item.position.y = 0; // 严防漂移

    return collidesWithPillar || hasFurnitureCollision;
  }

  // ================= 家具管理 =================
  addFurnitureItem(catalogItem, position = [0, 0, 0], rotationY = 0, colorVariant = null) {
    const group = buildFurnitureModel(catalogItem, colorVariant);
    group.position.set(position[0], 0, position[2]);
    group.rotation.y = rotationY;
    group.userData.uid = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    this.scene.add(group);
    this.placedItems.push(group);

    this._clampAndSnapItemPosition(group);
    this.selectItem(group);
    this._onItemMoved();
    return group;
  }

  selectItem(group) {
    this.selectedItem = group;
    if (this.viewMode === 'orbit') {
      this.transformControls.attach(group);
    }
    const isColliding = this._clampAndSnapItemPosition(group);
    this.dimensionVisualizer.update(group, this.roomBuilder.getWallBounds(), isColliding);
    if (this.callbacks.onSelect) {
      this.callbacks.onSelect(group);
    }
  }

  deselectItem() {
    this.selectedItem = null;
    this.transformControls.detach();
    this.dimensionVisualizer.clear();
    if (this.callbacks.onSelect) {
      this.callbacks.onSelect(null);
    }
  }

  rotateSelectedItem(angleRad = Math.PI / 4) {
    if (!this.selectedItem) return;
    this.selectedItem.rotation.y += angleRad;
    const isColliding = this._clampAndSnapItemPosition(this.selectedItem);
    this.dimensionVisualizer.update(this.selectedItem, this.roomBuilder.getWallBounds(), isColliding);
    this._onItemMoved();
  }

  snapSelectedItemToNearestWall() {
    if (!this.selectedItem) return;
    const bounds = this.roomBuilder.getWallBounds();
    const dimsMm = this.selectedItem.userData.dimensionsMm || { width: 1000, length: 1000 };
    const w = (dimsMm.width || 1000) / 1000;
    const d = (dimsMm.length || 1000) / 1000;
    const rot = this.selectedItem.rotation.y || 0;
    const halfX = (Math.abs(Math.cos(rot)) * w + Math.abs(Math.sin(rot)) * d) / 2;
    const halfZ = (Math.abs(Math.sin(rot)) * w + Math.abs(Math.cos(rot)) * d) / 2;
    const pos = this.selectedItem.position;

    // 计算到四面墙体的距离
    const dists = [
      { side: 'north', dist: Math.abs(pos.z - (bounds.minZ + halfZ)), targetZ: bounds.minZ + halfZ, rot: Math.PI },
      { side: 'south', dist: Math.abs((bounds.maxZ - halfZ) - pos.z), targetZ: bounds.maxZ - halfZ, rot: 0 },
      { side: 'west', dist: Math.abs(pos.x - (bounds.minX + halfX)), targetX: bounds.minX + halfX, rot: Math.PI / 2 },
      { side: 'east', dist: Math.abs((bounds.maxX - halfX) - pos.x), targetX: bounds.maxX - halfX, rot: -Math.PI / 2 }
    ];

    dists.sort((a, b) => a.dist - b.dist);
    const closest = dists[0];

    if (closest.targetZ !== undefined) pos.z = closest.targetZ;
    if (closest.targetX !== undefined) pos.x = closest.targetX;
    this.selectedItem.rotation.y = closest.rot;

    const isColliding = this._clampAndSnapItemPosition(this.selectedItem);
    this.dimensionVisualizer.update(this.selectedItem, this.roomBuilder.getWallBounds(), isColliding);
    this._onItemMoved();
  }

  removeSelectedItem() {
    if (!this.selectedItem) return;
    const idx = this.placedItems.indexOf(this.selectedItem);
    if (idx > -1) {
      this.placedItems.splice(idx, 1);
    }
    this.scene.remove(this.selectedItem);
    this.deselectItem();
    this._onItemMoved();
  }

  duplicateSelectedItem() {
    if (!this.selectedItem) return;
    const catId = this.selectedItem.userData.catalogId;
    const color = this.selectedItem.userData.color;
    const rot = this.selectedItem.rotation.y;
    const pos = [this.selectedItem.position.x + 0.3, 0, this.selectedItem.position.z + 0.3];

    // 从数据源重新实例化
    if (this.callbacks.getItemByCatalogId) {
      const itemData = this.callbacks.getItemByCatalogId(catId);
      if (itemData) {
        this.addFurnitureItem(itemData, pos, rot, color);
      }
    }
  }

  updateItemColor(newColor) {
    if (!this.selectedItem) return;
    const catId = this.selectedItem.userData.catalogId;
    const pos = this.selectedItem.position.clone();
    const rot = this.selectedItem.rotation.y;
    const uid = this.selectedItem.userData.uid;

    // 移除旧物体，换新材质生成
    this.removeSelectedItem();
    if (this.callbacks.getItemByCatalogId) {
      const itemData = this.callbacks.getItemByCatalogId(catId);
      if (itemData) {
        const newItem = this.addFurnitureItem(itemData, [pos.x, 0, pos.z], rot, newColor);
        newItem.userData.uid = uid;
      }
    }
  }

  clearAllItems() {
    this.deselectItem();
    this.placedItems.forEach(item => this.scene.remove(item));
    this.placedItems = [];
    this._onItemMoved();
  }

  _onItemMoved() {
    if (this.selectedItem) {
      const isColliding = this._clampAndSnapItemPosition(this.selectedItem);
      this.dimensionVisualizer.update(this.selectedItem, this.roomBuilder.getWallBounds(), isColliding);
    }
    // 运行动线安全评估
    const warnings = this.clearanceChecker.check(this.placedItems, this.roomBuilder.getWallBounds());
    if (this.callbacks.onWarningsChange) {
      this.callbacks.onWarningsChange(warnings);
    }
  }

  // ================= 房间尺寸与户型图纸加载 =================
  updateRoomConfig(config) {
    this.roomBuilder.build(config);
    this._onItemMoved();
  }

  loadFloorPlan(floorPlan, options = {}) {
    this.roomBuilder.build({
      floorPlan,
      width: floorPlan.targetWidthMeters,
      depth: floorPlan.targetDepthMeters,
      height: floorPlan.wallHeightMeters,
      wallFinish: options.wallFinish || this.roomBuilder.currentConfig.wallFinish
    });

    // 自动重定位观察视角与相机距离
    const maxDim = Math.max(floorPlan.targetWidthMeters || 6, floorPlan.targetDepthMeters || 6);
    this.orbitControls.target.set(0, 0.6, 0);
    this.camera.position.set(0, maxDim * 1.25, maxDim * 1.35);
    this.camera.lookAt(0, 0.6, 0);

    // 重置漫游出生点至大厅中央
    if (this.walkController) {
      this.walkController.position.set(0, this.walkController.eyeHeight, (floorPlan.targetDepthMeters || 6) / 4);
    }

    this._onItemMoved();
  }

  setBlueprintOverlayVisible(visible) {
    this.roomBuilder.setBlueprintOverlayVisible(visible);
  }

  setBlueprintOverlayOpacity(opacity) {
    this.roomBuilder.setBlueprintOverlayOpacity(opacity);
  }

  setLidarScanActive(active) {
    this.roomBuilder.setLidarScanVisible(active);
  }

  // ================= 序列化与导出 =================
  exportLayoutJson() {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      roomConfig: { ...this.roomBuilder.currentConfig },
      items: this.placedItems.map(item => ({
        uid: item.userData.uid,
        catalogId: item.userData.catalogId,
        name: item.userData.name,
        category: item.userData.category,
        dimensionsMm: item.userData.dimensionsMm,
        position: [item.position.x, item.position.y, item.position.z],
        rotationY: item.rotation.y,
        color: item.userData.color,
        priceEstimate: item.userData.priceEstimate
      }))
    };
  }

  loadLayoutJson(data, getItemByCatalogId) {
    this.clearAllItems();
    if (data.roomConfig) {
      this.updateRoomConfig(data.roomConfig);
    }
    if (Array.isArray(data.items)) {
      data.items.forEach(it => {
        const cat = getItemByCatalogId(it.catalogId);
        if (cat) {
          const group = buildFurnitureModel(cat, it.color);
          group.position.set(it.position[0], 0, it.position[2]);
          group.rotation.y = it.rotationY || 0;
          group.userData.uid = it.uid;
          this.scene.add(group);
          this.placedItems.push(group);
        }
      });
    }
    this._onItemMoved();
  }

  takeScreenshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  // ================= 渲染循环 =================
  _animate() {
    this.animId = requestAnimationFrame(this._animate);
    const delta = this.clock.getDelta();

    if (this.viewMode === 'orbit') {
      this.orbitControls.update();
    } else {
      // 漫游控制器更新，带身体碰撞
      this.walkController.update(delta, this.roomBuilder.getWallBounds(), this.placedItems);
    }

    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this._onResize);
    this.walkController.dispose();
    this.orbitControls.dispose();
    if (this.transformControls.getHelper().parent) {
      this.scene.remove(this.transformControls.getHelper());
    }
    this.transformControls.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
