#!/usr/bin/env node
/**
 * Emite líneas export PG* desde SUPABASE_DB_URL sin imprimir secretos en stderr.
 * La contraseña puede contener '/' y '@'; se separa host con el último '@'.
 */
import { writeFileSync } from "node:fs";

const raw = process.env.SUPABASE_DB_URL;
if (!raw) {
  console.error("SUPABASE_DB_URL no definida");
  process.exit(1);
}

const prefix = "postgresql://";
if (!raw.startsWith(prefix)) {
  console.error("SUPABASE_DB_URL debe usar esquema postgresql://");
  process.exit(1);
}

const withoutScheme = raw.slice(prefix.length);
const at = withoutScheme.lastIndexOf("@");
if (at === -1) {
  console.error("SUPABASE_DB_URL inválida (sin @)");
  process.exit(1);
}

const userInfo = withoutScheme.slice(0, at);
const hostInfo = withoutScheme.slice(at + 1);
const colon = userInfo.indexOf(":");
if (colon === -1) {
  console.error("SUPABASE_DB_URL inválida (sin usuario/contraseña)");
  process.exit(1);
}

const user = userInfo.slice(0, colon);
const password = userInfo.slice(colon + 1);

const slash = hostInfo.indexOf("/");
if (slash === -1) {
  console.error("SUPABASE_DB_URL inválida (sin base de datos)");
  process.exit(1);
}

const hostPort = hostInfo.slice(0, slash);
const database = hostInfo.slice(slash + 1).split("?")[0];

const portColon = hostPort.lastIndexOf(":");
const host = portColon === -1 ? hostPort : hostPort.slice(0, portColon);
const port = portColon === -1 ? "5432" : hostPort.slice(portColon + 1);

const outPath = process.argv[2];
const lines = [
  `PGHOST=${host}`,
  `PGPORT=${port}`,
  `PGUSER=${user}`,
  `PGDATABASE=${database}`,
  `PGPASSWORD=${password}`,
  "PGSSLMODE=require",
];

if (outPath) {
  writeFileSync(outPath, lines.join("\n") + "\n", { mode: 0o600 });
} else {
  for (const line of lines) {
    if (line.startsWith("PGPASSWORD=")) {
      console.log("PGPASSWORD=***");
    } else {
      console.log(line);
    }
  }
}
