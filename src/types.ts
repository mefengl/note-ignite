// 这个文件就像一个“字典”或者“说明书”，专门用来定义我们在这个项目中会用到的一些特殊“名词”的含义和格式。
// 在编程里，我们把这些“名词”叫做“类型”(Type)。定义类型的好处是，可以帮助我们更清楚地知道某个变量应该是什么样子的，
// 防止我们不小心用错，就像说明书告诉你这个玩具零件应该插在哪里一样。

// 这一行是从一个叫做 'gluegun' 的工具包里，导入了两个已经定义好的类型：GluegunCommand 和 GluegunToolbox。
// 'gluegun' 是一个帮助我们创建命令行工具（就是在黑色窗口里敲命令的那种程序）的库。
// GluegunCommand： 大概定义了一个“命令”应该长什么样，比如命令的名字、怎么运行等等。
// GluegunToolbox： 大概定义了一个“工具箱”，里面放了很多有用的工具函数，比如操作文件、显示信息等，方便我们在写命令的时候使用。
// 我们在这里把它们“导出”(export)，意味着我们项目里其他地方的代码也可以直接使用这两个从 'gluegun' 来的类型。
export { GluegunCommand, GluegunToolbox } from "gluegun"

// 这里我们定义了一个新的类型，叫做 CLIType。
// 'CLI' 是命令行界面 (Command Line Interface) 的缩写。
// 这个类型规定了，如果我们有一个变量是 CLIType 类型的，那么它的值 *只能* 是下面这四个字符串中的一个：
// 'ignite-classic': 代表旧版的 Ignite CLI。
// 'react-native-cli': 代表 React Native 官方提供的 CLI。
// 'expo-cli': 代表 Expo 框架提供的 CLI。
// 'create-react-native-app': 代表早期创建 React Native 应用的一个工具。
// 使用这种类型可以确保我们不会把 CLI 的类型写错，比如写成 'expocli' 或者其他不存在的类型。
export type CLIType = "ignite-classic" | "react-native-cli" | "expo-cli" | "create-react-native-app"

// 这里我们定义了另一个类型，叫做 CLIOptions。
// 'Options' 的意思是“选项”。这个类型描述了在运行我们的命令行工具时，可以提供哪些选项。
// 它规定了 CLIOptions 类型的变量必须是一个“对象”（Object），这个对象里面必须包含两个属性：
// 1. cli: 这个属性的类型必须是我们上面定义的 CLIType。也就是说，它的值必须是那四个字符串之一。
// 2. template: 这个属性的类型是 'string'，意思是它必须是一个字符串。这个字符串可能代表要使用的项目模板的名字或者路径。
// 这个类型帮助我们把相关的选项组织在一起，并且明确了每个选项应该是什么格式。
export type CLIOptions = {
  cli: CLIType
  template: string
}
