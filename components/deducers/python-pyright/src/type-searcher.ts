import { CallNode } from "pyright-internal/dist/parser/parseNodes";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import { TypeEvaluator } from "pyright-internal/dist/analyzer/typeEvaluatorTypes";
import { ClassType, FunctionType, TypeCategory } from "pyright-internal/dist/analyzer/types";
import * as TextUtils from "./text-utils";
import * as TypeUtils from "./type-utils";
import * as TypeConsts from "./type-consts";
import { SpecialNodeMap } from "./special-node-map";

/**
 * This class is responsible for searching for special types usage in the parse tree of one source
 * file. It will search all the call nodes that are constructing a resource object or calling a
 * special method of a resource object.
 */
export class TypeSearcher extends ParseTreeWalker {
  private readonly _specialNodeMap: SpecialNodeMap<CallNode> = new SpecialNodeMap();

  constructor(
    private readonly typeEvaluator: TypeEvaluator,
    private readonly sourceFile: SourceFile
  ) {
    super();
  }

  get specialNodeMap() {
    return this._specialNodeMap;
  }

  public override visitCall(node: CallNode): boolean {
    // Pyright's TypeEvaluator is powerful to figuring out the types of function calls. It breaks
    // down into two main scenarios:
    //
    // 1. Function calls - This includes both regular functions and class methods. The TypeEvaluator
    //    can determine the final type of the calling, be it a function or a method, along with the
    //    type of the object it's acting on.
    //
    // 2. Constructor calls - When you're creating a new instance with a class constructor, the
    //    TypeEvaluator can determine the type of the object being constructed.
    const nodeText = TextUtils.getTextOfNode(node, this.sourceFile);

    const funcType = this.typeEvaluator.getType(node.leftExpression);
    if (funcType === undefined) {
      throw new Error(
        `Cannot determine the type of the left expression of the call node '${nodeText}'.`
      );
    }

    // If the function type is overloaded, we only need to check the first overload since all
    // overloads should be within the same class.
    const type =
      funcType.category === TypeCategory.OverloadedFunction ? funcType.overloads[0] : funcType;
    switch (type.category) {
      case TypeCategory.Any:
      case TypeCategory.Unknown:
      case TypeCategory.Union:
        // We can't determine the type of the left expression, so we'll skip it. We won't throw an
        // error here because it's possible that this expression isn't related to special types. In
        // the next step, we'll check if the resource object is assigned to a variable that isn't a
        // special type, like UnionType. If it is, we'll throw an error at that point.
        console.warn(
          `The type of the left expression of the call node '${nodeText}' is Any, Unknown or Union. We skip it.`
        );
        break;
      case TypeCategory.Function:
        this.validateFunctionCall(node, type);
        break;
      case TypeCategory.Class:
        this.validateClassCall(node, type);
        break;
      default:
        throw new Error(`Unexpected type category: ${type.category}, ${nodeText}`);
    }
    return true;
  }

  private validateFunctionCall(node: CallNode, type: FunctionType): void {
    if (!type.boundToType) {
      // If the function is not bound to any type, it just means it's a regular function call. We'll
      // skip it. But if it's bound to a type, it's a method call, and `type.boundToType` indicates
      // the type of object the method works on. For special methods, `type.boundToType` ought to be
      // a subclass of `pluto_base.IResource`.
      return;
    }

    if (!TypeUtils.isSubclassOf(type.boundToType, TypeConsts.IRESOURCE_FULL_NAME)) {
      // If the object's type is not a subclass of pluto_base.IResource, we skip it.
      return;
    }

    // Get the method name.
    const memberName = type.details.name;
    // Check if the method belongs to any special type.
    for (const specialType of [
      TypeConsts.IRESOURCE_INFRA_API_FULL_NAME,
      TypeConsts.IRESOURCE_CLIENT_API_FULL_NAME,
      TypeConsts.IRESOURCE_CAPTURED_PROPS_FULL_NAME,
    ]) {
      if (TypeUtils.doesMethodBelongTo(memberName, type.boundToType, specialType)) {
        this._specialNodeMap.addNode(specialType, node);
      }
    }
  }

  private validateClassCall(node: CallNode, type: ClassType): void {
    // This is a constructor call. We need to check if the class is a subclass of
    // pluto_base.IResource.
    if (TypeUtils.isSubclassOf(type, TypeConsts.IRESOURCE_FULL_NAME)) {
      this._specialNodeMap.addNode(TypeConsts.IRESOURCE_FULL_NAME, node);
    }
  }
}
