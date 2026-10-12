import React, { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { clampAndSnapItemPosition } from '../../engine/PhysicsHelper';

export function TransformManager({
  selectedItem,
  viewMode = 'orbit',
  wallBounds,
  placedItems = [],
  onItemChange,
  onItemChangeEnd
}) {
  const transformRef = useRef();

  if (viewMode !== 'orbit' || !selectedItem || !selectedItem.group) {
    return null;
  }

  const handleObjectChange = () => {
    if (!selectedItem?.group || !wallBounds) return;
    const isColliding = clampAndSnapItemPosition(
      selectedItem.group,
      wallBounds,
      placedItems.map(p => p.group || p)
    );
    if (onItemChange) {
      onItemChange(selectedItem, isColliding);
    }
  };

  const handleMouseUp = () => {
    if (!selectedItem?.group || !wallBounds) return;
    const isColliding = clampAndSnapItemPosition(
      selectedItem.group,
      wallBounds,
      placedItems.map(p => p.group || p)
    );
    if (onItemChangeEnd) {
      onItemChangeEnd(selectedItem, isColliding);
    }
  };

  return (
    <TransformControls
      ref={transformRef}
      object={selectedItem.group}
      mode="translate"
      showY={false}
      showX={true}
      showZ={true}
      size={0.85}
      onObjectChange={handleObjectChange}
      onMouseUp={handleMouseUp}
    />
  );
}
