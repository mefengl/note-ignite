// 导入 gluegun 的 system 模块，用于执行系统命令，例如检查某个命令是否存在。
import { system } from "gluegun"
// 导入 ./spawn 模块中的 spawnProgress 函数，用于执行带有进度输出的子进程命令。
import { spawnProgress } from "./spawn"

// 这里注释提到，理想情况下应该有一个专门处理包管理器的 gluegun 核心扩展。
// 但目前没有，所以暂时使用这个自定义的实现。

// 定义支持的包管理器名称类型。Expo 目前不支持 pnpm，所以这里特别提到了。
// PackagerName 可以是 "npm", "yarn", "pnpm", 或 "bun"。
export type PackagerName = "npm" | "yarn" | "pnpm" | "bun"

// 定义包操作相关的选项类型。
type PackageOptions = {
  // 指定要使用的包管理器名称。如果未指定，通常会自动检测。
  packagerName?: PackagerName
  // 是否作为开发依赖项安装 (例如 `npm install --save-dev`)。
  dev?: boolean
  // 是否是全局安装 (例如 `npm install -g`)。
  global?: boolean
  // 是否静默模式运行，减少输出信息 (例如 `npm install --silent`)。
  silent?: boolean
}

// 定义运行包命令时的选项类型，继承自 PackageOptions，并增加了进度回调。
type PackageRunOptions = PackageOptions & {
  // 一个回调函数，用于在命令执行过程中处理输出（例如打印到控制台）。
  onProgress?: (out: string) => void
}

// 定义包安装命令的默认选项。
const packageInstallOptions: PackageRunOptions = {
  // 默认不作为开发依赖。
  dev: false,
  // 默认的进度处理函数是直接打印输出到控制台。
  onProgress: (out: string) => console.log(out),
}

// 定义列出包命令的默认选项。
const packageListOptions: PackageOptions = {
  // 默认不是全局操作。
  global: false,
}

// 用于缓存 yarn 是否可用的结果，避免重复检查。
let isYarn: boolean | undefined
/**
 * 检查系统中 yarn 命令是否可用。
 * @returns 如果 yarn 可用，返回 true；否则返回 false。
 */
function yarnAvailable() {
  // 如果已经检查过，直接返回缓存的结果。
  if (isYarn !== undefined) return isYarn
  // 使用 system.which 检查 yarn 命令是否存在于系统 PATH 中。
  // Boolean() 将 system.which 的结果（找到则为路径字符串，否则为 null）转换成布尔值。
  isYarn = Boolean(system.which("yarn"))
  // 返回检查结果。
  return isYarn
}

// 用于缓存 pnpm 是否可用的结果。
let isPnpm: boolean | undefined
/**
 * 检查系统中 pnpm 命令是否可用。
 * @returns 如果 pnpm 可用，返回 true；否则返回 false。
 */
function pnpmAvailable() {
  if (isPnpm !== undefined) return isPnpm
  isPnpm = Boolean(system.which("pnpm"))
  return isPnpm
}

// 用于缓存 bun 是否可用的结果。
let isBun: boolean | undefined
/**
 * 检查系统中 bun 命令是否可用。
 * @returns 如果 bun 可用，返回 true；否则返回 false。
 */
function bunAvailable() {
  if (isBun !== undefined) return isBun
  isBun = Boolean(system.which("bun"))
  return isBun
}

/**
 * 检测当前系统环境中最优先推荐使用的包管理器。
 * 检测顺序：yarn -> pnpm -> bun -> npm (默认)。
 * @returns 检测到的包管理器名称。
 */
function detectPackager(): PackagerName {
  if (yarnAvailable()) {
    return "yarn"
  } else if (pnpmAvailable()) {
    return "pnpm"
  } else if (bunAvailable()) {
    return "bun"
  } else {
    // 如果以上都不存在，默认返回 npm。
    return "npm"
  }
}

