import Link from 'next/link';

export default function PlayerNotFound() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Deportista no encontrado</h1>
      <p className="text-gray-600">Puede que no exista o no tengas permisos.</p>
      <div className="mt-4">
        <Link href="/dashboard" className="text-green-700 underline">
          Volver a Mi Panel
        </Link>
      </div>
    </div>
  );
}
