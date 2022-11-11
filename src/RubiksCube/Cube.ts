import * as THREE from 'three';
import { RoundedCubeGeometry, RoundedPlaneGeometry } from './RoundedCubeGeometry';

interface CubeData {
  position: THREE.Vector3;
  edgeIndices: number[];
}

export class Cube {
  objects = new THREE.Object3D();

  size = 3;
  datas: CubeData[] = [];

  pieces: THREE.Object3D[] = [];
  edges: THREE.Mesh<RoundedPlaneGeometry, THREE.MeshLambertMaterial>[] = []; // 彩色部分
  cubes: THREE.Mesh<RoundedCubeGeometry, THREE.MeshLambertMaterial>[] = []; // 黑色部分

  constructor() {
    this.initialize();
  }

  initialize() {
    this.generatePositions();
    this.generateObjects();
    this.setColors();

    this.objects.children = [];
    this.pieces.forEach((piece) => {
      this.objects.add(piece);
    });
  }

  generatePositions() {
    this.datas = [];

    const first = 0;
    const last = this.size - 1;

    const offset = this.size % 2 !== 0 ? -Math.floor(this.size / 2) : -(this.size - 1) / 2;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          const data: CubeData = {
            position: new THREE.Vector3(offset + x, offset + y, offset + z),
            edgeIndices: [],
          };

          if (x == first) data.edgeIndices.push(0);
          if (x == last) data.edgeIndices.push(1);
          if (y == first) data.edgeIndices.push(2);
          if (y == last) data.edgeIndices.push(3);
          if (z == first) data.edgeIndices.push(4);
          if (z == last) data.edgeIndices.push(5);

          this.datas.push(data);
        }
      }
    }
  }

  generateObjects() {
    this.edges = [];
    this.cubes = [];
    this.pieces = [];

    const pieceSize = 1 / 3;

    const mainMaterial = new THREE.MeshLambertMaterial();
    const edgeGeometry = new RoundedPlaneGeometry(pieceSize, 0.15, 0.01);
    // const edgeMesh = new THREE.Mesh(edgeGeometry, mainMaterial.clone());
    const cubeMesh = new THREE.Mesh(new RoundedCubeGeometry(pieceSize, 0.12, 90), mainMaterial.clone());

    this.datas.forEach(({ position, edgeIndices }, index) => {
      const piece = new THREE.Object3D();
      piece.name = index.toString();
      piece.position.copy(position.clone().divideScalar(3));
      piece.userData = {
        start: {
          position: piece.position.clone(),
          rotation: piece.rotation.clone(),
        },
      };

      const pieceCube = cubeMesh.clone();
      pieceCube.name = 'Cube#' + piece.name;
      piece.add(pieceCube);
      this.cubes.push(pieceCube);

      const pieceEdges: THREE.Mesh<RoundedPlaneGeometry, THREE.MeshLambertMaterial>[] = [];
      edgeIndices.forEach((edgeIndex) => {
        const pieceEdge = new THREE.Mesh(edgeGeometry, mainMaterial.clone());
        // const pieceEdge = edgeMesh.clone();
        pieceEdge.name = ['L', 'R', 'D', 'U', 'B', 'F'][edgeIndex] + '#Edge#' + piece.name;

        const distance = pieceSize / 2;
        pieceEdge.position.set(
          distance * [-1, 1, 0, 0, 0, 0][edgeIndex],
          distance * [0, 0, -1, 1, 0, 0][edgeIndex],
          distance * [0, 0, 0, 0, -1, 1][edgeIndex],
        );
        pieceEdge.rotation.set(
          (Math.PI / 2) * [0, 0, 1, -1, 0, 0][edgeIndex],
          (Math.PI / 2) * [-1, 1, 0, 0, 2, 0][edgeIndex],
          0,
        );
        pieceEdge.scale.set(0.85, 0.85, 0.85);

        pieceEdges.push(pieceEdge);
        piece.add(pieceEdge);
        this.edges.push(pieceEdge);
      });

      piece.userData.cube = pieceCube;
      piece.userData.edges = pieceEdges;

      this.pieces.push(piece);
    });
  }

  setColors() {
    const colors: Record<string, number> = {
      U: 0xfff7ff, // up
      D: 0xffef48, // down
      L: 0x82ca38, // left
      R: 0x41aac8, // right
      F: 0xef3923, // front
      B: 0xff8c0a, // back
    };
    this.edges.forEach((edge) => edge.material.color.setHex(colors[edge.name.split('#')[0]]));
    this.cubes.forEach((cube) => cube.material.color.setHex(0x08101a));
  }
}