/**
 * 获取当前系统环境中所有可用的包管理器列表。
 * 总是包含 "npm"，并根据检测结果添加 "yarn", "pnpm", "bun"。
 * @returns 可用的包管理器名称数组。
 */
function availablePackagers(): PackagerName[] {
  // 初始化列表，总是包含 npm。
  const packagers: PackagerName[] = ["npm"]

  // 如果 yarn 可用，添加到列表。
  if (yarnAvailable()) {
    packagers.push("yarn")
  }
  // 如果 pnpm 可用，添加到列表。
  if (pnpmAvailable()) {
    packagers.push("pnpm")
  }
  // 如果 bun 可用，添加到列表。
  if (bunAvailable()) {
    packagers.push("bun")
  }

  // 返回包含所有可用包管理器的列表。
  return packagers
}

/**
 * 生成用于添加（安装）一个或多个包的命令行字符串。
 * 会根据指定的包管理器（或自动检测）生成相应的命令。
 * 例如：`yarn add ramda` 或 `npm install ramda`。
 *
 * @param pkg 要安装的包名称（可以是用空格分隔的多个包）。
 * @param options 包操作选项，如 packagerName, dev, silent。默认为 packageInstallOptions。
 * @returns 生成的命令行字符串。
 */
function addCmd(pkg: string, options: PackageRunOptions = packageInstallOptions): string {
  // 根据 options.silent 决定是否添加静默模式标志。
  const silent = options.silent ? " --silent" : ""

  // 声明命令字符串变量。
  let cmd: string

  // 根据指定的 packagerName 构建命令。
  if (options.packagerName === "pnpm") {
    // pnpm 使用 `pnpm install <pkg>` 来添加依赖。
    cmd = `pnpm install`
  } else if (options.packagerName === "yarn") {
    // yarn 使用 `yarn add <pkg>`。
    cmd = `yarn add`
  } else if (options.packagerName === "npm") {
    // npm 使用 `npm install <pkg>`。
    cmd = `npm install`
  } else if (options.packagerName === "bun") {
    // bun 使用 `bun add <pkg>`。
    cmd = `bun add`
  } else {
    // 如果没有指定 packagerName，则自动检测一个并递归调用自身。
    // 使用 ...options 将现有选项传递下去，并覆盖 packagerName。
    // neither expo nor a packagerName was provided, so let's detect one
    return addCmd(pkg, { ...options, packagerName: detectPackager() })
  }

  // 组合最终的命令字符串：基础命令 + 包名 + 开发依赖标志 + 静默标志。
  // options.dev 为 true 时添加 "--save-dev"。
  return `${cmd} ${pkg}${options.dev ? " --save-dev" : ""}${silent}`
}

/**
 * 生成用于移除（卸载）一个或多个包的命令行字符串。
 * 会根据指定的包管理器（或自动检测）生成相应的命令。
 * 例如：`yarn remove ramda` 或 `npm uninstall ramda` 或 `pnpm remove ramda` 或 `bun remove ramda`。
 *
 * @param pkg 要卸载的包名称（可以是用空格分隔的多个包）。
 * @param options 包操作选项，如 packagerName, dev, silent。默认为 packageInstallOptions。
 *                注意：虽然继承了 install 的选项，但 `--save-dev` 对移除操作可能无实际意义或行为不同。
 * @returns 生成的命令行字符串。
 */
