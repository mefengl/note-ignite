// 导入 gluegun 框架的文件系统模块，提供文件操作的基础功能。
import { filesystem } from "gluegun"
// 导入 Node.js 的 'path' 模块，用于处理和转换文件路径。
import * as pathlib from "path"

/**
 * 获取指定路径下的所有直接子项（包括文件和目录）。
 * 这个函数类似于 gluegun 的 filesystem.subdirectories()，但它同时获取文件和目录。
 *
 * 原始注释提到这个功能或许应该添加到 Gluegun 框架本身。
 * 参考链接：https://github.com/infinitered/gluegun/blob/master/src/toolbox/filesystem-tools.ts#L52
 *
 * @param path 要查找子项的目录路径。
 * @param isRelative 是否返回相对路径。默认为 false，返回绝对路径。
 *                   如果为 true，则返回相对于 `path` 的路径。
 * @param matching 用于匹配文件/目录名称的 glob 模式。默认为 "*" (匹配所有)。
 * @returns 返回一个包含子项路径的字符串数组。路径是绝对路径还是相对路径取决于 `isRelative` 参数。
 */
export function children(path: string, isRelative = false, matching = "*"): string[] {
  // 使用 gluegun 的 filesystem.cwd() 将当前工作目录临时设置为指定的 'path'。
  // 然后调用 find() 方法查找子项。
  const dirs = filesystem.cwd(path).find({
    matching,        // 应用指定的 glob 模式进行匹配。
    directories: true, // 包含目录。
    recursive: false,  // 只查找直接子项，不递归查找子目录的内容。
    files: true,       // 包含文件。
  })

  // 根据 isRelative 参数决定返回相对路径还是绝对路径。
  if (isRelative) {
    // 如果需要相对路径，直接返回 find() 方法的结果。
    // find() 在指定 cwd 后返回的是相对于 cwd 的路径。
    return dirs
  } else {
    // 如果需要绝对路径，则遍历 find() 返回的相对路径数组。
    // 使用 pathlib.join() 将父路径 'path' 和每个相对路径 'dir' 拼接起来，得到绝对路径。
    return dirs.map((dir) => pathlib.join(path, dir))
  }
}
