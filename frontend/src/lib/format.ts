export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

export function formatDuration(startedAt: string, endedAt: string): string {
  const minutes = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000;
  return formatMinutes(minutes);
}