function removeCmd(pkg: string, options: PackageOptions = packageInstallOptions): string {
  // 根据 options.silent 决定是否添加静默模式标志。
  const silent = options.silent ? " --silent" : ""

  let cmd: string

  // 根据指定的 packagerName 构建命令。
  if (options.packagerName === "pnpm") {
    // pnpm 使用 `pnpm remove <pkg>` 或 `pnpm uninstall <pkg>`（两者通常等效）。
    cmd = "pnpm remove" // 或者 "pnpm uninstall"
  } else if (options.packagerName === "yarn") {
    // yarn 使用 `yarn remove <pkg>`。
    cmd = `yarn remove`
  } else if (options.packagerName === "npm") {
    // npm 使用 `npm uninstall <pkg>`。
    cmd = `npm uninstall`
  } else if (options.packagerName === "bun") {
    // bun 使用 `bun remove <pkg>`。
    cmd = `bun remove`
  } else {
    // 如果没有指定 packagerName，则自动检测一个并递归调用自身。
    // 使用 ...options 将现有选项传递下去，并覆盖 packagerName。
    // neither expo nor a packagerName was provided, so let's detect one
    return removeCmd(pkg, { ...options, packagerName: detectPackager() })
  }

  // 组合最终的命令字符串：基础命令 + 包名 + 开发依赖标志（可能无效） + 静默标志。
  // options.dev 对移除操作通常没有影响，保留可能是为了与 addCmd 签名一致。
  return `${cmd} ${pkg}${options.dev ? " --save-dev" : ""}${silent}`
}

/**
 * 生成用于执行通用安装（通常是安装项目 `package.json` 中定义的所有依赖）的命令行字符串。
 * 会根据指定的包管理器（或自动检测）生成相应的命令。
 * 例如：`yarn install`、`npm install`、`pnpm install` 或 `bun install`。
 *
 * @param options 包运行选项，主要用到 packagerName 和 silent。
 * @returns 生成的命令行字符串。
 */
function installCmd(options: PackageRunOptions): string {
  // 根据 options.silent 决定是否添加静默模式标志。
  const silent = options.silent ? " --silent" : ""

  // 根据指定的 packagerName 构建命令。
  if (options.packagerName === "pnpm") {
    return `pnpm install${silent}`
  } else if (options.packagerName === "yarn") {
    return `yarn install${silent}` // yarn install 也可以只写 yarn
  } else if (options.packagerName === "npm") {
    return `npm install${silent}`
  } else if (options.packagerName === "bun") {
    return `bun install${silent}`
  } else {
    // 如果没有指定 packagerName，则自动检测一个并递归调用自身。
    return installCmd({ ...options, packagerName: detectPackager() })
  }
}

/**
 * 定义 `list` 函数返回值的类型。
 * 它是一个元组（Tuple），包含两个元素：
 * 1. 用于执行列出包操作的命令行字符串。
 * 2. 一个解析函数，接收命令的原始输出字符串，并返回一个二维数组，
 *    每个子数组代表一个包，包含包名和版本号 `[packageName, packageVersion]`。
 */
type PackageListOutput = [string, (string) => [string, string][]]

/**
 * 生成用于列出已安装包的命令行字符串，并提供一个用于解析其输出的函数。
 * 支持 yarn 和 npm，可以列出全局或本地安装的包。
 * Bun 的支持目前与 Yarn 类似，但可能不完全准确。
 * Pnpm 目前不支持。
 *
 * @param options 包操作选项，如 packagerName, global。默认为 packageListOptions。
 * @returns 返回一个 `PackageListOutput` 元组。
 */
