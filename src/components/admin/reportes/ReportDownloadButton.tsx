'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ReportDownloadButton({
  endpoint,
  label,
}: {
  endpoint: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Error al generar el reporte');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = endpoint.split('/').pop() ?? 'reporte';
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar el reporte');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="border-slate-600 text-slate-300 hover:text-white"
    >
      <Download className="mr-2 h-3.5 w-3.5" />
      {loading ? 'Generando…' : label}
    </Button>
  );
}
