// A simple 2D simplex-style noise generator for hand-sculpted wobble
// Using a deterministic hash to keep the "sculpt" consistent

export function simplex2d(x: number, y: number): number {
  const dot = (a: [number, number], b: [number, number]) => a[0] * b[0] + a[1] * b[1];

  const hash = (p: [number, number]) => {
    const p2 = [
      dot(p, [127.1, 311.7]),
      dot(p, [269.5, 183.3])
    ];
    return [
      Math.sin(p2[0]) * 43758.5453123 - Math.floor(Math.sin(p2[0]) * 43758.5453123),
      Math.sin(p2[1]) * 43758.5453123 - Math.floor(Math.sin(p2[1]) * 43758.5453123)
    ];
  };

  const noise = (p: [number, number]) => {
    const i = [Math.floor(p[0]), Math.floor(p[1])];
    const f = [p[0] - i[0], p[1] - i[1]];

    const u = [
      f[0] * f[0] * (3.0 - 2.0 * f[0]),
      f[1] * f[1] * (3.0 - 2.0 * f[1])
    ];

    const a = hash([i[0], i[1]]);
    const b = hash([i[0] + 1, i[1]]);
    const c = hash([i[0], i[1] + 1]);
    const d = hash([i[0] + 1, i[1] + 1]);

    const res = (1.0 - u[0]) * (a[0] * (1.0 - u[1]) + c[0] * u[1]) +
                u[0] * (b[0] * (1.0 - u[1]) + d[0] * u[1]);
    
    return res * 2.0 - 1.0;
  };

  return noise([x, y]);
}
