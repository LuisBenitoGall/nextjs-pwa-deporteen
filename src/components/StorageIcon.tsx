import type { ComponentType } from 'react';
import { HardDrive, FolderOpen, Cloud } from 'lucide-react';

export type StorageKind = 'local' | 'drive' | 'r2' | 'cloud';

export function storageKindFromPath(storagePath: string | null): StorageKind {
  if (storagePath?.startsWith('drive:')) return 'drive';
  if (storagePath?.startsWith('r2:')) return 'r2';
  if (!storagePath) return 'local';
  return 'cloud';
}

const CONFIG: Record<StorageKind, {
  Icon: ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  bgColor: string;
  label: string;
}> = {
  local: { Icon: HardDrive,   iconColor: 'text-gray-500',   bgColor: 'bg-gray-600',   label: 'Local' },
  drive: { Icon: FolderOpen,  iconColor: 'text-blue-500',   bgColor: 'bg-blue-600',   label: 'Google Drive' },
  r2:    { Icon: Cloud,       iconColor: 'text-indigo-500', bgColor: 'bg-indigo-600', label: 'Nube Deporteen' },
  cloud: { Icon: Cloud,       iconColor: 'text-gray-400',   bgColor: 'bg-gray-500',   label: 'Nube' },
};

/** Inline coloured icon — use next to provider name in account settings */
export function StorageIcon({ kind, size = 18 }: { kind: string; size?: number }) {
  const config = CONFIG[kind as StorageKind] ?? CONFIG.cloud;
  const { Icon, iconColor } = config;
  return <Icon size={size} className={`shrink-0 ${iconColor}`} aria-hidden />;
}

/** Small coloured badge for gallery thumbnail overlays */
export function StorageBadge({ storagePath }: { storagePath: string | null }) {
  const kind = storageKindFromPath(storagePath);
  const { Icon, bgColor, label } = CONFIG[kind];
  return (
    <span
      className={`inline-flex items-center justify-center rounded p-1 ${bgColor}`}
      title={label}
      aria-label={label}
    >
      <Icon size={12} className="text-white" aria-hidden />
    </span>
  );
}
