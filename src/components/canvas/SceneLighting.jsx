import React, { useMemo } from 'react';
import * as THREE from 'three';

export function SceneLighting({ sunlightTime = 'noon' }) {
  const lightingConfig = useMemo(() => {
    switch (sunlightTime) {
      case 'morning':
        return {
          sunPos: [6.0, 3.5, 4.0],
          sunIntensity: 2.8,
          sunColor: '#fed7aa',
          hemiIntensity: 0.8,
          hemiSkyColor: '#bae6fd',
          hemiGroundColor: '#78716c'
        };
      case 'noon':
        return {
          sunPos: [2.0, 8.0, 2.0],
          sunIntensity: 3.2,
          sunColor: '#ffffff',
          hemiIntensity: 1.0,
          hemiSkyColor: '#e0f2fe',
          hemiGroundColor: '#52525b'
        };
      case 'sunset':
        return {
          sunPos: [-4.0, 1.8, -4.0],
          sunIntensity: 2.4,
          sunColor: '#f97316',
          hemiIntensity: 0.6,
          hemiSkyColor: '#fdba74',
          hemiGroundColor: '#451a03'
        };
      case 'night':
        return {
          sunPos: [0, 5, 0],
          sunIntensity: 0.1,
          sunColor: '#93c5fd',
          hemiIntensity: 0.25,
          hemiSkyColor: '#1e1b4b',
          hemiGroundColor: '#09090b'
        };
      default:
        return {
          sunPos: [2.0, 8.0, 2.0],
          sunIntensity: 3.2,
          sunColor: '#ffffff',
          hemiIntensity: 1.0,
          hemiSkyColor: '#e0f2fe',
          hemiGroundColor: '#52525b'
        };
    }
  }, [sunlightTime]);

  return (
    <>
      <hemisphereLight
        args={[lightingConfig.hemiSkyColor, lightingConfig.hemiGroundColor, lightingConfig.hemiIntensity]}
      />
      <directionalLight
        position={lightingConfig.sunPos}
        intensity={lightingConfig.sunIntensity}
        color={lightingConfig.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0001}
      />
    </>
  );
}
