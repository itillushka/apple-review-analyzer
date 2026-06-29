import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Loading particle scene — a purpose-built companion to the home Particles cloud.
//
// Concept: each particle is a review. They pop in cluster-by-cluster, arranged
// around a slowly orbiting ring (one cluster per processing stage). As progress
// climbs the clusters fill in; in the final stretch the whole field coalesces
// from loose clusters into the full galaxy spiral — the "done" shape.
//
// Driven entirely by `progressRef.current` (a 0..1 number the parent updates each
// frame). We never re-render React per frame: the scene reads the ref in its own
// requestAnimationFrame loop and animates on the GPU via a single uProgress/uForm.
export default function LoadingScene({ progressRef, density = 1700 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dead = false;

    const rand = (a, b) => a + Math.random() * (b - a);
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const TAU = Math.PI * 2;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 1, 3000);
    camera.position.set(0, 0, 230);

    // Soft round sprite (same radial-gradient dot as the home cloud).
    const tc = document.createElement('canvas'); tc.width = tc.height = 64;
    const tctx = tc.getContext('2d');
    const grad = tctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    tctx.fillStyle = grad; tctx.beginPath(); tctx.arc(32, 32, 32, 0, Math.PI * 2); tctx.fill();
    const sprite = new THREE.CanvasTexture(tc);

    // Mostly white with a violet/amber sprinkle — matches the Dala palette.
    const cols = [
      [1, 1, 1, 0.74], [0.502, 0.322, 1, 0.16], [1, 0.722, 0.161, 0.06], [0.604, 0.604, 0.604, 0.04],
    ];
    const pickColor = () => { let r = Math.random(); for (const c of cols) { if (r < c[3]) return c; r -= c[3]; } return cols[0]; };

    const CLUSTERS = 5;        // one per pipeline stage
    const RING = 118;          // radius the clusters orbit on
    const SPREAD = 26;         // gaussian cloud size within a cluster
    const GR = 150;            // galaxy radius (final form)
    const count = Math.round(density);

    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const phases = new Float32Array(count);
    const thresholds = new Float32Array(count);      // progress at which the particle reveals
    const clusterPos = new Float32Array(count * 3);  // loose-cluster home
    const galaxyPos = new Float32Array(count * 3);   // final spiral home

    for (let i = 0; i < count; i++) {
      const cl = i % CLUSTERS;
      const cAng = (cl / CLUSTERS) * TAU;
      // cluster centre on the ring + a gaussian puff around it
      const cx = Math.cos(cAng) * RING, cy = Math.sin(cAng) * RING;
      clusterPos[i * 3] = cx + gauss() * SPREAD;
      clusterPos[i * 3 + 1] = cy + gauss() * SPREAD;
      clusterPos[i * 3 + 2] = gauss() * SPREAD * 0.7;

      // galaxy: 3-arm spiral (same recipe as the home cloud's galaxy())
      const arm = i % 3;
      const tt = Math.pow(Math.random(), 0.62);
      const ang = (arm / 3) * TAU + tt * Math.PI + (Math.random() - 0.5) * 1.1;
      const rad = GR * (0.05 + 1.2 * tt) + (Math.random() - 0.5) * GR * 0.12;
      galaxyPos[i * 3] = rad * Math.cos(ang) * 1.12;
      galaxyPos[i * 3 + 1] = rad * Math.sin(ang);
      galaxyPos[i * 3 + 2] = (Math.random() - 0.5) * GR * 0.18;

      const c = pickColor();
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
      sizes[i] = rand(2.2, 9.5);
      alphas[i] = c === cols[0] ? rand(0.35, 0.95) : rand(0.6, 1);
      phases[i] = Math.random() * TAU;
      // reveal clusters in order across 0..0.72, with a per-particle stagger
      thresholds[i] = (cl / CLUSTERS) * 0.72 + Math.random() * 0.10;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(clusterPos, 3));
    geo.setAttribute('aGalaxy', new THREE.BufferAttribute(galaxyPos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aThresh', new THREE.BufferAttribute(thresholds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: sprite }, uTime: { value: 0 }, uProgress: { value: 0 },
        uForm: { value: 0 }, uAccent: { value: new THREE.Color(0x8052ff) },
      },
      vertexShader: [
        'attribute vec3 aGalaxy;', 'attribute vec3 aColor;', 'attribute float aSize;',
        'attribute float aAlpha;', 'attribute float aPhase;', 'attribute float aThresh;',
        'uniform float uTime;', 'uniform float uProgress;', 'uniform float uForm;', 'uniform vec3 uAccent;',
        'varying vec3 vColor;', 'varying float vAlpha;',
        'void main(){',
        // reveal: particle fades in once progress passes its threshold
        '  float rev = smoothstep(aThresh, aThresh + 0.10, uProgress);',
        // morph loose cluster -> galaxy spiral in the final stretch
        '  vec3 pos = mix(position, aGalaxy, uForm);',
        // gentle breathing + twinkle so it never feels frozen
        '  pos *= 1.0 + 0.025 * sin(uTime * 1.4 + aPhase);',
        '  float tw = 0.62 + 0.38 * sin(uTime * 2.1 + aPhase);',
        // freshly revealed particles flare violet, then settle toward their colour
        '  float fresh = (1.0 - smoothstep(aThresh, aThresh + 0.18, uProgress));',
        '  vColor = mix(aColor, uAccent, fresh * 0.7);',
        '  vAlpha = aAlpha * rev * tw;',
        '  vec4 mv = modelViewMatrix * vec4(pos, 1.0);',
        '  gl_PointSize = aSize * (320.0 / -mv.z) * (1.0 + fresh * 0.6);',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uTex;', 'varying vec3 vColor;', 'varying float vAlpha;',
        'void main(){', '  vec4 t = texture2D(uTex, gl_PointCoord);', '  if(t.a < 0.05) discard;',
        '  gl_FragColor = vec4(vColor, t.a * vAlpha);', '}',
      ].join('\n'),
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geo, material);
    points.frustumCulled = false;
    scene.add(points);

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.fov = w < 760 ? 78 : 60; camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0, raf, formCur = 0;
    const loop = () => {
      if (dead) return;
      t += 0.016;
      const p = Math.max(0, Math.min(1, (progressRef && progressRef.current) || 0));
      const formTarget = THREE.MathUtils.smoothstep(p, 0.7, 1.0); // start coalescing at 70%
      formCur += (formTarget - formCur) * 0.08;
      material.uniforms.uTime.value = t;
      material.uniforms.uProgress.value = p;
      material.uniforms.uForm.value = formCur;
      // clusters orbit the ring; the spin eases off as the galaxy forms
      points.rotation.z = t * 0.20 * (1 - formCur * 0.7);
      points.rotation.y = Math.sin(t * 0.18) * 0.18 + formCur * 0.2;
      points.rotation.x = Math.sin(t * 0.13) * 0.08;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      geo.dispose(); material.dispose(); sprite.dispose(); renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none', zIndex: 0 }}
    />
  );
}
