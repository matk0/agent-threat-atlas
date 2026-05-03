import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cachePath = path.join(root, "content", "deepl.sk.cache.json");
const generatedAt = new Date().toISOString();
const context =
  "Cybersecurity reference site about agentic AI threats, incidents, controls, security advisories, and prevention guidance. Keep product names, vendor names, CVE IDs, standards, URLs, and code identifiers unchanged.";

const sources = {
  incidents: path.join(root, "content", "incidents.en.ts"),
  threats: path.join(root, "content", "threats.en.ts"),
  playbooks: path.join(root, "content", "playbooks.en.ts"),
  surfaces: path.join(root, "content", "surfaces.en.ts"),
  bestPractices: path.join(root, "content", "bestPractices.en.ts"),
  resources: path.join(root, "content", "resources.en.ts"),
};

const outputs = {
  incidents: path.join(root, "content", "incidents.sk.ts"),
  threats: path.join(root, "content", "threats.sk.ts"),
  playbooks: path.join(root, "content", "playbooks.sk.ts"),
  surfaces: path.join(root, "content", "surfaces.sk.ts"),
  bestPractices: path.join(root, "content", "bestPractices.sk.ts"),
  resources: path.join(root, "content", "resources.sk.ts"),
};

const cache = await loadCache();
const collected = new Set();

const modules = Object.fromEntries(
  Object.entries(sources).map(([name, file]) => [name, loadTsModule(file)]),
);

collectIncidents(modules.incidents.incidents);
collectThreats(modules.threats.threats);
collectPlaybooks(modules.playbooks.playbooks);
collectSurfaces(modules.surfaces.surfaces);
collectBestPractices(modules.bestPractices.bestPractices);
collectResources(modules.resources.resourceGroups);

await translateMissing([...collected]);

await writeGenerated(
  outputs.incidents,
  'import type { Incident } from "./incidents.en";',
  "incidents",
  translateIncidents(modules.incidents.incidents),
  "Incident[]",
);
await writeGenerated(
  outputs.threats,
  'import type { Threat } from "./threats.en";',
  "threats",
  translateThreats(modules.threats.threats),
  "Threat[]",
);
await writeGenerated(
  outputs.playbooks,
  'import type { Playbook } from "./playbooks.en";',
  "playbooks",
  translatePlaybooks(modules.playbooks.playbooks),
  "Playbook[]",
);
await writeGenerated(
  outputs.surfaces,
  'import type { Surface } from "./surfaces.en";',
  "surfaces",
  translateSurfaces(modules.surfaces.surfaces),
  "Surface[]",
);
await writeGenerated(
  outputs.bestPractices,
  "",
  "bestPractices",
  translateBestPractices(modules.bestPractices.bestPractices),
  "Record<string, string[]>",
);
await writeGenerated(
  outputs.resources,
  'import type { ResourceGroup } from "./resources.en";',
  "resourceGroups",
  translateResources(modules.resources.resourceGroups),
  "ResourceGroup[]",
);

await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");

function loadTsModule(file) {
  const source = readSource(file);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  });

  const module = { exports: {} };
  const dirname = path.dirname(file);
  const context = {
    exports: module.exports,
    module,
    require(specifier) {
      if (specifier.startsWith("./")) {
        const resolved = path.resolve(dirname, specifier);
        const filePath = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
        return loadTsModule(filePath);
      }
      if (specifier.startsWith("@/")) {
        const resolved = path.join(root, `${specifier.slice(2)}.ts`);
        return loadTsModule(resolved);
      }
      throw new Error(`Unsupported import ${specifier} in ${file}`);
    },
  };

  vm.runInNewContext(outputText, context, { filename: file });
  return module.exports;
}

function readSource(file) {
  return ts.sys.readFile(file, "utf8") ?? "";
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(cachePath, "utf8"));
  } catch {
    return {};
  }
}

function mark(text) {
  if (typeof text !== "string") return;
  const clean = text.trim();
  if (!clean || !/[A-Za-z]/.test(clean)) return;
  collected.add(clean);
}

function tr(text) {
  if (typeof text !== "string") return text;
  const clean = text.trim();
  if (!clean || !/[A-Za-z]/.test(clean)) return text;
  return cache[cacheKey(clean)]?.text ?? text;
}

function cacheKey(text) {
  return createHash("sha256").update(`EN:SK:${text}`).digest("hex");
}

async function translateMissing(texts) {
  const missing = texts.filter((text) => !cache[cacheKey(text)]);
  if (missing.length === 0) {
    console.log("No missing Slovak translations.");
    return;
  }

  const authKey = process.env.DEEPL_AUTH_KEY;
  if (!authKey) {
    throw new Error("DEEPL_AUTH_KEY is required to generate Slovak translations.");
  }

  const endpoint = authKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  let translated = 0;
  for (const batch of batches(missing)) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${authKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: batch,
        source_lang: "EN",
        target_lang: "SK",
        preserve_formatting: true,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL translation failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const translations = data.translations ?? [];
    if (translations.length !== batch.length) {
      throw new Error(`DeepL returned ${translations.length} translations for ${batch.length} inputs.`);
    }

    for (let i = 0; i < batch.length; i += 1) {
      cache[cacheKey(batch[i])] = {
        source: batch[i],
        text: translations[i].text,
        translatedAt: generatedAt,
      };
    }
    translated += batch.length;
    console.log(`Translated ${translated}/${missing.length}`);
  }
}

