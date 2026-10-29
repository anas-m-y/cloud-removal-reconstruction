import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// A Sentinel-style radar satellite built from primitives, flown across the hero's tile wall by scroll.
// The orthographic camera works in CSS pixels, so the satellite and its beam line up exactly with the DOM tiles below.
// `pass` is a mutable ref written by the hero: { x, on, imgLeft, imgTop, imgW, imgH, stageW, stageH, laneH, scale, beamW }.
// The hero already smooths x, so this scene follows it exactly; nothing here sets React state per frame.

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function useMaterials() {
  return useMemo(() => {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const foil = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#c99a3c'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {                          // crinkled multi-layer insulation
        const x = rnd() * w, y = rnd() * h, s = 10 + rnd() * 40, l = 38 + rnd() * 32;
        g.fillStyle = `hsla(${40 + rnd() * 8}, ${60 + rnd() * 20}%, ${l}%, ${0.25 + rnd() * 0.4})`;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * (rnd() - 0.2), y + s * (rnd() - 0.5)); g.lineTo(x + s * (rnd() - 0.5), y + s * rnd()); g.closePath(); g.fill();
      }
    });
    const cells = canvasTexture(512, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#1a2f7a'); grd.addColorStop(0.5, '#0d1a4a'); grd.addColorStop(1, '#22307a');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      const cx = 16, cy = 6, cw = w / cx, ch = h / cy;
      for (let i = 0; i < cx; i++) for (let j = 0; j < cy; j++) {
        g.fillStyle = `rgba(${60 + rnd() * 40}, ${90 + rnd() * 50}, 220, ${0.10 + rnd() * 0.14})`;
        g.fillRect(i * cw + 2, j * ch + 2, cw - 4, ch - 4);
      }
      g.strokeStyle = 'rgba(200,215,240,.55)'; g.lineWidth = 1.5;
      for (let i = 0; i <= cx; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, h); g.stroke(); }
      for (let j = 0; j <= cy; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(w, j * ch); g.stroke(); }
      g.strokeStyle = 'rgba(230,236,250,.9)'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
    });
    const sar = canvasTexture(256, 64, (g, w, h) => {
      g.fillStyle = '#d9dee6'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(70,90,120,.35)';
      for (let i = 0; i < 28; i++) for (let j = 0; j < 6; j++) g.fillRect(4 + i * 9, 6 + j * 9.5, 6, 6);
    });
    return {
      foil: new THREE.MeshStandardMaterial({ map: foil, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.3 }),
      white: new THREE.MeshStandardMaterial({ color: '#e9edf3', metalness: 0.15, roughness: 0.45 }),
      dark: new THREE.MeshStandardMaterial({ color: '#1b2230', metalness: 0.6, roughness: 0.35 }),
      steel: new THREE.MeshStandardMaterial({ color: '#b8c2cf', metalness: 0.95, roughness: 0.22 }),
      panel: new THREE.MeshPhysicalMaterial({ map: cells, metalness: 0.55, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.6 }),
      panelBack: new THREE.MeshStandardMaterial({ color: '#c8cdd6', metalness: 0.4, roughness: 0.5 }),
      sar: new THREE.MeshStandardMaterial({ map: sar, metalness: 0.35, roughness: 0.4 }),
      lens: new THREE.MeshPhysicalMaterial({ color: '#0a1830', metalness: 0.2, roughness: 0.05, clearcoat: 1, envMapIntensity: 2 }),
      glow: new THREE.MeshBasicMaterial({ color: '#5cb8ff', toneMapped: false }),
    };
  }, []);
}

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => { scene.environment = null; env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

function Wing({ side, m, wingRef }) {
  return (
    <group position={[side * 15, 2, 0]}>
      <mesh material={m.steel} rotation={[0, 0, Math.PI / 2]} position={[side * 6, 0, 0]}><cylinderGeometry args={[0.9, 0.9, 12, 8]} /></mesh>
      <group ref={wingRef} position={[side * 12, 0, 0]}>
        <mesh material={m.steel} position={[side * 1, 0, 0]}><boxGeometry args={[2, 4, 4]} /></mesh>
        {[0, 1].map((k) => (
          <group key={k} position={[side * (19 + k * 35), 0, 0]}>
            <mesh material={[m.panelBack, m.panelBack, m.panelBack, m.panelBack, m.panel, m.panelBack]}><boxGeometry args={[33, 24, 0.9]} /></mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Satellite({ pass }) {
  const m = useMaterials();
  const root = useRef(), body = useRef(), wl = useRef(), wr = useRef(), beam = useRef(), ring = useRef();
  const st = useRef({ x: null, v: 0 });
  const beamMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uTop: { value: 0.06 }, uA: { value: new THREE.Color('#bfe3ff') }, uB: { value: new THREE.Color('#5cb8ff') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform float uTime, uOn, uTop; uniform vec3 uA, uB;
      void main(){
        float y = vUv.y;                                   // 1 at the satellite, 0 at the ground
        float hw = mix(0.5, uTop, y);                    // trapezoid: narrow at the lens, full swath on the ground
        float dx = abs(vUv.x - 0.5);
        float body = 1.0 - smoothstep(hw * 0.55, hw, dx);
        float core = 1.0 - smoothstep(0.0, hw * 0.35, dx);
        float pulses = 0.65 + 0.35 * sin(y * 90.0 + uTime * 7.0);
        vec3 col = mix(uB, uA, smoothstep(0.0, 1.0, y) * 0.7 + core * 0.3);
        float a = body * (0.16 + 0.30 * y) * pulses + core * 0.30 * (0.4 + 0.6 * y);
        a += body * smoothstep(0.035, 0.0, y) * 0.5;       // bright footprint where the swath meets the image edge
        gl_FragColor = vec4(col, a * uOn);
      }`,
  }), []);

  useFrame((state, dt) => {
    const L = pass.current; if (!L.imgW) return;
    const t = state.clock.elapsedTime, s = L.scale;
    const nx = L.imgLeft + L.x - L.stageW / 2;
    const S = st.current;
    if (S.x === null) S.x = nx;
    S.v = THREE.MathUtils.lerp(S.v, (nx - S.x) / Math.max(dt, 1e-3), 0.12); S.x = nx;
    const laneY = L.stageH / 2 - L.laneH * 0.5;
    root.current.position.set(S.x, laneY + Math.sin(t * 1.3) * 2.2 * s, 0);
    root.current.scale.setScalar(s);
    root.current.rotation.z = THREE.MathUtils.clamp(-S.v * 0.0006, -0.16, 0.16);   // banks gently into the motion
    body.current.rotation.y = -0.62 + Math.sin(t * 0.35) * 0.07;
    const tilt = 0.55 + Math.sin(t * 0.45) * 0.28;
    wl.current.rotation.x = tilt; wr.current.rotation.x = tilt;
    ring.current.material.color.setHSL(0.57, 1, 0.68 + Math.sin(t * 3) * 0.06);

    // Beam: from the lens down to the bottom of the image, one swath wide on the ground.
    const lensY = root.current.position.y - 27 * s, groundY = L.stageH / 2 - L.imgTop - L.imgH;
    const h = lensY - groundY, w = L.beamW;
    beam.current.position.set(S.x, groundY + h / 2, -50);
    beam.current.scale.set(w, h, 1);
    beamMat.uniforms.uTop.value = Math.min(0.5, (9 * s) / w);
    beamMat.uniforms.uTime.value = t;
    beamMat.uniforms.uOn.value += (L.on * (0.55 + Math.min(Math.abs(S.v) / 1200, 0.25)) - beamMat.uniforms.uOn.value) * Math.min(1, dt * 5);
  });

  return (
    <>
      <mesh ref={beam} material={beamMat} renderOrder={-1}><planeGeometry args={[1, 1]} /></mesh>
      <group ref={root}>
        <group ref={body} rotation={[0.32, -0.62, 0]}>
          <mesh material={m.foil}><boxGeometry args={[26, 32, 24]} /></mesh>
          <mesh material={m.white} position={[0, 17.5, 0]}><boxGeometry args={[27.5, 3, 25.5]} /></mesh>
          <mesh material={m.white} position={[0, -17.5, 0]}><boxGeometry args={[27.5, 3, 25.5]} /></mesh>
          <mesh material={m.dark} position={[0, 0, 12.3]}><boxGeometry args={[14, 18, 0.8]} /></mesh>
          {/* C-band SAR antenna along the flight direction */}
          <group position={[0, -21, 4]} rotation={[0.25, 0, 0]}>
            <mesh material={[m.white, m.white, m.white, m.sar, m.white, m.white]}><boxGeometry args={[70, 2.2, 11]} /></mesh>
            <mesh material={m.steel} position={[0, 2.4, -2]}><boxGeometry args={[4, 3, 4]} /></mesh>
          </group>
          {/* optical lens and its glowing ring, the beam source */}
          <mesh material={m.lens} position={[9, -23.5, -6]}><cylinderGeometry args={[4.2, 5, 5, 24]} /></mesh>
          <mesh ref={ring} material={m.glow} position={[9, -26.1, -6]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[4.4, 0.7, 8, 32]} /></mesh>
          {/* comms dish and star trackers */}
          <mesh material={m.steel} position={[-6, 23, -4]}><cylinderGeometry args={[0.7, 0.7, 7, 6]} /></mesh>
          <mesh material={m.white} position={[-6, 27.5, -4]} rotation={[Math.PI * 0.85, 0.3, 0]}><sphereGeometry args={[6.5, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.32]} /></mesh>
          <mesh material={m.dark} position={[8, 21, 7]} rotation={[0.4, 0, -0.3]}><cylinderGeometry args={[2, 2.4, 4, 12]} /></mesh>
          <mesh material={m.dark} position={[11, 21, -2]} rotation={[-0.3, 0, -0.4]}><cylinderGeometry args={[2, 2.4, 4, 12]} /></mesh>
          <Wing side={-1} m={m} wingRef={wl} />
          <Wing side={1} m={m} wingRef={wr} />
        </group>
      </group>
    </>
  );
}

export default function SatelliteScene({ pass, active }) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 600], near: 1, far: 2000, zoom: 1 }}
      dpr={[1, 2]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      resize={{ offsetSize: true }}
      style={{ pointerEvents: 'none' }}
    >
      <Env />
      <hemisphereLight args={['#dfeeff', '#1a1d1f', 0.9]} />
      <directionalLight position={[-300, 400, 500]} intensity={2.4} color="#fff4e2" />
      <directionalLight position={[400, -100, 200]} intensity={0.9} color="#5cb8ff" />
      <Satellite pass={pass} />
    </Canvas>
  );
}
