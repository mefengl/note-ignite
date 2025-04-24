// 这个文件包含了一系列用于处理代码文件中特殊“标记”注释的工具函数。
// 这些标记注释允许我们以编程方式修改代码文件，例如移除特定的行、代码块，
// 甚至整个文件。这对于代码生成器或者根据不同条件定制代码模板非常有用。

import { filesystem, patching } from "gluegun"
import * as pathlib from "path"

// 定义所有可能的标记注释类型
// 这些枚举值会用在注释中，告诉处理函数要执行什么操作
export enum MarkupComments {
  RemoveCurrentLine = "remove-current-line", // 标记：移除当前这一行
  RemoveNextLine = "remove-next-line",     // 标记：移除紧跟着的下一行
  RemoveBlockStart = "remove-block-start", // 标记：移除代码块的开始标记
  RemoveBlockEnd = "remove-block-end",     // 标记：移除代码块的结束标记
  RemoveFile = "remove-file",             // 标记：移除整个文件
  ReplaceNextLine = "replace-next-line",   // 标记：用注释内容替换下一行
}

// 辅助函数，用于生成标准格式的标记注释字符串
// 标记注释通常看起来像这样: `// @前缀 操作名称` 或 `# @前缀 操作名称`
// 例如: `// @ignite remove-current-line`
export const markupComment = (prefix: string, commentType: MarkupComments) =>
  `${prefix} ${commentType}`

// 辅助函数，用于创建正则表达式来查找文件中的标记注释
// 这个正则表达式会匹配单行注释 (`//` 或 `#`) 以及可能的块注释 (`/* ... */`) 中的标记
// prefix: 注释中使用的特定前缀 (例如 'ignite')
export const markupRegex = (prefix: string) => {
  // 正则表达式解释:
  // (\/\/|#)       匹配 '//' 或 '#'
  // \s*            匹配零个或多个空格
  // ${prefix}       匹配传入的前缀 (例如 'ignite')
  // .*             匹配注释中剩余的任何字符
  // |              或者
  // {?\/.*        匹配可选的 '{/' 开始的块注释 (虽然这部分可能不太标准或常用)
  // ${prefix}       匹配前缀
  // .*\/}?        匹配剩余内容直到可选的 '/}' 结束
  const pattern = `(\/\/|#)\s*${prefix}.*|{?\/.*${prefix}.*\/}?`
  // 'g' 表示全局搜索 (查找所有匹配项)
  // 'm' 表示多行模式 (允许 '^' 和 '$' 匹配行的开始和结束)
  return new RegExp(pattern, "gm")
}

/**
 * 处理文件内容字符串，移除所有包含 `// @前缀 remove-current-line` 这种注释的行。
 * @param contents 文件内容的字符串。
 * @param comment 要查找和移除的特定注释字符串。
 * @returns 处理后移除了指定行的文件内容字符串。
 */
export function removeCurrentLine(contents: string, comment: string): string {
  const lines = contents.split("\n") // 将文件内容按行分割成数组
  // 使用 filter 方法，只保留不包含指定注释的行
  const result = lines.filter((line) => !line.includes(comment))
  return result.join("\n") // 将处理后的行数组重新组合成字符串
}

/**
 * 处理文件内容字符串，移除紧跟在 `// @前缀 remove-next-line` 注释后面的那一行。
 * @param contents 文件内容的字符串。
 * @param comment 要查找的特定注释字符串 (`remove-next-line` 注释)。
 * @returns 处理后移除了指定下一行的文件内容字符串。
 */
export function removeNextLine(contents: string, comment: string): string {
  const lines = contents.split("\n")
  const result = lines.filter((line, index) => {
    // 获取当前行的上一行
    const prevLine = lines[index - 1]

    // 检查当前行是否包含 'remove-next-line' 注释，如果不包含，则当前行需要保留
    const preserveCurrent = line.includes(comment) === false
    // 检查上一行是否存在并且是否包含 'remove-next-line' 注释，如果不包含，则上一行不是移除标记
    // (注意: 这个变量名 preservePrevious 可能有点误导，它实际表示上一行 *不* 是移除标记)
    const preservePrevious = prevLine !== undefined && prevLine.includes(comment) === false

    if (index === 0) {
      // 如果是第一行，没有上一行，直接判断当前行是否是标记注释
      return preserveCurrent
    }

    // 核心逻辑：只有当 *当前行* 和 *上一行* 都不包含 'remove-next-line' 注释时，
    // 才保留当前行。如果上一行包含注释，那么当前行（下一行）就会被移除。
    // 如果当前行自己就是注释行，它也会被移除（因为 preserveCurrent 会是 false）。
    const keepLine = preserveCurrent && preservePrevious
    return keepLine
  })
  return result.join("\n")
}

