// 导入 GluegunToolbox 类型，用于与 Gluegun CLI 框架交互。
import { GluegunToolbox } from "gluegun"
// 导入用于显示生成器特定帮助信息的函数。
import { showGeneratorHelp } from "../tools/generators"
// 导入用于格式化输出的辅助函数：p (段落), command (命令格式), heading (标题), direction (指示), link (链接)。
import { p, command, heading, direction, link } from "../tools/pretty"

// 导出模块，定义 'help' 命令。
module.exports = {
  // dashed: true, // 允许使用 '--help' 形式的选项 (此行通常表示选项，但在此处可能用于区分命令)
  // 定义命令的别名，用户可以使用 'ignite h' 代替 'ignite help'。
  alias: ["h"],
  // 命令的描述，用于 'ignite --help' 等场景。
  description: "显示 Ignite CLI 帮助信息",
  // 命令的执行函数。
  run: async (toolbox: GluegunToolbox) => {
    // 从工具箱中解构出 meta (CLI 元数据，如版本) 和 parameters (命令行参数)。
    const { meta, parameters } = toolbox

    // 打印一个空行，用于格式化输出。
    p()

    // --- 处理特定的帮助请求 ---
    // 检查是否有第二个命令行参数，并且该参数是 'g' 或以 'generat' 开头 (匹配 'generate')。
    if (
      parameters.second &&
      (parameters.second === "g" || parameters.second.startsWith("generat"))
    ) {
      // 如果是请求 generator 的帮助信息，则调用 showGeneratorHelp 函数并退出。
      return showGeneratorHelp(toolbox)
    }

    // --- 显示通用的帮助信息 ---
    // 打印欢迎标题，包含 Ignite CLI 的版本号。
    heading(`欢迎使用 Ignite ${meta.version()}! `)
    // 打印空行。
    p()
    // 打印 Ignite CLI 的简介。
    p("Ignite 是一个 CLI 工具，可帮助您使用经过实战检验的技术栈快速搭建新的 React Native 应用程序。")
    // 打印空行。
    p()
    // 打印 "Commands" 标题。
    heading("命令")
    // 打印空行。
    p()

    // --- new 命令 ---
    // 使用 command 辅助函数格式化 'new' 命令的帮助信息。
    command("new             ", "创建一个新的 React Native 应用程序", [ // 命令名称和描述
      "npx ignite-cli new MyApp", // 用法示例 1
      "npx ignite-cli new MyApp --bundle com.mycompany.myapp", // 用法示例 2
    ])
    // 打印空行。
    p()

    // --- generate 命令 ---
    // 使用 command 辅助函数格式化 'generate' (或别名 'g') 命令的帮助信息。
    command("generate (g)    ", "生成组件和其他应用程序功能", [ // 命令名称、别名和描述
      "npx ignite-cli generate --hello", // 用法示例 1 (可能是特定生成器的快捷方式)
      "npx ignite-cli generate component Hello", // 用法示例 2 (生成组件)
      "npx ignite-cli generate model User", // 用法示例 3 (生成模型)
      "npx ignite-cli generate screen Login", // 用法示例 4 (生成屏幕)
      "npx ignite-cli generate component Hello --dir src/components", // 用法示例 5 (指定目录生成组件)
    ])
    // 打印空行。
    p()

    // --- doctor 命令 ---
    // 使用 command 辅助函数格式化 'doctor' 命令的帮助信息。
    command(
      "doctor          ", // 命令名称
      "检查您的环境并显示已安装依赖项的版本", // 命令描述
      ["npx ignite-cli doctor"], // 用法示例
    )
    // 打印空行。
    p()

    // --- rename 命令 ---
    // 使用 command 辅助函数格式化 'rename' 命令的帮助信息。
    command("rename          ", "重命名您的 React Native 项目 (实验性功能)", [ // 命令名称和描述 (标记为实验性)
      "npx ignite-cli rename NewName com.mycompany.newname", // 用法示例
    ])
    // 打印空行。
    p()

    // --- remove-demo 命令 ---
    // 使用 command 辅助函数格式化 'remove-demo' (或别名 'rd') 命令的帮助信息。
    command(
      "remove-demo (rd)", // 命令名称和别名
      "从项目中移除演示代码 (添加 --dry-run 只列出更改而不执行)", // 命令描述和 --dry-run 选项说明
      ["npx ignite-cli remove-demo", "npx ignite-cli remove-demo --dry-run"], // 用法示例
    )
    // 打印空行。
    p()

    // --- remove-demo-markup 命令 ---
    // 使用 command 辅助函数格式化 'remove-demo-markup' (或别名 'rdm') 命令的帮助信息。
    command(
      "remove-demo-markup (rdm)", // 命令名称和别名
      "从项目中移除 @demo 标记 (添加 --dry-run 只列出更改而不执行)", // 命令描述和 --dry-run 选项说明
      ["npx ignite-cli remove-demo-markup", "npx ignite-cli remove-demo-markup --dry-run"], // 用法示例
    )
    // 打印空行。
    p()

    // --- 附加信息和链接 ---
    // 使用 direction 和 link 辅助函数打印文档链接。
    direction(
      `查看文档: ${link("https://github.com/infinitered/ignite/tree/master/docs")}`,
    )
    // 打印空行。
    p()
    // 使用 direction 和 link 辅助函数打印 Slack 社区链接。
    direction(
      `如果您需要其他帮助，请加入我们的 Slack: ${link("http://community.infinite.red")}`,
    )
    // 打印空行。
    p()
  },
}
