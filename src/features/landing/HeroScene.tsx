'use client';

import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  NormalBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';

interface OrbitNode {
  mesh: Mesh;
  ring: number;
  radius: number;
  speed: number;
  phase: number;
}

const RINGS = [
  { radius: 2.7, tiltX: 1.2, tiltY: 0.2 },
  { radius: 3.4, tiltX: 0.5, tiltY: -0.6 },
  { radius: 4.1, tiltX: 1.8, tiltY: 0.9 },
];
const NODES_PER_RING = [4, 5, 5];
const PARTICLE_COUNT = 700;

function cssColor(name: string, fallback: string): Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  try {
    return new Color(value || fallback);
  } catch {
    return new Color(fallback);
  }
}

/**
 * The hero's "hub": a faceted core (the organization) with team members orbiting it on tilted
 * rings, each tethered back to the core. Raw three.js keeps this to one small dependency.
 */
export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const primary = cssColor('--color-primary', '#8b7bff');
    const accent = cssColor('--color-accent', '#2dd4bf');
    // Additive glow and white particles vanish on a light background, so light mode gets darker,
    // normally-blended versions. The parent remounts this scene whenever the theme changes.
    const isLight = !document.documentElement.classList.contains('dark');

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      return; // No WebGL — the gradient backdrop behind the canvas still carries the hero.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 11);

    const hub = new Group();
    scene.add(hub);

    // Core
    const coreGeometry = new IcosahedronGeometry(1.45, 1);
    const coreMaterial = new MeshStandardMaterial({
      color: primary,
      emissive: primary,
      emissiveIntensity: 0.35,
      metalness: 0.4,
      roughness: 0.25,
      flatShading: true,
    });
    const core = new Mesh(coreGeometry, coreMaterial);
    hub.add(core);

    const shellGeometry = new EdgesGeometry(new IcosahedronGeometry(1.95, 1));
    const shellMaterial = new LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.55,
    });
    const shell = new LineSegments(shellGeometry, shellMaterial);
    hub.add(shell);

    // Rings + orbiting nodes
    const ringGroups: Group[] = [];
    const ringGeometries: TorusGeometry[] = [];
    const ringMaterial = new MeshStandardMaterial({
      color: primary,
      emissive: primary,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.35,
    });
    const nodeGeometry = new SphereGeometry(0.13, 20, 20);
    const nodeMaterials = [
      new MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.9 }),
      new MeshStandardMaterial({ color: primary, emissive: primary, emissiveIntensity: 0.9 }),
    ];
    const nodes: OrbitNode[] = [];

    RINGS.forEach((ring, ringIndex) => {
      const group = new Group();
      group.rotation.set(ring.tiltX, ring.tiltY, 0);
      const geometry = new TorusGeometry(ring.radius, 0.008, 8, 160);
      ringGeometries.push(geometry);
      group.add(new Mesh(geometry, ringMaterial));
      hub.add(group);
      ringGroups.push(group);

      const count = NODES_PER_RING[ringIndex]!;
      for (let i = 0; i < count; i += 1) {
        const mesh = new Mesh(nodeGeometry, nodeMaterials[(i + ringIndex) % 2]!);
        group.add(mesh);
        nodes.push({
          mesh,
          ring: ringIndex,
          radius: ring.radius,
          speed: 0.12 + ringIndex * 0.05 + (i % 2) * 0.03,
          phase: (i / count) * Math.PI * 2,
        });
      }
    });

    // Tethers from each node back to the core, rewritten each frame.
    const tetherPositions = new Float32Array(nodes.length * 6);
    const tetherGeometry = new BufferGeometry();
    tetherGeometry.setAttribute('position', new BufferAttribute(tetherPositions, 3));
    const tetherMaterial = new LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: isLight ? 0.35 : 0.18,
      blending: isLight ? NormalBlending : AdditiveBlending,
    });
    const tethers = new LineSegments(tetherGeometry, tetherMaterial);
    hub.add(tethers);

    // Starfield
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const r = 7 + Math.random() * 16;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi) - 6;
    }
    const particleGeometry = new BufferGeometry();
    particleGeometry.setAttribute('position', new BufferAttribute(particlePositions, 3));
    const particleMaterial = new PointsMaterial({
      color: isLight
        ? primary.clone().lerp(new Color('#16161f'), 0.2)
        : primary.clone().lerp(new Color('#ffffff'), 0.5),
      size: 0.045,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const particles = new Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Lights
    scene.add(new AmbientLight(0xffffff, 0.35));
    const keyLight = new PointLight(primary, 60, 30);
    keyLight.position.set(4, 3, 6);
    scene.add(keyLight);
    const rimLight = new PointLight(accent, 45, 30);
    rimLight.position.set(-5, -3, 3);
    scene.add(rimLight);

    // Sizing — the hub sits right of center on wide screens, centered on narrow ones.
    function resize() {
      const { clientWidth: width, clientHeight: height } = container!;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const wide = width >= 1024;
      hub.position.x = wide ? 3.1 : 0;
      hub.position.y = wide ? 0 : -0.6;
      hub.scale.setScalar(wide ? 1 : 0.78);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // Pointer parallax
    const pointer = { x: 0, y: 0 };
    function onPointerMove(event: PointerEvent) {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const hubSpace = new Vector3();
    function renderFrame(elapsed: number) {
      core.rotation.set(elapsed * 0.15, elapsed * 0.22, 0);
      shell.rotation.set(-elapsed * 0.08, -elapsed * 0.12, 0);
      core.scale.setScalar(1 + Math.sin(elapsed * 1.6) * 0.025);

      nodes.forEach((node, index) => {
        const angle = node.phase + elapsed * node.speed;
        node.mesh.position.set(Math.cos(angle) * node.radius, Math.sin(angle) * node.radius, 0);
        // Tether end in hub space = the ring's tilt applied to the node's local position.
        hubSpace.copy(node.mesh.position).applyEuler(ringGroups[node.ring]!.rotation);
        tetherPositions.set([0, 0, 0, hubSpace.x, hubSpace.y, hubSpace.z], index * 6);
      });
      tetherGeometry.attributes.position!.needsUpdate = true;

      hub.rotation.y += (pointer.x * 0.35 - hub.rotation.y) * 0.04;
      hub.rotation.x += (pointer.y * 0.25 - hub.rotation.x) * 0.04;
      particles.rotation.y = elapsed * 0.012;
      particles.position.x = -pointer.x * 0.3;
      particles.position.y = pointer.y * 0.2;

      renderer.render(scene, camera);
    }

    // Only animate while the hero is on screen and the tab is visible.
    let frameId = 0;
    let visible = true;
    const start = performance.now();
    function loop() {
      frameId = requestAnimationFrame(loop);
      renderFrame((performance.now() - start) / 1000);
    }
    function play() {
      if (reduceMotion || frameId || !visible || document.hidden) return;
      loop();
    }
    function pause() {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    const intersection = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) play();
      else pause();
    });
    intersection.observe(container);
    function onVisibility() {
      if (document.hidden) pause();
      else play();
    }
    document.addEventListener('visibilitychange', onVisibility);

    if (reduceMotion) renderFrame(4);
    else play();

    return () => {
      pause();
      intersection.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      [
        coreGeometry,
        shellGeometry,
        nodeGeometry,
        tetherGeometry,
        particleGeometry,
        ...ringGeometries,
      ].forEach((geometry) => geometry.dispose());
      [
        coreMaterial,
        shellMaterial,
        ringMaterial,
        tetherMaterial,
        particleMaterial,
        ...nodeMaterials,
      ].forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />;
}