export function list(options: PackageOptions = packageListOptions): PackageListOutput {
  if (options.packagerName === "pnpm") {
    // pnpm list 目前未被支持。
    // TODO: 实现 pnpm list 的支持。 pnpm list --depth=0 --json 也许可行？
    throw new Error("pnpm list is not supported yet")
  } else if (options.packagerName === "bun") {
    // Bun 的 list 命令目前直接复用 Yarn 的逻辑，可能不完全准确。
    // `bun pm ls` 是其列出依赖的命令。
    // TODO: 确认 bun pm ls 的输出格式，并编写专门的解析器。
    return [
      `bun pm ls${options.global ? " --global" : ""}`, // Bun 是否支持 --global ls？需要确认
      (output: string): [string, string][] => {
        // 目前使用 Yarn 的解析逻辑，可能不适用于 Bun 的输出。
        // Parse yarn's human-readable output (assuming bun output is similar for now)
        return output
          .split("\n")
          .reduce((acc: [string, string][], line: string): [string, string][] => {
            // 尝试匹配类似 `info "packageName@version" has binaries` 的行
            const match = line.match(/info "([^@]+)@([^"\)]+)" has binaries/) // Bun 输出格式可能不同
            return match ? [...acc, [match[1], match[2]]] : acc
          }, [])
      },
    ]
  } else if (
    // 如果指定了 yarn，或者未指定但 yarn 可用
    options.packagerName === "yarn" ||
    (options.packagerName === undefined && yarnAvailable())
  ) {
    // yarn 使用 `yarn list` 或 `yarn global list`。
    return [
      `yarn${options.global ? " global" : ""} list`,
      (output: string): [string, string][] => {
        // 解析 Yarn 的人类可读输出格式。
        // Parse yarn's human-readable output
        return output
          .split("\n")
          .reduce((acc: [string, string][], line: string): [string, string][] => {
            // 查找包含 `info "包名@版本号"` 的行。
            const match = line.match(/info "([^@]+)@([^"\)]+)" has binaries/) // 这个正则可能不适用于所有 yarn 版本或配置
            return match ? [...acc, [match[1], match[2]]] : acc
          }, [])
      },
    ]
  } else {
    // 默认使用 npm。
    // npm 使用 `npm list`，添加 `--depth=0` 只显示顶层依赖，`--json` 输出 JSON 格式。
    return [
      `npm list${options.global ? " --global" : ""} --depth=0 --json`,
      (output: string): [string, string][] => {
        // npm 返回一个 JSON 对象，其 `dependencies` 键包含依赖信息。
        // npm returns a single JSON blob with a "dependencies" key
        // 有时 npm 会在 JSON 输出前附加警告信息，需要移除它们。
        // however, sometimes npm can emit warning messages prepended to json output
        const json = JSON.parse(output.replace(/npm WARN.+/g, "")) // 移除警告行
        // 提取 dependencies 对象的键（包名）和对应的 version。
        return Object.keys(json.dependencies || []).map((key: string): [string, string] => [
          key,
          json.dependencies[key].version,
        ])
      },
    ]
  }
}

/**
 * 生成用于通过指定的包管理器运行脚本（定义在 `package.json` 的 `scripts` 中）的命令行字符串。
 * 例如，运行 `start` 脚本：`yarn start` 或 `npm run start` 或 `pnpm run start` 或 `bun run start`。
 *
 * @param command 要运行的脚本名称。
 * @param options 包操作选项，主要用到 packagerName 和 silent。
 * @returns 生成的命令行字符串。
 */
function runCmd(command: string, options: PackageOptions) {
  // 根据 options.silent 决定是否添加静默模式标志（并非所有包管理器都支持）。
  const silent = options.silent ? " --silent" : ""
  if (options.packagerName === "pnpm") {
    // pnpm 使用 `pnpm run <command>`。
    return `pnpm run ${command}${silent}` // pnpm 可能不支持 --silent for run
  } else if (options.packagerName === "yarn") {
    // yarn 可以直接运行脚本名 `yarn <command>`。
    return `yarn ${command}${silent}` // yarn 也不支持 --silent for run
  } else if (options.packagerName === "bun") {
    // bun 使用 `bun run <command>`。
    return `bun run ${command}` // bun 可能不支持 --silent for run
  } else {
    // 默认使用 npm，需要 `run` 关键字。
    // npm 使用 `npm run <command>`。
    return `npm run ${command}${silent}` // npm 支持 --silent
  }
}

/**
 * 导出的 `packager` 对象，提供了一组与包管理器交互的便捷方法。
 * 这些方法会自动检测或使用指定的包管理器，并能显示命令执行进度。
 */
