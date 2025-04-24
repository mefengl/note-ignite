import { spawn as crossSpawn } from "cross-spawn" // 明确导入，而不是使用 require

/**
 * 定义 `spawnProgress` 函数的选项类型。
 */
export type SpawnOptions = {
  /**
   * (可选) 一个回调函数，用于在子进程产生标准输出（stdout）时接收数据。
   * 这对于需要实时显示命令执行进度的场景非常有用，例如显示安装包的过程。
   * 如果提供了此回调，stdout 数据将不会累积在最终的 Promise 解析值中。
   *
   * @param data 子进程输出的数据块（通常是字符串）。
   */
  onProgress?: (data: string) => void
  /**
   * (可选) 一个包含环境变量键值对的对象，用于传递给子进程。
   * 这允许你为执行的命令设置特定的环境变量，例如 `NODE_ENV` 或 `PATH`。
   * 默认情况下，子进程会继承父进程（即运行 Ignite CLI 的进程）的环境变量。
   */
  env?: Record<string, unknown> // NodeJS.ProcessEnv 更精确，但 Record<string, unknown> 也可接受
}

/**
 * 异步执行一个命令行字符串，并可以选择性地通过回调报告进度。
 * 底层使用 `cross-spawn` 库来确保跨平台兼容性（Windows, macOS, Linux）。
 *
 * @param commandLine 要执行的完整命令行字符串，例如 "npm install --save-dev typescript"。
 *                    命令及其参数应该用空格分隔。
 * @param options 一个 `SpawnOptions` 对象，包含可选的进度回调 `onProgress` 和环境变量 `env`。
 * @returns 返回一个 Promise：
 *          - 如果命令成功执行（退出码为 0），Promise 将解析为子进程的标准输出（stdout）和标准错误（stderr）
 *            的完整内容拼接成的字符串。**注意**：如果提供了 `onProgress` 回调，stdout 数据将不会包含在此解析值中。
 *          - 如果命令执行失败（退出码非 0），Promise 将被拒绝（reject），并将子进程的 stdout 和 stderr
 *            （如果有）拼接成的字符串作为拒绝的原因。
 *          - 如果在启动或执行过程中发生其他错误（例如找不到命令），Promise 也会被拒绝，并传递底层的错误对象。
 */
export function spawnProgress(commandLine: string, options: SpawnOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    // 将命令行字符串按空格分割成命令和参数数组。
    // 例如 "npm install --save-dev typescript" -> ["npm", "install", "--save-dev", "typescript"]
    // 注意：这种简单的 split 可能无法处理包含空格的参数（例如路径），但对于常见的 CLI 命令通常足够。
    // 更健壮的方法可能需要解析引号或使用更复杂的参数解析库。
    const args = commandLine.split(" ")
    // 第一个元素是命令本身，将其从数组中移除并用作 `cross-spawn` 的第一个参数。
    const command = args.shift()

    // 检查 command 是否为空，防止 shift 后数组为空导致错误
    if (!command) {
      return reject(new Error("Command cannot be empty"))
    }

    // 使用 cross-spawn 启动子进程。
    // - command: 要执行的命令 (e.g., "npm")
    // - args: 命令的参数数组 (e.g., ["install", "--save-dev", "typescript"])
    // - options: 传递给 `cross-spawn` 的选项，这里只传递了 env。onProgress 是我们自己处理的。
    const spawned = crossSpawn(command, args, { env: options.env as NodeJS.ProcessEnv }) // 类型断言为 NodeJS.ProcessEnv

    // 用于累积命令输出的数组（如果未使用 onProgress 回调）。
    const output: string[] = [] // 明确类型为 string[]

    // 监听子进程的标准输出流 (stdout)。
    spawned.stdout?.on("data", (data: Buffer | string) => { // data 可以是 Buffer 或 string
      const dataStr = data.toString() // 统一转换为 string
      // 如果提供了 onProgress 回调，则调用它来报告进度。
      // 否则，将输出数据块添加到 output 数组中。
      return options.onProgress ? options.onProgress(dataStr) : output.push(dataStr)
    })

    // 监听子进程的标准错误流 (stderr)。
    // 无论命令成功还是失败，stderr 的输出都会被收集。
    spawned.stderr?.on("data", (data: Buffer | string) => { // data 可以是 Buffer 或 string
      output.push(data.toString())
    })

    // 监听子进程的 'close' 事件，这个事件在进程退出时触发。
    spawned.on("close", (code: number | null) => { // code 可以是 null
      // 检查退出码 (code)。
      // code === 0 表示命令成功执行。
      if (code === 0) {
        // 成功：将累积的输出（stdout + stderr，如果未使用 onProgress 则包含 stdout）合并成一个字符串并解析 Promise。
        resolve(output.join(""))
      } else {
        // 失败：将累积的输出合并成一个字符串并拒绝 Promise。
        // 拒绝的原因是命令的输出，这有助于调试。
        reject(new Error(`Command failed with exit code ${code}: ${output.join("")}`)) // 包装成 Error 对象
      }
    })

    // 监听子进程的 'error' 事件，这通常在无法启动进程时触发（例如命令不存在）。
    spawned.on("error", (err) => {
      // 发生启动错误：直接拒绝 Promise，并传递原始错误对象。
      reject(err)
    })
  })
}
