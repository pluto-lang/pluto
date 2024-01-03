各个 generator 的功能可能并不相同，可能是生成 IaC 代码，可能是生成资源拓扑图，但都是依据 arch ref 生成输出，并保存至指定目录。

官方提供 2 个 generator：

1. Graphviz Generator：根据 arch ref 生成 dot file。
2. TS Provision Generator：根据 arch ref 结合 infra SDK 生成 IaC 代码

## 输入

- arch ref
- 计算闭包集合
- 输出目录

## 输出

- 所有生成文件的入口文件