function batches(texts) {
  const out = [];
  let batch = [];
  for (const text of texts) {
    const next = [...batch, text];
    if (next.length > 50 || Buffer.byteLength(JSON.stringify({ text: next })) > 120 * 1024) {
      out.push(batch);
      batch = [text];
    } else {
      batch = next;
    }
  }
  if (batch.length > 0) out.push(batch);
  return out;
}

function collectIncidents(incidents) {
  for (const incident of incidents) {
    mark(incident.headline);
    mark(incident.summary);
    mark(incident.preventionNote);
  }
}

function translateIncidents(incidents) {
  return incidents.map((incident) => ({
    ...incident,
    headline: tr(incident.headline),
    summary: tr(incident.summary),
    preventionNote: tr(incident.preventionNote),
  }));
}

function collectThreats(threats) {
  for (const threat of threats) {
    mark(threat.title);
    mark(threat.short);
    mark(threat.summary);
    threat.whatItIs.forEach(mark);
    threat.howItHappens.forEach((item) => {
      mark(item.title);
      mark(item.body);
    });
    threat.realWorld.forEach((item) => mark(item.note));
    threat.mitigations.forEach((item) => {
      mark(item.title);
      mark(item.body);
    });
  }
}

function translateThreats(threats) {
  return threats.map((threat) => ({
    ...threat,
    title: tr(threat.title),
    short: tr(threat.short),
    summary: tr(threat.summary),
    whatItIs: threat.whatItIs.map(tr),
    howItHappens: threat.howItHappens.map((item) => ({
      ...item,
      title: tr(item.title),
      body: tr(item.body),
    })),
    realWorld: threat.realWorld.map((item) => ({
      ...item,
      note: tr(item.note),
    })),
    mitigations: threat.mitigations.map((item) => ({
      ...item,
      title: tr(item.title),
      body: tr(item.body),
    })),
  }));
}

function collectPlaybooks(playbooks) {
  for (const playbook of playbooks) {
    mark(playbook.title);
    mark(playbook.short);
    mark(playbook.audience);
    mark(playbook.summary);
    playbook.sections.forEach((section) => {
      mark(section.title);
      mark(section.intro);
      section.items.forEach(mark);
    });
  }
}

function translatePlaybooks(playbooks) {
  return playbooks.map((playbook) => ({
    ...playbook,
    title: tr(playbook.title),
    short: tr(playbook.short),
    audience: tr(playbook.audience),
    summary: tr(playbook.summary),
    sections: playbook.sections.map((section) => ({
      ...section,
      title: tr(section.title),
      intro: tr(section.intro),
      items: section.items.map(tr),
    })),
  }));
}

function collectSurfaces(surfaces) {
  for (const surface of surfaces) {
    mark(surface.title);
    mark(surface.short);
    mark(surface.role);
    surface.mitigations.forEach(mark);
  }
}

function translateSurfaces(surfaces) {
  return surfaces.map((surface) => ({
    ...surface,
    title: tr(surface.title),
    short: tr(surface.short),
    role: tr(surface.role),
    mitigations: surface.mitigations.map(tr),
  }));
}

function collectBestPractices(practices) {
  Object.values(practices).flat().forEach(mark);
}

function translateBestPractices(practices) {
  return Object.fromEntries(
    Object.entries(practices).map(([slug, items]) => [slug, items.map(tr)]),
  );
}

function collectResources(groups) {
  for (const group of groups) {
    mark(group.title);
    mark(group.intro);
    group.items.forEach((item) => {
      mark(item.name);
      mark(item.note);
    });
  }
}

function translateResources(groups) {
  return groups.map((group) => ({
    ...group,
    title: tr(group.title),
    intro: tr(group.intro),
    items: group.items.map((item) => ({
      ...item,
      name: tr(item.name),
      note: tr(item.note),
    })),
  }));
}

async function writeGenerated(file, importLine, exportName, data, typeName) {
  await mkdir(path.dirname(file), { recursive: true });
  const header = [
    importLine,
    "",
    `// Auto-generated by scripts/translate-content.mjs at ${generatedAt}.`,
    "// Slovak localization. UI label: Prevencia.",
    `export const ${exportName}: ${typeName} = ${JSON.stringify(data, null, 2)};`,
    "",
  ]
    .filter((line, index) => line || index !== 0)
    .join("\n");
  await writeFile(file, header, "utf8");
}
