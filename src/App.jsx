import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from './engine/SceneManager';
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

export default function App() {
  const containerRef = useRef(null);
  const sceneManagerRef = useRef(null);

  // 界面状态
  const [viewMode, setViewMode] = useState('orbit'); // 'orbit' | 'walk' | 'ar_pov'
  const [isCatalogOpen, setIsCatalogOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [placedItems, setPlacedItems] = useState([]);
  const [warnings, setWarnings] = useState([]);
  
  // 光照与扫描
  const [sunlightTime, setSunlightTime] = useState('noon');
  const [isLidarScanActive, setIsLidarScanActive] = useState(false);

  // 弹窗状态
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);
  const [isFloorPlanModalOpen, setIsFloorPlanModalOpen] = useState(false);
  const [isBOMOpen, setIsBOMOpen] = useState(false);

  // 地面图纸投影
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.65);

  // 漫游与体感
  const [isLocked, setIsLocked] = useState(false);
  const [eyeHeight, setEyeHeight] = useState(1.68);
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  // 房间尺寸配置
  const [roomConfig, setRoomConfig] = useState({
    width: 5.0,
    depth: 4.2,
    height: 2.8,
    wallFinish: 'concrete',
    floorPlan: null
  });

  const getItemByCatalogId = useCallback((catId) => {
    return FURNITURE_ITEMS.find(item => item.id === catId);
  }, []);

  // 初始化 3D 渲染器与场景管理器
  useEffect(() => {
    if (!containerRef.current) return;

    const manager = new SceneManager(containerRef.current, {
      onSelect: (item) => setSelectedItem(item),
      onWarningsChange: (warns) => {
        setWarnings(warns);
        if (sceneManagerRef.current) {
          setPlacedItems([...sceneManagerRef.current.placedItems]);
        }
      },
      onLockChange: (locked) => setIsLocked(locked),
      getItemByCatalogId
    });

    sceneManagerRef.current = manager;

    // 默认载入经典的 1:1 主卧样板布局
    const defaultPreset = SAMPLE_PRESETS[0];
    if (defaultPreset) {
      setRoomConfig(defaultPreset.roomConfig);
      manager.loadLayoutJson({
        roomConfig: defaultPreset.roomConfig,
        items: defaultPreset.items.map(it => ({
          catalogId: it.modelId,
          position: it.position,
          rotationY: it.rotationY,
          color: it.colorVariant,
          uid: it.uid
        }))
      }, getItemByCatalogId);
    }

    return () => {
      manager.dispose();
    };
  }, [getItemByCatalogId]);

  // 视角模式同步
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setViewMode(viewMode);
      if (viewMode !== 'orbit') {
        setIsCatalogOpen(false); // 漫游时自动收起侧边栏，视野最大化
      }
    }
  }, [viewMode]);

  // 光照同步
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setSunlightTime(sunlightTime);
    }
  }, [sunlightTime]);

  // LiDAR 扫描线同步
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setLidarScanActive(isLidarScanActive);
    }
  }, [isLidarScanActive]);

  // 人眼高度同步
  useEffect(() => {
    if (sceneManagerRef.current && sceneManagerRef.current.walkController) {
      sceneManagerRef.current.walkController.setEyeHeight(eyeHeight);
    }
  }, [eyeHeight]);

  // 添加家具
  const handleAddItem = (catalogItem) => {
    if (!sceneManagerRef.current) return;
    // 默认摆放在房间中央略微随机偏置位置
    const pos = [(Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8];
    sceneManagerRef.current.addFurnitureItem(catalogItem, pos, 0);
    setPlacedItems([...sceneManagerRef.current.placedItems]);
  };

  // 空间操作
  const handleRotate = (angleRad) => {
    if (sceneManagerRef.current) sceneManagerRef.current.rotateSelectedItem(angleRad);
  };

  const handleSnapToWall = () => {
    if (sceneManagerRef.current) sceneManagerRef.current.snapSelectedItemToNearestWall();
  };

  const handleDuplicate = () => {
    if (sceneManagerRef.current) sceneManagerRef.current.duplicateSelectedItem();
  };

  const handleDelete = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.removeSelectedItem();
      setSelectedItem(null);
      setPlacedItems([...sceneManagerRef.current.placedItems]);
    }
  };

  const handleChangeColor = (newColor) => {
    if (sceneManagerRef.current) sceneManagerRef.current.updateItemColor(newColor);
  };

  // 预设载入
  const handleLoadPreset = (preset) => {
    if (!sceneManagerRef.current) return;
    setRoomConfig(preset.roomConfig);
    sceneManagerRef.current.loadLayoutJson({
      roomConfig: preset.roomConfig,
      items: preset.items.map(it => ({
        catalogId: it.modelId,
        position: it.position,
        rotationY: it.rotationY,
        color: it.colorVariant,
        uid: it.uid
      }))
    }, getItemByCatalogId);
    setPlacedItems([...sceneManagerRef.current.placedItems]);
  };

  // 户型图纸加载与 3D 重建
  const handleLoadFloorPlan = (floorPlan, options = {}) => {
    if (!sceneManagerRef.current) return;
    setRoomConfig({
      width: floorPlan.targetWidthMeters,
      depth: floorPlan.targetDepthMeters,
      height: floorPlan.wallHeightMeters || 2.8,
      wallFinish: options.wallFinish || 'concrete',
      floorPlan
    });

    if (options.clearExistingFurniture) {
      sceneManagerRef.current.clearAllItems();
      setSelectedItem(null);
      setPlacedItems([]);
    }

    sceneManagerRef.current.loadFloorPlan(floorPlan, options);
    setPlacedItems([...sceneManagerRef.current.placedItems]);
  };

  // 房间尺寸保存
  const handleSaveRoomConfig = (newConfig) => {
    setRoomConfig(newConfig);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.updateRoomConfig(newConfig);
    }
  };

  // 截屏
  const handleTakeScreenshot = () => {
    if (!sceneManagerRef.current) return;
    const dataUrl = sceneManagerRef.current.takeScreenshot();
    const link = document.createElement('a');
    link.download = `ARHome_1to1_Preview_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // 导出方案 JSON
  const handleExportJson = () => {
    if (!sceneManagerRef.current) return;
    const json = sceneManagerRef.current.exportLayoutJson();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `ARHome_Layout_${Date.now()}.json`;
    link.href = url;
    link.click();
  };

  // 摄像头穿透
  const handleToggleWebcam = async () => {
    if (!sceneManagerRef.current) return;
    const active = await sceneManagerRef.current.toggleWebcamPassthrough(!isWebcamActive);
    setIsWebcamActive(active);
  };

  // 请求锁定视角
  const handleRequestLock = () => {
    if (sceneManagerRef.current && sceneManagerRef.current.walkController) {
      sceneManagerRef.current.walkController.requestLock();
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none bg-slate-950 font-sans">
      {/* 3D WebGL 画布容器 */}
      <div 
        ref={containerRef} 
        id="viewport-canvas"
        className="w-full h-full cursor-grab active:cursor-grabbing"
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

      {/* 左侧标准尺寸家居库 (设计模式下可用) */}
      <FurnitureCatalog
        isOpen={isCatalogOpen}
        setIsOpen={setIsCatalogOpen}
        onAddItem={handleAddItem}
      />

      {/* 右侧选中物体属性检查与微调面板 */}
      {viewMode === 'orbit' && selectedItem && (
        <InspectorPanel
          selectedItem={selectedItem}
          onRotate={handleRotate}
          onSnapToWall={handleSnapToWall}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onClose={() => {
            if (sceneManagerRef.current) sceneManagerRef.current.deselectItem();
          }}
          onChangeColor={handleChangeColor}
        />
      )}

      {/* 真实漫游指引条 (真人走动模式) */}
      {viewMode === 'walk' && (
        <WalkthroughControlsGuide
          isLocked={isLocked}
          onLockRequest={handleRequestLock}
          eyeHeight={eyeHeight}
          onDirectionChange={(dir, active) => {
            if (sceneManagerRef.current && sceneManagerRef.current.walkController) {
              sceneManagerRef.current.walkController.setDirectionState(dir, active);
            }
          }}
        />
      )}

      {/* 模拟 AR 眼镜光波导与 HUD 浮层 (AR POV 模式) */}
      {viewMode === 'ar_pov' && (
        <ARGlassesHUD
          eyeHeight={eyeHeight}
          setEyeHeight={setEyeHeight}
          isWebcamActive={isWebcamActive}
          onToggleWebcam={handleToggleWebcam}
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
        onSaveConfig={handleSaveRoomConfig}
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
        onToggleOverlay={(visible) => {
          setIsOverlayVisible(visible);
          if (sceneManagerRef.current) sceneManagerRef.current.setBlueprintOverlayVisible(visible);
        }}
        overlayOpacity={overlayOpacity}
        onChangeOverlayOpacity={(val) => {
          setOverlayOpacity(val);
          if (sceneManagerRef.current) sceneManagerRef.current.setBlueprintOverlayOpacity(val);
        }}
      />
    </div>
  );
}
