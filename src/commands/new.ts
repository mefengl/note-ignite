{{ ... }}
    newArchSpinner.succeed("Set up New Architecture") // 更新 spinner 状态
  }
  // #endregion

  // #region Install dependencies (安装依赖)
  // 根据用户选择的包管理器 (packager)，运行相应的命令来安装项目依赖。
  // 只有在用户没有通过 --no-install 标志明确跳过安装时，才会执行此操作。
  // 这部分代码负责处理项目依赖的安装，确保项目能够正常运行。
  if (!options.noInstall) {
    const hydrationSpinner = print.spin(`Installing dependencies using ${packager}`) // 创建 spinner

    // 根据选择的包管理器，构建相应的安装命令。
    // 支持 npm、pnpm、bun 和 yarn 等包管理器。
    let installCommand: string
    if (packager === "npm") {
      installCommand = "npm install"
    } else if (packager === "pnpm") {
      installCommand = "pnpm install"
    } else if (packager === "bun") {
      installCommand = "bun install"
    } else {
      // 默认为 yarn
      installCommand = "yarn install"
    }

    // 在目标项目目录下执行安装命令。
    // 使用 system.run 函数异步执行命令，并捕获其输出。
    // 这一步骤可能需要一些时间，取决于项目依赖的数量和网络速度。
    try {
      await system.run(installCommand, { cwd: targetPath })
      hydrationSpinner.succeed(`Installed dependencies using ${packager}`) // 更新 spinner 状态为成功
    } catch (e) {
      // 如果安装过程中发生错误，则更新 spinner 状态为失败，并打印错误信息。
      // 提示用户可以手动安装依赖。
      hydrationSpinner.fail(`Failed to install dependencies using ${packager}`)
      print.error(e.stderr)
      print.info(`You can try installing them manually:`) // 给用户提供手动安装的建议
      print.info(`  cd ${targetPath} && ${installCommand}`)
      process.exit(1) // 退出程序
    }
  } else {
    // 如果用户选择了 --no-install，则打印提示信息。
    // 告知用户已跳过安装步骤，需要手动安装依赖。
    print.info(`Skipping dependency installation`) // 告知用户已跳过安装步骤
  }
  // #endregion

  // #region Final messages (最终提示信息)
  // 在所有设置步骤完成后，向用户显示一些有用的信息和后续步骤。
  // 这部分代码负责打印最终提示信息，帮助用户了解下一步操作。

  // 打印一个空行，用于格式分隔
  print.info("")
  // 打印带有项目名称的成功信息，使用绿色高亮显示项目名称。
  print.success(`IGNITED 🔥 ${print.colors.green(projectName)} has been created!`) // 使用 emoji 和颜色增强视觉效果
  print.info("")

  // 显示项目所在的绝对路径。
  print.info(`Navigate to your project: ${print.colors.yellow(`cd ${targetPathRelative}`)}`) // 使用黄色高亮显示路径
  print.info("")

  // 根据用户选择的工作流 ('managed' 或 'manual') 提供不同的启动指令。
  if (workflow === "managed") {
    // 对于 'managed' 工作流 (Expo Go)
    print.info("To run in Expo Go:")
    // 打印使用 Expo Go 启动应用的命令，使用黄色高亮显示。
    print.info(`  ${print.colors.yellow(`${packager === "npm" ? "npm run" : packager} start`)}`)
    print.info("")
    print.info("To run on iOS simulator:")
    // 打印在 iOS 模拟器上启动应用的命令。
    print.info(`  ${print.colors.yellow(`${packager === "npm" ? "npm run" : packager} ios`)}`)
    print.info("")
    print.info("To run on Android simulator:")
    // 打印在 Android 模拟器或设备上启动应用的命令。
    print.info(`  ${print.colors.yellow(`${packager === "npm" ? "npm run" : packager} android`)}`)
    print.info("")
  } else {
    // 对于 'manual' 工作流 (裸 React Native 或自定义开发构建)
    print.info("To run on iOS simulator:")
    // 打印在 iOS 模拟器上启动应用的命令。
    print.info(`  ${print.colors.yellow(`${packager === "npm" ? "npm run" : packager} ios`)}`)
    print.info("")
    print.info("To run on Android simulator:")
    // 打印在 Android 模拟器或设备上启动应用的命令。
    print.info(`  ${print.colors.yellow(`${packager === "npm" ? "npm run" : packager} android`)}`)
    print.info("")
  }

  // 提示用户如何生成新的组件、屏幕等。
  print.info("To generate new components, screens, etc:")
  print.info(`  ${print.colors.yellow("npx ignite-cli g component MyComponent")}`) // 提供一个具体的生成命令示例
  print.info("")

  // 提示用户查看 README 获取更多信息。
  print.info("To view all available commands:")
  print.info(`  ${print.colors.yellow("npx ignite-cli --help")}`) // 提示查看帮助命令
  print.info("")

  // 结束标记
  print.info("Now get cooking! 🍽 ")
  print.info("")
  // #endregion
}
