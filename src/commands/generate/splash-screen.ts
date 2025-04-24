import { GluegunToolbox } from "gluegun"
// 导入 GluegunToolbox 类型，用于定义工具箱对象，包含命令行工具的上下文和方法。
import {
  generateSplashScreen, // 导入生成启动屏的核心函数
  runGenerator, // 导入执行生成器逻辑的通用函数
  validateSplashScreenGenerator, // 导入验证启动屏生成器前提条件的函数
} from "../../tools/generators"
// 从生成器工具模块导入所需函数。
import { command, heading, p, warning } from "../../tools/pretty"
// 导入格式化输出的辅助函数，如 command (打印命令示例), heading (打印标题), p (打印段落), warning (打印警告信息)。

// 导出模块，定义 'splash-screen' 子命令 (属于 'generate' 命令下)。
module.exports = {
  // 命令的别名，用户可以使用 'generate splash'。
  alias: ["splash"],
  // 命令的描述，会在帮助信息中显示。
  description: "Generates splash-screen from templates",
  // 命令的执行函数。
  run: async (toolbox: GluegunToolbox) => {
    // 获取当前执行的子命令名称 (应该是 'splash-screen' 或 'splash')，并转换为小写。
    const generator = toolbox.parameters.command?.toLowerCase()
    // 调用 runGenerator 函数来执行实际的生成逻辑。
    // 将 toolbox (上下文)、generate 函数 (具体的生成实现) 和 generator 类型传递给它。
    runGenerator(toolbox, generate, generator)
  },
}

/**
 * 'generate splash-screen' 命令的核心执行函数。
 * @param toolbox - Gluegun 工具箱，包含参数、文件系统等工具。
 */
async function generate(toolbox: GluegunToolbox) {
  // 从工具箱中解构出 parameters 对象，用于访问命令行参数和选项。
  const { parameters } = toolbox

  // 获取正在运行的生成器类型（即 'splash-screen' 或 'splash'）。
  const generator = parameters.command.toLowerCase()

  // 获取用户提供的第一个参数作为启动屏的背景颜色。
  let backgroundColor = parameters.first

  // 从命令行选项中获取 Android 和 iOS 图标的可选尺寸。
  // 使用解构赋值并提供默认值 (androidSize=180, iosSize=212)。
  // 将剩余的选项存入 'options' 对象。
  let { androidSize = 180, iosSize = 212, ...options } = parameters.options || {}

  // 检查用户是否提供了背景颜色。
  if (!backgroundColor) {
    // 如果没有提供背景颜色，则显示警告信息。
    warning(
      `⚠️  Please specify the background color of the screen that will be used to generate the splash screen.`,
    )
    p() // 打印空行
    // 显示正确的命令用法示例。
    command(`npx ignite-cli g ${generator} "#191015" [--android-size=180 --ios-size=212]`)
    return // 退出函数
  }

  // 强制类型转换：确保尺寸是数字类型，即使它们是以字符串形式传入的（例如用户加了引号）。
  androidSize = Number(androidSize)
  iosSize = Number(iosSize)
  // 强制类型转换：确保背景颜色是字符串，并检查是否以 '#' 开头，如果不是则添加 '#'。
  // 这处理了用户可能输入 '191015' 而不是 '#191015' 的情况。
  backgroundColor = String(backgroundColor).startsWith("#")
    ? backgroundColor
    : `#${backgroundColor}`

  // 调用 validateSplashScreenGenerator 函数，验证生成启动屏所需的环境和配置是否就绪。
  // 传递解析后的尺寸、背景颜色以及其他选项。
  // 它会检查例如源图标文件是否存在等。
  const { isValid, messages } = await validateSplashScreenGenerator(
    { androidSize, iosSize, backgroundColor }, // 包含尺寸和颜色的对象
    options, // 其他命令行选项
  )

  // 如果验证未通过 (isValid 为 false)。
  if (!isValid) {
    // 遍历验证过程中产生的错误或警告信息。
    messages.forEach((message) => warning(message)) // 使用 warning 函数打印每条信息。
    return // 退出函数，不继续执行生成。
  }

  // 如果验证通过，则调用 generateSplashScreen 函数执行实际的启动屏生成操作。
  // 传递包含尺寸和背景颜色的对象。
  const isSuccessful = await generateSplashScreen({ androidSize, iosSize, backgroundColor })

  // 检查启动屏生成是否成功。
  if (isSuccessful) {
    // 如果成功，打印成功的标题。
    heading(`Splash screen generated!`)
    // 打印提示信息，告知用户需要清理构建缓存、重新安装并构建应用才能看到变化。
    p(
      "Uninstall the application from your simulator/emulator, run `prebuild:clean` and re-build your app to see the changes!",
    )
    // 针对原生 Android 的注意事项。
    p(
      "Note: (vanilla Android) The splash-screen will not appear if you launch your app via the terminal or Android Studio. Kill the app and launch it normally by tapping on the launcher icon. https://stackoverflow.com/a/69831106",
    )
    // 针对原生 iOS 的注意事项。
    p(
      "Note: (vanilla iOS) You might notice the splash-screen logo change size. This happens in debug/development mode. Try building the app for release.",
    )
  }
  // 如果生成失败 (isSuccessful 为 false)，目前没有显式的错误处理，
  // generateSplashScreen 内部可能已经打印了错误信息。
}
