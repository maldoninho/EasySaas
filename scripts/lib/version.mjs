export function parseMajor(version) {
  const match = String(version).trim().replace(/^v/u, "").match(/^(\d+)/u);
  return match ? Number(match[1]) : Number.NaN;
}

export function isSupportedNode(version, requiredMajor = 24) {
  return parseMajor(version) === requiredMajor;
}
