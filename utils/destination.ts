export function extractCountry(destination: string): string {
  const parts = destination.split(',').map((s) => s.trim());
  return parts[parts.length - 1] || destination;
}
