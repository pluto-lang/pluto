import chalk from "chalk";

class Logger {
  public error(...msg: any[]) {
    console.error(chalk.bold.red("Error:"), ...msg);
  }

  public info(...msg: any[]) {
    console.info(chalk.blue("Info: "), ...msg);
  }

  public debug(...msg: any[]) {
    console.log(chalk.gray("Debug:"), ...msg);
  }
}

export default new Logger();
