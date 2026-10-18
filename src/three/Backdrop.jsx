import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { reducedMotion } from '../lib/motion.js';

// Full-page animated gradient behind everything (ruucm/shadergradient on React Three Fiber).
// lightType '3d' keeps it self-contained: 'env' would fetch HDR files from the author's site.
export default function Backdrop() {
  const still = reducedMotion();
  const small = window.matchMedia('(max-width: 760px)').matches;
  return (
    <ShaderGradientCanvas
      style={{ position: 'absolute', inset: 0 }}
      pixelDensity={small ? 0.8 : 1}
      fov={45}
      lazyLoad={false}
      pointerEvents="none"
      powerPreference="low-power"
    >
      <ShaderGradient
        control="props"
        type="plane"
        animate={still ? 'off' : 'on'}
        uTime={still ? 2.4 : 0}
        uSpeed={0.16}
        uStrength={3.4}
        uDensity={1.2}
        uFrequency={5.5}
        uAmplitude={0}
        positionX={-1.2}
        positionY={0}
        positionZ={0}
        rotationX={0}
        rotationY={10}
        rotationZ={50}
        color1="#2ec5d9"
        color2="#4d2fc4"
        color3="#040a1c"
        reflection={0.1}
        brightness={1.2}
        cAzimuthAngle={180}
        cPolarAngle={90}
        cDistance={3.6}
        cameraZoom={1}
        lightType="3d"
        grain="off"
        grainBlending={0.25}
        wireframe={false}
        shader="defaults"
        enableTransition={false}
      />
    </ShaderGradientCanvas>
  );
}
