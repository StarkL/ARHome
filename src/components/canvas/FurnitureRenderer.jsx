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
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem(item.group);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
            }}
          />
        );
      })}
    </group>
  );
}
