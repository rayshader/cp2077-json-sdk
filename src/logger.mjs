import chalk from "chalk";

export const error = (msg) => {
    if (msg instanceof Error) {
        const entries = msg.stack.split('\n');

        entries.splice(0, 1);
        console.error(chalk.bold.red('[error] ') + chalk.bold(msg) + '\n' + entries.join('\n'));
    } else {
        console.error(chalk.bold.red('[error] ') + chalk.bold(msg));
    }
};
export const info = (msg) => console.log(chalk.bold.blue('[info] ') + msg);
export const debug = (msg) => console.debug(chalk.bold.magentaBright('[debug] ') + msg);
export const nicePath = (path) => chalk.green(`"${path}"`);
