'use client';

import { useEffect } from 'react';
import { bindMediaSyncOnOnline } from '@/lib/mediaSync';

export default function MediaSyncBootstrap() {
  useEffect(() => {
    bindMediaSyncOnOnline();
  }, []);
  return null;
}
