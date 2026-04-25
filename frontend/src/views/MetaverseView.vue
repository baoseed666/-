<template>
  <div class="relative w-full min-h-screen bg-[#0a0a0a] overflow-hidden">
    <div class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
      <router-link to="/" class="text-arcade-muted hover:text-arcade-gold text-sm transition-colors">← 返回首页</router-link>
      <div class="text-center">
        <h1 class="text-xl font-bold text-arcade-gold tracking-widest">🌆 龙华元宇宙商业街</h1>
        <p class="text-xs text-arcade-muted tracking-widest">探索上海徐汇龙华商圈 3D 全景</p>
      </div>
      <div class="w-16" />
    </div>

    <canvas ref="canvasRef" class="absolute inset-0 w-full h-full" />

    <div class="absolute bottom-0 left-0 right-0 z-20 p-4">
      <div class="max-w-md mx-auto card-arcade">
        <div class="flex items-center gap-2 mb-2">
          <span class="inline-block w-3 h-3 rounded-full" :style="{ backgroundColor: '#' + selected.color.toString(16).padStart(6, '0') }" />
          <span class="text-arcade-gold font-bold tracking-wider">{{ selected.name }}</span>
          <span class="text-arcade-muted text-xs ml-auto">{{ selected.type }}</span>
        </div>
        <div class="flex gap-6 text-sm">
          <div>
            <p class="text-arcade-muted text-xs">商家数量</p>
            <p class="text-arcade-green font-mono">{{ selected.storeCount }} 家</p>
          </div>
          <div>
            <p class="text-arcade-muted text-xs">人均消费</p>
            <p class="text-arcade-gold font-mono">{{ selected.priceRange }}</p>
          </div>
        </div>
        <p class="text-xs text-arcade-muted mt-2">点击建筑查看详情 · 拖拽旋转视角</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const DISTRICTS = [
  { name: '龙华会', type: '综合商业', storeCount: 17, priceRange: '¥20-400', color: 0xff4400, height: 3, x: -3 },
  { name: '西岸凤巢', type: '精品文创', storeCount: 7, priceRange: '¥45-220', color: 0x00ff88, height: 2, x: -1.5 },
  { name: '西岸梦中心', type: '大型商业', storeCount: 20, priceRange: '¥30-1800', color: 0xffdd00, height: 4, x: 0 },
  { name: '朵云轩', type: '艺文中心', storeCount: 4, priceRange: '¥0-85', color: 0x8844ff, height: 1.5, x: 1.5 },
  { name: '滨江步道', type: '户外滨江', storeCount: 4, priceRange: '¥0-350', color: 0x4488ff, height: 1, x: 3 },
];

const canvasRef = ref<HTMLCanvasElement>();
const selected = ref(DISTRICTS[2]);

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let animId: number;
const meshes: THREE.Mesh[] = [];

onMounted(() => {
  const canvas = canvasRef.value!;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(0x0a0a0a);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 2, 8);
  camera.lookAt(0, 1, 0);

  const geo = new THREE.BufferGeometry();
  const count = 800;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 20;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffdd00, size: 0.02, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(geo, starMat));

  for (const d of DISTRICTS) {
    const boxGeo = new THREE.BoxGeometry(0.8, d.height, 0.8);
    const mat = new THREE.MeshBasicMaterial({ color: d.color, wireframe: true });
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.position.set(d.x, d.height / 2, 0);
    mesh.userData = d;
    scene.add(mesh);
    meshes.push(mesh);
  }

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1, 0);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const onClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) selected.value = hits[0].object.userData as typeof DISTRICTS[0];
  };
  canvas.addEventListener('click', onClick);

  const animate = () => {
    animId = requestAnimationFrame(animate);
    scene.rotation.y += 0.003;
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  };
  window.addEventListener('resize', onResize);

  onUnmounted(() => {
    window.removeEventListener('resize', onResize);
    canvas.removeEventListener('click', onClick);
    cancelAnimationFrame(animId);
    controls.dispose();
    renderer.dispose();
  });
});
</script>
