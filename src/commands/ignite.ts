// 导入 'GluegunToolbox' 类型定义。
// 'GluegunToolbox' 是一个包含了 gluegun 提供的所有工具和上下文信息的大对象。
// 当我们编写一个命令时，gluegun 会把这个 'toolbox' 对象传递给我们的命令执行函数（run 函数）。
// 我们可以从这个 'toolbox' 里拿出各种方便的工具，比如参数解析器 (parameters)、打印工具 (print)、文件系统工具 (filesystem) 等等。
// 这就像一个瑞士军刀，里面集成了各种我们需要的功能。
import { GluegunToolbox } from "gluegun"

// 使用 Node.js 的 module.exports 导出一个对象，这个对象就代表了一个 gluegun 命令。
// gluegun 会自动加载并识别这种格式的对象作为命令定义。
module.exports = {
  // 'description': 命令的简短描述。
  // 这个描述通常会显示在帮助信息里，告诉用户这个命令是干什么的。
  // 这里的 图标增加了趣味性。
  description: " The Ignite CLI ",

  // 'run': 这是命令的核心执行函数，必须是一个异步函数 (async)。
  // 当用户在命令行里输入 `ignite` (或者 `ignite-cli`) 并回车时，这个函数就会被调用。
  // 它接收一个参数 `toolbox`，就是我们前面提到的那个包含各种工具的 GluegunToolbox 对象。
  run: async (toolbox: GluegunToolbox) => {
    // 从 'toolbox' 对象中解构出我们需要的工具和信息。
    // 这是一种 JavaScript/TypeScript 的语法糖，可以方便地从对象中提取属性。
    const {
      // 'parameters': 这是 gluegun 提供的参数解析器。
      // 我们可以从 `parameters` 中获取用户输入的命令、选项和参数。
      // '{ first }' 从 `parameters` 中提取出第一个参数（也就是紧跟在 `ignite` 后面的那个词）。
      // 例如，用户输入 `ignite foo`，那么 `first` 的值就是 "foo"。
      parameters: { first },
      // 'print': 这是 gluegun 提供的打印工具。
      // 我们可以用它在控制台打印各种信息，比如普通消息、成功信息、错误信息、警告信息等。
      // '{ error }' 从 `print` 中提取出打印错误信息的函数。
      print: { error },
      // 注意：这里可以解构出更多 toolbox 里的工具，比如 filesystem, system, template 等，
      // 但这个命令目前只需要用到 parameters 和 print.error。
    } = toolbox

    // 检查用户是否在 `ignite` 后面输入了其他东西 (`first` 是否有定义)。
    if (first !== undefined) {
      // 如果 `first` 不是 undefined，说明用户输入了类似 `ignite foo` 这样的命令。
      // 但是 `ignite.ts` 只处理根命令 `ignite` 本身，不处理子命令。
      // 所以，如果 `first` 存在，说明用户可能输入了一个不存在的命令。
      // 调用 `error()` 函数在控制台打印一条错误消息，提示用户输入的不是一个有效的命令。
      // 例如，用户输入 `ignite blabla`，会提示 "ignite-cli 'blabla' is not a command"。
      error(`ignite-cli '${first}' is not a command`)
    } else {
      // 如果 `first` 是 undefined，说明用户只输入了 `ignite`，没有跟任何子命令或参数。
      // 在这种情况下，这个根命令的行为是显示帮助信息。
      // `require("./help")` 加载同目录下的 `help.ts` 命令模块。
      // `.run(toolbox)` 调用 `help` 命令的 `run` 函数，并把当前的 `toolbox` 传递给它。
      // 这样，`help` 命令就可以利用当前的上下文信息来显示帮助内容了。
      // `return` 将 `help` 命令的执行结果返回。
      return require("./help").run(toolbox)
    }
  },
}
