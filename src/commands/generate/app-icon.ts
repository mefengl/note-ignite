import { GluegunToolbox } from "gluegun"
// 导入 GluegunToolbox 类型，用于定义工具箱对象，包含命令行工具的上下文和方法。
import { generateAppIcons, runGenerator, validateAppIconGenerator } from "../../tools/generators"
// 导入 generateAppIcons 函数，用于生成应用程序图标。
// 导入 runGenerator 函数，用于执行生成器逻辑。
// 导入 validateAppIconGenerator 函数，用于验证生成应用图标的前提条件是否满足。
import { heading, p, warning } from "../../tools/pretty"
// 导入格式化输出的辅助函数，如 heading (打印标题), p (打印段落), warning (打印警告信息)。

// 导出模块，定义 'app-icon' 子命令 (属于 'generate' 命令下)。
module.exports = {
  // 命令的别名，用户可以使用 'generate launcher-icon'。
  alias: ["launcher-icon"],
  // 命令的描述，会在帮助信息中显示。
  description: "Generates app-icons from templates",
  // 命令的执行函数。
  run: async (toolbox: GluegunToolbox) => {
    // 获取当前执行的子命令名称 (应该是 'app-icon' 或 'launcher-icon')，并转换为小写。
    // 注意：这里获取的是 command 而不是 first parameter，因为它是 generate 的子命令。
    const generator = toolbox.parameters.command?.toLowerCase()
    // 调用 runGenerator 函数来执行实际的生成逻辑。
    // 将 toolbox (上下文)、generate 函数 (具体的生成实现) 和 generator 类型传递给它。
    runGenerator(toolbox, generate, generator)
  },
}

/**
 * 'generate app-icon' 命令的核心执行函数。
 * @param toolbox - Gluegun 工具箱，包含参数、文件系统等工具。
 */
async function generate(toolbox: GluegunToolbox) {
  // 从工具箱中解构出 parameters 对象，用于访问命令行参数和选项。
  const { parameters } = toolbox

  // 调用 validateAppIconGenerator 函数，验证生成图标所需的环境和配置是否就绪。
  // 目前硬编码为 'expo' 平台，并传递命令行选项。
  // 它会检查例如源图标文件是否存在等。
  const { isValid, messages } = await validateAppIconGenerator("expo", parameters.options)

  // 如果验证未通过 (isValid 为 false)。
  if (!isValid) {
    // 遍历验证过程中产生的错误或警告信息。
    messages.forEach((message) => warning(message)) // 使用 warning 函数打印每条信息。
    return // 退出函数，不继续执行生成。
  }

  // 如果验证通过，则调用 generateAppIcons 函数执行实际的图标生成操作。
  // 目前硬编码为 'expo' 平台。这个函数会处理图片缩放、放置到对应平台目录等逻辑。
  const isSuccessful = await generateAppIcons("expo")

  // 检查图标生成是否成功。
  if (isSuccessful) {
    // 如果成功，打印成功的标题。
    heading(`App icons generated!`)
    // 打印提示信息，告知用户需要重新安装和构建应用才能看到图标变化。
    p(
      "Uninstall the application from your simulator/emulator and re-build your app to see the changes!",
    )
  }
  // 如果生成失败 (isSuccessful 为 false)，目前没有显式的错误处理，
  // generateAppIcons 内部可能已经打印了错误信息。
}
