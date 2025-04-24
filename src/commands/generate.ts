import { GluegunToolbox } from "gluegun"
// 导入 GluegunToolbox 类型，用于定义工具箱对象，包含命令行工具的上下文和方法。
import { boolFlag } from "../tools/flag"
// 导入 boolFlag 函数，用于处理布尔类型的命令行标志 (flags)。
import { generateFromTemplate, runGenerator } from "../tools/generators"
// 导入 generateFromTemplate 函数，用于从模板生成文件。
// 导入 runGenerator 函数，用于执行生成器逻辑。
import { command, heading, p, warning } from "../tools/pretty"
// 导入格式化输出的辅助函数，如 command (打印命令示例), heading (打印标题), p (打印段落), warning (打印警告信息)。
import { Options } from "./new"
// 导入 'new' 命令的 Options 类型，虽然这里可能不是直接使用 'new' 的所有选项，但可能共享部分类型定义或用于未来扩展。

// 定义子目录的分隔符，通常是斜杠 '/'。
const SUB_DIR_DELIMITER = "/"

// 导出模块，定义 'generate' 命令。
module.exports = {
  // 命令的别名，用户可以使用 'g', 'generator', 'generators' 来代替 'generate'。
  alias: ["g", "generator", "generators"],
  // 命令的描述，会在帮助信息中显示。
  description: "Generates components and other features from templates",
  // 命令的执行函数。
  run: async (toolbox: GluegunToolbox) => {
    // 获取用户输入的第一个参数，通常是生成器的类型 (例如 'component', 'screen')，并转换为小写。
    const generator = toolbox.parameters.first?.toLowerCase()
    // 调用 runGenerator 函数来执行实际的生成逻辑。
    // 将 toolbox (上下文)、generate 函数 (具体的生成实现) 和 generator 类型传递给它。
    runGenerator(toolbox, generate, generator)
  },
}

/**
 * 'generate' 命令的核心执行函数。
 * @param toolbox - Gluegun 工具箱，包含参数、字符串处理、文件系统等工具。
 */
async function generate(toolbox: GluegunToolbox) {
  // 解构赋值，获取常用的工具和参数。
  const { parameters, strings } = toolbox

  // 获取要运行的生成器类型 (例如 'component', 'screen')。
  const generator = parameters.first.toLowerCase()

  // 检查用户是否通过 --dir 标志或作为第三个参数指定了目标目录。
  // 这允许用户覆盖模板定义的默认输出目录。
  const dir = parameters.options.dir ?? parameters.third

  // 获取用户指定的名称 (例如 'MyComponent')，这是第二个参数。
  let name = parameters.second
  // 如果没有提供名称，则显示警告信息和用法示例，然后退出。
  if (!name) {
    warning(`⚠️  Please specify a name for your ${generator}:`) // 提示用户需要提供名称
    p() // 打印空行
    command(`npx ignite-cli g ${generator} MyName`) // 显示正确的命令格式
    return // 退出函数
  }

  // 解析名称中可能包含的子目录路径。
  let subdirectory = "" // 初始化子目录字符串
  // 检查名称中是否包含子目录分隔符。
  if (name.indexOf(SUB_DIR_DELIMITER) > -1) {
    // 找到最后一个分隔符的位置。
    const lastSlashIndex = name.lastIndexOf(SUB_DIR_DELIMITER)
    // 提取子目录路径 (包含末尾的斜杠)。
    subdirectory = name.substring(0, lastSlashIndex + 1)
    // 提取真实的名称 (去除子目录部分)。
    name = name.substring(lastSlashIndex + 1)
  }

  // 避免生成类似 'MyComponentComponent' 这样的重复名称。
  // 将生成器类型转换为帕斯卡命名法 (PascalCase)。
  const pascalGenerator = strings.pascalCase(generator)
  // 将用户提供的名称也转换为帕斯卡命名法。
  let pascalName = strings.pascalCase(name)
  // 检查转换后的名称是否以转换后的生成器类型结尾。
  if (pascalName.endsWith(pascalGenerator)) {
    // 如果是，则打印提示信息，告知用户不需要手动添加类型后缀。
    p(`Stripping ${pascalGenerator} from end of name`)
    p(
      `Note that you don't need to add ${pascalGenerator} to the end of the name -- we'll do it for you!`,
    )
    // 从名称末尾移除生成器类型后缀。
    pascalName = pascalName.slice(0, -1 * pascalGenerator.length)
    // 显示修正后的命令示例。
    command(`npx ignite-cli generate ${generator} ${pascalName}`)
  }

  // 准备调用核心的模板生成函数。
  p() // 打印空行
  // 获取所有命令行选项。
  const options: Options = parameters.options
  // 设置默认是否覆盖已存在文件为 false。
  const defaultOverwrite = false
  // 检查用户是否通过 --overwrite 标志指定了覆盖，如果未指定或无效，则使用默认值。
  const overwrite = !options.overwrite ? defaultOverwrite : boolFlag(options.overwrite)

  // 调用 generateFromTemplate 函数执行实际的文件生成。
  // 传递生成器类型、处理后的名称、原始名称、是否跳过索引文件、是否覆盖、子目录、自定义目录和大小写选项。
  const { written, overwritten, exists } = await generateFromTemplate(generator, {
    name: pascalName, // 处理后的帕斯卡命名法名称
    originalName: name, // 用户输入的原始名称 (不含子目录)
    skipIndexFile: parameters.options.skipIndexFile, // 是否跳过自动更新 index 文件
    overwrite, // 是否覆盖已存在的文件
    subdirectory, // 解析出的子目录路径
    dir, // 用户指定的覆盖目录
    case: parameters.options.case, // 文件名大小写风格 ('pascal', 'kebab', etc.)
  })

  // 向用户报告生成结果。
  heading(`Generated new files:`) // 打印标题

  // 检查是否有文件因为已存在而被跳过。
  if (exists.length > 0) {
    // 如果有新文件被写入，则列出它们。
    if (written.length > 0) {
      written.forEach((f) => p(f)) // 打印每个新写入的文件路径
    } else {
      p(`<none>`) // 如果没有新文件写入，则显示 <none>
    }
    p() // 打印空行
    // 打印被跳过的文件列表。
    heading(`Skipped these files because they already exist:`)
    exists.forEach((f) => p(f)) // 打印每个被跳过的文件路径
    p() // 打印空行
    // 提示用户可以使用 --overwrite 标志来强制覆盖。
    heading("To overwrite these files, run the command again with the `--overwrite` flag")
  } else if (overwritten.length > 0) {
    // 如果有文件被覆盖，则列出它们。
    overwritten.forEach((f) => p(f)) // 打印每个被覆盖的文件路径
  } else {
    // 如果所有文件都是新创建的，则列出它们。
    written.forEach((f) => p(f)) // 打印每个新写入的文件路径
  }
}
