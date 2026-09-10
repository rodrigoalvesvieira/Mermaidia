/** Original exploration landform; artistic spatial compression, never a surveyed bathymetry. */
export function seafloorHeight(x: number, z: number, theme: string) {
  const ripple =
    Math.sin(x * 0.24) * Math.cos(z * 0.2) * 0.5 +
    Math.sin(z * 0.55 + x * 0.16) * 0.2;
  if (theme === "ice" || theme === "wreck") return -10.8 + ripple;
  const ridge = (cx: number, cz: number, h: number) =>
    h * Math.exp(-((x - cx) ** 2 / 48 + (z - cz) ** 2 / 85));
  return (
    -10.8 +
    ripple +
    Math.min(1, Math.max(0, (Math.hypot(x, z) - 35) / 25)) *
      (1.4 + 1.1 * Math.sin(x * 0.075) * Math.cos(z * 0.065)) +
    ridge(-17, -18, 5) +
    ridge(17, -20, 5.5) +
    ridge(-3, -34, 6)
  );
}
