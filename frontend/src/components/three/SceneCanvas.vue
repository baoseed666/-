<template>
  <canvas ref="canvasRef" class="absolute inset-0 w-full h-full" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { gsap } from 'gsap';

const canvasRef = ref<HTMLCanvasElement>();
let renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera;
let animId: number;

onMounted(() => {
  const canvas = canvasRef.value!;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.z = 3;

  const geo = new THREE.BufferGeometry();
  const count = 800;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 10;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffdd00, size: 0.015, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(geo, mat));

  const ringGeo = new THREE.TorusGeometry(1.5, 0.005, 8, 100);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.3 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  scene.add(ring);
  gsap.to(ring.rotation, { y: Math.PI * 2, duration: 8, repeat: -1, ease: 'none' });

  const animate = () => {
    animId = requestAnimationFrame(animate);
    const pts = scene.children[0] as THREE.Points;
    pts.rotation.y += 0.0003;
    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  };
  window.addEventListener('resize', onResize);
  onUnmounted(() => { window.removeEventListener('resize', onResize); cancelAnimationFrame(animId); renderer.dispose(); });
});
</script>
