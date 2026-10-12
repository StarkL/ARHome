import React from 'react';

export function FurnitureRenderer({
  items = [],
  selectedId,
  onSelectItem
}) {
  return (
    <group name="placed-furniture-group">
      {items.map((item) => {
        if (!item.group) return null;

        return (
          <primitive
            key={item.userData.uid}
            object={item.group}
            position={[item.position.x, item.position.y || 0, item.position.z]}
            rotation={[0, item.rotation.y || 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem(item.group);
            }}
          />
        );
      })}
    </group>
  );
}
