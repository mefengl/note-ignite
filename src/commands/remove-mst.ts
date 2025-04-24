// 导入 GluegunToolbox 类型，用于与 Gluegun CLI 框架交互。
import { GluegunToolbox } from "gluegun"
// 导入 Node.js 的 'path' 模块，用于处理文件和目录路径。
import * as pathlib from "path"
// 导入用于处理布尔类型命令行标志的辅助函数。
import { boolFlag } from "../tools/flag"
// 导入用于格式化输出的辅助函数：p (段落), warning (警告信息)。
import { p, warning } from "../tools/pretty"
// 导入与 MST 相关的常量和列表：标记前缀和需要移除的依赖项列表。
import { MST_MARKUP_PREFIX, mstDependenciesToRemove } from "../tools/mst"
// 导入用于处理标记的辅助函数：findFiles (查找文件), removeEmptyDirs (移除空目录), updateFiles (根据标记更新文件)。
import { findFiles, removeEmptyDirs, updateFiles } from "../tools/markup"
// 导入用于从 package.json 文件中移除依赖项的辅助函数。
import { removePackageJSONDependencies } from "../tools/dependencies"

// 导出模块，定义 'remove-mst' 命令。
module.exports = {
  // 定义命令的别名，用户可以使用 'ignite rm-mst' 或 'ignite remove-mst'。
  alias: ["rm-mst", "remove-mst"],
  // 命令的描述，解释其功能以及 --dry-run 选项。
  description:
    "从生成的样板代码中移除 MobX-State-Tree 代码。添加 --dry-run 查看将要移除的内容。",
  // 命令的执行函数。
  run: async (toolbox: GluegunToolbox) => {
    // 从工具箱中解构出 parameters (命令行参数)。注意：filesystem 似乎未在此命令中直接使用。
    const { parameters } = toolbox

    // 获取当前工作目录 (Current Working Directory)。
    const CWD = process.cwd()
    // 确定目标目录。如果用户提供了第一个参数，则使用该参数；否则默认为当前工作目录。
    const TARGET_DIR = parameters.first ?? CWD
    // 检查用户是否提供了 --dry-run 标志。
    const dryRun = boolFlag(parameters.options.dryRun) ?? false

    // 打印空行。
    p()
    // 打印开始信息，指明目标目录以及是否为 dry run 模式。
    p(`正在从 '${TARGET_DIR}' 移除 MobX-State-Tree 代码${dryRun ? " (演练模式)" : ""}`)

    // 使用 findFiles 函数查找目标目录下的所有相关文件。
    // 这个函数通常会应用一些默认的排除规则（例如排除 node_modules, .git 等），具体取决于其内部实现。
    const filePaths = findFiles(TARGET_DIR)

    // 打印将要从 package.json 移除的 MST 相关依赖项列表。
    p(
      `正在从 package.json 移除依赖项: ${mstDependenciesToRemove.join(", ")} ${
        dryRun ? "(演练模式)" : "" // 如果是演练模式，则添加提示
      }`,
    )
    // 如果不是 dryRun 模式，则实际执行移除操作。
    if (!dryRun) {
      // 构建 package.json 文件的完整路径。
      const packageJSONPath = pathlib.join(TARGET_DIR, "package.json")
      // 调用辅助函数，从 package.json 文件中移除指定的依赖项。
      removePackageJSONDependencies(packageJSONPath, mstDependenciesToRemove)
    }

    // 调用 updateFiles 函数处理找到的所有文件。
    // 这个函数会查找文件中以 MST_MARKUP_PREFIX 开头的注释标记 (例如 '// @remove-mst-file')，
    // 并根据这些标记执行相应的操作（如删除文件、删除代码块等）。
    // removeMarkupOnly: false 表示不仅移除标记本身，还要移除标记所指定的文件或代码块。
    const mstCommentResults = await updateFiles({
      filePaths, // 要处理的文件路径列表
      markupPrefix: MST_MARKUP_PREFIX, // MST 代码标记的前缀
      removeMarkupOnly: false, // 指示要移除标记及其关联的代码/文件
      dryRun, // 是否为演练模式
    })

    // 处理 updateFiles 函数返回的结果。
    mstCommentResults
      // 首先按文件路径字母顺序对结果进行排序，方便阅读日志。
      .sort((a, b) => {
        // 只对成功处理的结果进行排序。
        if (a.status === "fulfilled" && b.status === "fulfilled") {
          return a.value.path.localeCompare(b.value.path)
        }
        // 对于失败的结果或混合结果，保持原始顺序。
        return 0
      })
      // 遍历排序后的结果。
      .forEach((result) => {
        // 如果某个文件的处理失败 (rejected)，则打印警告信息。
        if (result.status === "rejected") {
          warning(result.reason) // 打印失败原因
          return // 继续处理下一个结果
        }

        // 如果文件处理成功 (fulfilled)，并且该文件中找到了 MST 代码注释标记。
        const { path, comments } = result.value
        if (comments.length > 0) {
          // 打印信息，列出在哪个文件中找到了哪些 MST 代码标记。
          p(`在 ${path} 中找到 ${comments.map((c) => `'${c}'`).join(", ")}`)
        }
      })

    // 执行空目录移除。
    // 在移除了 MST 相关文件或代码块后，一些目录可能变空，需要清理。
    const emptyDirsRemoved = removeEmptyDirs({ targetDir: TARGET_DIR, dryRun })
    // 打印被移除的空目录信息。
    emptyDirsRemoved.forEach((path) => {
      p(`移除了空目录 '${path}'`)
    })

    // 打印完成信息。
    p(`完成从 '${TARGET_DIR}' 移除 MobX-State-Tree 代码${dryRun ? " (演练模式)" : ""}`)
  },
}