export const packager = {
  /**
   * 异步运行一个 package.json 中的脚本命令。
   * @param command 要运行的脚本名称。
   * @param options 运行选项，包括 onProgress 回调。
   * @returns 一个 Promise，在命令执行完成后解析。
   */
  run: async (command: string, options: PackageRunOptions = packageInstallOptions) => {
    // 调用 runCmd 生成命令字符串，然后用 spawnProgress 执行。
    return spawnProgress(`${runCmd(command, options)}`, {
      onProgress: options.onProgress, // 传递进度回调
    })
  },
  /**
   * 异步添加（安装）一个或多个包。
   * @param pkg 要安装的包名称（可包含版本，空格分隔多个包）。
   * @param options 安装选项，包括 onProgress 回调。
   * @returns 一个 Promise，在命令执行完成后解析。
   */
  add: async (pkg: string, options: PackageRunOptions = packageInstallOptions) => {
    // 调用 addCmd 生成命令字符串，然后用 spawnProgress 执行。
    const cmd = addCmd(pkg, options)
    return spawnProgress(cmd, { onProgress: options.onProgress })
  },
  /**
   * 异步移除（卸载）一个或多个包。
   * @param pkg 要卸载的包名称。
   * @param options 移除选项，包括 onProgress 回调。
   * @returns 一个 Promise，在命令执行完成后解析。
   */
  remove: async (pkg: string, options: PackageRunOptions = packageInstallOptions) => {
    // 调用 removeCmd 生成命令字符串，然后用 spawnProgress 执行。
    const cmd = removeCmd(pkg, options)
    return spawnProgress(cmd, { onProgress: options.onProgress })
  },
  /**
   * 异步安装项目的所有依赖（相当于执行 `npm install` 或 `yarn install` 等）。
   * @param options 安装选项，包括 onProgress 回调。
   * @returns 一个 Promise，在命令执行完成后解析。
   */
  install: async (options: PackageRunOptions = packageInstallOptions) => {
    // 调用 installCmd 生成命令字符串，然后用 spawnProgress 执行。
    const cmd = installCmd(options)
    return spawnProgress(cmd, { onProgress: options.onProgress })
  },
  /**
   * 异步列出已安装的包。
   * @param options 列出选项。
   * @returns 一个 Promise，解析为包含包名和版本号的二维数组 `[packageName, packageVersion][]`。
   */
  list: async (options: PackageOptions = packageListOptions) => {
    // 调用 list 获取命令和解析函数。
    const [cmd, parseFn] = list(options)
    // 使用 spawnProgress 执行命令，然后用 parseFn 解析输出。
    return parseFn(await spawnProgress(cmd, {})) // list 通常不需要进度，所以 onProgress 为空
  },
  /**
   * 检查指定的包管理器在当前系统中是否可用。
   * @param packageManager 要检查的包管理器名称 ("yarn", "npm", "pnpm", "bun")。
   * @returns 如果可用返回 `true`，否则返回 `false`。npm 总是被认为是可用的。
   */
  has: (packageManager: "yarn" | "npm" | "pnpm" | "bun"): boolean => {
    if (packageManager === "yarn") return yarnAvailable()
    if (packageManager === "pnpm") return pnpmAvailable()
    if (packageManager === "bun") return bunAvailable()
    // 假设 npm 总是可用的，因为它是 Node.js 自带的。
    return true
  },
  /**
   * 重新导出 `detectPackager` 函数，用于检测当前环境首选的包管理器。
   */
  detectPackager,
  /**
   * 重新导出 `runCmd` 函数，用于生成运行脚本的命令字符串。
   */
  runCmd,
  /**
   * 重新导出 `addCmd` 函数，用于生成添加包的命令字符串。
   */
  addCmd,
  /**
   * 重新导出 `installCmd` 函数，用于生成安装所有依赖的命令字符串。
   */
  installCmd,
  /**
   * 重新导出 `availablePackagers` 函数，用于获取所有可用的包管理器列表。
   */
  availablePackagers,
}
