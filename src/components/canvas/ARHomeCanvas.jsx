import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneLighting } from './SceneLighting';
import { RoomMesh } from './RoomMesh';
import { FurnitureRenderer } from './FurnitureRenderer';
import { ViewController } from './ViewController';
import { TransformManager } from './TransformManager';
import { DimensionOverlay } from './DimensionOverlay';

export const ARHomeCanvas = forwardRef(function ARHomeCanvas({
  viewMode = 'orbit',
  roomConfig,
  wallBounds,
  sunlightTime = 'noon',
  isLidarScanActive = false,
  isOverlayVisible = true,
  overlayOpacity = 0.65,
  placedItems = [],
  selectedItem = null,
  isColliding = false,
  eyeHeight = 1.68,
  isLocked = false,
  onLockChange,
  directionState = {},
  onSelectItem,
  onDeselect,
  onItemChange,
  onItemChangeEnd
}, ref) {
  const canvasRef = useRef(null);

  // 暴露截屏能力给外部
  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      const cvs = canvasRef.current?.querySelector('canvas');
      return cvs ? cvs.toDataURL('image/png') : null;
    }
  }));

  return (
    <div 
      ref={canvasRef} 
      className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
    >
      <Canvas
        shadows
        camera={{ position: [0, 8.5, 9.5], fov: 45 }}
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05
        }}
        onPointerMissed={() => onDeselect()}
      >
        {/* 自然采光与动态日光系统 */}
        <SceneLighting sunlightTime={sunlightTime} />

        {/* 毛坯房几何结构、水泥贴图与 3D 地面工程图纸投影 */}
        <RoomMesh
          roomConfig={roomConfig}
          viewMode={viewMode}
          isLidarActive={isLidarScanActive}
          isOverlayVisible={isOverlayVisible}
          overlayOpacity={overlayOpacity}
        />

        {/* 家具渲染列表 */}
        <FurnitureRenderer
          items={placedItems}
          selectedId={selectedItem?.userData?.uid}
          onSelectItem={onSelectItem}
        />

        {/* 自由拖拽与水平面变换控件 */}
        <TransformManager
          selectedItem={selectedItem}
          viewMode={viewMode}
          wallBounds={wallBounds}
          walls={roomConfig?.floorPlan?.walls || []}
          placedItems={placedItems}
          onItemChange={onItemChange}
          onItemChangeEnd={onItemChangeEnd}
        />

        {/* 3D CAD 工程长宽高尺寸标注与包围线 */}
        <DimensionOverlay
          selectedItem={selectedItem?.group}
          wallBounds={wallBounds}
          isColliding={isColliding}
        />

        {/* 相机控制器与真人第一人称物理走动控制 */}
        <ViewController
          viewMode={viewMode}
          eyeHeight={eyeHeight}
          isLocked={isLocked}
          onLockChange={onLockChange}
          wallBounds={wallBounds}
          placedItems={placedItems}
          directionState={directionState}
        />
      </Canvas>
    </div>
  );
});
