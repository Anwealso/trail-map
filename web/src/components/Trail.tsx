import { useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { TerrainSampler } from "../utils/terrainSampler";
import { Point } from "../utils/Point";
import { createClayMaterial } from "../utils/clayMaterial";

const TRAIL_HEIGHT_OFFSET = 0.003; // helps stop the two meshes clipping each other
const DIST_SAMPLES = 300; // samples along curve for distance-to-path

/**
 * Load in trail csv coordinates. Trail points must be provided in world units.
 * @param url
 * @returns
 */
async function loadTrailCSV(url: string): Promise<{ x: number; y: number }[]> {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.trim().split("\n");

  return lines.slice(1).map((line) => {
    const [x, y] = line.split(",").map(Number);
    return { x, y };
  });
}

interface TrailMeshParams {
  curve: THREE.CatmullRomCurve3;
  width: number;
  terrainSampler: TerrainSampler;
}

/** 2D distance from point (px,pz) to segment [a,b] in the XZ plane. */
function distToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const c1 = wx * vx + wz * vz;
  if (c1 <= 0) return Math.hypot(wx, wz);
  const c2 = vx * vx + vz * vz;
  if (c1 >= c2) return Math.hypot(px - bx, pz - bz);
  const t = c1 / c2;
  return Math.hypot(px - (ax + t * vx), pz - (az + t * vz));
}

/** Min distance from (px,pz) to the polyline in XZ. */
function distToPolyline(
  px: number,
  pz: number,
  poly: { x: number; z: number }[],
): number {
  let d = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const dseg = distToSegment(
      px,
      pz,
      poly[i].x,
      poly[i].z,
      poly[i + 1].x,
      poly[i + 1].z,
    );
    if (dseg < d) d = dseg;
  }
  return d;
}

/**
 * Creates a trail mesh by:
 * 1) Building left/right offset curves at width/2 from the path.
 * 2) Scanning the full terrain mesh and including every vertex whose 2D (XZ)
 *    position lies within those offset curves (distance to path <= width/2).
 * 3) Triangulating via the terrain grid: for each 2x2 cell whose four
 *    corners are in the corridor and whose centroid is inside, emit two triangles.
 * All vertices are from the terrain mesh; heights use the mesh and TRAIL_HEIGHT_OFFSET.
 */
function createTrailGeometry(params: TrailMeshParams): THREE.BufferGeometry {
  const { curve, width, terrainSampler } = params;
  const halfWidth = width / 2;
  const n = Math.max(2, DIST_SAMPLES);

  // 1) Center polyline and left/right offset curves in XZ (game coords).
  //    Left/right are at (pt ± halfWidth * perpendicular). A point is
  //    within the corridor iff distance to center <= width/2.
  const center: { x: number; z: number }[] = [];
  const leftOffset: { x: number; z: number }[] = [];
  const rightOffset: { x: number; z: number }[] = [];

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const pt = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    let tx = tangent.x;
    let tz = tangent.z;
    const len = Math.hypot(tx, tz);
    if (len < 1e-6) {
      tx = 1;
      tz = 0;
    } else {
      tx /= len;
      tz /= len;
    }
    center.push({ x: pt.x, z: pt.z });
    leftOffset.push({ x: pt.x - tz * halfWidth, z: pt.z + tx * halfWidth });
    rightOffset.push({ x: pt.x + tz * halfWidth, z: pt.z - tx * halfWidth });
  }

  // 2) All mesh points within the corridor (distance to path <= width/2).
  //    Store (r,c) so we can use grid connectivity for triangulation.
  const mapPoints = terrainSampler.mapPoints;
  const rows = mapPoints.length;
  const cols = mapPoints[0]?.length ?? 0;
  const included: { p: Point; r: number; c: number }[] = [];
  const coordToIndex = new Map<number, number>(); // key: r*cols+c

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = mapPoints[r][c];
      if (distToPolyline(p.threeX, p.threeZ, center) <= halfWidth) {
        const idx = included.length;
        coordToIndex.set(r * cols + c, idx);
        included.push({ p, r, c });
      }
    }
  }

  if (included.length < 3) {
    const empty = new THREE.BufferGeometry();
    empty.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(0), 3),
    );
    empty.setIndex([]);
    return empty;
  }

  // 3) Triangulate via grid quads: for each 2x2 whose corners are all in the
  //    corridor and whose centroid is inside, emit two triangles.
  const indices: number[] = [];

  for (const { r, c } of included) {
    const i00 = coordToIndex.get(r * cols + c);
    const i01 = coordToIndex.get(r * cols + (c + 1));
    const i10 = coordToIndex.get((r + 1) * cols + c);
    const i11 = coordToIndex.get((r + 1) * cols + (c + 1));

    if (i00 == null || i01 == null || i10 == null || i11 == null) continue;

    const p00 = included[i00].p;
    const p01 = included[i01].p;
    const p10 = included[i10].p;
    const p11 = included[i11].p;
    const cx = (p00.threeX + p01.threeX + p10.threeX + p11.threeX) / 4;
    const cz = (p00.threeZ + p01.threeZ + p10.threeZ + p11.threeZ) / 4;
    if (distToPolyline(cx, cz, center) > halfWidth) continue;

    indices.push(i00, i01, i11, i00, i11, i10);
  }

  const positions = new Float32Array(included.length * 3);
  for (let j = 0; j < included.length; j++) {
    const q = included[j].p;
    positions[3 * j] = q.threeX;
    positions[3 * j + 1] = q.threeY + TRAIL_HEIGHT_OFFSET;
    positions[3 * j + 2] = q.threeZ;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

interface TrailProps {
  csvUrl: string;
  width: number;
  terrainSampler: TerrainSampler;
  color: string;
  onLoad?: () => void;
}

export function Trail({
  csvUrl,
  width,
  terrainSampler,
  color = "#eaffdc",
  onLoad,
}: TrailProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    loadTrailCSV(csvUrl).then((data) => {
      const trailCoordsVect3: THREE.Vector3[] = data.map(({ x, y }) => {
        const point = Point.fromWorldCoords(x, y, 0);
        return new THREE.Vector3(point.threeX, point.threeY, point.threeZ);
      });

      if (trailCoordsVect3.length < 2) return;

      const curve = new THREE.CatmullRomCurve3(trailCoordsVect3, false);
      const trailGeometry = createTrailGeometry({
        curve,
        width: width,
        terrainSampler,
      });
      setGeometry(trailGeometry);
      onLoad?.();
    });
  }, [csvUrl, terrainSampler, width, onLoad]);

  const mat = useMemo(
    () => createClayMaterial({ color, side: THREE.DoubleSide }),
    [color],
  );

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} material={mat} castShadow={false} receiveShadow />
  );
}
