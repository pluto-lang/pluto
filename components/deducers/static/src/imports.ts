import ts from "typescript";

/**
 * Cases:
 *  1. import { element } from "library";  // Named import
 *  2. import element, { another } from "library";  // Named import + Default import
 *  3. import * as lib from "library";  // Namespace import
 *  4. import "library";  // No import clause => Direct import
 *  5. import library from "library";  // Default import
 *  6. import { } from "library";  // Named import
 */
export enum ImportType {
  Named,
  Namespace,
  Default,
  Direct,
}

export interface ImportElement {
  type: ImportType;
  name: string;
  package: string;
}

export class ImportStore {
  // TODO: change to a more efficient data structure.
  private elements: ImportElement[];

  constructor(elements?: ImportElement[]) {
    this.elements = elements ?? [];
  }

  public update(elems: ImportElement[]) {
    this.elements.push(...elems);
  }

  public searchElement(target: string): ImportElement | undefined {
    for (const element of this.elements) {
      if (element.name == target) {
        return element;
      }
    }
    return;
  }

  public listAllElementsByType(type: ImportType): ImportElement[] {
    return this.elements.filter((e) => e.type == type);
  }
}

/**
 * Extract all import elements from one import statement for every type.
 */
export function extractImportElements(
  sourceFile: ts.SourceFile,
  importStat: ts.ImportDeclaration
): ImportElement[] {
  const pkgName = importStat.moduleSpecifier.getText(sourceFile).replaceAll(/(^"|"$)/g, "");
  // For type 4, such as `import "fs"`
  if (importStat.importClause == undefined) {
    return [{ type: ImportType.Direct, name: "", package: pkgName }];
  }

  const elements: ImportElement[] = [];
  // For type 2, such as `import def, { element } from "library"`,
  // or type 5, such as `import def from "library"`
  if (importStat.importClause.name) {
    const elemName = importStat.importClause.name.escapedText.toString();
    elements.push({ type: ImportType.Default, name: elemName, package: pkgName });
  }

  // For type 5
  if (importStat.importClause.namedBindings == undefined) {
    return elements;
  }

  if (ts.isNamedImports(importStat.importClause.namedBindings)) {
    // For type 2, type 1, such as `import { element } from "library"`,
    // or type 6, such as `import { } from "library"`
    importStat.importClause.namedBindings.elements.forEach((elem) => {
      const elemName = elem.name.escapedText.toString();
      elements.push({ type: ImportType.Named, name: elemName, package: pkgName });
    });
  } else if (ts.isNamespaceImport(importStat.importClause.namedBindings)) {
    // For type 2 or type 3, such as `import * as path from "path"`
    const elemName = importStat.importClause.namedBindings.name.escapedText.toString();
    elements.push({ type: ImportType.Namespace, name: elemName, package: pkgName });
  } else {
    throw new Error(
      `Something error, niether named import nor namesapce import: ${importStat.getText(
        sourceFile
      )}`
    );
  }
  return elements;
}

export function genImportStats(depElems: ImportElement[]): string[] {
  const stats: string[] = [];
  for (const elem of depElems) {
    switch (elem.type) {
      case ImportType.Direct:
        stats.push(`import "${elem.package}";`);
        break;
      case ImportType.Default:
        stats.push(`import ${elem.name} from "${elem.package}";`);
        break;
      case ImportType.Named:
        stats.push(`import { ${elem.name} } from "${elem.package}";`);
        break;
      case ImportType.Namespace:
        stats.push(`import * as ${elem.name} from "${elem.package}";`);
        break;
      default:
        throw new Error(`Invalid import type: ${elem.type}.`);
    }
  }
  return stats;
}

const importStoreCache = new Map<string, ImportStore>();
export function buildImportStore(sourceFile: ts.SourceFile): ImportStore {
  const filename = sourceFile.fileName;
  if (importStoreCache.has(filename)) {
    return importStoreCache.get(filename)!;
  }

  const store = new ImportStore();
  const importStats = sourceFile.statements
    .filter(ts.isImportDeclaration)
    .flatMap((stmt) => extractImportElements(sourceFile, stmt));
  store.update(importStats);
  importStoreCache.set(filename, store);
  return store;
}
