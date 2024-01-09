import { dirname, resolve } from "path";
import { existsSync, readFileSync, statSync } from "fs";
import ts from "typescript";
import {
  CAPTURED_PROPS_IFACE_NAME,
  CLIENT_API_IFACE_NAME,
  INFRA_API_IFACE_NAME,
  PLUTO_BASE_PKG,
} from "../constants";

export function methodBelongsToClientApi(
  callExpression: ts.CallExpression,
  typeChecker: ts.TypeChecker
): boolean {
  return methodBelongsToIface(callExpression, typeChecker, PLUTO_BASE_PKG, CLIENT_API_IFACE_NAME);
}

export function methodBelongsToInfraApi(
  callExpression: ts.CallExpression,
  typeChecker: ts.TypeChecker
): boolean {
  return methodBelongsToIface(callExpression, typeChecker, PLUTO_BASE_PKG, INFRA_API_IFACE_NAME);
}

export function propBelongsToCapturedProps(
  propAccessExpression: ts.PropertyAccessExpression,
  typeChecker: ts.TypeChecker
): boolean {
  return propBelongsToIface(
    propAccessExpression,
    typeChecker,
    PLUTO_BASE_PKG,
    CAPTURED_PROPS_IFACE_NAME
  );
}

/**
 * Checks if the given call expression belongs to a specified interface.
 *
 * @param {ts.CallExpression} callExpression - The call expression node representing the method invocation.
 * @param {ts.TypeChecker} typeChecker - The type checker instance used to resolve types and symbols.
 * @param {string} targetIfaceName - The name of the target interface to check against.
 * @returns {boolean} - True if the method belongs to the target interface, false otherwise.
 */
function methodBelongsToIface(
  callExpression: ts.CallExpression,
  typeChecker: ts.TypeChecker,
  targetPkgName: string,
  targetIfaceName: string
): boolean {
  // Resolve the call signature from the call expression.
  const signature = typeChecker.getResolvedSignature(callExpression);
  if (!signature) {
    return false;
  }

  // Get the declaration of the given call expression.
  const declaration = signature.getDeclaration();
  if (!declaration) {
    return false;
  }
  return declarationBelongsToIface(declaration, typeChecker, targetPkgName, targetIfaceName);
}

/**
 * Checks if the given property access expression belongs to a specified interface.
 *
 * @param {ts.PropertyAccessExpression} propAccessExpression - The property access expression node representing the method invocation.
 * @param {ts.TypeChecker} typeChecker - The type checker instance used to resolve types and symbols.
 * @param {string} targetIfaceName - The name of the target interface to check against.
 * @returns {boolean} - True if the method belongs to the target interface, false otherwise.
 */
function propBelongsToIface(
  propAccessExpression: ts.PropertyAccessExpression,
  typeChecker: ts.TypeChecker,
  targetPkgName: string,
  targetIfaceName: string
): boolean {
  const symbol = typeChecker.getSymbolAtLocation(propAccessExpression);
  const declarations = symbol?.declarations;
  if (!declarations || declarations.length === 0) {
    return false;
  }

  if (declarations.length > 1) {
    throw new Error(
      `The property '${propAccessExpression.getText()}' has multiple declarations. We are unable to handle this situation.`
    );
  }

  return declarationBelongsToIface(declarations[0], typeChecker, targetPkgName, targetIfaceName);
}

function declarationBelongsToIface(
  declaration: ts.Declaration,
  typeChecker: ts.TypeChecker,
  targetPkgName: string,
  targetIfaceName: string
): boolean {
  if (
    !ts.isClassDeclaration(declaration.parent) &&
    !ts.isInterfaceDeclaration(declaration.parent)
  ) {
    return false;
  }

  // Recursively inspect the type inheritance chain to determine whether the target interface exists within it.
  const typeChain: ts.Type[] = [];
  typeChain.push(typeChecker.getTypeAtLocation(declaration.parent));
  let belongsToTargetIface = false;
  while (typeChain.length > 0) {
    const currentType = typeChain.pop()!;
    if (!currentType.isClassOrInterface()) {
      continue;
    }

    const symbol = currentType.getSymbol();
    if (symbol && symbol.name === targetIfaceName && isSymbolFromPackage(symbol, targetPkgName)) {
      belongsToTargetIface = true;
      break;
    }

    const baseTypes = typeChecker.getBaseTypes(currentType);
    typeChain.push(...baseTypes);
  }
  return belongsToTargetIface;
}

/**
 * Check if a symbol comes from a specific package.
 *
 * @param {ts.Symbol} symbol - The symbol to check.
 * @param {string} packageName - The name of the package to check against.
 * @returns {boolean} - True if the symbol is from the package, false otherwise.
 */
function isSymbolFromPackage(symbol: ts.Symbol, packageName: string): boolean {
  // Get the declaration(s) of the symbol
  const declarations = symbol.getDeclarations();

  // If there are no declarations available, the symbol does not belong to any package
  if (!declarations || declarations.length === 0) {
    return false;
  }

  // Check each declaration to see if any come from the target package
  for (const declaration of declarations) {
    const sourceFile = declaration.getSourceFile();
    const filepath = sourceFile.fileName;
    if (packageName === findPackageName(filepath)) {
      return true;
    }
  }
  // The symbol does not come from the target package
  return false;
}

function findPackageName(filepath: string): string | undefined {
  let dirpath = filepath;
  if (statSync(dirpath).isFile()) {
    dirpath = dirname(dirpath);
  }

  let packageName: string | undefined;
  while (dirpath.length >= 1) {
    const pkgJsonPath = resolve(dirpath, "package.json");
    if (existsSync(pkgJsonPath)) {
      const pkgJsonContent = readFileSync(pkgJsonPath).toString();
      const pkgJsonData = JSON.parse(pkgJsonContent);
      packageName = pkgJsonData["name"];
      break;
    }
    dirpath = dirname(dirpath);
  }
  return packageName;
}
