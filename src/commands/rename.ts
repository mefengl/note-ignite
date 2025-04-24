// 导入 GluegunToolbox 类型，用于与 Gluegun CLI 框架交互。
import { GluegunToolbox } from "gluegun"
// 导入用于格式化输出的辅助函数：direction (指示), heading (标题), p (段落), warning (警告信息)。
import { direction, heading, p, warning } from "../tools/pretty"
// 导入用于重命名 React Native 应用的核心函数。
import { renameReactNativeApp } from "../tools/react-native"

// 导出模块，定义 'rename' 命令。
module.exports = {
  // 定义命令的别名，用户可以使用 'ignite rn'。
  alias: ["rn"],
  // 命令的描述，解释其功能。
  description: "重命名 React Native 和/或 Ignite 应用",
  // 命令的执行函数。
  run: async (toolbox: GluegunToolbox) => {
    // 从工具箱中解构出需要的工具：parameters (命令行参数), prompt (交互式提示), filesystem (文件系统操作), print (打印信息)。
    const { parameters, prompt, filesystem, print } = toolbox
    // 从 print 工具中解构出 colors (颜色) 和 info (信息打印函数)。
    const { colors, info } = print
    // 从 colors 中解构出 red (红色) 和 green (绿色)，用于高亮显示信息。
    const { red, green } = colors

    // 获取用户传入的新应用名称（第一个命令行参数）。
    let newName = parameters.first
    // 获取用户传入的新 Bundle Identifier（通过 --bundle 选项）。
    let newBundleIdentifier = parameters.options.bundle

    // 定义 app.json 文件的路径（位于当前工作目录下）。
    const appJsonPath = `${process.cwd()}/app.json`
    // 第一步：检查当前目录是否为 React Native 项目的根目录。
    // 通过查找 app.json 文件来验证。
    if (!filesystem.exists(appJsonPath)) {
      warning("你必须在 React Native 项目的根目录下才能重命名。")
      warning("(我们会查找 app.json 文件来确认。)")
      return // 如果不在项目根目录，则退出命令。
    }

    // 第二步：获取当前的应用名称。
    // 加载 app.json 文件内容。
    const appJson = require(appJsonPath)
    // 从 app.json 中读取 'name' 字段。
    const oldName = appJson.name
    // 如果无法获取当前名称，则打印警告并退出。
    if (!oldName) {
      warning("在 app.json 中找不到当前的应用名称。")
      return
    }

    // 第三步：获取当前的 Bundle Identifier (包名)。
    // 优先从 Android 配置获取，如果不存在则从 iOS 配置获取。
    // 这是为了兼容 Ignite v9+ 可能没有原生 android/ios 目录的情况 (例如 Expo Managed Workflow)。
    const oldBundleIdentifier = appJson.expo.android.package ?? appJson.expo.ios.bundleIdentifier
    // 如果无法获取当前的 Bundle Identifier，则打印警告并退出。
    if (!oldBundleIdentifier) {
      // warning("Couldn't find the current bundle identifier in app.json.") // 更准确的警告信息
      warning("在 app.json 中找不到当前的包名。") 
      return
    }

    // 第四步：获取并验证新的应用名称和 Bundle Identifier。
    // 验证新名称：
    if (!newName) {
      // 如果用户没有通过命令行参数提供新名称，则通过交互式提示询问用户。
      const result = await prompt.ask({
        type: "input", // 输入类型
        name: "newName", // 结果存储的键名
        message: `你想将应用重命名为什么？当前名称: ${oldName}`, // 提示信息
      })
      // 将用户输入的新名称赋值给 newName 变量。
      newName = result.newName
    }

    // 如果经过提示后仍然没有获取到新名称，则打印警告并退出。
    if (!newName) {
      warning("未提供新名称，无法执行操作。")
      return
    }

    // 验证新 Bundle Identifier：
    if (!newBundleIdentifier) {
      // 如果用户没有通过 --bundle 选项提供新的 Bundle Identifier，则通过交互式提示询问用户。
      const result = await prompt.ask({
        type: "input",
        name: "newBundleIdentifier",
        message: `你想将应用的包名重命名为什么？当前包名: ${oldBundleIdentifier}`,
      })
      // 将用户输入的新 Bundle Identifier 赋值给 newBundleIdentifier 变量。
      newBundleIdentifier = result.newBundleIdentifier
    }

    // 如果经过提示后仍然没有获取到新的 Bundle Identifier，则打印警告并退出。
    if (!newBundleIdentifier) {
      warning("未提供新包名，无法执行操作。")
      return
    }

    // 第五步：执行重命名操作前的最后检查。
    // 检查新旧名称和包名是否都相同。
    if (oldName === newName && oldBundleIdentifier === newBundleIdentifier) {
      warning("新旧应用名称和包名都相同，无需重命名。")
      return
    }
    // 检查新旧名称是否相同。
    if (oldName === newName) {
      warning("当前应用名称和新名称相同。")
    }
    // 检查新旧包名是否相同。
    if (oldBundleIdentifier === newBundleIdentifier) {
      warning("当前包名和新包名相同。")
    }


    // 第六步：调用核心函数执行重命名。
    // 传入工具箱、旧名称、新名称、旧包名、新包名。
    await renameReactNativeApp(toolbox, oldName, newName, oldBundleIdentifier, newBundleIdentifier)

    // 第七步：显示成功信息和注意事项。
    // 打印成功标题，高亮显示旧名称（红色）和新名称（绿色）。
    heading(`Ignite 已成功将你的应用从 ${red(oldName)} 重命名为 ${green(newName)}！`)
    p() // 打印空行
    heading(`注意事项:`)
    p() // 打印空行
    // 打印具体注意事项。
    info(`    * Ignite 的重命名功能在所有情况下并非 100% 完美。`)
    info(`      在提交更改之前，请使用 'git diff' 仔细检查它产生的差异。`)
    info(`    * 此外，你可能需要重新运行 'pod install' 并`)
    info(`      重新构建你的应用和清除缓存。我们不会对这些文件或文件夹进行任何更改。`)
    p() // 打印空行
    // 提供后续操作指引。
    direction(`下一步: 运行 'git diff' 查看我们所做的更改。`)
    direction(`要重置所有内容: 运行 'git reset --hard && git clean -fd'`)
    warning(`(注意: 这将删除你尚未提交的所有其他更改！)`) // 强调重置命令的风险
  },
}
