// 导入 'gluegun' 工具箱中的 'build' 函数。
// 'gluegun' 是一个专门用来帮助我们创建命令行界面 (CLI) 工具的工具箱。
// 就像一个乐高积木盒，里面有很多预先做好的零件（函数和模块），
// 我们可以用这些零件快速搭建出自己的命令行程序。
// 'build' 函数就是用来搭建我们 CLI 程序骨架的最重要的零件之一。
import { build } from "gluegun"

// 定义一个异步函数 'run'，它接收一个参数 'argv'。
// 'async function' 表示这个函数里面可能会执行一些需要等待的操作（比如读取文件、网络请求等），
// 但它不会阻塞整个程序的运行。
// 'argv' (argument vector 的缩写) 通常代表用户在命令行里输入的参数数组。
// 比如用户输入 `ignite new MyApp --bundle=com.myapp`，那么 `argv` 就可能包含 `['new', 'MyApp', '--bundle=com.myapp']` 这些信息。
// 这个 'run' 函数是整个 CLI 程序的入口点，所有的命令执行都是从这里开始的。
async function run(argv) {
  // 使用 'build()' 函数开始创建一个 CLI 的运行时（runtime）实例。
  // 这就像开始搭建乐高模型的第一步，先拿出基础的底板。
  const cli = build()
    // '.brand("ignite-cli")' 给我们的 CLI 设置一个“品牌名称”。
    // 这个名称可能会用在帮助信息、版本信息等地方，让用户知道他们正在使用哪个工具。
    // 就像给你的乐高模型取个名字，比如“宇宙飞船号”。
    .brand("ignite-cli")
    // '.exclude(["semver", "http", "template"])' 告诉 gluegun 不要加载它自带的这几个扩展插件。
    // 'gluegun' 自带了一些常用的功能插件，比如处理版本号(semver)、发送网络请求(http)、处理模板(template)。
    // 这里我们选择不使用这些内置插件，可能是因为 Ignite CLI 实现了自己的版本处理、网络请求或模板逻辑，
    // 或者根本用不到这些功能。就像搭建乐高时，你决定不使用某些特定形状的积木。
    .exclude(["semver", "http", "template"])
    // '.src(__dirname)' 指定了我们自己编写的命令和扩展插件所在的目录。
    // '__dirname' 是 Node.js 中的一个特殊变量，它代表当前这个文件（cli.ts）所在的目录的绝对路径。
    // 这告诉 gluegun 去这个目录下查找我们定义的各种命令（比如 `new`, `generate` 等）和扩展功能。
    // 就像告诉乐高说明书，我们自定义的零件都放在哪个盒子里。
    .src(__dirname)
    // '.defaultCommand(require("./commands/help"))' 设置默认命令。
    // 如果用户只输入了 `ignite-cli` 而没有指定任何命令（比如 `new` 或 `generate`），
    // 那么就执行这里指定的默认命令，通常是显示帮助信息。
    // `require("./commands/help")` 加载了 `commands` 目录下的 `help` 命令模块。
    // 就像你按了一下乐高模型的总开关，它默认会亮起指示灯（显示帮助信息）。
    .defaultCommand(require("./commands/help"))
    // '.create()' 完成 CLI 实例的创建。
    // 这是搭建过程的最后一步，把所有配置好的零件组装起来，形成一个完整的、可以运行的 CLI 实例。
    // 乐高模型搭建完成！
    .create()

  // 'cli.run(argv)' 运行我们刚刚创建好的 CLI 实例，并把用户输入的参数 'argv' 传给它。
  // CLI 会解析这些参数，找到对应的命令并执行。
  // 比如用户输入 `ignite new MyApp`，`cli.run` 就会找到 `new` 命令，把 `MyApp` 作为参数传给它去执行。
  // 就像你启动了你的乐高模型，它开始按照指令行动。
  // 这个函数会返回一个结果，通常是命令执行的状态或者输出。
  return cli.run(argv)
}

// 'module.exports = { run }' 把 'run' 函数导出，使其可以被其他文件调用。
// 在 Node.js 环境中，这是标准的模块导出方式。
// 这样，其他需要启动 CLI 的地方（比如项目根目录下的 `bin/ignite-cli` 执行脚本）就可以导入并调用这个 `run` 函数了。
// 就像给你的乐高模型装上了一个遥控器接口，让其他程序可以控制它。
module.exports = { run }