/**
 * 处理文件内容字符串，将紧跟在 `// @前缀 replace-next-line 新内容` 注释后面的那一行替换为注释中指定的新内容。
 * @param contents 文件内容的字符串。
 * @param comment 要查找的特定注释字符串 (`replace-next-line` 注释)。
 * @returns 处理后替换了指定下一行的文件内容字符串。
 */
export function replaceNextLine(contents: string, comment: string): string {
  const lines = contents.split("\n")
  const result = lines.map((line, index) => {
    const prevLine = lines[index - 1]
    // 检查上一行是否存在，并且是否包含 'replace-next-line' 注释
    if (prevLine?.includes(comment)) {
      // 如果上一行是替换标记注释，提取注释内容作为新行内容
      // 1. 移除开头的 '//'
      // 2. 移除 'replace-next-line' 注释本身
      // 3. trim() 移除前后空格
      const newLineContent = prevLine.replace("//", "").replace(comment, "").trim()
      // 返回提取到的新内容，替换掉当前行
      return newLineContent
    } else {
      // 如果上一行不是替换标记，保持当前行不变
      return line
    }
  })
    // 过滤掉那些作为 'replace-next-line' 标记本身的行
    .filter((line, index, arr) => !arr[index]?.includes(comment))
  return result.join("\n")
}

/**
 * 处理文件内容字符串，移除被 `// @前缀 remove-block-start` 和 `// @前缀 remove-block-end`
 * 注释包围的代码块（包括这两个注释行本身）。
 * @param contents 文件内容的字符串。
 * @param comment 包含 start 和 end 两个注释字符串的对象。
 * @returns 处理后移除了指定代码块的文件内容字符串。
 */
export function removeBlocks(contents: string, comment: { start: string; end: string }): string {
  const { start, end } = comment // 解构出开始和结束注释
  const lines = contents.split("\n")

  // 查找第一个开始标记和第一个结束标记的行索引
  const findIndex = (l: typeof lines, c: typeof start | typeof end) =>
    l.findIndex((line) => line.includes(c))
  const NOT_FOUND = -1

  const blockStartIndex = findIndex(lines, start)
  const blockEndIndex = findIndex(lines, end)
  // 检查是否同时找到了开始和结束标记
  const blockExists = blockStartIndex !== NOT_FOUND && blockEndIndex !== NOT_FOUND

  if (blockExists) {
    // 计算要移除的行的数量 (包含开始和结束标记行)
    const blockLength = blockEndIndex - blockStartIndex + 1
    // 从行数组中移除这个代码块
    lines.splice(blockStartIndex, blockLength) // splice 会直接修改 `lines` 数组
  }

  // 将修改后的行数组重新组合成字符串
  const updateContents = lines.join("\n")

  // 递归检查：因为可能存在多个不嵌套的块，或者处理完一个块后，
  // 原来的嵌套块变成了顶层块，所以需要再次查找。
  const anotherBlockExists =
    findIndex(lines, start) !== NOT_FOUND && findIndex(lines, end) !== NOT_FOUND
  if (anotherBlockExists) {
    // 如果还存在其他块，递归调用 removeBlocks 处理剩余的内容
    return removeBlocks(updateContents, comment)
  }

  // 如果没有更多块了，返回最终处理结果
  return updateContents
}

/**
 * 对单个文件内容执行所有定义的标记处理操作。
 * 这是核心的处理函数，它按顺序调用上面定义的各种移除/替换函数。
 * @param contents 原始文件内容的字符串。
 * @param markupPrefix 标记注释中使用的前缀 (例如 'ignite')。
 * @returns 执行了所有移除/替换操作后的文件内容字符串。
 */
