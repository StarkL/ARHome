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
        const dims = item.userData?.dimensionsMm || { width: 1000, length: 1000, height: 800 };
        const w = (dims.width || 1000) / 1000;
        const h = (dims.height || 800) / 1000;
        const d = (dims.length || 1000) / 1000;
        const isSelected = item.userData?.uid === selectedId;

        return (
          <group
            key={item.userData.uid}
            position={[item.position.x, item.position.y || 0, item.position.z]}
            rotation={[0, item.rotation.y || 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem(item.group);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          >
            {/* 3D 家具真实实体模型 */}
            <primitive object={item.group} />

            {/* 隐形全包围物理拾取盒 (确保点击家具任何细腿、死角、缝隙都能 100% 灵敏命中选中) */}
            <mesh position={[0, h / 2, 0]}>
              <boxGeometry args={[Math.max(w * 1.05, 0.4), Math.max(h * 1.05, 0.4), Math.max(d * 1.05, 0.4)]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
