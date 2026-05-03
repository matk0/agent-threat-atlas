import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", ".bin", "next");

const builds = [
  { locale: "en", env: { SITE_LOCALE: "en" }, output: "dist/en" },
  { locale: "sk", env: { SITE_LOCALE: "sk" }, output: "dist/sk" },
];

await rm(path.join(root, "dist"), { force: true, recursive: true });

for (const build of builds) {
  await rm(path.join(root, ".next"), { force: true, recursive: true });
  await rm(path.join(root, "out"), { force: true, recursive: true });

  const result = spawnSync(nextBin, ["build"], {
    cwd: root,
    env: {
      ...process.env,
      ...build.env,
    },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  await cp(path.join(root, "out"), path.join(root, build.output), {
    recursive: true,
  });
}

await rm(path.join(root, "out"), { force: true, recursive: true });
