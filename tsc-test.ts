import * as ts from 'typescript';

// 定义一个 visitor 用于遍历语法树
function visitor(ctx: ts.TransformationContext, sourceFile: ts.SourceFile) {
  function visit(node: ts.Node): ts.Node {
    if (ts.isClassDeclaration(node)) {
      for (const member of node.members) {
        console.log(member.name);
      }
    }
    return ts.visitEachChild(node, visit, ctx);
  }
  return (node: ts.SourceFile) => ts.visitNode(node, visit);
}

// 创建一个编译器插件
const jsonGenerator: ts.TransformerFactory<ts.SourceFile> = (ctx: ts.TransformationContext) => {
  return (sourceFile: ts.SourceFile) => ts.visitNode(sourceFile, visitor(ctx, sourceFile)) as ts.SourceFile;
};

// 读取要编译的文件路径
const filePath = process.argv[2];
if (!filePath) {
  console.error('File path is required.');
  process.exit(1);
}

// 创建编译选项
const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2017,
  module: ts.ModuleKind.CommonJS
};

// 创建编译器
const program = ts.createProgram([filePath], options);

// 应用编译器插件
const transformed = ts.transform(program.getSourceFile(filePath)!, [jsonGenerator]);

// 获取编译结果
const result = ts.createPrinter().printFile(transformed.transformed[0]);

// 打印结果
// console.log(result);
