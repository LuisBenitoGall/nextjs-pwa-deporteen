export type DriveAvailability = { available: true; src: string } | { available: false; reason: string };

export async function resolveDriveMediaSource(fileId: string): Promise<DriveAvailability> {
  const checkRes = await fetch(`/api/google/drive/file/${encodeURIComponent(fileId)}?check=1`, {
    cache: 'no-store',
  });
  if (!checkRes.ok) {
    return { available: false, reason: `drive:${checkRes.status}` };
  }
  return {
    available: true,
    src: `/api/google/drive/file/${encodeURIComponent(fileId)}`,
  };
}
