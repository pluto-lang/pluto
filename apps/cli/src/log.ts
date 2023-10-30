import chalk from "chalk";

class Logger {
  // eslint-disable-next-line
  public static error(...msg: any[]) {
    console.error(chalk.bold.red("Error:"), ...msg);
  }

  // eslint-disable-next-line
  public static info(...msg: any[]) {
    console.info(chalk.blue("Info: "), ...msg);
  }

  // eslint-disable-next-line
  public static debug(...msg: any[]) {
    console.log(chalk.gray("Debug:"), ...msg);
  }
}

export default Logger;
