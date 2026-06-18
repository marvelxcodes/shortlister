export function formatScore(score: number, digits = 1) {
  return (score * 100).toFixed(digits);
}

export function formatPercent(p: number, digits = 1) {
  return `${p.toFixed(digits)}%`;
}

export function formatDelta(delta: number) {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

const palette = [
  ["#ede9ff", "#5b3df0"],
  ["#ddf5f0", "#0d8f7e"],
  ["#fff1d6", "#b97a07"],
  ["#ffe1ea", "#c83363"],
  ["#e1ecff", "#2954c8"],
  ["#eafff0", "#137a3f"],
];

export function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length] as [string, string];
}
