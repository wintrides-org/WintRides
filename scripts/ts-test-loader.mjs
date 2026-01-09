import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const projectRoot = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs"]);

function resolveWithExtensions(basePath) {
  const extension = path.extname(basePath);
  if (extension && fs.existsSync(basePath)) {
    return basePath;
  }

  for (const ext of sourceExtensions) {
    const candidate = `${basePath}${ext}`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const ext of sourceExtensions) {
    const candidate = path.join(basePath, `index${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier === "next/server") {
    return defaultResolve("next/server.js", context, defaultResolve);
  }
  if (specifier.startsWith("@/")) {
    const resolvedPath = resolveWithExtensions(
      path.resolve(projectRoot, specifier.slice(2))
    );
    if (resolvedPath) {
      return {
        url: pathToFileURL(resolvedPath).href,
        shortCircuit: true
      };
    }
  }

  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const parentDir = context.parentURL
      ? path.dirname(fileURLToPath(context.parentURL))
      : projectRoot;
    const resolvedPath = resolveWithExtensions(
      path.resolve(parentDir, specifier)
    );
    if (resolvedPath) {
      return {
        url: pathToFileURL(resolvedPath).href,
        shortCircuit: true
      };
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (!url.startsWith("file://")) {
    return defaultLoad(url, context, defaultLoad);
  }

  const filePath = fileURLToPath(url);
  const ext = path.extname(filePath);
  if (sourceExtensions.has(ext) && (ext === ".ts" || ext === ".tsx" || ext === ".mts")) {
    const source = fs.readFileSync(filePath, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true
      }
    });

    return {
      format: "module",
      source: output.outputText,
      shortCircuit: true
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
