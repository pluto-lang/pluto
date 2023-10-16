import chalk from "chalk";

class Logger {
  public error(msg: string) {
    console.error(chalk.bold.red("Error:"), msg);
  }

  public info(msg: string) {
    console.info(chalk.blue("Info: "), msg);
  }
}

export default new Logger();
