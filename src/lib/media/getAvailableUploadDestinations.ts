/** Destinos posibles al subir un lote de archivos desde el partido (live/edición). */
export type UploadBatchDestination = 'local' | 'drive' | 'r2';

export type UploadDestinationAvailability = {
  /** OAuth de Google Drive configurado en servidor (`/api/storage/provider`). */
  driveAvailable: boolean;
  driveStatus: 'connected' | 'reconnect-required' | 'disconnected';
  /** Suscripción R2 activa con cuota (`r2Active` del hook). */
  r2Active: boolean;
};

/**
 * Lista destinos operativos para un lote de subida.
 * - `local`: siempre
 * - `drive`: solo si Drive está configurado y la cuenta del usuario conectada
 * - `r2`: solo si hay suscripción de almacenamiento remoto activa
 */
export function getAvailableUploadDestinations(
  input: UploadDestinationAvailability
): UploadBatchDestination[] {
  const destinations: UploadBatchDestination[] = ['local'];

  if (input.driveAvailable && input.driveStatus === 'connected') {
    destinations.push('drive');
  }
  if (input.r2Active) {
    destinations.push('r2');
  }

  return destinations;
}

/** Si hay una sola opción, no hace falta modal de elección. */
export function shouldPromptUploadBatchDestination(
  destinations: UploadBatchDestination[]
): boolean {
  return destinations.length >= 2;
}
