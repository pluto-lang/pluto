import chalk from "chalk";

class Logger {
  public static error(...msg: any[]) {
    console.error(chalk.bold.red("ERRO:"), ...msg);
  }

  public static warn(...msg: any[]) {
    console.warn(chalk.yellow("WARN:"), ...msg);
  }

  public static info(...msg: any[]) {
    console.info(chalk.blue("INFO: "), ...msg);
  }

  public static debug(...msg: any[]) {
    if (process.env.DEBUG) {
      console.debug(chalk.gray("DEBU:"), ...msg);
    }
  }
}

export default Logger;
