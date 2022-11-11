import { isArray } from 'lodash';
import { FC, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Cube } from './Cube';
import { RoundedPlaneGeometry } from './RoundedCubeGeometry';
import './RubiksCube.scss';

window.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

enum FlipType {
  Cube = 'cube',
  Layer = 'layer',
}

enum State {
  Still = 'still',
  Preparing = 'preparing',
  Rotating = 'rotating',
}

type Axis = 'x' | 'y' | 'z';
const axises: Axis[] = ['x', 'y', 'z'];

const getMainAxis = (vec3: THREE.Vector3): Axis => {
  return Object.keys(vec3).reduce((a, b) => (Math.abs(vec3[a as Axis]) > Math.abs(vec3[b as Axis]) ? a : b)) as Axis;
};

const initWebGL = (container: HTMLDivElement) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const canvas = renderer.domElement;
  container.appendChild(canvas);

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

  const camera = new THREE.PerspectiveCamera();
  camera.position.set(5, 2.5, 5);
  camera.lookAt(scene.position);

  const cube = new Cube();

  const lights = {
    objects: new THREE.Object3D(),

    ambient: new THREE.AmbientLight(0xffffff, 0.69),
    front: new THREE.DirectionalLight(0xffffff, 0.36),
    back: new THREE.DirectionalLight(0xffffff, 0.19),
  };

  lights.front.position.set(3, 10, 6);
  lights.back.position.set(-3, -10, -6);

  lights.objects.add(lights.front);
  lights.objects.add(lights.back);
  lights.objects.add(lights.ambient);

  scene.add(lights.objects);
  scene.add(cube.objects);

  const cubeHelper = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
    }),
  );
  scene.add(cubeHelper);

  const planeHelper = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.5,
      color: 0x0000ff,
    }),
  );
  planeHelper.rotation.set(0, Math.PI / 4, 0);
  scene.add(planeHelper);

  const group = new THREE.Object3D();
  cube.objects.add(group);

  const raycaster = new THREE.Raycaster();

  const getIntersect = (event: MouseEvent, object: THREE.Object3D | THREE.Object3D[]) => {
    const coords = { x: 0, y: 0 };
    coords.x = (event.clientX / canvas.clientWidth) * 2 - 1;
    coords.y = -(event.clientY / canvas.clientHeight) * 2 + 1;
    raycaster.setFromCamera(coords, camera);

    const intersects = isArray(object) ? raycaster.intersectObjects(object) : raycaster.intersectObject(object);
    return intersects[0];
  };

  let state = State.Still;

  let dragCurrent: THREE.Vector3;
  let dragTotal: THREE.Vector3;
  let dragDirection: Axis;
  let dragNormal: THREE.Vector3;
  let dragPiece: THREE.Object3D;

  let flipType = FlipType.Cube;
  let flipAxis: THREE.Vector3;
  let flipLayer: THREE.Object3D[];

  const callbacks: Array<() => void> = [];

  const attach = (child: THREE.Object3D, parent: THREE.Object3D) => {
    child.applyMatrix4(parent.matrixWorld.clone().invert());
    scene.remove(child);
    parent.add(child);
  };

  const detach = (child: THREE.Object3D, parent: THREE.Object3D) => {
    child.applyMatrix4(parent.matrixWorld);
    parent.remove(child);
    scene.add(child);
  };

  const getLayer = () => {
    const scalar = cube.size;

    // const axis = getMainAxis(flipAxis);

    const axis = getMainAxis(cubeHelper.worldToLocal(flipAxis));
    const pos = dragPiece.position.clone().multiplyScalar(scalar).round();

    const layer: THREE.Object3D[] = [];
    cube.pieces.forEach((piece) => {
      const piecePosition = piece.position.clone().multiplyScalar(scalar).round();
      if (piecePosition[axis] === pos[axis]) {
        layer.push(piece);
      }
    });

    return layer;
  };

  const movePieces = (layer: THREE.Object3D[], from: THREE.Object3D, to: THREE.Object3D) => {
    from.updateMatrixWorld();
    to.updateMatrixWorld();

    layer.forEach((piece) => {
      piece.applyMatrix4(from.matrixWorld);
      from.remove(piece);
      piece.applyMatrix4(to.matrixWorld.clone().invert());
      to.add(piece);
    });
  };

  const selectLayer = (layer: THREE.Object3D[]) => {
    group.rotation.set(0, 0, 0);
    movePieces(layer, cube.objects, group);
    flipLayer = layer;
  };

  const deselectLayer = (layer: THREE.Object3D[]) => {
    movePieces(layer, group, cube.objects);
    flipLayer = [];
  };

  container.addEventListener('mousedown', (event) => {
    if (state === State.Preparing || state === State.Rotating) {
      return;
    }

    const iEdge = getIntersect(event, cube.edges);
    const iCubeHelper = getIntersect(event, cubeHelper);

    if (iEdge && iCubeHelper && iCubeHelper.face) {
      flipType = FlipType.Layer;

      const edge = iEdge.object as THREE.Mesh<RoundedPlaneGeometry, THREE.MeshLambertMaterial>;

      edge.material.color.multiplyScalar(4 / 5);
      callbacks.push(() => {
        edge.material.color.multiplyScalar(5 / 4);
      });

      dragPiece = edge.parent as THREE.Object3D;

      dragNormal = iCubeHelper.face.normal;

      attach(planeHelper, cubeHelper);

      planeHelper.rotation.set(0, 0, 0);
      planeHelper.position.set(0, 0, 0);

      // planeHelper.lookAt(dragNormal);

      const axis = getMainAxis(dragNormal);
      const upAxis = axises[(axises.findIndex((v) => v === axis) + 1) % 3];
      const up = new THREE.Vector3();
      up[upAxis] = 1;

      planeHelper.up.copy(cubeHelper.localToWorld(up));
      planeHelper.lookAt(cubeHelper.localToWorld(dragNormal));

      planeHelper.translateZ(-0.5);
      planeHelper.updateMatrixWorld();

      detach(planeHelper, cubeHelper);
    } else {
      flipType = FlipType.Cube;

      dragNormal = new THREE.Vector3(0, 0, 1);

      planeHelper.rotation.set(0, Math.PI / 4, 0);
      planeHelper.position.set(0, 0, 0);
      planeHelper.updateMatrixWorld();
    }

    const iPlaneHelper = getIntersect(event, planeHelper);
    if (!iPlaneHelper) {
      return;
    }
    dragCurrent = planeHelper.worldToLocal(iPlaneHelper.point);
    dragTotal = new THREE.Vector3();

    state = state === State.Still ? State.Preparing : state;
  });
  container.addEventListener('mousemove', (event) => {
    if (state === State.Still) {
      return;
    }

    const iPlaneHelper = getIntersect(event, planeHelper);
    if (!iPlaneHelper) {
      return;
    }

    const dragNext = planeHelper.worldToLocal(iPlaneHelper.point);
    const dragDelta = dragNext.clone().sub(dragCurrent).setZ(0);
    dragTotal.add(dragDelta);
    dragCurrent = dragNext;

    if (state === State.Preparing && dragTotal.length() > 0.05) {
      dragDirection = getMainAxis(dragTotal);

      if (flipType === FlipType.Layer) {
        const direction = new THREE.Vector3();
        direction[dragDirection] = 1;

        const worldDirection = planeHelper.localToWorld(direction).sub(planeHelper.position);
        const objectDirection = cubeHelper.worldToLocal(worldDirection);

        flipAxis = objectDirection.cross(dragNormal).negate();

        const layer = getLayer();
        selectLayer(layer);
      } else {
        const axis =
          dragDirection === 'x' ? 'y' : dragDirection === 'y' && event.clientX < canvas.clientWidth / 2 ? 'x' : 'z';
        flipAxis = new THREE.Vector3();
        flipAxis[axis] = axis === 'x' ? -1 : 1;
      }

      state = State.Rotating;
    }

    if (state === State.Rotating) {
      const rotation = dragDelta[dragDirection];
      if (flipType === FlipType.Layer) {
        group.rotateOnAxis(flipAxis, rotation);
      } else {
        cubeHelper.rotateOnWorldAxis(flipAxis, rotation);
        cube.objects.rotation.copy(cubeHelper.rotation);
      }
    }
  });
  container.addEventListener('mouseup', () => {
    state = State.Still;

    if (flipType === FlipType.Layer) {
      deselectLayer(flipLayer);
    } else {
      //
    }

    while (callbacks.length > 0) {
      callbacks.pop()?.();
    }
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
