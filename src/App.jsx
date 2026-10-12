import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { ARHomeCanvas } from './components/canvas/ARHomeCanvas';
import { Header } from './components/Header';
import { FurnitureCatalog } from './components/FurnitureCatalog';
import { InspectorPanel } from './components/InspectorPanel';
import { ARGlassesHUD } from './components/ARGlassesHUD';
import { ClearanceWarningBanner } from './components/ClearanceWarningBanner';
import { RoomSettingsModal } from './components/RoomSettingsModal';
import { BOMExportModal } from './components/BOMExportModal';
import { FloorPlanImportModal } from './components/FloorPlanImportModal';
import { WalkthroughControlsGuide } from './components/WalkthroughControlsGuide';

import { FURNITURE_ITEMS } from './data/furnitureCatalogData';
import { SAMPLE_PRESETS } from './data/samplePresets';
import { buildFurnitureModel } from './engine/FurnitureModels';
import { ClearanceChecker } from './engine/ClearanceChecker';
import { 
  clampAndSnapItemPosition, 
  snapSelectedItemToNearestWall,
  findSafeSpawnPosition 
} from './engine/PhysicsHelper';

export default function App() {
  const canvasComponentRef = useRef(null);

  // 1. 核心视图模式
  const [viewMode, setViewMode] = useState('orbit'); // 'orbit' | 'walk' | 'ar_pov'
  const [isCatalogOpen, setIsCatalogOpen] = useState(true);

  // 2. 空间参数与户型
  const [roomConfig, setRoomConfig] = useState({
    width: 4.5,
    depth: 3.8,
    height: 2.8,
    wallFinish: 'concrete',
    floorPlan: null
  });

  // 3. 家具实体状态 (React 声明式统一驱动)
  const [placedItems, setPlacedItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isColliding, setIsColliding] = useState(false);

  // 4. 环境与动线安全
  const [sunlightTime, setSunlightTime] = useState('noon');
  const [isLidarScanActive, setIsLidarScanActive] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const clearanceChecker = useMemo(() => new ClearanceChecker(new THREE.Scene()), []);

  // 5. 地面工程图纸对照层
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.65);

  // 6. 漫游与体感
  const [isLocked, setIsLocked] = useState(false);
  const [eyeHeight, setEyeHeight] = useState(1.68);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [directionState, setDirectionState] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false
  });

  // 7. 模态窗口
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);
  const [isFloorPlanModalOpen, setIsFloorPlanModalOpen] = useState(false);
  const [isBOMOpen, setIsBOMOpen] = useState(false);

  // 动态物理墙体边界
  const wallBounds = useMemo(() => {
    const w = roomConfig.floorPlan?.targetWidthMeters || roomConfig.width || 5.0;
    const d = roomConfig.floorPlan?.targetDepthMeters || roomConfig.depth || 4.2;
    return {
      minX: -w / 2,
      maxX: w / 2,
      minZ: -d / 2,
      maxZ: d / 2,
      wallSegments: roomConfig.floorPlan?.walls || []
    };
  }, [roomConfig]);

  // 工具：根据 catalogId 查找元数据
  const getItemByCatalogId = useCallback((catId) => {
    return FURNITURE_ITEMS.find(item => item.id === catId);
  }, []);

  // 重新评估通道动线与碰撞
  const evaluateClearance = useCallback((currentItems) => {
    const objs = currentItems.map(it => it.group || it);
    const result = clearanceChecker.check(objs, wallBounds);
    setWarnings(result);
  }, [clearanceChecker, wallBounds]);

  const hasInitializedRef = useRef(false);

  // 初始化：仅在首次挂载时载入默认主卧 1:1 预设方案
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const defaultPreset = SAMPLE_PRESETS[0];
    if (defaultPreset) {
      setRoomConfig(defaultPreset.roomConfig);
      const initialItems = defaultPreset.items.map(it => {
        const cat = getItemByCatalogId(it.modelId);
        if (!cat) return null;
        const group = buildFurnitureModel(cat, it.colorVariant);
        group.position.set(it.position[0], 0, it.position[2]);
        group.rotation.y = it.rotationY || 0;
        group.userData.uid = it.uid;
        return {
          uid: it.uid,
          catalogId: it.modelId,
          group,
          position: group.position,
          rotation: group.rotation,
          userData: group.userData
        };
      }).filter(Boolean);

      setPlacedItems(initialItems);
      evaluateClearance(initialItems);
    }
  }, [getItemByCatalogId, evaluateClearance]);

  // 视角模式同步 (漫游时收起侧边栏)
  useEffect(() => {
    if (viewMode !== 'orbit') {
      setIsCatalogOpen(false);
      setSelectedItem(null);
    }
  }, [viewMode]);

  // ================= 家具管理操作 =================
  const handleAddItem = (catalogItem) => {
    const uid = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const group = buildFurnitureModel(catalogItem);
    
    // 智能安全计算生成落脚点：自动选择合适房间开阔区域，严防卡入墙体
    const safePos = findSafeSpawnPosition(catalogItem, roomConfig, placedItems, wallBounds);
    group.position.set(safePos[0], 0, safePos[2]);
    group.userData.uid = uid;

    const newItem = {
      uid,
      catalogId: catalogItem.id,
      group,
      position: group.position,
      rotation: group.rotation,
      userData: group.userData
    };

    const isCollide = clampAndSnapItemPosition(
      group, 
      wallBounds, 
      placedItems.map(p => p.group),
      roomConfig.floorPlan?.walls || []
    );
    setIsColliding(isCollide);

    const updated = [...placedItems, newItem];
    setPlacedItems(updated);
    setSelectedItem(newItem);
    evaluateClearance(updated);
  };

  const handleSelectItem = (groupObj) => {
    if (!groupObj) {
      setSelectedItem(null);
      return;
    }
    const found = placedItems.find(it => it.group === groupObj || it.uid === groupObj.userData?.uid);
    if (found) {
      const isCollide = clampAndSnapItemPosition(
        found.group, 
        wallBounds, 
        placedItems.map(p => p.group),
        roomConfig.floorPlan?.walls || []
      );
      setIsColliding(isCollide);
      setSelectedItem(found);
    }
  };

  const handleRotate = (angleRad) => {
    if (!selectedItem?.group) return;
    selectedItem.group.rotation.y += angleRad;
    selectedItem.rotation = selectedItem.group.rotation;
    const isCollide = clampAndSnapItemPosition(
      selectedItem.group, 
      wallBounds, 
      placedItems.map(p => p.group),
      roomConfig.floorPlan?.walls || []
    );
    setIsColliding(isCollide);
    setPlacedItems([...placedItems]);
    evaluateClearance(placedItems);
  };

  const handleSnapToWall = () => {
    if (!selectedItem?.group) return;
    snapSelectedItemToNearestWall(selectedItem.group, wallBounds);
    const isCollide = clampAndSnapItemPosition(
      selectedItem.group, 
      wallBounds, 
      placedItems.map(p => p.group),
      roomConfig.floorPlan?.walls || []
    );
    setIsColliding(isCollide);
    setPlacedItems([...placedItems]);
    evaluateClearance(placedItems);
  };

  const handleDuplicate = () => {
    if (!selectedItem) return;
    const cat = getItemByCatalogId(selectedItem.userData.catalogId);
    if (!cat) return;
    const uid = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const group = buildFurnitureModel(cat, selectedItem.userData.color);
    group.position.set(selectedItem.position.x + 0.3, 0, selectedItem.position.z + 0.3);
    group.rotation.y = selectedItem.rotation.y;
    group.userData.uid = uid;

    const copyItem = {
      uid,
      catalogId: cat.id,
      group,
      position: group.position,
      rotation: group.rotation,
      userData: group.userData
    };

    clampAndSnapItemPosition(
      group, 
      wallBounds, 
      placedItems.map(p => p.group),
      roomConfig.floorPlan?.walls || []
    );
    const updated = [...placedItems, copyItem];
    setPlacedItems(updated);
    setSelectedItem(copyItem);
    evaluateClearance(updated);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    const updated = placedItems.filter(it => it.uid !== selectedItem.uid);
    setPlacedItems(updated);
    setSelectedItem(null);
    evaluateClearance(updated);
  };

  const handleChangeColor = (newColor) => {
    if (!selectedItem) return;
    const cat = getItemByCatalogId(selectedItem.userData.catalogId);
    if (!cat) return;

    // 重新根据新颜色创建网格，保持位置不变
    const group = buildFurnitureModel(cat, newColor);
    group.position.copy(selectedItem.position);
    group.rotation.copy(selectedItem.rotation);
    group.userData.uid = selectedItem.uid;

    selectedItem.group = group;
    selectedItem.userData = group.userData;
    setPlacedItems([...placedItems]);
  };

  const handleItemMove = (item, isCollide) => {
    setIsColliding(isCollide);
  };

  const handleItemMoveEnd = (item, isCollide) => {
    setIsColliding(isCollide);
    setPlacedItems([...placedItems]);
    evaluateClearance(placedItems);
  };

  // ================= 户型图纸与预设方案 =================
  const handleLoadFloorPlan = (floorPlan, options = {}) => {
    setRoomConfig({
      width: floorPlan.targetWidthMeters,
      depth: floorPlan.targetDepthMeters,
      height: floorPlan.wallHeightMeters || 2.8,
      wallFinish: options.wallFinish || 'concrete',
      floorPlan
    });

    if (options.clearExistingFurniture) {
      setPlacedItems([]);
      setSelectedItem(null);
      setWarnings([]);
    } else {
      evaluateClearance(placedItems);
    }
  };

  const handleLoadPreset = (preset) => {
    setRoomConfig(preset.roomConfig);
    const newItems = preset.items.map(it => {
      const cat = getItemByCatalogId(it.modelId);
      if (!cat) return null;
      const group = buildFurnitureModel(cat, it.colorVariant);
      group.position.set(it.position[0], 0, it.position[2]);
      group.rotation.y = it.rotationY || 0;
      group.userData.uid = it.uid;
      return {
        uid: it.uid,
        catalogId: it.modelId,
        group,
        position: group.position,
        rotation: group.rotation,
        userData: group.userData
      };
    }).filter(Boolean);

    setPlacedItems(newItems);
    setSelectedItem(null);
    evaluateClearance(newItems);
  };

  // 截屏
  const handleTakeScreenshot = () => {
    if (!canvasComponentRef.current) return;
    const dataUrl = canvasComponentRef.current.takeScreenshot();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `ARHome_1to1_Preview_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // 导出方案 JSON
  const handleExportJson = () => {
    const json = {
      version: '2.0.0-r3f',
      exportedAt: new Date().toISOString(),
      roomConfig,
      items: placedItems.map(it => ({
        uid: it.uid,
        catalogId: it.catalogId,
        name: it.userData.name,
        category: it.userData.category,
        dimensionsMm: it.userData.dimensionsMm,
        position: [it.position.x, it.position.y || 0, it.position.z],
        rotationY: it.rotation.y || 0,
        color: it.userData.color,
        priceEstimate: it.userData.priceEstimate
      }))
    };
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `ARHome_Layout_${Date.now()}.json`;
    link.href = url;
    link.click();
  };

  // 虚拟方向盘 (D-Pad)
  const handleDirectionChange = (dir, active) => {
    setDirectionState(prev => ({ ...prev, [dir]: active }));
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none bg-slate-950 font-sans">
      {/* 🚀 React Three Fiber 3D 渲染核心 */}
      <ARHomeCanvas
        ref={canvasComponentRef}
        viewMode={viewMode}
        roomConfig={roomConfig}
        wallBounds={wallBounds}
        sunlightTime={sunlightTime}
        isLidarScanActive={isLidarScanActive}
        isOverlayVisible={isOverlayVisible}
        overlayOpacity={overlayOpacity}
        placedItems={placedItems}
        selectedItem={selectedItem}
        isColliding={isColliding}
        eyeHeight={eyeHeight}
        isLocked={isLocked}
        onLockChange={setIsLocked}
        directionState={directionState}
        onSelectItem={handleSelectItem}
        onDeselect={() => setSelectedItem(null)}
        onItemChange={handleItemMove}
        onItemChangeEnd={handleItemMoveEnd}
      />

      {/* 顶部主导航栏 */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        sunlightTime={sunlightTime}
        setSunlightTime={setSunlightTime}
        isLidarScanActive={isLidarScanActive}
        setIsLidarScanActive={setIsLidarScanActive}
        onOpenRoomSettings={() => setIsRoomSettingsOpen(true)}
        onOpenFloorPlanModal={() => setIsFloorPlanModalOpen(true)}
        onOpenBOM={() => setIsBOMOpen(true)}
        onLoadPreset={handleLoadPreset}
        onTakeScreenshot={handleTakeScreenshot}
        onExportJson={handleExportJson}
      />

      {/* 左侧标准尺寸家居库 (设计模式) */}
      <FurnitureCatalog
        isOpen={isCatalogOpen}
        setIsOpen={setIsCatalogOpen}
        onAddItem={handleAddItem}
      />

      {/* 已摆放家具快速切换条 (设计模式且有摆放家具时展示) */}
      {viewMode === 'orbit' && placedItems.length > 0 && (
        <div className="absolute top-20 left-72 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 shadow-xl max-w-2xl overflow-x-auto scrollbar-none animate-in fade-in duration-150">
          <span className="text-[11px] text-slate-400 font-medium px-2 whitespace-nowrap flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            已摆放 ({placedItems.length}):
          </span>
          {placedItems.map((item) => {
            const isSelected = selectedItem?.uid === item.uid;
            return (
              <button
                key={item.uid}
                onClick={() => handleSelectItem(item.group)}
                className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
                title="点击在 3D 场景中立即选中并调整"
              >
                <span>{item.userData?.name || '家具'}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 右侧选中物体属性检查与微调面板 */}
      {viewMode === 'orbit' && selectedItem && (
        <InspectorPanel
          selectedItem={selectedItem}
          onRotate={handleRotate}
          onSnapToWall={handleSnapToWall}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onClose={() => setSelectedItem(null)}
          onChangeColor={handleChangeColor}
        />
      )}

      {/* 真实漫游指引条 (真人走动模式) */}
      {viewMode === 'walk' && (
        <WalkthroughControlsGuide
          isLocked={isLocked}
          onLockRequest={() => {
            const canvasEl = document.querySelector('canvas');
            if (canvasEl && canvasEl.requestPointerLock) {
              canvasEl.requestPointerLock();
            }
          }}
          eyeHeight={eyeHeight}
          onDirectionChange={handleDirectionChange}
        />
      )}

      {/* 模拟 AR 眼镜光波导与 HUD 浮层 (AR POV 模式) */}
      {viewMode === 'ar_pov' && (
        <ARGlassesHUD
          eyeHeight={eyeHeight}
          setEyeHeight={setEyeHeight}
          isWebcamActive={isWebcamActive}
          onToggleWebcam={() => setIsWebcamActive(!isWebcamActive)}
          isLocked={isLocked}
        />
      )}

      {/* 底部人体工程学动线与通道净宽预警横幅 */}
      <ClearanceWarningBanner warnings={warnings} />

      {/* 房型尺寸调整模态窗 */}
      <RoomSettingsModal
        isOpen={isRoomSettingsOpen}
        onClose={() => setIsRoomSettingsOpen(false)}
        currentConfig={roomConfig}
        onSaveConfig={(newConfig) => setRoomConfig(prev => ({ ...prev, ...newConfig }))}
      />

      {/* 软装采购物料清单 (BOM) 弹窗 */}
      <BOMExportModal
        isOpen={isBOMOpen}
        onClose={() => setIsBOMOpen(false)}
        placedItems={placedItems}
        roomConfig={roomConfig}
        onExportJson={handleExportJson}
      />

      {/* 户型图纸自动解析与 3D 重建工作台 */}
      <FloorPlanImportModal
        isOpen={isFloorPlanModalOpen}
        onClose={() => setIsFloorPlanModalOpen(false)}
        onLoadFloorPlan={handleLoadFloorPlan}
        isOverlayVisible={isOverlayVisible}
        onToggleOverlay={setIsOverlayVisible}
        overlayOpacity={overlayOpacity}
        onChangeOverlayOpacity={setOverlayOpacity}
      />
    </div>
  );
}
