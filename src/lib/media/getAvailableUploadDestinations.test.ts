import { describe, expect, it } from 'vitest';
import {
  getAvailableUploadDestinations,
  shouldPromptUploadBatchDestination,
} from './getAvailableUploadDestinations';

describe('getAvailableUploadDestinations', () => {
  it('siempre incluye local', () => {
    expect(
      getAvailableUploadDestinations({
        driveAvailable: false,
        driveStatus: 'disconnected',
        r2Active: false,
      })
    ).toEqual(['local']);
  });

  it('incluye drive solo con driveAvailable y connected', () => {
    expect(
      getAvailableUploadDestinations({
        driveAvailable: true,
        driveStatus: 'connected',
        r2Active: false,
      })
    ).toEqual(['local', 'drive']);

    expect(
      getAvailableUploadDestinations({
        driveAvailable: true,
        driveStatus: 'reconnect-required',
        r2Active: false,
      })
    ).toEqual(['local']);

    expect(
      getAvailableUploadDestinations({
        driveAvailable: false,
        driveStatus: 'connected',
        r2Active: false,
      })
    ).toEqual(['local']);
  });

  it('incluye r2 solo cuando r2Active', () => {
    expect(
      getAvailableUploadDestinations({
        driveAvailable: false,
        driveStatus: 'disconnected',
        r2Active: true,
      })
    ).toEqual(['local', 'r2']);
  });

  it('puede devolver las tres opciones', () => {
    expect(
      getAvailableUploadDestinations({
        driveAvailable: true,
        driveStatus: 'connected',
        r2Active: true,
      })
    ).toEqual(['local', 'drive', 'r2']);
  });
});

describe('shouldPromptUploadBatchDestination', () => {
  it('no pide modal con una sola opción', () => {
    expect(shouldPromptUploadBatchDestination(['local'])).toBe(false);
  });

  it('pide modal con dos o más opciones', () => {
    expect(shouldPromptUploadBatchDestination(['local', 'drive'])).toBe(true);
    expect(shouldPromptUploadBatchDestination(['local', 'drive', 'r2'])).toBe(true);
  });
});