export function updateFile(contents: string, markupPrefix: string): string {
  let result = contents // 初始化结果为原始内容

  // 1. 移除代码块
  result = removeBlocks(result, {
    start: markupComment(markupPrefix, MarkupComments.RemoveBlockStart),
    end: markupComment(markupPrefix, MarkupComments.RemoveBlockEnd),
  })
  // 2. 移除当前行
  result = removeCurrentLine(result, markupComment(markupPrefix, MarkupComments.RemoveCurrentLine))
  // 3. 移除下一行
  result = removeNextLine(result, markupComment(markupPrefix, MarkupComments.RemoveNextLine))
  // 4. 替换下一行
  result = replaceNextLine(result, markupComment(markupPrefix, MarkupComments.ReplaceNextLine))

  // 返回最终处理后的内容
  return result
}

// 默认的文件/目录匹配模式 (Glob Patterns)
// 用于 `findFiles` 和 `removeEmptyDirs` 函数，排除常见的非源码或构建产物目录
const DEFAULT_MATCHING_GLOBS = [
  "!**/.DS_Store",             // 排除 macOS 的 .DS_Store 文件
  "!**/.expo{,/**}",          // 排除 .expo 目录及其内容
  "!**/.git{,/**}",           // 排除 .git 目录及其内容
  "!**/.vscode{,/**}",        // 排除 .vscode 目录及其内容
  "!**/node_modules{,/**}",   // 排除 node_modules 目录及其内容
  "!**/ios/build{,/**}",      // 排除 ios build 目录
  "!**/ios/Pods{,/**}",       // 排除 ios Pods 目录
  "!**/ios/*.xcworkspace{,/**}", // 排除 Xcode workspace
  "!**/android/build{,/**}",  // 排除 android build 目录
  "!**/android/app/build{,/**}", // 排除 android app build 目录
] // 注意：这里的模式都是 '!' 开头，表示排除

/**
 * 在指定目录下查找文件。
 * @param targetDir 要搜索的目标目录。
 * @param matching 可选的 glob 匹配模式数组。如果未提供，则使用 `DEFAULT_MATCHING_GLOBS`。
 *                 这里的 matching 模式通常用于 *包含* 文件，而 `DEFAULT_MATCHING_GLOBS` 用于 *排除*。
 *                 gluegun 的 find 会智能处理这些。
 * @returns 返回找到的文件路径数组（绝对路径）。
 */
export function findFiles(targetDir: string, matching?: string[]) {
  // 使用 gluegun 的 filesystem.find 来查找文件
  const filePaths = filesystem
    .cwd(targetDir) // 设置当前工作目录为目标目录
    .find({
      // 如果传入了 matching，则使用传入的；否则使用默认的排除模式。
      // gluegun find 会合并处理，这里的模式通常是包含模式，例如 "**/*.js"
      // 而 DEFAULT_MATCHING_GLOBS 是排除模式。最终效果是找到匹配 `matching` 且不匹配 `DEFAULT_MATCHING_GLOBS` 的文件。
      matching: matching ?? DEFAULT_MATCHING_GLOBS,
      recursive: true,    // 递归搜索子目录
      files: true,        // 只查找文件
      directories: false, // 不查找目录
    })
    // find 返回的是相对于 targetDir 的路径，需要拼接成绝对路径
    .map((path) => pathlib.join(targetDir, path))
  return filePaths
}

/**
 * 移除指定目录下的所有空目录。
 * 这个函数会循环执行，直到没有空目录为止，因为删除一个空目录可能导致其父目录变空。
 * @param options 包含目标目录、是否空运行和匹配模式的对象。
 * @param options.targetDir 目标目录。
 * @param options.dryRun 如果为 true，则只报告会删除哪些目录，而不实际删除。
 * @param options.matching 用于查找目录的 glob 模式，默认为 `DEFAULT_MATCHING_GLOBS` (主要用于排除)。
 * @returns 返回被移除（或在 dryRun 模式下将要被移除）的空目录路径数组。
 */
