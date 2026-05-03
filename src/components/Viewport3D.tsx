import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type {
  RibParams,
  RibProfile,
  InstallationMode,
  LightingPreset,
} from '../engine/types';
import { SCALE } from '../engine/types';
import {
  createRibGeometry,
  generateRibProfiles,
  LIGHTING_PRESETS,
} from '../engine/ribEngine';

interface Viewport3DProps {
  params: RibParams;
  installationMode: InstallationMode;
  lightingPreset: LightingPreset;
  ledEnabled: boolean;
  ledColorStart: string;
  ledColorEnd: string;
  ledIntensity: number;
  backdropColor: string;
  bgColor: string;
  floorEnabled: boolean;
  wallpaperEnabled: boolean;
  scaleFigureEnabled: boolean;
  imageScale: number;
  onRibProfilesGenerated: (profiles: RibProfile[]) => void;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}

export default function Viewport3D({
  params,
  installationMode,
  lightingPreset,
  ledEnabled,
  ledColorStart,
  ledColorEnd,
  ledIntensity,
  backdropColor,
  bgColor,
  floorEnabled,
  wallpaperEnabled,
  scaleFigureEnabled,
  imageScale,
  onRibProfilesGenerated,
  rendererRef,
  sceneRef,
  cameraRef,
}: Viewport3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const ribGroupRef = useRef<THREE.Group | null>(null);
  const ribMeshesRef = useRef<THREE.Mesh[]>([]);
  const wallMeshRef = useRef<THREE.Mesh | null>(null);
  const ceilingMeshRef = useRef<THREE.Mesh | null>(null);
  const ledLightsRef = useRef<THREE.PointLight[]>([]);
  const ledMeshesRef = useRef<THREE.Mesh[]>([]);
  const lightsInSceneRef = useRef<THREE.Light[]>([]);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const scaleFigureRef = useRef<THREE.Mesh | null>(null);
  const animFrameRef = useRef<number>(0);
  const wallpaperTextureRef = useRef<THREE.Texture | null>(null);
  const initializedRef = useRef(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const container = containerRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1f);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(15, 10, 25);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Initialize RectAreaLight support
    RectAreaLightUniformsLib.init();

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Rib group container
    const ribGroup = new THREE.Group();
    scene.add(ribGroup);
    ribGroupRef.current = ribGroup;

    // Grid helper
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x333333);
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Floor
    createFloor('/floors/marble.png', scene);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Scale figure drag
    setupScaleFigureDrag(renderer.domElement, camera, controls, scene);

    // Handle resize
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      initializedRef.current = false;
    };
  }, []);

  // ── Floor ──
  const createFloor = useCallback((textureUrl: string, scene: THREE.Scene) => {
    if (floorMeshRef.current) {
      scene.remove(floorMeshRef.current);
      floorMeshRef.current.geometry.dispose();
      (floorMeshRef.current.material as THREE.MeshStandardMaterial).dispose();
      floorMeshRef.current = null;
    }

    const loader = new THREE.TextureLoader();
    loader.load(textureUrl, (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(6, 6);
      texture.colorSpace = THREE.SRGBColorSpace;

      const floorGeo = new THREE.PlaneGeometry(50, 50);
      const floorMat = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 0.6,
        metalness: 0.0,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.01;
      floor.receiveShadow = true;
      scene.add(floor);
      floorMeshRef.current = floor;

      if (gridHelperRef.current) gridHelperRef.current.visible = false;
    });
  }, []);

  // ── Scale figure drag ──
  const setupScaleFigureDrag = useCallback((
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    _scene: THREE.Scene
  ) => {
    let isDragging = false;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    canvas.addEventListener('pointerdown', (e) => {
      if (!scaleFigureRef.current) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(scaleFigureRef.current, true);
      if (intersects.length > 0) {
        isDragging = true;
        controls.enabled = false;
        canvas.style.cursor = 'grabbing';
        const figureY = scaleFigureRef.current.position.y - (68 * SCALE / 2);
        dragPlane.set(new THREE.Vector3(0, 1, 0), -figureY);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!scaleFigureRef.current) { canvas.style.cursor = ''; return; }
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
          scaleFigureRef.current.position.x = intersection.x;
          scaleFigureRef.current.position.z = intersection.z;
        }
      } else {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(scaleFigureRef.current, true);
        canvas.style.cursor = intersects.length > 0 ? 'grab' : '';
      }
    });

    canvas.addEventListener('pointerup', () => {
      if (isDragging) {
        isDragging = false;
        controls.enabled = true;
        canvas.style.cursor = '';
      }
    });
  }, []);

  // ── Generate ribs (reactive) ──
  useEffect(() => {
    const scene = sceneRef.current;
    const ribGroup = ribGroupRef.current;
    if (!scene || !ribGroup) return;

    // Clear existing ribs
    ribMeshesRef.current.forEach((m) => ribGroup.remove(m));
    ribMeshesRef.current = [];
    if (wallMeshRef.current) { ribGroup.remove(wallMeshRef.current); wallMeshRef.current = null; }
    if (ceilingMeshRef.current) { ribGroup.remove(ceilingMeshRef.current); ceilingMeshRef.current = null; }
    clearLEDs();

    const { height, thickness, count, spacing, color } = params;

    const actualMinDepth = Math.min(params.minDepth, params.maxDepth);
    const actualMaxDepth = Math.max(params.minDepth, params.maxDepth);
    const safeParams = { ...params, minDepth: actualMinDepth, maxDepth: actualMaxDepth };

    const { ribProfiles, ceilingProfilesArr } = generateRibProfiles(safeParams, installationMode, imageScale);

    // Material
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      side: THREE.DoubleSide,
      roughness: 0.35,
      metalness: 0.0,
      envMapIntensity: 0.5,
    });

    const totalWidth = (count - 1) * spacing;
    const startZ = -(totalWidth * SCALE) / 2;

    // Generate meshes
    for (let i = 0; i < count; i++) {
      const rp = ribProfiles[i];
      const profileVec2 = rp.profile.map((p) => new THREE.Vector2(p.x, p.y));
      const geometry = createRibGeometry(profileVec2, thickness, height);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = startZ + i * spacing * SCALE - thickness * SCALE / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      ribGroup.add(mesh);
      ribMeshesRef.current.push(mesh);
    }

    // Wall/ceiling backdrop
    const backdropMat = new THREE.MeshStandardMaterial({
      color: wallpaperEnabled ? 0xffffff : new THREE.Color(backdropColor),
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.0,
    });

    if (wallpaperEnabled) {
      if (!wallpaperTextureRef.current) {
        const loader = new THREE.TextureLoader();
        loader.load('/wallpapers/bluewallpaper.png', (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          wallpaperTextureRef.current = tex;
          backdropMat.map = tex;
          backdropMat.needsUpdate = true;
        });
      } else {
        backdropMat.map = wallpaperTextureRef.current;
      }
    }

    if (installationMode === 'wall') {
      const wallGeo = new THREE.PlaneGeometry((totalWidth + 40) * SCALE, (height + 10) * SCALE);
      const wall = new THREE.Mesh(wallGeo, backdropMat);
      wall.rotation.y = Math.PI / 2;
      wall.position.set(-0.5 * SCALE, height * SCALE / 2, 0);
      wall.receiveShadow = true;
      ribGroup.add(wall);
      wallMeshRef.current = wall;
      ribGroup.rotation.set(0, 0, 0);
      ribGroup.position.set(0, 0, 0);
    } else if (installationMode === 'ceiling') {
      const ceilGeo = new THREE.PlaneGeometry((totalWidth + 40) * SCALE, (height + 10) * SCALE);
      const ceil = new THREE.Mesh(ceilGeo, backdropMat);
      ceil.rotation.y = Math.PI / 2;
      ceil.position.set(-0.5 * SCALE, height * SCALE / 2, 0);
      ceil.receiveShadow = true;
      ribGroup.add(ceil);
      ceilingMeshRef.current = ceil;
      ribGroup.rotation.set(0, 0, -Math.PI / 2);
      ribGroup.position.set(height * SCALE / 2, actualMaxDepth * SCALE / 2, 0);
    } else if (installationMode === 'both') {
      const ceilingRun = params.ceilingRun;

      for (let i = 0; i < count; i++) {
        const ceilingProfile = ceilingProfilesArr[i];
        if (ceilingProfile && ceilingProfile.length > 2) {
          const ceilGeo = createRibGeometry(ceilingProfile, thickness, ceilingRun);
          const ceilMesh = new THREE.Mesh(ceilGeo, material);
          ceilMesh.rotation.z = -Math.PI / 2;
          ceilMesh.position.set(0, height * SCALE, startZ + i * spacing * SCALE - thickness * SCALE / 2);
          ceilMesh.castShadow = true;
          ceilMesh.receiveShadow = true;
          ribGroup.add(ceilMesh);
          ribMeshesRef.current.push(ceilMesh);
        }
        ribProfiles[i].ceilingProfile = ceilingProfile.map((p) => ({ x: p.x, y: p.y }));
        ribProfiles[i].ceilingRun = ceilingRun;
      }

      // Wall backdrop
      const wallBackGeo = new THREE.PlaneGeometry((totalWidth + 40) * SCALE, (height + 5) * SCALE);
      const wall = new THREE.Mesh(wallBackGeo, backdropMat);
      wall.rotation.y = Math.PI / 2;
      wall.position.set(-0.5 * SCALE, height * SCALE / 2, 0);
      wall.receiveShadow = true;
      ribGroup.add(wall);
      wallMeshRef.current = wall;

      // Ceiling backdrop
      const ceilBackGeo = new THREE.PlaneGeometry((ceilingRun + 5) * SCALE, (totalWidth + 40) * SCALE);
      const ceilBack = new THREE.Mesh(ceilBackGeo, backdropMat.clone());
      ceilBack.rotation.x = -Math.PI / 2;
      ceilBack.position.set((ceilingRun / 2) * SCALE, height * SCALE + 0.5 * SCALE, 0);
      ceilBack.receiveShadow = true;
      ribGroup.add(ceilBack);
      ceilingMeshRef.current = ceilBack;

      ribGroup.rotation.set(0, 0, 0);
      ribGroup.position.set(0, 0, 0);
    }

    // LEDs
    if (ledEnabled) {
      createLEDsForProfiles(ribProfiles, safeParams, installationMode);
    }

    onRibProfilesGenerated(ribProfiles);
  }, [params, installationMode, imageScale, backdropColor, wallpaperEnabled, ledEnabled, ledColorStart, ledColorEnd, ledIntensity]);

  // ── Lighting ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    lightsInSceneRef.current.forEach((l) => scene.remove(l));
    lightsInSceneRef.current = [];

    const config = LIGHTING_PRESETS[lightingPreset];
    scene.background = new THREE.Color(config.background);

    // Hemisphere light
    const hemi = config.hemisphere;
    const hemiLight = new THREE.HemisphereLight(hemi.sky, hemi.ground, hemi.intensity);
    scene.add(hemiLight);
    lightsInSceneRef.current.push(hemiLight);

    config.lights.forEach((lc) => {
      const light = new THREE.DirectionalLight(lc.color, lc.intensity);
      light.position.set(...lc.position);
      if (lc.castShadow) {
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.bias = -0.0005;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 60;
      }
      scene.add(light);
      lightsInSceneRef.current.push(light);
    });
  }, [lightingPreset]);

  // ── Background color override ──
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(bgColor);
    }
  }, [bgColor]);

  // ── Floor visibility ──
  useEffect(() => {
    if (floorMeshRef.current) floorMeshRef.current.visible = floorEnabled;
    if (gridHelperRef.current) gridHelperRef.current.visible = !floorEnabled;
  }, [floorEnabled]);

  // ── Scale figure ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (scaleFigureEnabled) {
      createScaleFigure(scene);
    } else if (scaleFigureRef.current) {
      scene.remove(scaleFigureRef.current);
      scaleFigureRef.current = null;
    }
  }, [scaleFigureEnabled]);

  // ── Helper: create scale figure ──
  const createScaleFigure = useCallback((scene: THREE.Scene) => {
    if (scaleFigureRef.current) {
      scene.remove(scaleFigureRef.current);
      scaleFigureRef.current = null;
    }

    const H = 68 * SCALE;
    const W = H * (390 / 1420);

    const loader = new THREE.TextureLoader();
    loader.load('/figures/scale-person.png', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;

      const planeGeo = new THREE.PlaneGeometry(W, H);
      const planeMat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.1,
      });

      const figure = new THREE.Mesh(planeGeo, planeMat);
      figure.position.y = H / 2;

      const totalWidth = (params.count - 1) * params.spacing;
      const zPos = totalWidth * SCALE / 2 + 18 * SCALE;
      figure.position.set(params.maxDepth * SCALE * 0.5, H / 2, zPos);

      scene.add(figure);
      scaleFigureRef.current = figure;
    });
  }, [params]);

  // ── LED helpers ──
  const clearLEDs = useCallback(() => {
    const ribGroup = ribGroupRef.current;
    if (!ribGroup) return;
    ledLightsRef.current.forEach((l) => ribGroup.remove(l));
    ledMeshesRef.current.forEach((m) => ribGroup.remove(m));
    ledLightsRef.current = [];
    ledMeshesRef.current = [];
  }, []);

  const createLEDsForProfiles = useCallback((
    ribProfiles: RibProfile[],
    params: RibParams,
    installationMode: InstallationMode
  ) => {
    const ribGroup = ribGroupRef.current;
    if (!ribGroup || !ribProfiles.length) return;

    clearLEDs();

    const startColor = new THREE.Color(ledColorStart);
    const endColor = new THREE.Color(ledColorEnd);

    const totalWidth = (params.count - 1) * params.spacing;
    const startZ = -(totalWidth * SCALE) / 2;
    const lightInterval = Math.max(1, Math.floor(params.count / 20));

    ribProfiles.forEach((rib, i) => {
      const t = params.count > 1 ? i / (params.count - 1) : 0;
      const ribColor = new THREE.Color().lerpColors(startColor, endColor, t);

      const profile = rib.profile;
      const sampleRate = Math.max(1, Math.floor(profile.length / 25));
      const points: THREE.Vector3[] = [];
      for (let p = 0; p < profile.length; p += sampleRate) {
        const pt = profile[p];
        points.push(new THREE.Vector3(pt.x * SCALE + 0.02, pt.y * SCALE, 0));
      }

      if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.015, 4, false);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: ribColor,
          transparent: true,
          opacity: 0.95,
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.z = startZ + i * params.spacing * SCALE - params.thickness * SCALE / 2;
        ribGroup.add(tube);
        ledMeshesRef.current.push(tube);
      }

      if (i % lightInterval === 0) {
        const numLights = 6;
        for (let j = 0; j < numLights; j++) {
          const lt = (j + 0.5) / numLights;
          const pointIndex = Math.floor(lt * (profile.length - 1));
          const point = profile[pointIndex];

          const light = new THREE.PointLight(ribColor, ledIntensity * 0.5, params.spacing * SCALE * 2.5);
          light.position.set(
            point.x * SCALE + 0.05,
            point.y * SCALE,
            startZ + i * params.spacing * SCALE + params.thickness * SCALE * 0.6
          );
          ribGroup.add(light);
          ledLightsRef.current.push(light);
        }
      }

      // Ceiling LED strip for "both" mode
      if (installationMode === 'both' && rib.ceilingProfile && rib.ceilingProfile.length > 2) {
        const ceilProfile = rib.ceilingProfile;
        const ceilSampleRate = Math.max(1, Math.floor(ceilProfile.length / 25));
        const ceilPoints: THREE.Vector3[] = [];
        for (let p = 0; p < ceilProfile.length; p += ceilSampleRate) {
          const pt = ceilProfile[p];
          ceilPoints.push(new THREE.Vector3(pt.y * SCALE, rib.height * SCALE - pt.x * SCALE - 0.02, 0));
        }

        if (ceilPoints.length >= 2) {
          const ceilCurve = new THREE.CatmullRomCurve3(ceilPoints);
          const ceilTubeGeo = new THREE.TubeGeometry(ceilCurve, 20, 0.015, 4, false);
          const ceilTubeMat = new THREE.MeshBasicMaterial({
            color: ribColor,
            transparent: true,
            opacity: 0.95,
          });
          const ceilTube = new THREE.Mesh(ceilTubeGeo, ceilTubeMat);
          ceilTube.position.z = startZ + i * params.spacing * SCALE - params.thickness * SCALE / 2;
          ribGroup.add(ceilTube);
          ledMeshesRef.current.push(ceilTube);
        }

        if (i % lightInterval === 0 && rib.ceilingRun) {
          const numCeilLights = Math.max(2, Math.round(6 * (rib.ceilingRun / rib.height)));
          for (let j = 0; j < numCeilLights; j++) {
            const lt = (j + 0.5) / numCeilLights;
            const pidx = Math.floor(lt * (ceilProfile.length - 1));
            const pt = ceilProfile[pidx];

            const cLight = new THREE.PointLight(ribColor, ledIntensity * 0.5, params.spacing * SCALE * 2.5);
            cLight.position.set(
              pt.y * SCALE,
              rib.height * SCALE - pt.x * SCALE - 0.05,
              startZ + i * params.spacing * SCALE + params.thickness * SCALE * 0.6
            );
            ribGroup.add(cLight);
            ledLightsRef.current.push(cLight);
          }
        }
      }
    });
  }, [ledColorStart, ledColorEnd, ledIntensity, clearLEDs]);

  // ── Public view methods via imperative handle ──
  // Exposed via window for simplicity
  useEffect(() => {
    (window as any).__ribmakerSetView = (view: string) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;

      const totalWidth = (params.count - 1) * params.spacing * SCALE;
      const centerY = params.height * SCALE / 2;
      const maxD = params.maxDepth * SCALE;

      switch (view) {
        case 'front':
          camera.position.set(maxD + 15, centerY, 0);
          controls.target.set(0, centerY, 0);
          break;
        case 'top':
          camera.position.set(0, 20, 0);
          controls.target.set(0, 0, 0);
          break;
        case 'side':
          camera.position.set(maxD / 2, centerY, totalWidth + 10);
          controls.target.set(maxD / 2, centerY, 0);
          break;
        case 'perspective':
          camera.position.set(15, 10, 25);
          controls.target.set(0, centerY, 0);
          break;
      }
      controls.update();
    };
  }, [params]);

  return (
    <div ref={containerRef} className="flex-1 relative" />
  );
}
