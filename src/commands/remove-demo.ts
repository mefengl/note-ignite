// 导入 GluegunToolbox 类型，用于与 Gluegun CLI 框架交互。
import { GluegunToolbox } from "gluegun"
// 导入 Node.js 的 'path' 模块，用于处理文件和目录路径。
import * as pathlib from "path"
// 导入用于处理布尔类型命令行标志的辅助函数。
import { boolFlag } from "../tools/flag"
// 导入用于格式化输出的辅助函数：p (段落), warning (警告信息)。
import { p, warning } from "../tools/pretty"
// 导入用于处理标记的辅助函数：findFiles (查找文件), removeEmptyDirs (移除空目录), updateFiles (根据标记更新文件)。
import { findFiles, removeEmptyDirs, updateFiles } from "../tools/markup"
// 导入演示代码标记的前缀常量。
import { DEMO_MARKUP_PREFIX } from "../tools/demo"

// 定义一组 glob 模式，用于在查找文件时排除或包含特定文件/目录。
// 这些模式确保我们不会意外修改或删除不应触碰的文件，例如 .git 目录、node_modules、构建产物等。
const MATCHING_GLOBS = [
  "!**/.DS_Store", // 排除 macOS 的 .DS_Store 文件
  "!**/.expo{,/**}", // 排除 .expo 目录及其所有内容
  "!**/.git{,/**}", // 排除 .git 目录及其所有内容
  "!**/.vscode{,/**}", // 排除 .vscode 目录及其所有内容
  "!**/node_modules{,/**}", // 排除 node_modules 目录及其所有内容
  "!**/ios/build{,/**}", // 排除 ios/build 目录及其所有内容
  "!**/ios/Pods{,/**}", // 排除 ios/Pods 目录及其所有内容
  "!**/ios/*.xcworkspace{,/**}", // 排除 iOS 的 xcworkspace 文件/目录
  "!**/ios/*.xcodeproj{,/**}", // 排除 iOS 的 xcodeproj 文件/目录
  "!**/android/build{,/**}", // 排除 android/build 目录及其所有内容
  "!**/android/app/build{,/**}", // 排除 android/app/build 目录及其所有内容
  "!**/android/.gradle", // 排除 android/.gradle 目录
]

// 导出模块，定义 'remove-demo' 命令。
module.exports = {
  // 定义命令的别名，用户可以使用 'ignite rd' 或 'ignite remove-demos'。
  alias: ["rd", "remove-demos"],
  // 命令的描述，解释其功能以及 --dry-run 选项。
  description:
    "从生成的样板代码中移除演示代码。添加 --dry-run 查看将要移除的内容。",
  // 命令的执行函数。
  run: async (toolbox: GluegunToolbox) => {
    // 从工具箱中解构出 parameters (命令行参数) 和 filesystem (文件系统操作工具)。
    const { parameters, filesystem } = toolbox

    // 获取当前工作目录 (Current Working Directory)。
    const CWD = process.cwd()
    // 确定目标目录。如果用户提供了第一个参数，则使用该参数；否则默认为当前工作目录。
    const TARGET_DIR = parameters.first ?? CWD
    // 检查用户是否提供了 --dry-run 标志。boolFlag 会处理各种形式的布尔值 (true, 'true', 1, etc.)。
    const dryRun = boolFlag(parameters.options.dryRun) ?? false

    // 打印空行。
    p()
    // 打印开始信息，指明目标目录以及是否为 dry run 模式。
    p(`正在从 '${TARGET_DIR}' 移除演示代码${dryRun ? " (演练模式)" : ""}`)

    // 使用 findFiles 函数查找目标目录下的所有相关文件，会应用 MATCHING_GLOBS 规则。
    const filePaths = findFiles(TARGET_DIR)

    // 调用 updateFiles 函数处理找到的所有文件。
    // 这个函数会查找文件中以 DEMO_MARKUP_PREFIX 开头的注释标记 (例如 '// @demo remove-file')，
    // 并根据这些标记执行相应的操作（如删除文件、删除代码块等）。
    // 如果是 dryRun 模式，则只报告将要执行的操作，而不实际修改文件。
    const demoCommentResults = await updateFiles({
      filePaths, // 要处理的文件路径列表
      markupPrefix: DEMO_MARKUP_PREFIX, // 演示代码标记的前缀
      dryRun, // 是否为演练模式
    })

    // 处理 updateFiles 函数返回的结果。
    demoCommentResults
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

        // 如果文件处理成功 (fulfilled)，并且该文件中找到了演示代码注释标记。
        const { path, comments } = result.value
        if (comments.length > 0) {
          // 打印信息，列出在哪个文件中找到了哪些演示代码标记。
          p(`在 ${path} 中找到 ${comments.map((c) => `'${c}'`).join(", ")}`)
        }
      })

    // 定义一个函数，用于查找并移除名为 'demo' 的目录。
    function removeDemoAssets() {
      // 使用 filesystem.find 查找所有名为 'demo' 的目录。
      // matching: 应用排除规则 (MATCHING_GLOBS) 并查找 '**/demo'。
      // recursive: 递归查找。
      // files: false - 只查找目录。
      // directories: true - 只查找目录。
      const demoPaths = filesystem
        .cwd(TARGET_DIR) // 设置查找的根目录
        .find({
          matching: [...MATCHING_GLOBS, "**/demo"], // 合并排除规则和查找目标
          recursive: true,
          files: false,
          directories: true,
        })
        // 将相对路径转换为绝对路径。
        .map((path) => pathlib.join(TARGET_DIR, path))

      // 遍历找到的 'demo' 目录路径。
      demoPaths.forEach((path) => {
        // 如果不是 dryRun 模式，则实际移除目录。
        if (!dryRun) filesystem.remove(path)
        // 打印移除信息。
        p(`移除了演示目录 '${path}'`)
      })
    }

    // 执行第一轮空目录移除。
    // 在移除了文件或代码块后，一些目录可能变空，需要清理。
    const emptyDirsRemoved = removeEmptyDirs({ targetDir: TARGET_DIR, dryRun })
    // 打印被移除的空目录信息。
    emptyDirsRemoved.forEach((path) => {
      p(`移除了空目录 '${path}'`)
    })

    // 调用函数移除 'demo' 资产目录。
    removeDemoAssets()

    // 注意：移除 'demo' 目录后，可能又会产生新的空目录。
    // 如果需要彻底清理，可以在 removeDemoAssets() 之后再调用一次 removeEmptyDirs()。
    // 但当前代码只执行一次空目录清理。

    // 打印完成信息。
    p(`完成从 '${TARGET_DIR}' 移除演示代码${dryRun ? " (演练模式)" : ""}`)
  },
}