export function removeEmptyDirs({
  targetDir,
  dryRun,
  matching = DEFAULT_MATCHING_GLOBS,
}: {
  targetDir: string
  dryRun: boolean
  matching?: string[]
}) {
  const removedDirs: string[] = [] // 存储已移除或计划移除的目录

  // 获取当前所有空目录的函数
  const getEmptyDirPaths = () =>
    filesystem
      .cwd(targetDir)
      .find({
        matching,          // 使用指定的匹配/排除模式
        recursive: true,    // 递归查找
        files: false,       // 只查找目录
        directories: true,
      })
      .map((path) => pathlib.join(targetDir, path)) // 转为绝对路径
      // 过滤出空的目录 (目录下没有任何文件或子目录)
      .filter((path) => !filesystem.list(path)?.length)

  let emptyDirPaths = getEmptyDirPaths() // 第一次获取空目录

  // 循环直到没有空目录为止
  while (emptyDirPaths.length > 0) {
    emptyDirPaths.forEach((path) => {
      if (!dryRun) filesystem.remove(path) // 如果不是 dryRun，实际删除目录
      removedDirs.push(path) // 记录被删除的目录
    })
    // 重新获取空目录列表，因为删除了子目录可能导致父目录变空
    emptyDirPaths = getEmptyDirPaths()
  }

  return removedDirs
}

/**
 * 检查文件路径列表中的文件，如果文件内容包含特定的 `remove-file` 注释，则删除该文件。
 * @param options 包含文件列表、注释标记和是否空运行的对象。
 * @param options.filePaths 要检查和可能删除的文件路径数组。
 * @param options.comment 用于标记删除文件的特定注释字符串。
 * @param options.dryRun 如果为 true，则只报告会删除哪些文件，而不实际删除。
 * @returns 返回被删除（或在 dryRun 模式下将要被删除）的文件路径数组。
 */
export async function deleteFiles({
  filePaths,
  comment,
  dryRun = true,
}: {
  filePaths: string[]
  comment: string
  dryRun?: boolean
}) {
  const removedFiles: string[] = []

  for (const path of filePaths) {
    // 读取文件内容
    const contents = await patching.read(path)
    // 检查文件内容是否包含删除文件的标记注释
    if (contents?.includes(comment)) {
      removedFiles.push(path) // 记录要删除的文件
      if (!dryRun) {
        filesystem.remove(path) // 如果不是 dryRun，实际删除文件
      }
    }
  }

  return removedFiles
}

/**
 * 批量处理文件列表：读取每个文件，应用 `updateFile` 函数进行标记处理，然后写回文件。
 * 或者，可以选择只移除标记注释而不执行它们代表的操作。
 * @param options 包含文件列表、标记前缀、是否空运行和是否只移除标记的选项对象。
 * @param options.filePaths 要处理的文件路径数组。
 * @param options.markupPrefix 标记注释中使用的前缀 (例如 'ignite')。
 * @param options.dryRun 如果为 true，则只报告会修改哪些文件，而不实际写入更改。
 * @param options.removeMarkupOnly 如果为 true，则只移除所有标记注释，而不执行移除/替换操作。
 * @returns 返回一个对象，包含被修改（或计划修改）的文件列表和被跳过的文件列表。
 */
export async function updateFiles({
  filePaths,
  markupPrefix,
  dryRun = true,
  removeMarkupOnly = false,
}: {
  filePaths: string[]
  markupPrefix: string
  dryRun?: boolean
  removeMarkupOnly?: boolean
}) {
  const updatedFiles: string[] = []
  const skippedFiles: string[] = []

  // 构造用于查找所有标记注释的正则表达式
  const searchRegex = markupRegex(markupPrefix)

  for (const path of filePaths) {
    // 读取文件内容
    const contents = await patching.read(path)
    if (!contents) {
      // 如果文件读取失败或为空，跳过此文件
      skippedFiles.push(path)
      continue
    }

    // 检查文件是否包含任何标记注释
    const hasMarkup = searchRegex.test(contents)
    if (!hasMarkup) {
      // 如果文件不包含任何标记，跳过此文件
      skippedFiles.push(path)
      continue
    }

    // 记录此文件将被更新
    updatedFiles.push(path)

    // 如果不是 dryRun 模式，执行实际的更新操作
    if (!dryRun) {
      let updatedContents = contents
      if (removeMarkupOnly) {
        // 如果是只移除标记模式，使用正则表达式替换掉所有匹配的标记注释为空字符串
        updatedContents = contents.replace(searchRegex, "")
      } else {
        // 否则，调用 updateFile 执行所有标记操作
        updatedContents = updateFile(contents, markupPrefix)
      }

      // 将处理后的内容写回文件
      // 注意：patching.writeAsync 如果文件内容没有变化，可能不会实际写入
      await patching.writeAsync(path, updatedContents)
    }
  }

  return { updatedFiles, skippedFiles }
}
