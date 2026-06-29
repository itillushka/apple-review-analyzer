import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Live galaxy particle background — a landing-page motif that dims to nothing
// on every other view. Scroll loosens it into a soft dissolve (chaos at the
// top, galaxy assembling toward the bottom). Pointer parallax + click burst.
// Ported 1:1 from the original initThree().
export default function Particles({ viewRef, density = 1500, animate = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dead = false;

    const rand = (a, b) => a + Math.random() * (b - a);
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 1, 3000);
    camera.position.set(0, 0, 210);

    const tc = document.createElement('canvas'); tc.width = tc.height = 64;
    const tctx = tc.getContext('2d');
    const grad = tctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    tctx.fillStyle = grad; tctx.beginPath(); tctx.arc(32, 32, 32, 0, Math.PI * 2); tctx.fill();
    const sprite = new THREE.CanvasTexture(tc);

    const cols = [
      [1, 1, 1, 0.70], [0.502, 0.322, 1, 0.12], [0.604, 0.604, 0.604, 0.09], [1, 0.722, 0.161, 0.06], [0.082, 0.518, 0.431, 0.03],
    ];
    const pickColor = () => { let r = Math.random(); for (const c of cols) { if (r < c[3]) return c; r -= c[3]; } return cols[0]; };

    const R = 155;
    const TAU = Math.PI * 2;
    const count = Math.round(density * 2.2);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const phases = new Float32Array(count);
    const pr = [];
    for (let i = 0; i < count; i++) {
      pr.push({ a: Math.random(), b: Math.random(), c: Math.random(), d: Math.random(), arm: i % 3, ox: rand(-1, 1), oy: rand(-1, 1), oz: rand(-1, 1) });
      const c = pickColor(); colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
      sizes[i] = rand(2.4, 10.5);
      alphas[i] = c === cols[0] ? rand(0.3, 0.95) : rand(0.55, 1);
      phases[i] = Math.random() * Math.PI * 2;
    }

    const galaxy = (p, winding, radScale) => {
      const arms = 3;
      const tt = Math.pow(p.c, 0.62);
      const ang = (p.arm / arms) * TAU + tt * winding * Math.PI + (p.b - 0.5) * 1.1;
      const rad = R * (0.05 + radScale * tt) + (p.d - 0.5) * R * 0.12;
      const z = (p.d - 0.5) * R * 0.18;
      return [rad * Math.cos(ang) * 1.12, rad * Math.sin(ang), z];
    };
    const formFns = [
      (p) => galaxy(p, 1.0, 1.2),
      (p) => { const g = galaxy(p, 1.0, 1.2); return [g[0] + p.ox * R * 0.5, g[1] + p.oy * R * 0.5, g[2] + p.oz * R * 0.4]; },
    ];
    const forms = formFns.map(fn => {
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) { const v = fn(pr[i]); arr[i * 3] = v[0]; arr[i * 3 + 1] = v[1]; arr[i * 3 + 2] = v[2]; }
      return arr;
    });
    const positions = new Float32Array(forms[0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const posAttr = geo.attributes.position;
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: sprite }, uTime: { value: 0 }, uBurst: { value: 0 }, uTwinkle: { value: animate ? 1 : 0 }, uDim: { value: 1 }, uAccentX: { value: 0 }, uAccentColor: { value: new THREE.Color(0x8052ff) } },
      vertexShader: [
        'attribute vec3 aColor;', 'attribute float aSize;', 'attribute float aAlpha;', 'attribute float aPhase;',
        'uniform float uTime;', 'uniform float uBurst;', 'uniform float uTwinkle;', 'uniform float uDim;', 'uniform float uAccentX;', 'uniform vec3 uAccentColor;',
        'varying vec3 vColor;', 'varying float vAlpha;',
        'void main(){',
        '  vec3 pos = position * (1.0 + uBurst*0.35);',
        '  float tw = mix(1.0, 0.55 + 0.45*sin(uTime*1.3 + aPhase), uTwinkle);',
        '  float ax = abs(pos.x - uAccentX);',
        '  float gain = smoothstep(125.0, 0.0, ax);',
        '  vColor = mix(aColor, uAccentColor, gain*0.65);',
        '  vAlpha = aAlpha * tw * uDim * (1.0 + gain*1.4);',
        '  vec4 mv = modelViewMatrix * vec4(pos,1.0);',
        '  gl_PointSize = aSize * (320.0 / -mv.z) * (1.0 + gain*0.45);',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uTex;', 'varying vec3 vColor;', 'varying float vAlpha;',
        'void main(){', '  vec4 t = texture2D(uTex, gl_PointCoord);', '  if(t.a < 0.05) discard;', '  gl_FragColor = vec4(vColor, t.a*vAlpha);', '}',
      ].join('\n'),
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.NormalBlending,
    });
    const points = new THREE.Points(geo, material);
    points.frustumCulled = false;
    scene.add(points);

    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.fov = w < 760 ? 76 : 60; camera.updateProjectionMatrix();
    };
    resize();

    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    let burst = 0;
    const onMove = (e) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; target.y = (e.clientY / window.innerHeight - 0.5) * 2; };
    const onDown = () => { burst = 1; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('resize', resize);

    let scale = 1, dim = 1, scrollCur = 0;
    let t = 0, raf;
    const loop = () => {
      if (dead) return;
      t += 0.016;
      material.uniforms.uTime.value = t;
      const de = document.documentElement;
      const smax = (de.scrollHeight - window.innerHeight) || 1;
      const sy = window.scrollY || de.scrollTop || document.body.scrollTop || 0;
      const scrollFrac = Math.min(1, Math.max(0, sy / smax));
      const onHome = (viewRef.current || 'home') === 'home';
      if (onHome) {
        const o = Math.max(0, 1 - sy / 520), scl = Math.max(0.96, 1 - sy / 9000);
        document.querySelectorAll('[data-hero]').forEach(el => { el.style.opacity = String(o); el.style.transform = 'scale(' + scl + ')'; });
      }
      scrollCur += ((scrollFrac || 0) - scrollCur) * 0.025;
      const mt = Math.max(0, Math.min(1, 1 - scrollCur));
      const fe = mt * mt * (3 - 2 * mt);
      const A = forms[0], B = forms[1], D = posAttr.array;
      for (let k = 0; k < D.length; k++) { D[k] = A[k] + (B[k] - A[k]) * fe; }
      posAttr.needsUpdate = true;
      material.uniforms.uAccentX.value += (0 - material.uniforms.uAccentX.value) * 0.05;
      points.position.x += (0 - points.position.x) * 0.05;
      cur.x += (target.x - cur.x) * 0.05; cur.y += (target.y - cur.y) * 0.05;
      points.rotation.y = cur.x * 0.5 + Math.sin(t * 0.16) * 0.22;
      points.rotation.x = cur.y * 0.3 + Math.sin(t * 0.11) * 0.1;
      scale += (1 - scale) * 0.06;
      points.scale.setScalar(scale);
      const targetDim = onHome ? 1 : 0;
      dim += (targetDim - dim) * 0.06;
      material.uniforms.uDim.value = dim * (1 - mt * 0.35);
      camera.position.x += (cur.x * 24 - camera.position.x) * 0.05;
      camera.position.y += (-cur.y * 16 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      burst += (0 - burst) * 0.06;
      material.uniforms.uBurst.value = burst;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', resize);
      geo.dispose(); material.dispose(); sprite.dispose(); renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none', zIndex: 0 }}
    />
  );
}
