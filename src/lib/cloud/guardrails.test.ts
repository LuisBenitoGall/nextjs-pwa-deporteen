import { describe, expect, it } from 'vitest';
import {
  getCloudUsageLevel,
  getMaxVideoDurationSeconds,
  hasQuotaForUpload,
  isVideoDurationAllowed,
  isVideoSizeAllowed,
  MAX_VIDEO_FILE_BYTES,
} from '@/lib/cloud/guardrails';

describe('cloud guardrails thresholds', () => {
  it('maps usage percentage to correct level', () => {
    expect(getCloudUsageLevel(0)).toBe('ok');
    expect(getCloudUsageLevel(69.99)).toBe('ok');
    expect(getCloudUsageLevel(70)).toBe('info70');
    expect(getCloudUsageLevel(84.99)).toBe('info70');
    expect(getCloudUsageLevel(85)).toBe('warn85');
    expect(getCloudUsageLevel(94.99)).toBe('warn85');
    expect(getCloudUsageLevel(95)).toBe('warn95');
    expect(getCloudUsageLevel(99.9)).toBe('warn95');
    expect(getCloudUsageLevel(100)).toBe('full100');
  });
});

describe('cloud quota guardrail', () => {
  it('blocks upload when quota would be exceeded', () => {
    expect(hasQuotaForUpload(100, 200, 100)).toBe(true);
    expect(hasQuotaForUpload(100, 200, 101)).toBe(false);
  });
});

describe('video limits by size and duration', () => {
  it('enforces max file size', () => {
    expect(isVideoSizeAllowed(MAX_VIDEO_FILE_BYTES)).toBe(true);
    expect(isVideoSizeAllowed(MAX_VIDEO_FILE_BYTES + 1)).toBe(false);
  });

  it('enforces duration according to plan capacity', () => {
    expect(getMaxVideoDurationSeconds(10)).toBe(60);
    expect(getMaxVideoDurationSeconds(50)).toBe(180);
    expect(getMaxVideoDurationSeconds(200)).toBe(600);

    expect(isVideoDurationAllowed(60, 10)).toBe(true);
    expect(isVideoDurationAllowed(61, 10)).toBe(false);

    expect(isVideoDurationAllowed(180, 50)).toBe(true);
    expect(isVideoDurationAllowed(181, 50)).toBe(false);

    expect(isVideoDurationAllowed(600, 200)).toBe(true);
    expect(isVideoDurationAllowed(601, 200)).toBe(false);
  });
});
