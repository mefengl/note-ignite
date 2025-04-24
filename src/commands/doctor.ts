/**
 * 这个命令检查当前的开发环境，看用户的机器是否已正确设置以运行 Ignite。
 * 这部分代码需要一些维护，因为它主要是为旧的 Ignite CLI 和 Bowser 设计的。
 * Ignite v4 ("flame") 是这两者的结合。
 */
import { GluegunToolbox } from "gluegun"
// 导入 GluegunToolbox 类型，用于定义工具箱对象，包含命令行工具的上下文和方法。
import * as os from "os"
// 导入 Node.js 的 'os' 模块，用于获取操作系统相关的信息，如平台、架构、CPU 等。
import { packager } from "../tools/packager"
// 导入 packager 工具，用于与 npm, yarn, pnpm, bun 等包管理器交互。

// 判断当前操作系统是否为 Windows。
const isWindows = process.platform === "win32"
// 判断当前操作系统是否为 macOS。
const isMac = process.platform === "darwin"

// 导出模块，定义 'doctor' 命令。
module.exports = {
  // 命令的描述，会在帮助信息中显示。
  description: "检查你的开发环境是否已正确设置以运行 Ignite。",
  // 命令的执行函数。
  run: async function (toolbox: GluegunToolbox) {
    // 从工具箱中解构出需要使用的模块和方法。
    const {
      filesystem: { separator, isFile }, // 文件系统工具：路径分隔符，判断是否为文件
      system: { run, which }, // 系统工具：执行命令，查找可执行文件路径
      print: { colors, info, table }, // 打印工具：颜色，打印信息，打印表格
      strings: { padEnd }, // 字符串工具：在末尾填充字符以达到指定长度
      meta, // 元数据工具：获取 CLI 版本、源路径等信息
    } = toolbox

    // --- 显示辅助函数 ---
    // 定义表格第一列的格式化函数，接受标签和可选长度（默认为 16），使用 padEnd 填充空格。
    const column1 = (label, length = 16) => padEnd(label || "", length)
    // 定义表格第二列的格式化函数，将标签或默认的 '-' 标黄，并用 padEnd 填充到长度 10。
    const column2 = (label) => colors.yellow(padEnd(label || "-", 10))
    // 定义表格第三列的格式化函数，将标签设为柔和色（通常是灰色）。
    const column3 = (label) => colors.muted(label)

    // --- 系统信息 ---
    info(colors.cyan("系统信息")) // 打印 "系统信息" 标题 (青色)
    const platform = process.platform // 获取操作系统平台 (例如 'darwin', 'win32', 'linux')
    const arch = os.arch() // 获取 CPU 架构 (例如 'x64', 'arm64')
    const cpus = os.cpus() || [] // 获取 CPU 核心信息列表
    const firstCpu = cpus[0] || { model: undefined } // 获取第一个 CPU 的信息，处理可能为空的情况
    const cpu = `${firstCpu.model}` // CPU 型号
    const cores = `${cpus.length} cores` // CPU 核心数
    const directory = `${process.cwd()}` // 获取当前工作目录
    // 打印系统信息表格。
    table([
      [column1("平台"), column2(platform), column3("")], // 平台
      [column1("架构"), column2(arch), column3("")], // 架构
      [column1("CPU"), column2(cores), column3(cpu)], // CPU
      [column1("目录"), column2(directory.split(separator).pop()), column3(directory)], // 当前目录名 和 完整路径
    ])

    // --- JavaScript 环境 ---
    const nodePath = which("node") // 查找 Node.js 可执行文件路径
    // 执行 'node --version' 命令获取版本号，去除 'v' 前缀。
    const nodeVersion = (await run("node --version", { trim: true })).replace("v", "")
    const npmPath = which("npm") // 查找 npm 可执行文件路径
    // 如果找到 npm，执行 'npm --version' 获取版本号。
    const npmVersion = npmPath && (await run("npm --version", { trim: true }))
    const yarnPath = which("yarn") // 查找 yarn 可执行文件路径
    // 如果找到 yarn，执行 'yarn --version' 获取版本号。
    const yarnVersion = yarnPath && (await run("yarn --version", { trim: true }))
    const pnpmPath = which("pnpm") // 查找 pnpm 可执行文件路径
    // 如果找到 pnpm，执行 'pnpm --version' 获取版本号。
    const pnpmVersion = pnpmPath && (await run("pnpm --version", { trim: true }))
    const bunPath = which("bun") // 查找 bun 可执行文件路径
    // 如果找到 bun，执行 'bun --version' 获取版本号。
    const bunVersion = bunPath && (await run("bun --version", { trim: true }))

    // 准备 Node, npm, yarn, pnpm, bun 的信息行，用于表格显示。
    const nodeInfo = [column1("Node.js"), column2(nodeVersion), column3(nodePath)]
    const npmInfo = [column1("npm"), column2(npmVersion), column3(npmPath || "未安装")]
    const yarnInfo = [column1("yarn"), column2(yarnVersion), column3(yarnPath || "未安装")]
    const pnpmInfo = [column1("pnpm"), column2(pnpmVersion), column3(pnpmPath || "未安装")]
    const bunInfo = [column1("bun"), column2(bunVersion), column3(bunPath || "未安装")]

    // 定义一个异步函数来获取指定包管理器的全局安装包列表。
    async function packageInfo(packagerName: "npm" | "yarn" | "pnpm" | "bun") {
      // 调用 packager 工具的 list 方法，设置 global 为 true。
      return (await packager.list({ packagerName, global: true })).map((nameAndVersion) => [
        // 格式化每一行，包名缩进并放在第一列，版本号在第二列。
        column1("  " + nameAndVersion[0]),
        column2(nameAndVersion[1]),
        column3(""),
      ])
    }
    // 获取 npm 和 yarn 的全局包列表。
    const npmPackages = npmPath ? await packageInfo("npm") : []
    const yarnPackages = yarnPath ? await packageInfo("yarn") : []
    // TODO: pnpm 全局包列表获取功能待实现。
    const pnpmPackages = pnpmPath
      ? [[column1("  "), column2("<no pnpm global package info available>"), column3("")]]
      : []
    // 检查是否有全局包被列出。
    const haveGlobalPackages = npmPackages.length > 0 || yarnPackages.length > 0

    // --- Expo 相关信息 ---
    // 定义获取本地项目中 Expo 版本的命令。
    const expoVersionCmd = "npm list --depth 0 expo 2>&1"
    let expoVersion // Expo 版本
    let expoWorkflow // Expo 工作流类型 (managed 或 bare)

    // 判断 Expo 工作流类型：检查 ios 和 android 原生目录是否存在。
    function expoWorkflowInfo() {
      const iosFound = isFile(`${directory}\\ios\\.xcodeproj`) // 检查 ios 目录下的 xcodeproj 文件
      const androidFound = isFile(`${directory}\\android\\.gradle`) // 检查 android 目录下的 gradle 文件
      return iosFound || androidFound // 如果任一存在，则认为是 bare 工作流
    }

    try {
      // 执行命令获取 Expo 版本信息。
      // 使用正则表达式匹配 'expo@<version>' 并提取版本号。
      expoVersion = (await run(expoVersionCmd))?.match(/expo@(.*)/)?.slice(-1)[0]
      // 判断工作流类型。
      expoWorkflow = expoWorkflowInfo() ? "bare" : "managed"
    } catch (_) {
      // 如果命令执行失败或未找到 Expo，设置默认值。
      expoVersion = "-"
      expoWorkflow = "未安装"
    }
    // 准备 Expo 信息行。
    const expoInfo = [column1("Expo"), column2(expoVersion), column3(expoWorkflow)]

    // --- 检查旧版 Expo CLI ---
    let depExpoCliInfo = null // 存储旧版 Expo CLI 信息的变量，默认为 null
    try {
      // 尝试执行 'expo-cli --version' 命令。
      const expoCliVersionOutput = await run("expo-cli --version", { trim: true })
      // 如果命令成功执行并返回了版本号。
      if (expoCliVersionOutput) {
        const expoCliVersion = expoCliVersionOutput.replace("v", "") // 去除 'v' 前缀
        // 准备警告信息行，提示用户移除已弃用的 expo-cli。
        depExpoCliInfo = [
          column1("expo global cli"),
          column2(expoCliVersion),
          column3(colors.yellow("已弃用：找到 'expo-cli'，请移除。")),
        ]
      }
    } catch (_) {
      // 如果 'expo-cli' 未安装或检查版本时出错，则不执行任何操作。
    }

    info("") // 打印空行
    info(colors.cyan(`JavaScript${haveGlobalPackages ? " (和全局安装包)" : ""}`)) // 打印 "JavaScript" 标题，如果检测到全局包，则添加提示
    // 打印 JavaScript 环境信息表格。
    table([
      nodeInfo, // Node.js 信息
      npmInfo, // npm 信息
      ...npmPackages, // npm 全局包
      yarnInfo, // yarn 信息
      ...yarnPackages, // yarn 全局包
      pnpmInfo, // pnpm 信息
      ...pnpmPackages, // pnpm 全局包 (占位符)
      bunInfo, // bun 信息
      expoInfo, // Expo 信息
      // 如果检测到旧版 expo-cli，则添加其信息行。
      ...(depExpoCliInfo ? [depExpoCliInfo] : []),
    ])

    // --- Ignite CLI 信息 ---
    info("") // 打印空行
    info(colors.cyan("Ignite")) // 打印 "Ignite" 标题
    const ignitePath = which("ignite") // 查找 ignite 命令的路径
    const igniteSrcPath = `${meta.src}` // 获取 ignite-cli 源代码的路径
    const igniteVersion = meta.version() // 获取 ignite-cli 的版本号
    const igniteTable = [] // 初始化 Ignite 信息表格数组
    // 添加 ignite-cli 行：名称、版本、路径
    igniteTable.push([column1("ignite-cli"), column2(igniteVersion), column3(ignitePath)])
    // 添加 ignite src 行：源代码目录名、完整路径
    igniteTable.push([
      column1("ignite src"),
      column2(igniteSrcPath.split(separator).pop()), // 取路径的最后一部分作为目录名
      column3(igniteSrcPath),
    ])
    table(igniteTable) // 打印 Ignite 信息表格

    // --- Android 环境 ---
    info("") // 打印空行
    info(colors.cyan("Android")) // 打印 "Android" 标题
    const androidPath = process.env.ANDROID_HOME // 获取 ANDROID_HOME 环境变量
    let javaPath = which("java") // 查找 Java 可执行文件路径
    const javaVersionCmd = "java -version 2>&1" // 获取 Java 版本的命令 (需要重定向 stderr)
    let javaVersion // Java 版本

    try {
      // 执行命令获取 Java 版本。
      // Java 版本信息通常在 stderr 的第二行，格式类似 "1.8.0_292"。
      javaVersion = javaPath && (await run(javaVersionCmd))?.match(/"(.*)"/)?.slice(-1)[0]
    } catch (_) {
      // 如果命令失败或未找到 Java，设置默认值。
      javaVersion = "-"
      javaPath = "未安装"
    }

    // 打印 Android 环境信息表格。
    table([
      [column1("Java"), column2(javaVersion), column3(javaPath)], // Java 信息
      [column1("Android_HOME"), column2("-"), column3(androidPath)], // ANDROID_HOME 信息 (版本号用 '-' 代替)
    ])

    // --- iOS 环境 (仅限 macOS) ---
    if (isMac) {
      info("") // 打印空行
      info(colors.cyan("iOS")) // 打印 "iOS" 标题
      const xcodePath = which("xcodebuild") // 查找 xcodebuild 命令路径
      // 如果找到 xcodebuild，执行 'xcodebuild -version' 获取版本号。
      // 输出格式通常是 "Xcode 13.4.1\nBuild version 13F100"，提取第二个词作为版本号。
      const xcodeVersion =
        xcodePath && (await run("xcodebuild -version", { trim: true })).split(/\s/)[1]
      // 打印 Xcode 信息表格。
      table([[column1("Xcode"), column2(xcodeVersion)]])

      // 查找 CocoaPods 命令路径。
      const cocoaPodsPath = which("pod") || ""
      // 如果找到 CocoaPods，执行 'pod --version' 获取版本号，否则设为 "未安装"。
      const cocoaPodsVersion = cocoaPodsPath
        ? await run("pod --version", { trim: true })
        : "未安装"
      // 打印 CocoaPods 信息表格。
      table([[column1("CocoaPods"), column2(cocoaPodsVersion), column3(cocoaPodsPath)]])
    }

    // --- Windows 环境 (占位符) ---
    // TODO: 在 Windows 上可以检查哪些内容？(例如 Visual Studio, .NET SDK 等)
    if (isWindows) {
      // info('')
      // info(colors.cyan('Windows'))
      // table([])
    }

    // --- 工具 ---
    info("") // 打印空行
    info(colors.cyan("工具")) // 打印 "工具" 标题
    const gitPath = which("git") // 查找 Git 命令路径
    // 如果找到 Git，执行 'git --version' 获取版本号。
    const gitVersion = gitPath && (await run("git --version", { trim: true }))
    // 准备 Git 信息行。
    const gitInfo = [column1("Git"), column2(gitVersion), column3(gitPath || "未安装")]
    // 打印工具信息表格。
    table([gitInfo])
  },
}
