import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // ── Renderer ──────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 80;

    // ── Floating Particle Field ───────────────────────────────────
    const PARTICLE_COUNT = 280;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);

    const colorOptions = [
      new THREE.Color('#00d4ff'),
      new THREE.Color('#7c4dff'),
      new THREE.Color('#00e676'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      const c = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = Math.random() * 1.8 + 0.4;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── Glowing Orbs ─────────────────────────────────────────────
    const orbData = [];
    const orbConfigs = [
      { r: 6,   color: 0x00d4ff, emissive: 0x003a4a, speed: 0.003, x:  30, y:  20, z: -20 },
      { r: 4.5, color: 0x7c4dff, emissive: 0x1a0045, speed: 0.005, x: -40, y: -15, z: -30 },
      { r: 3,   color: 0x00e676, emissive: 0x003a1a, speed: 0.007, x:  55, y: -30, z: -10 },
      { r: 5,   color: 0x7c4dff, emissive: 0x1a0045, speed: 0.004, x: -25, y:  35, z: -40 },
      { r: 2.5, color: 0x00d4ff, emissive: 0x003a4a, speed: 0.009, x:  10, y: -45, z: -15 },
    ];

    orbConfigs.forEach(cfg => {
      const geo = new THREE.SphereGeometry(cfg.r, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.emissive,
        emissiveIntensity: 1.5,
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
        opacity: 0.55,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      scene.add(mesh);
      orbData.push({ mesh, speed: cfg.speed, originX: cfg.x, originY: cfg.y });
    });

    // ── Connecting Lines between nearby particles ─────────────────
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lineGroup = new THREE.Group();
    const linePositions = [];
    for (let i = 0; i < 60; i++) {
      const a = Math.floor(Math.random() * PARTICLE_COUNT);
      const b = Math.floor(Math.random() * PARTICLE_COUNT);
      const pts = [
        new THREE.Vector3(positions[a*3], positions[a*3+1], positions[a*3+2]),
        new THREE.Vector3(positions[b*3], positions[b*3+1], positions[b*3+2]),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      lineGroup.add(new THREE.Line(geo, lineMat));
      linePositions.push({ a, b });
    }
    scene.add(lineGroup);

    // ── Lights ────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x111133, 2));
    const pointLight1 = new THREE.PointLight(0x00d4ff, 3, 150);
    pointLight1.position.set(30, 30, 40);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x7c4dff, 2, 120);
    pointLight2.position.set(-30, -20, 30);
    scene.add(pointLight2);

    // ── Mouse Parallax ────────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // ── Resize ────────────────────────────────────────────────────
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // ── Animation Loop ────────────────────────────────────────────
    let t = 0;
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.007;

      // Rotate particle field slowly
      particles.rotation.y = t * 0.04;
      particles.rotation.x = t * 0.02;

      // Camera parallax
      camera.position.x += (mouse.x * 8 - camera.position.x) * 0.03;
      camera.position.y += (-mouse.y * 5 - camera.position.y) * 0.03;
      camera.lookAt(scene.position);

      // Float orbs
      orbData.forEach((o, i) => {
        o.mesh.position.x = o.originX + Math.sin(t * o.speed * 10 + i) * 8;
        o.mesh.position.y = o.originY + Math.cos(t * o.speed * 10 + i * 1.3) * 6;
        o.mesh.rotation.y += o.speed;
      });

      // Pulse lights
      pointLight1.intensity = 2.5 + Math.sin(t * 1.2) * 0.8;
      pointLight2.intensity = 1.8 + Math.cos(t * 0.9) * 0.6;

      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
