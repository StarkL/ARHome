import React, { useMemo } from 'react';
import * as THREE from 'three';

function createTextSprite(text, bgColor = 'rgba(15, 23, 42, 0.88)', textColor = '#38bdf8', borderColor = '#0ea5e9') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const r = 16;
  const x = 10, y = 10, w = 492, h = 108;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = 'bold 44px "JetBrains Mono", -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(0.65, 0.16, 1);
  return sprite;
}

export function DimensionOverlay({
  selectedItem,
  wallBounds,
  isColliding = false
}) {
  const overlayData = useMemo(() => {
    if (!selectedItem) return null;

    const box = new THREE.Box3().setFromObject(selectedItem);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const dimsMm = selectedItem.userData.dimensionsMm || {
      width: Math.round(size.x * 1000),
      length: Math.round(size.z * 1000),
      height: Math.round(size.y * 1000)
    };

    const wMm = dimsMm.width || Math.round(size.x * 1000);
    const lMm = dimsMm.length || Math.round(size.z * 1000);
    const hMm = dimsMm.height || Math.round(size.y * 1000);

    const borderColor = isColliding ? '#ef4444' : '#0ea5e9';
    const textColor = isColliding ? '#fca5a5' : '#38bdf8';
    const bgColor = isColliding ? 'rgba(69, 10, 10, 0.92)' : 'rgba(15, 23, 42, 0.88)';

    const wSprite = createTextSprite(`宽 ${wMm} mm`, bgColor, textColor, borderColor);
    wSprite.position.set(center.x, center.y + size.y / 2 + 0.15, center.z);

    const lSprite = createTextSprite(`长 ${lMm} mm`, bgColor, textColor, borderColor);
    lSprite.position.set(center.x + size.x / 2 + 0.15, center.y + size.y / 2 + 0.15, center.z);

    const hSprite = createTextSprite(`高 ${hMm} mm`, bgColor, textColor, borderColor);
    hSprite.position.set(center.x - size.x / 2 - 0.25, center.y, center.z);

    // 虚线框几何点
    const min = box.min;
    const max = box.max;
    const boxPoints = [
      new THREE.Vector3(min.x, min.y, min.z), new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, min.z), new THREE.Vector3(max.x, min.y, max.z),
      new THREE.Vector3(max.x, min.y, max.z), new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x, min.y, max.z), new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, max.y, min.z), new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(max.x, max.y, min.z), new THREE.Vector3(max.x, max.y, max.z),
      new THREE.Vector3(max.x, max.y, max.z), new THREE.Vector3(min.x, max.y, max.z),
      new THREE.Vector3(min.x, max.y, max.z), new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(min.x, min.y, min.z), new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(max.x, min.y, min.z), new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(max.x, min.y, max.z), new THREE.Vector3(max.x, max.y, max.z),
      new THREE.Vector3(min.x, min.y, max.z), new THREE.Vector3(min.x, max.y, max.z)
    ];

    const boxGeom = new THREE.BufferGeometry().setFromPoints(boxPoints);

    return {
      wSprite,
      lSprite,
      hSprite,
      boxGeom,
      lineColor: isColliding ? '#ef4444' : '#0284c7'
    };
  }, [selectedItem, wallBounds, isColliding]);

  if (!overlayData) return null;

  return (
    <group name="dimension-overlay">
      <lineSegments geometry={overlayData.boxGeom}>
        <lineBasicMaterial color={overlayData.lineColor} linewidth={2} />
      </lineSegments>
      <primitive object={overlayData.wSprite} />
      <primitive object={overlayData.lSprite} />
      <primitive object={overlayData.hSprite} />
    </group>
  );
}
