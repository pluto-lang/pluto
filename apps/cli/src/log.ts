import chalk from "chalk";

class Logger {
  public static error(...msg: any[]) {
    console.error(chalk.bold.red("Error:"), ...msg);
  }

  public static info(...msg: any[]) {
    console.info(chalk.blue("Info: "), ...msg);
  }

  public static debug(...msg: any[]) {
    if (process.env.DEBUG) {
      console.debug(chalk.gray("Debug:"), ...msg);
    }
  }
}

export default Logger;
