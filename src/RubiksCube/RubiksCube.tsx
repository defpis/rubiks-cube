import { FC, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Cube } from './Cube';
import { throttle } from 'lodash';

const log = throttle(console.log, 500);

window.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

interface DeltaPos {
  x: number;
  y: number;
}

const initWebGL = (container: HTMLDivElement) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const canvas = renderer.domElement;
  container.appendChild(canvas);

  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 0, 5);

  const onResize = ({ width, height }: { width: number; height: number }) => {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  const resizeObserver = new ResizeObserver((entries) => {
    entries.forEach(({ contentRect }) => {
      onResize(contentRect);
    });
  });
  resizeObserver.observe(container);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.9, 0.9, 0.9);

  const cube = new Cube();

  const lights = {
    holder: new THREE.Object3D(),
    ambient: new THREE.AmbientLight(0xffffff, 0.69),
    front: new THREE.DirectionalLight(0xffffff, 0.36),
    back: new THREE.DirectionalLight(0xffffff, 0.19),
  };

  lights.front.position.set(3, 10, 6);
  lights.back.position.set(-3, -10, -6);

  lights.holder.add(lights.front);
  lights.holder.add(lights.back);
  lights.holder.add(lights.ambient);

  scene.add(lights.holder);
  scene.add(cube.holder);

  const raycaster = new THREE.Raycaster();

  const XAxis = new THREE.Vector3(1, 0, 0);
  const YAxis = new THREE.Vector3(0, 1, 0);

  const rotateCube = (deltaPos: DeltaPos) => {
    edges.rotateOnWorldAxis(XAxis, deltaPos.y / 100);
    edges.rotateOnWorldAxis(YAxis, deltaPos.x / 100);

    cube.object.rotation.copy(edges.rotation);
  };

  let mousedown = false;
  let action = false; // 操作魔方中

  const helperMaterial = new THREE.MeshBasicMaterial({
    depthWrite: false,
    transparent: false,
    opacity: 1,
    color: 0x0033ff,
  });

  const group = new THREE.Object3D();
  const edges = new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 1), helperMaterial.clone()); // 整体

  cube.object.add(group);
  scene.add(edges);

  const dragStart = new THREE.Vector3(); // 旋转或转动时初始位置
  const dragTotal = new THREE.Vector3();
  // let intersectCube: THREE.Intersection<THREE.Object3D>;

  container.addEventListener('mousedown', (event) => {
    mousedown = true;

    const mouse = { x: 0, y: 0 };
    mouse.x = (event.clientX / canvas.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / canvas.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersectEdge = raycaster.intersectObject(edges)[0];
    // intersectCube = raycaster.intersectObjects(cube.cubes)[0]; // 用piece一样的，也会去到edge和cube

    if (intersectEdge) {
      action = true;

      if (!intersectEdge.face) {
        return;
      }

      dragStart.copy(intersectEdge.point);
      dragTotal.set(0, 0, 0);
    } else {
      rotateCube({ x: 0, y: 0 });
      dragStart.set(event.clientX, event.clientY, 0);
    }
  });
  container.addEventListener('mousemove', (event) => {
    if (!mousedown) {
      return;
    }

    if (action) {
      const mouse = { x: 0, y: 0 };
      mouse.x = (event.clientX / canvas.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / canvas.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersectEdge = raycaster.intersectObject(edges)[0];
      const dragMove = intersectEdge.point;
      const dragDelta = dragMove.clone().sub(dragStart);
      dragTotal.add(dragDelta);
      dragStart.copy(dragMove);

      if (dragTotal.length() > 0.05) {
        // TODO: 系统性学些three.js之后再来搞吧有点难受
      }
    } else {
      rotateCube({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y });
      dragStart.set(event.clientX, event.clientY, 0);
    }
  });
  container.addEventListener('mouseup', () => {
    mousedown = false;
    action = false;
  });

  renderer.setAnimationLoop(() => {
    const dpr = window.devicePixelRatio;
    renderer.setPixelRatio(dpr);
    renderer.render(scene, camera);
  });
};

const RubiksCube: FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (element) {
      initWebGL(element);
    }
  }, []);

  return <div ref={ref} id="app"></div>;
};

export default RubiksCube;
