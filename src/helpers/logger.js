import ora from 'ora';
import chalk from 'chalk';

class Logger {
  constructor() {
    this.spinner = ora();
  }

  log(message) {
    console.log(message);
  }

  info(message) {
    console.log(chalk.blue(`ℹ️ ${message}`));
  }

  success(message) {
    console.log(chalk.green(`✔️ ${message}`));
  }

  warning(message) {
    console.log(chalk.yellow(`⚠️ ${message}`));
  }

  error(message) {
    console.error(chalk.red(`❌ ${message}`));
  }

  startSpinner(message) {
    this.spinner.text = message;
    this.spinner.start();
  }

  stopSpinner() {
    this.spinner.stop();
  }
}

export default Logger;