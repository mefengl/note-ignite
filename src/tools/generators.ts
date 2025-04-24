// 导入 ejs 模板引擎，用于处理模板文件。
import * as ejs from "ejs"
// 导入 gluegun 框架的核心模块：filesystem 用于文件操作, GluegunToolbox 提供工具箱上下文,
// GluegunPatchingPatchOptions 定义补丁选项类型, patching 用于文件修改, strings 提供字符串处理工具。
import { filesystem, GluegunToolbox, GluegunPatchingPatchOptions, patching, strings } from "gluegun"
// 导入 gluegun 的 Options 类型，用于表示命令行选项。
import { Options } from "gluegun/build/types/domain/options"
// 导入 sharp 库，用于图像处理，例如生成 app 图标和启动屏。
import * as sharp from "sharp"
// 导入 yaml 库，用于解析 YAML 格式的 front matter。
import * as YAML from "yaml"
// 从 ./pretty 模块导入格式化输出的辅助函数，用于在控制台打印美观的消息。
import { command, direction, heading, igniteHeading, link, p, warning } from "./pretty"

// 定义换行符常量，使用 gluegun 的 filesystem.eol 保证跨平台兼容性。
const NEW_LINE = filesystem.eol

/**
 * 运行指定的生成器函数。
 * 这个函数是生成器命令的入口点，根据用户输入的参数决定执行哪个操作：
 * 显示帮助信息、更新生成器模板或执行实际的生成逻辑。
 *
 * @param toolbox Gluegun 工具箱，包含命令行参数、文件系统访问等工具。
 * @param generateFunc 实际执行生成逻辑的异步函数。
 * @param generator 可选的生成器名称。如果提供了，会先验证该生成器是否有效。
 */
export function runGenerator(
  toolbox: GluegunToolbox,
  generateFunc: (toolbox: GluegunToolbox) => Promise<void>,
  generator?: string,
) {
  // 从工具箱中解构出命令行参数。
  const { parameters } = toolbox

  // 打印一个空行，用于格式化输出。
  p()
  // 检查用户是否请求帮助 (--help) 或列表 (--list)。
  if (parameters.options.help || parameters.options.list) {
    // 如果是，则显示生成器的帮助信息。
    showGeneratorHelp(toolbox)
  // 检查用户是否请求更新生成器模板 (--update)。
  } else if (parameters.options.update) {
    // 如果是，则执行更新生成器模板的操作。
    updateGenerators(toolbox)
  } else {
    // 如果既不是请求帮助/列表，也不是请求更新。
    // 检查是否提供了具体的生成器名称。
    if (generator) {
      // 如果提供了生成器名称，验证其有效性。
      const isValid = validateGenerator(generator)
      // 如果生成器名称无效，则直接返回，不执行后续操作。
      if (!isValid) return
    } else {
      // 如果没有提供生成器名称（例如直接运行 `ignite-cli generate`），
      // 则默认显示帮助信息。
      showGeneratorHelp(toolbox)
      // 显示帮助后返回，不执行生成逻辑。
      return
    }

    // 如果生成器有效（或未提供但走到了这里，理论上不会发生，因为上面会显示帮助），
    // 则调用传入的 generateFunc 执行实际的生成逻辑。
    generateFunc(toolbox)
  }
}

