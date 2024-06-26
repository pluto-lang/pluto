import { DeclarationType } from "pyright-internal/dist/analyzer/declaration";
import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import { ClassType, Type, TypeCategory } from "pyright-internal/dist/analyzer/types";
import {
  CallNode,
  ClassNode,
  ExpressionNode,
  FunctionNode,
  LambdaNode,
  NameNode,
  ParseNode,
  ParseNodeType,
} from "pyright-internal/dist/parser/parseNodes";

/**
 * Check if the type is a subclass of the target type.
 * @param type - The type we want to check.
 * @param targetTypeFullName - The full name of the target type.
 * @returns True if the type is a subclass of the target type, otherwise false.
 */
export function isSubclassOf(type: Type, targetTypeFullName: string): type is ClassType {
  // If the type is unknown, we cannot determine if it is a subclass of the target class. So, we
  // print a warning and return false.
  if (type.category === TypeCategory.Unknown) {
    console.warn("There is an unknown type.");
    return false;
  }

  // If the type is not a class, it cannot extend the target class.
  if (type.category !== TypeCategory.Class) {
    return false;
  }

  // Maybe the type itself is the target class.
  if (type.details.fullName === targetTypeFullName) {
    return true;
  }

  // Iterate through the class hierarchy to find if there is the target class.
  for (const baseClass of type.details.mro) {
    if (
      baseClass.category === TypeCategory.Class &&
      baseClass.details.fullName === targetTypeFullName
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a method within a class belongs to the target type. If the class containing the method
 * directly is a subclass of the target type, then the method is recognized as belonging to the
 * type,  and we refer to it as a special method.
 *
 * @param methodName - The name of method we want to check.
 * @param type - The class type that contains the method.
 * @param targetTypeFullName - The full name of the target type.
 * @returns True if the method belongs to the target type, otherwise false.
 */
export function doesMethodBelongTo(
  methodName: string,
  type: ClassType,
  targetTypeFullName: string
): boolean {
  // Iterate through the class hierarchy, including the class itself, to identify the class that
  // owns the method, and check if it is a subclass of the target type. The mro we use is a list of
  // classes that the class is derived from, the first element is the class itself. And when calling
  // a method of a class, the order of the mro (method resolution order) is used to determine which
  // method to call if there are multiple methods with the same name.
  for (const klass of type.details.mro) {
    if (klass.category !== TypeCategory.Class) {
      continue;
    }

    const classDecl = klass.details.declaration;
    if (!classDecl || classDecl.type !== DeclarationType.Class) {
      // If the class declaration is not found, or the declaration is not a
      // class, we skip it. Because the method is impossible to be in a
      // SpecialBuiltInClass.
      continue;
    }

    // If this class contains the target method and it is a subclass of the
    // target class, we return true.
    if (containsMethod(classDecl.node, methodName) && isSubclassOf(klass, targetTypeFullName)) {
      return true;
    }
  }
  return false;
}

function containsMethod(classNode: ClassNode, methodName: string): boolean {
  class TreeWalker extends ParseTreeWalker {
    private _found = false;

    constructor(private readonly targetMethodName: string) {
      super();
    }

    get found(): boolean {
      return this._found;
    }

    public override visitFunction(node: FunctionNode): boolean {
      if (node.name.value === this.targetMethodName) {
        this._found = true;
      }
      return !this._found;
    }
  }

  const walker = new TreeWalker(methodName);
  walker.walk(classNode);
  return walker.found;
}

export function isFunctionVar(node: ExpressionNode, typeEvaluator: TypeEvaluator) {
  const valueNodeType = typeEvaluator.getType(node);
  return valueNodeType?.category === TypeCategory.Function;
}

export function isLambdaNode(node: ParseNode): node is LambdaNode {
  return node.nodeType === ParseNodeType.Lambda;
}

export function getTypeName(type: Type): string {
  switch (type.category) {
    case TypeCategory.Class:
      return `class ${type.details.fullName}`;
    case TypeCategory.Function:
      return "function";
    case TypeCategory.Module:
      return "module";
    case TypeCategory.OverloadedFunction:
      return "overloaded function";
    case TypeCategory.Union:
      return "union";
    case TypeCategory.Unknown:
      return "unknown";
    case TypeCategory.Never:
      return "never";
    case TypeCategory.Any:
      return "any";
    case TypeCategory.TypeVar:
      return "type var";
    case TypeCategory.Unbound:
      return "unbound";
  }
}

/**
 * Checks whether the specified expression node denotes access to an environment variable. Examples
 * include os.environ["key"] or os.environ.get("key").
 *
 * @param node - The expression node to check.
 * @param checker - The type evaluator used for type checking.
 * @returns `true` if the expression node represents an environment variable access, `false`
 * otherwise.
 */
export function isEnvVarAccess(node: ExpressionNode, checker: TypeEvaluator) {
  if (node.nodeType === ParseNodeType.Index) {
    // This is the case of `os.environ["key"]`.
    return (
      node.baseExpression.nodeType === ParseNodeType.MemberAccess &&
      node.baseExpression.leftExpression.nodeType === ParseNodeType.Name &&
      isOSModuleReference(node.baseExpression.leftExpression, checker) &&
      node.baseExpression.memberName.value === "environ"
    );
  }

  if (node.nodeType === ParseNodeType.Call) {
    // This is the case of `os.environ.get("key")`.
    const funcExpression = node.leftExpression;
    if (funcExpression.nodeType !== ParseNodeType.MemberAccess) {
      // The left expression should be a member access.
      return false;
    }

    const leftExpression = funcExpression.leftExpression;
    const memberName = funcExpression.memberName;
    return (
      leftExpression.nodeType === ParseNodeType.MemberAccess &&
      leftExpression.leftExpression.nodeType === ParseNodeType.Name &&
      isOSModuleReference(leftExpression.leftExpression, checker) &&
      leftExpression.memberName.value === "environ" &&
      memberName.value === "get"
    );
  }
  return false;
}

/**
 * Checks if the given node is a reference to the "os" module.
 *
 * @param node - The node to check.
 * @param checker - The type evaluator to use.
 * @returns `true` if the node is a reference to the "os" module, `false` otherwise.
 */
function isOSModuleReference(node: NameNode, checker: TypeEvaluator): boolean {
  const type = checker.getType(node);
  return type !== undefined && type.category === TypeCategory.Module && type.moduleName === "os";
}

export function isDataClassConstructor(node: CallNode, checker: TypeEvaluator) {
  const valueType = checker.getType(node.leftExpression);
  return valueType && valueType.category === TypeCategory.Class && ClassType.isDataClass(valueType);
}