function validateGenerator(generator?: string) {
  const generators = installedGenerators()

  if (!generators.includes(generator)) {
    warning(`⚠️  Generator "${generator}" isn't installed.`)
    p()

    if (availableGenerators().includes(generator)) {
      direction("Install the generator with:")
      p()
      command(`npx ignite-cli generate ${generator} --update`)
      p()
      direction("... and then try again!")
    } else {
      direction("Check your spelling and try again")
    }

    return false
  }

  return true
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function showGeneratorHelp(toolbox: GluegunToolbox) {
  igniteHeading()
  heading("Ignite Generators")
  p()
  p("When you create a new app with Ignite CLI, it will install several generator")
  p("templates in the project folder under the `ignite/templates` folder.")
  p()
  heading("Commands")
  p()
  command("--list  ", "List installed generators", ["npx ignite-cli --list"])
  command(
    "--update",
    "Update installed generators. You can also use the 'npx ignite-cli update X' format",
    [
      "npx ignite-cli --update",
      `npx ignite-cli model --update`,
      `npx ignite-cli update model`,
      `npx ignite-cli update --all`,
    ],
  )
  warning("          ⚠️  this erases any customizations you've made!")
  p()
  heading("Options")
  p()
  command("--dir", "Override front matter or default path for generated files", [
    "npx ignite-cli g model Episodes --dir src/models",
  ])
  command("--case", "Formats the generated filename", [
    "npx ignite-cli g model episode --case=auto",
    "npx ignite-cli g model episode --case=pascal",
    "npx ignite-cli g model episode --case=kebab",
    "npx ignite-cli g model episode --case=snake",
    "npx ignite-cli g model episode --case=none",
  ])
  p()
  heading("Installed generators")
  p()
  showGenerators()
}

/**
 * 显示当前项目中已安装的 Ignite 生成器列表。
 * 它会检查是否在 Ignite 项目根目录，然后列出 `ignite/templates` 目录下的所有子目录作为生成器。
 * 对于特殊的 `app-icon` 和 `splash-screen` 生成器，会显示特定的用法示例。
 */
function showGenerators() {
  // 检查当前目录是否为 Ignite 项目的根目录。
  if (!isIgniteProject()) {
    // 如果不是，则打印警告信息并返回。
    warning("⚠️  Not in an Ignite project root. Go to your Ignite project root to see generators.")
    return
  }

  // 获取已安装的生成器列表。
  const generators = installedGenerators()
  // 计算最长的生成器名称长度，用于对齐输出。
  const longestGen = generators.reduce((c, g) => Math.max(c, g.length), 0)
  // 遍历所有已安装的生成器。
  generators.forEach((g) => {
    if (g === "app-icon") {
      // 特殊处理 app-icon 生成器：显示其特定描述和用法。
      // specialty app-icon generator
      command(g.padEnd(longestGen), `生成 app 图标`, [
        `npx ignite-cli ${g} all|ios|android|expo`,
      ])
    } else if (g === "splash-screen") {
      // 特殊处理 splash-screen 生成器：显示其特定描述和用法。
      // specialty splash-screen generator
      command(g.padEnd(longestGen), `生成启动屏`, [
        `npx ignite-cli ${g} "#191015" [--android-size=180 --ios-size=212]`,
      ])
    } else {
      // 处理标准的生成器：显示通用描述和用法。
      // standard generators
      command(g.padEnd(longestGen), `生成 ${g}`, [`npx ignite-cli ${g} Demo`])
    }
  })
}

/**
 * 更新项目中已安装的 Ignite 生成器。
 * 可以更新指定的生成器，也可以更新所有可用的生成器。
 * 它会从 Ignite CLI 的源模板目录复制最新的模板文件到项目的 `ignite/templates` 目录。
 *
 * @param toolbox Gluegun 工具箱，用于访问命令行参数等。
 */
export function updateGenerators(toolbox: GluegunToolbox) {
  const { parameters } = toolbox // 解构获取命令行参数

  // 检查当前目录是否为 Ignite 项目的根目录。
  if (!isIgniteProject()) {
    // 如果不是，则打印警告信息并返回。
    warning("⚠️  Not in an Ignite project root. Go to your Ignite project root to see generators.")
    return
  }

  let generatorsToUpdate: string[] // 定义要更新的生成器列表
  if (parameters.first) {
    // 如果命令行提供了第一个参数（生成器名称），则只更新这一个。
    // only update the specified one
    generatorsToUpdate = [parameters.first]
  } else {
    // 否则，获取所有可用的生成器进行更新。
    // update any available generators
    generatorsToUpdate = availableGenerators()
  }

  // 调用 installGenerators 函数执行实际的复制更新操作，并返回实际被修改（更新）的生成器列表。
  const changes = installGenerators(generatorsToUpdate)
  // 定义一个去重函数。
  const distinct = (val, index, self) => self.indexOf(val) === index
  // 合并“计划更新”和“实际更新”的列表，去重并排序，得到所有涉及的生成器。
  const allGenerators = changes.concat(generatorsToUpdate).filter(distinct).sort()

  // 显示更新结果的标题。
  heading(`Updated ${changes.length} generator${changes.length === 1 ? "" : "s"}`)
  // 遍历所有涉及的生成器，并标明哪些被更新了，哪些没有变化。
  allGenerators.forEach((g) => {
    if (changes.includes(g)) {
      heading(`  ${g} - updated`) // 已更新
    } else {
      p(`  ${g} - no changes`) // 无变化
    }
  })
}

/**
 * 检查当前工作目录是否是一个 Ignite 项目的根目录。
 * 判断依据是是否存在名为 `ignite` 的子目录。
 *
 * @returns 如果是 Ignite 项目根目录则返回 true，否则返回 false。
 */
function isIgniteProject(): boolean {
  // 使用 filesystem.exists 检查 "./ignite" 是否存在且类型为 "dir" (目录)。
  return filesystem.exists("./ignite") === "dir"
}

/**
 * 获取当前 Node.js 进程的工作目录。
 *
 * @returns 当前工作目录的绝对路径字符串。
 */
function cwd() {
  // process.cwd() 是 Node.js 内置函数，返回当前工作目录。
  return process.cwd()
}

/**
 * 获取当前 Ignite 项目中 `ignite` 目录的绝对路径。
 *
 * @returns `ignite` 目录的绝对路径字符串。
 */
function igniteDir() {
  // 使用 filesystem.path 拼接当前工作目录和 "ignite"。
  return filesystem.path(cwd(), "ignite")
}

/**
 * 获取当前 Ignite 项目中 `app` 目录的绝对路径。
 * (注意：虽然函数名叫 appDir，但实际项目中可能主要是 `src` 目录，这里可能是历史遗留或特定约定)
 *
 * @returns `app` 目录的绝对路径字符串。
 */
function appDir() {
  // 使用 filesystem.path 拼接当前工作目录和 "app"。
  return filesystem.path(cwd(), "app")
}

/**
 * 获取当前 Ignite 项目中 `ignite/templates` 目录的绝对路径。
 * 这是存放项目 spécifiques 生成器模板的地方。
 *
 * @returns `ignite/templates` 目录的绝对路径字符串。
 */
function templatesDir() {
  // 使用 filesystem.path 拼接 igniteDir() 的结果和 "templates"。
  return filesystem.path(igniteDir(), "templates")
}

function frontMatter(contents: string) {
  const parts = contents.split(`---${NEW_LINE}`)
  if (parts.length === 1 || parts.length === 3) {
    return {
      data: parts[1] ? YAML.parse(parts[1]) : {},
      content: parts[2] ?? parts[0],
    }
  } else {
    return {}
  }
}

/**
 * Patch front matter configuration
 */
type Patch = GluegunPatchingPatchOptions & {
  path: string
  append?: string
  prepend?: string
  replace?: string
  skip?: boolean
}

/**
 * Handles patching files via front matter config
 */
async function handlePatches(data: { patches?: Patch[]; patch?: Patch }) {
  const patches = data.patches ?? []
  if (data.patch) patches.push(data.patch)
  for (const patch of patches) {
    const { path: patchPath, skip, ...patchOpts } = patch
    if (patchPath && !skip) {
      if (patchOpts.append) {
        await patching.append(patchPath, patchOpts.append)
      }
      if (patchOpts.prepend) {
        await patching.prepend(patchPath, patchOpts.prepend)
      }
      if (patchOpts.replace) {
        await patching.replace(patchPath, patchOpts.replace, patchOpts.insert)
      }
      await patching.patch(patchPath, patchOpts)
    }
  }
}

/**
 * Finds generator templates installed in the current project
 */
function installedGenerators(): string[] {
  const { subdirectories, separator } = filesystem

  const generators = subdirectories(templatesDir()).map((g) => g.split(separator).slice(-1)[0])

  return generators
}

/**
 * 定义生成器文件名的大小写格式选项。
 * - auto: 自动判断（通常基于文件名约定或上下文）。
 * - pascal: PascalCase (大驼峰命名)。
 * - camel: camelCase (小驼峰命名)。
 * - kebab: kebab-case (短横线分隔)。
 * - snake: snake_case (下划线分隔)。
 * - none: 保持原始名称，不进行格式化。
 */
type GeneratorCaseOptions = "auto" | "pascal" | "camel" | "kebab" | "snake" | "none"

/**
 * 定义传递给 `generateFromTemplate` 函数的选项类型。
 * - name: 用户提供的生成器名称 (例如 "userProfile")。
 * - originalName: 用户输入的原始名称 (可能包含路径等)。
 * - skipIndexFile?: 是否跳过生成或更新 `index.ts` 文件 (如果模板包含的话)。
 * - subdirectory: 目标子目录 (相对于 `app` 或 `src` 目录)。
 * - overwrite: 是否允许覆盖已存在的文件。
 * - dir?: 可选的绝对或相对路径，用于覆盖默认的生成目录。
 * - case?: 可选的文件名大小写格式选项。
 */
type GeneratorOptions = {
  name: string
  originalName: string
  skipIndexFile?: boolean
  subdirectory: string
  overwrite: boolean
  dir?: string
  case?: GeneratorCaseOptions
}

/**
 * 核心函数：根据指定的生成器模板和选项，生成相应的文件。
 * 处理模板渲染、文件命名、路径确定、文件写入/覆盖逻辑以及后续的补丁操作。
 *
 * @param generator 生成器的名称 (例如 "model", "component")。
 * @param options 包含生成所需信息的选项对象。
 * @returns 一个包含三个数组的对象：`written` (新写入的文件路径), `overwritten` (被覆盖的文件路径), `exists` (已存在且未被覆盖的文件路径)。
 */
// Generates something using a template
export async function generateFromTemplate(
  generator: string,
  options: GeneratorOptions,
): Promise<{ written: string[]; overwritten: string[]; exists: string[] }> {
  const { find, path, dir, separator, read, write, exists: fsExists } = filesystem // 解构文件系统工具
  const { pascalCase, kebabCase, pluralize, camelCase, snakeCase, isBlank } = strings // 解构字符串处理工具

  // 生成名称的各种大小写变体，用于模板和文件名。
  // permutations of the name
  const pascalCaseName = pascalCase(options.name)
  const kebabCaseName = kebabCase(options.name)
  const camelCaseName = camelCase(options.name)
  const snakeCaseName = snakeCase(options.name)

  // 初始化用于记录文件状态的数组。
  // array of written, exists and overwritten files
  const written: string[] = []    // 新写入的文件
  const overwritten: string[] = [] // 被覆盖的文件
  const exists: string[] = []     // 已存在的文件

  // 准备传递给 EJS 模板引擎的属性对象。
  // 包含名称变体和所有传入的选项。
  // passed into the template generator
  const props = { camelCaseName, kebabCaseName, pascalCaseName, snakeCaseName, ...options }

  // 确定模板文件的来源目录。
  // where are we copying from?
  const sourceGeneratorDir = path(templatesDir(), generator)

  // 查找来源目录下的所有模板文件（以 .ejs 结尾）。
  // find the EJS templates
  const templateFiles = find(sourceGeneratorDir, { matching: "*.ejs", recursive: true })

  // 遍历找到的每个模板文件。
  // loop through the templates
  for (const templateFilename of templateFiles) {
    // --- 确定目标路径和文件名 ---

    // 读取模板文件的内容。
    // figure out the properties
    const templateContent = read(templateFilename)
    // 如果模板文件为空，则跳过。
    if (isBlank(templateContent)) {
      // skip blank templates
      continue // 跳过空模板
    }

    // 解析模板文件中的 Front Matter。
    // read the front matter
    const { data, content } = frontMatter(templateContent)

    // 确定最终生成文件的相对路径和文件名。
    // 优先使用 Front Matter 中的 `path` 配置。
    // 如果没有 `path`，则根据模板文件名和 `subdirectory` 选项构建。
    // figure out the destination path
    const relativePath =
      data.path ??
      path(
        options.subdirectory, // 基础子目录 (例如 "models", "components")
        // 处理模板文件名，移除 .ejs 后缀，并替换掉占位符 (例如 `NAME` -> 具体名称)。
        // remove the template directory from the filename
        templateFilename
          .replace(sourceGeneratorDir + separator, "") // 移除模板目录前缀
          .replace(".ejs", "")                        // 移除 .ejs 后缀
          .replace("NAME", options.name),              // 将 NAME 替换为实际名称
      )

    // 根据 `options.case` 对文件名部分进行大小写格式化。
    // (注意：这里只格式化路径的最后一部分，即文件名)
    // format the filename according to the case option
    const filename = path.basename(relativePath) // 获取文件名部分
    let formattedFilename = filename // 默认使用原始文件名
    const caseOption = options.case ?? "auto" // 获取大小写选项，默认为 auto

    // 根据选项应用格式化
    // apply the case transformation
    if (caseOption === "pascal") formattedFilename = pascalCase(filename)
    else if (caseOption === "kebab") formattedFilename = kebabCase(filename)
    else if (caseOption === "snake") formattedFilename = snakeCase(filename)
    else if (caseOption === "camel") formattedFilename = camelCase(filename)
    // 'auto' 和 'none' 通常意味着不主动修改，或依赖模板本身的命名约定。

    // 拼接最终的目标文件路径。
    // 优先使用 `options.dir` (如果提供)。
    // 否则，使用 `appDir()` (通常是 'app' 或 'src') 作为基础目录。
    // figure out the final destination path
    const targetPath = path.join(
      options.dir ?? appDir(), // 基础目录
      path.dirname(relativePath), // 文件的相对目录部分
      formattedFilename, // 格式化后的文件名
    )

    // --- 处理文件写入 ---

    // 检查目标文件是否已存在。
    // check if the file exists
    const pathExists = fsExists(targetPath) === "file"

    // 如果文件已存在且不允许覆盖 (options.overwrite 为 false)。
    // if the file exists and we're not overwriting, skip it
    if (pathExists && !options.overwrite) {
      // 将目标路径添加到 exists 数组，并跳过此文件。
      exists.push(targetPath)
      continue
    }

    // --- 渲染模板并写入文件 ---

    try {
      // 使用 EJS 渲染模板内容，传入 props。
      // generate the file
      const generatedContent = ejs.render(content, props)

      // 将渲染后的内容写入目标文件。
      // write the file
      write(targetPath, generatedContent)

      // 根据文件是否已存在，记录到 written 或 overwritten 数组。
      // track the file status
      if (pathExists) {
        overwritten.push(targetPath)
      } else {
        written.push(targetPath)
      }

      // 如果 Front Matter 中定义了补丁操作，则执行它们。
      // handle any patches specified in the front matter
      if (data.patches || data.patch) {
        // 在写入文件后处理补丁。这很重要，确保目标文件存在后再打补丁。
        // 注意：handlePatches 接收的路径应该是相对于项目根目录的。
        // 需要确认 frontMatter 中的 path 和 handlePatches 是否正确处理了相对/绝对路径。
        // 假设 frontMatter 中的 path 是相对于项目根的。
        // handle patching after the file is written
        await handlePatches(data)
      }
    } catch (e) {
      // 捕获并打印 EJS 渲染或文件写入过程中的错误。
      // handle errors
      console.error(`Error generating ${targetPath}:`, e)
      // 可以考虑更详细的错误处理或抛出异常。
    }
  } // 结束模板文件循环

  // 返回包含文件状态记录的对象。
  // return the file statuses
  return { written, overwritten, exists }
}

/**
 * 获取 Ignite CLI 工具本身的根目录路径。
 * 通常用于查找 CLI 内部的资源或模板。
 *
 * @returns Ignite CLI 的根目录的绝对路径字符串。
 */
function igniteCliRootDir(): string {
  // __filename 是 Node.js 中的一个全局变量，表示当前正在执行的脚本的文件名（包含绝对路径）。
  // filesystem.path() 用于安全地拼接路径部分。
  // ".." 表示向上移动一级目录。从当前文件 (generators.ts) 开始：
  // ".." -> src/tools/
  // ".." -> src/
  // ".." -> 项目根目录 (note-ignite)
  return filesystem.path(__filename, "..", "..", "..")
}

/**
 * 从用户提供的模板名称（可能包含路径、版本标签等）中提取规范的模板名称。
 * 处理各种输入格式，例如：
 * - "ignite-bowser" -> "ignite-bowser"
 * - "ignite-react-native-boilerplate" -> "ignite-react-native-boilerplate"
 * - "react-native-ignite-andross" -> "ignite-andross" (移除 "react-native-" 前缀)
 * - "/path/to/ignite-boilerplate" -> "ignite-boilerplate" (提取最后一部分)
 * - "git@github.com:user/ignite-repo.git" -> "ignite-repo" (从 Git URL 提取)
 * - "https://github.com/user/ignite-repo" -> "ignite-repo" (从 HTTPS URL 提取)
 *
 * @param boilerplateName 用户提供的原始模板名称字符串。
 * @returns 提取出的规范化模板名称。如果无法提取，则返回原始输入。
 */
function extractBoilerplateName(boilerplateName: string): string {
  let name = boilerplateName

  // 移除常见的 "react-native-" 前缀。
  // remove the react-native- prefix if it's there
  if (name.startsWith("react-native-")) {
    name = name.slice("react-native-".length)
  }

  // 如果名称看起来像一个文件路径（包含路径分隔符），则只取最后一部分。
  // remove the path if it's part of a larger path
  if (name.includes(filesystem.separator)) {
    name = name.split(filesystem.separator).slice(-1)[0]
  }

  // 如果名称看起来像一个 Git URL，则尝试提取仓库名。
  // remove the git stuff if it's part of a git url
  if (name.endsWith(".git")) {
    name = name.slice(0, -4) // 移除 ".git" 后缀
    // 查找最后一个 "/" 或 ":"，取其后的部分作为仓库名。
    const slashIndex = name.lastIndexOf("/")
    const colonIndex = name.lastIndexOf(":")
    // 取两者中较大的索引（更靠后）+ 1 开始的部分。
    name = name.slice(Math.max(slashIndex, colonIndex) + 1)
  }

  // 如果没有 "ignite-" 前缀，则添加它。
  // ensure we have ignite-*
  if (!name.startsWith("ignite-")) {
    name = `ignite-${name}`
  }

  return name
}

/**
 * 检查当前项目使用的 Ignite 模板版本与当前安装的 Ignite CLI 版本是否兼容。
 * 如果版本不匹配（或无法读取版本信息），则显示警告信息。
 *
 * @param boilerplate Ignite CLI 提供的 `boilerplate` 对象，用于访问模板信息。
 * @param command 需要兼容性检查的命令名称 (例如 "generate", "new")。
 * @param cliVersion 当前 Ignite CLI 的版本号。
 */
function boilerplateVersionCheck(boilerplate, command: string, cliVersion: string) {
  // 检查模板对象是否存在。
  if (!boilerplate) return

  // 尝试从模板的 package.json 中读取 Ignite CLI 的版本要求。
  // read the boilerplate's ignite config
  let boilerplateIgniteVersion = boilerplate.config?.ignite?.version

  // 如果读取失败，尝试直接读取项目根目录下的 ignite.json 文件。
  // some boilerplates don't have package.json setup yet, try ignite.json directly
  if (!boilerplateIgniteVersion && filesystem.exists("./ignite.json")) {
    boilerplateIgniteVersion = filesystem.read("./ignite.json", "json")?.ignite?.version
  }

  // 如果仍然无法获取模板要求的版本，则退出检查。
  // it's possible the boilerplate doesn't have ignite.json setup either
  // can't perform this check!
  if (!boilerplateIgniteVersion) return

  // 使用 semver 比较 CLI 版本和模板要求的版本。
  // check the versions
  if (semver.neq(boilerplateIgniteVersion, cliVersion)) {
    // 如果版本不匹配，显示警告信息。
    // show warning message
    spinners.warn(
      `Your CLI version (${colors.yellow(cliVersion)}) is not the same as the boilerplate's required version (${colors.yellow(
        boilerplateIgniteVersion,
      )})`,
    )
    spinners.warn(`If you encounter issues, consider running ${colors.cyan(`npx ignite-cli@${boilerplateIgniteVersion} ${command}`)}`)
  }
}

// 导出现在模块中的所有函数和类型。
// export the functions
export const generators = {
  runGenerator,
  // ...其他函数
}

/**
 * Directory where we can find Ignite CLI generator templates
 */
function sourceDirectory(): string {
  return filesystem.path(igniteCliRootDir(), "boilerplate", "ignite", "templates")
}

/**
 * Finds generator templates in Ignite CLI
 */
function availableGenerators(): string[] {
  const { subdirectories, separator } = filesystem
  return subdirectories(sourceDirectory()).map((g) => g.split(separator).slice(-1)[0])
}

/**
 * Copies over generators (specific generators, or all) from Ignite CLI to the project
 * ignite/templates folder.
 */
function installGenerators(generators: string[]): string[] {
  const { path, find, copy, dir, cwd, separator, exists, read } = filesystem
  const sourceDir = sourceDirectory()
  const targetDir = path(cwd(), "ignite", "templates")

  // for each generator type, copy it over to the ignite/templates folder
  const changedGenerators = generators.filter((gen) => {
    const sourceGenDir = path(sourceDir, gen)
    const targetGenDir = path(targetDir, gen)

    // ensure the directory exists
    dir(targetDir)

    // find all source files
    const files = find(sourceGenDir, { matching: "*" })

    // copy them over
    const changedFiles = files.filter((file) => {
      const filename = file.split(separator).slice(-1)[0]
      const targetFile = path(targetGenDir, filename)

      if (!exists(targetFile) || read(targetFile) !== read(file)) {
        copy(file, targetFile, { overwrite: true })
        return true
      } else {
        return false
      }
    })

    return changedFiles.length > 0
  })

  return changedGenerators
}

enum Platforms {
  Ios = "ios",
  Android = "android",
  Expo = "expo",
}

// prettier-ignore
const APP_ICON_RULESET = {
  icons: [
    { platform: Platforms.Ios, type: "universal", name: "Icon-{size}-{idiom}{scale}.png", inputFile: "ios-universal.png" },
    { platform: Platforms.Android, type: "adaptive", name: "mipmap-{dpi}/ic_launcher_background.png", inputFile: "android-adaptive-background.png" },
    { platform: Platforms.Android, type: "adaptive", name: "mipmap-{dpi}/ic_launcher_foreground.png", inputFile: "android-adaptive-foreground.png" },
    { platform: Platforms.Android, type: "legacy", name: "mipmap-{dpi}/ic_launcher.png", inputFile: "android-legacy.png", transform: { size: 812, radius: 64, padding: 106 } },
    { platform: Platforms.Android, type: "legacy", name: "mipmap-{dpi}/ic_launcher_round.png", inputFile: "android-legacy.png", transform: { size: 944, radius: 472, padding: 40 } },
    { platform: Platforms.Expo, type: "mobile", name: "app-icon-ios.png", inputFile: "ios-universal.png" },
    { platform: Platforms.Expo, type: "mobile", name: "app-icon-android-legacy.png", inputFile: "android-legacy.png" },
    { platform: Platforms.Expo, type: "mobile", name: "app-icon-android-adaptive-background.png", inputFile: "android-adaptive-background.png" },
    { platform: Platforms.Expo, type: "mobile", name: "app-icon-android-adaptive-foreground.png", inputFile: "android-adaptive-foreground.png" },
    { platform: Platforms.Expo, type: "mobile", name: "app-icon-all.png", inputFile: "ios-universal.png" },
    { platform: Platforms.Expo, type: "web", name: "app-icon-web-favicon.png", inputFile: "ios-universal.png" },
  ],
  rules: [
    { platform: Platforms.Ios, size: { universal: 1024 }, scale: 1, idiom: "ios-marketing" },
    { platform: Platforms.Ios, size: { universal: 83.5 }, scale: 2, idiom: "ipad" },
    { platform: Platforms.Ios, size: { universal: 20 }, scale: 1, idiom: "ipad" },
    { platform: Platforms.Ios, size: { universal: 20 }, scale: 2, idiom: "ipad" },
    { platform: Platforms.Ios, size: { universal: 29 }, scale: 1, idiom: "ipad" },
    { platform: Platforms.Ios, size: { universal: 29 }, scale: 2, idiom: "ipad" },
    { platform: Platforms.Ios, size: { universal: 40 }, scale: 1, idiom: "ipad" },
    { platform: Platforms.Ios, size: { universal: 40 }, scale: 2, idiom: "ipad" },
    { platform: Platforms.Ios, size: { universal: 76 }, scale: 1, idiom: "ipad" },
    { platform: Platforms.Ios, size: { universal: 76 }, scale: 2, idiom: "ipad" },
    { platform: Platforms.Ios, size: { universal: 20 }, scale: 2, idiom: "iphone" },
    { platform: Platforms.Ios, size: { universal: 20 }, scale: 3, idiom: "iphone" },
    { platform: Platforms.Ios, size: { universal: 29 }, scale: 2, idiom: "iphone" },
    { platform: Platforms.Ios, size: { universal: 29 }, scale: 3, idiom: "iphone" },
    { platform: Platforms.Ios, size: { universal: 40 }, scale: 2, idiom: "iphone" },
    { platform: Platforms.Ios, size: { universal: 40 }, scale: 3, idiom: "iphone" },
    { platform: Platforms.Ios, size: { universal: 60 }, scale: 2, idiom: "iphone" },
    { platform: Platforms.Ios, size: { universal: 60 }, scale: 3, idiom: "iphone" },
    { platform: Platforms.Android, size: { legacy: 192, adaptive: 432 }, dpi: "xxxhdpi" },
    { platform: Platforms.Android, size: { legacy: 144, adaptive: 324 }, dpi: "xxhdpi" },
    { platform: Platforms.Android, size: { legacy: 96, adaptive: 216 }, dpi: "xhdpi" },
    { platform: Platforms.Android, size: { legacy: 72, adaptive: 162 }, dpi: "hdpi" },
    { platform: Platforms.Android, size: { legacy: 48, adaptive: 108 }, dpi: "mdpi" },
    { platform: Platforms.Expo, size: { mobile: 1024, web: 48 } },
  ]
}

/**
 * Validates that all necessary app-icon input files exist in the template dir.
 * Additionally validates that they are of the correct size.
 */
export async function validateAppIconGenerator(option: `${Platforms}` | "all", flags: Options) {
  const { skipSourceEqualityValidation } = flags || {}

  const { path, exists, inspect } = filesystem

  const allowedOptions = Object.values(Platforms) as `${Platforms}`[]

  // check that the option is allowed
  if (option !== "all" && !allowedOptions.includes(option)) {
    return {
      isValid: false,
      messages: [`The option "${option}" is not valid for generator "app-icon"`],
    }
  }

  const optionsToValidate = option === "all" ? allowedOptions : [option]

  // get all the file-names that are required for the supplied option(s) and dedup
  const inputFileNames = APP_ICON_RULESET.icons
    .filter((i) => optionsToValidate.includes(i.platform))
    .reduce((acc, i) => Array.from(new Set([...acc, i.inputFile])), [])

  // validate both presence and size of all input files
  const validationPromises = inputFileNames.map(async (fileName) => {
    const boilerplateInputFilePath = path(sourceDirectory(), "app-icon", fileName)
    const inputFilePath = path(templatesDir(), "app-icon", fileName)

    const isMissing = !exists(inputFilePath)
    const isInvalidSize = await (async function () {
      if (isMissing) return false

      const metadata = await sharp(inputFilePath).metadata()
      return metadata.width !== 1024 || metadata.height !== 1024
    })()
    const isSameAsSource = await (async function () {
      if (skipSourceEqualityValidation) return false
      if (isMissing) return false

      const inputFileMd5 = inspect(inputFilePath, { checksum: "md5" }).md5
      const sourceFileMd5 = inspect(boilerplateInputFilePath, { checksum: "md5" }).md5

      return inputFileMd5 === sourceFileMd5
    })()

    return { fileName, isMissing, isInvalidSize, isSameAsSource }
  })

  const validationResults = await Promise.all(validationPromises)

  // accumulate error messages for any failed validations
  const validationMessages = validationResults.reduce((acc, r) => {
    const messages = [
      r.isMissing && "   • the file is missing",
      r.isInvalidSize && "   • the file is the wrong size (expected 1024x1024px)",
      r.isSameAsSource &&
        "   • looks like you're using our default template; customize the file with your own icon first",
    ].filter(Boolean)

    if (messages.length) {
      acc.push(`⚠️  ignite/templates/app-icon/${r.fileName}:`, ...messages)
    }

    return acc
  }, [])

  return {
    isValid: !validationMessages.length,
    messages: validationMessages,
  }
}

/**
 * Generates app-icons for specified option.
 */
export async function generateAppIcons(option: `${Platforms}` | "all") {
  const { path, exists, find, copy, write } = filesystem
  const cwd = process.cwd()

  const options = option === "all" ? Object.values(Platforms) : ([option] as `${Platforms}`[])

  const optionGenerationSuccesses = []

  // start the generation process for each platform
  // looping instead of mapping allows us to await for each platform sequentially
  for (const o of options) {
    const optionProjectName = { expo: "Expo" }[o]

    // find the output path for platform and check if it exists
    // iOS is a bit weird since it's named differently for each project
    const relativeOutputDirPath = {
      expo: "assets/images",
      android: "android/app/src/main/res",
      ios: (function () {
        const searchPath = path(cwd, "ios")

        if (!exists(searchPath)) return searchPath

        return (
          find(searchPath, {
            directories: true,
            files: false,
            matching: "AppIcon.appiconset",
          })?.[0] || "ios/**/Images.xcassets/AppIcon.appiconset"
        )
      })(),
    }[o]
    const outputDirPath = path(cwd, relativeOutputDirPath)

    // if not, skip...
    if (exists(outputDirPath) !== "dir") {
      warning(
        `⚠️  No output directory found for "${optionProjectName}" at "${outputDirPath}". Skipping...`,
      )
      continue
    }

    heading(`Generating ${optionProjectName} app icons...`)

    const icons = APP_ICON_RULESET.icons.filter((i) => i.platform === o)

    // prepare each icon for generation sequentially
    for (const i of icons) {
      const inputFilePath = path(templatesDir(), "app-icon", i.inputFile)

      // get the input file for sharp and do some initial transforms when necessary (e.g. radius and padding)
      const inputFile = await (async function () {
        if (!i.transform) return inputFilePath

        try {
          const { size, radius, padding } = i.transform
          const cutoutMask = Buffer.from(
            `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`,
          )
          return await sharp(inputFilePath)
            .resize(size, size, { fit: "fill" })
            .composite([{ input: cutoutMask, blend: "dest-in" }])
            .extend({
              top: padding,
              bottom: padding,
              left: padding,
              right: padding,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .toBuffer()
        } catch (error) {}
      })()

      const rules = APP_ICON_RULESET.rules.filter((i) => i.platform === o)

      // actually resize the input files and save to output dir sequentially
      for (const r of rules) {
        // construct the output file name
        const outputFileName = {
          expo: i.name,
          android: i.name.replace("{dpi}", r.dpi),
          ios: i.name
            .replace("{size}", r.size[i.type])
            .replace("{idiom}", r.idiom)
            .replace("{scale}", r.scale > 1 ? `@${r.scale}x` : ""),
        }[o]

        if (!inputFile) {
          warning(`⚠️  ${outputFileName}: transform failed, please file an issue on GitHub`)
          continue
        }

        const outputFilePath = path(outputDirPath, outputFileName)
        const outputSize = r.size[i.type] * (r.scale || 1)

        // finally, resize and save
        try {
          await sharp(inputFile)
            .resize(outputSize, outputSize, { fit: "fill" })
            .toFile(outputFilePath)

          direction(`✅ ${outputFileName}`)
        } catch (error) {
          warning(`⚠️  ${outputFileName}: saving failed, check if the directory exists`)
        }
      }
    }

    const boilerplateDirPath = path(igniteCliRootDir(), "boilerplate")

    const postGenerationFn = {
      ios: () => {
        const sourceContentsJsonFilePath = path(
          boilerplateDirPath,
          "ios",
          require(path(boilerplateDirPath, "app.json")).name,
          "Images.xcassets/AppIcon.appiconset/Contents.json",
        )
        copy(sourceContentsJsonFilePath, path(outputDirPath, "Contents.json"), { overwrite: true })
        direction(`✅ Contents.json`)
      },

      android: () => {
        const sourceIcLauncherXmlFilePath = path(
          boilerplateDirPath,
          relativeOutputDirPath,
          "mipmap-anydpi-v26/ic_launcher.xml",
        )

        copy(
          sourceIcLauncherXmlFilePath,
          path(outputDirPath, "mipmap-anydpi-v26/ic_launcher.xml"),
          { overwrite: true },
        )
        direction(`✅ mipmap-anydpi-v26/ic_launcher.xml`)
      },

      expo: () => {
        const merge = require("deepmerge-json")
        const sourceExpoConfig = require(path(boilerplateDirPath, "app.json"))?.expo
        const outputAppConfig = path(cwd, "app.json")

        const iconConfig = {
          expo: {
            icon: sourceExpoConfig?.icon,
            android: {
              icon: sourceExpoConfig?.android?.icon,
              adaptiveIcon: sourceExpoConfig?.android?.adaptiveIcon,
            },
            ios: { icon: sourceExpoConfig?.ios?.icon },
            web: { favicon: sourceExpoConfig?.web?.favicon },
          },
        }

        // Check if app.json exists - however, could also be `app.config.js` or `app.config.ts` in
        // which case we should output a warning of what files to update
        if (!exists(outputAppConfig)) {
          const appConfigFiles = find(cwd, { matching: "app.config.*" })
          if (appConfigFiles.length > 0) {
            warning(
              `⚠️  No "app.json" found at "${outputAppConfig}". It looks like you are using a dynamic configuration! Learn more at ${link(
                "https://docs.expo.dev/workflow/configuration/#dynamic-configuration-with-appconfigjs",
              )}`,
            )
            warning(`⚠️  Please add the following to your app.config.js manually:`)
            JSON.stringify(iconConfig, null, 2)
              .split("\n")
              .map((line) => p(`  ${line}`))
          } else {
            warning(`⚠️  No "app.json" found at "${outputAppConfig}". Skipping...`)
          }

          return
        }

        const updatedConfig = merge(require(outputAppConfig), iconConfig)

        write(path(cwd, "app.json"), JSON.stringify(updatedConfig, null, 2) + "\n")
        direction(`✅ app.json`)
      },
    }[o]

    postGenerationFn()

    // if we reached this point, generation for this platform was successful
    optionGenerationSuccesses.push(true)
  }

  return !!optionGenerationSuccesses.length
}

/**
 * Validates that splash screen icon input file exists in the template dir.
 * Additionally validates the size and background parameters.
 */
export async function validateSplashScreenGenerator(
  options: { androidSize: number; iosSize: number; backgroundColor: string },
  flags: Options,
) {
  const { androidSize, iosSize, backgroundColor } = options || {}
  const { skipSourceEqualityValidation } = flags || {}

  const { path, exists, inspect } = filesystem

  const validationMessages = []

  // check if the android size option is numerical and non-zero
  const androidMessages = [
    Number.isNaN(androidSize) && "   • a numerical value",
    androidSize <= 0 && "   • a value greater than 0",
    androidSize >= 288 && "   • a value less than 288",
  ].filter(Boolean)

  if (androidMessages.length) {
    validationMessages.push(`⚠️  "--android-size" option must be:`, ...androidMessages)
  }

  // check if the ios size option is numerical and non-zero
  const iosMessages = [
    Number.isNaN(iosSize) && "   • a numerical value",
    iosSize <= 0 && "   • a value greater than 0",
  ].filter(Boolean)

  if (iosMessages.length) {
    validationMessages.push(`⚠️  "--ios-size" option must be:`, ...iosMessages)
  }

  // check if the background option is a valid hex color
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(backgroundColor)) {
    validationMessages.push(`⚠️  background color parameter must be:`)
    validationMessages.push(`   • a valid hex color`)
  }

  // validate template input file
  const boilerplateInputFilePath = path(sourceDirectory(), "splash-screen", "logo.png")
  const inputFilePath = path(templatesDir(), "splash-screen", "logo.png")

  const isMissing = !exists(inputFilePath)
  const isInvalidSize = await (async function () {
    if (isMissing) return false

    const metadata = await sharp(inputFilePath).metadata()
    return metadata.width !== 1024 || metadata.height !== 1024
  })()
  const isSameAsSource = await (async function () {
    if (skipSourceEqualityValidation) return false
    if (isMissing) return false

    const inputFileMd5 = inspect(inputFilePath, { checksum: "md5" }).md5
    const sourceFileMd5 = inspect(boilerplateInputFilePath, { checksum: "md5" }).md5

    return inputFileMd5 === sourceFileMd5
  })()

  const messages = [
    isMissing && "   • the file is missing",
    isInvalidSize && "   • the file is the wrong size (expected 1024x1024px)",
    isSameAsSource &&
      "   • looks like you're using our default template; customize the file with your own icon first",
  ].filter(Boolean)

  if (messages.length) {
    validationMessages.push(`⚠️  ignite/templates/splash-screen/logo.png:`, ...messages)
  }

  return {
    isValid: !validationMessages.length,
    messages: validationMessages,
  }
}

/**
 * Generates splash screen for all platforms
 */
export async function generateSplashScreen(options: {
  androidSize: number
  iosSize: number
  backgroundColor: string
}) {
  const { androidSize, iosSize, backgroundColor } = options || {}
  const { path, exists, write, find } = filesystem
  const cwd = process.cwd()

  const inputFilePath = path(templatesDir(), "splash-screen", "logo.png")
  const expoOutputDirPath = path(cwd, "assets/images")
  const isExpoOutputDirExists = exists(expoOutputDirPath) === "dir"

  const optionGenerationSuccesses = []

  async function generateForExpo(
    type: "ios" | "android" | "web" | "all",
    size: number,
    expoRules: { name?: string; width: number; height: number; scale: number }[],
  ) {
    for (const expoRule of expoRules) {
      const { name, width, height, scale } = expoRule

      const outputFileName = [`splash-logo`, type, name].filter(Boolean).join("-") + ".png"
      const outputFilePath = path(expoOutputDirPath, outputFileName)
      const logoSize = size * scale
      const verticalPadding = Math.ceil((height - logoSize) / 2)
      const horizontalPadding = Math.ceil((width - logoSize) / 2)

      try {
        await sharp(inputFilePath)
          .resize(logoSize, logoSize, { fit: "fill" })
          .extend({
            top: verticalPadding,
            bottom: verticalPadding,
            left: horizontalPadding,
            right: horizontalPadding,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toFile(outputFilePath)

        direction(`✅ assets/images/${outputFileName}`)
        optionGenerationSuccesses.push(true)
      } catch (error) {}
    }
  }

  heading(`Generating Expo splash screens (Android, iOS, and Web)...`)
  if (isExpoOutputDirExists) {
    await generateForExpo("ios", iosSize, [
      { name: "mobile", width: 1284, height: 2778, scale: 3 },
      { name: "tablet", width: 2048, height: 2732, scale: 2 },
    ])
    await generateForExpo("android", androidSize, [
      { name: "universal", width: 1440, height: 2560, scale: 4 },
    ])
    await generateForExpo("web", 300, [{ width: 1920, height: 1080, scale: 1 }])
    await generateForExpo("all", 180, [{ width: 1242, height: 2436, scale: 3 }])

    // update app.json
    const boilerplateDirPath = path(igniteCliRootDir(), "boilerplate")
    const merge = require("deepmerge-json")
    const sourceExpoConfig = require(path(boilerplateDirPath, "app.json"))?.expo
    const outputAppConfig = path(cwd, "app.json")

    const splashConfig = {
      expo: {
        splash: {
          backgroundColor,
          image: sourceExpoConfig?.splash?.image,
          resizeMode: sourceExpoConfig?.splash?.resizeMode,
        },
        android: {
          splash: {
            backgroundColor,
            image: sourceExpoConfig?.android?.splash?.image,
            resizeMode: sourceExpoConfig?.android?.splash?.resizeMode,
          },
        },
        ios: {
          splash: {
            backgroundColor,
            image: sourceExpoConfig?.ios?.splash?.image,
            resizeMode: sourceExpoConfig?.ios?.splash?.resizeMode,
          },
        },
        web: {
          splash: {
            backgroundColor,
            image: sourceExpoConfig?.web?.splash?.image,
            resizeMode: sourceExpoConfig?.web?.splash?.resizeMode,
          },
        },
      },
    }

    // Check if app.json exists - however, could also be `app.config.js` or `app.config.ts` in
    // which case we should output a warning of what files to update
    if (!exists(outputAppConfig)) {
      const appConfigFiles = find(cwd, { matching: "app.config.*" })
      if (appConfigFiles.length > 0) {
        warning(
          `⚠️  No "app.json" found at "${outputAppConfig}". It looks like you are using a dynamic configuration! Learn more at ${link(
            "https://docs.expo.dev/workflow/configuration/#dynamic-configuration-with-appconfigjs",
          )}`,
        )
        warning(`⚠️  Please add the following to your app.config.js manually:`)
        JSON.stringify(splashConfig, null, 2)
          .split("\n")
          .map((line) => p(`  ${line}`))
      } else {
        warning(`⚠️  No "app.json" found at "${outputAppConfig}". Skipping...`)
      }

      return
    }

    const updatedConfig = merge(require(outputAppConfig), splashConfig)

    write(path(cwd, "app.json"), JSON.stringify(updatedConfig, null, 2) + "\n")
    direction(`✅ app.json`)
  } else {
    warning(`⚠️  No output directory found for "Expo" at "${expoOutputDirPath}". Skipping...`)
  }

  return !!optionGenerationSuccesses.length
}
