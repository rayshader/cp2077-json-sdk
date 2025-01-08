import chalk from "chalk";

let ctx = 'stdout';

export const print = (msg, withNewline = true) => {
    if (withNewline) {
        msg += '\n';
    }
    const fd = (ctx === 'stderr') ? process.stderr : process.stdout;

    fd.write(msg);
}

export const error = (msg, withNewline = true) => {
    if (msg instanceof Error) {
        const entries = msg.stack.split('\n');

        entries.splice(0, 1);
        msg = chalk.bold.red('[error] ') + chalk.bold(msg) + '\n' + entries.join('\n');
    } else {
        msg = chalk.bold.red('[error] ') + chalk.bold(msg);
    }
    if (withNewline) {
        msg += '\n';
    }
    process.stderr.write(msg);
    ctx = 'stderr';
};

export const warn = (msg, withNewline = true) => {
    msg = chalk.bold.yellow('[warn] ') + msg;
    if (withNewline) {
        msg += '\n';
    }
    process.stdout.write(msg);
    ctx = 'stdout';
}

export const info = (msg, withNewline = true) => {
    msg = chalk.bold.blue('[info] ') + msg;
    if (withNewline) {
        msg += '\n';
    }
    process.stdout.write(msg);
    ctx = 'stdout';
}

export const debug = (msg, withNewline = true) => {
    msg = chalk.bold.magentaBright('[debug] ') + msg;
    if (withNewline) {
        msg += '\n';
    }
    process.stdout.write(msg);
    ctx = 'stdout';
}

export const nicePath = (path) => chalk.bold.green(`"${path}"`);

export const formatTime = (time) => {
    const milliseconds = Math.trunc(time % 1000);
    const seconds = Math.trunc(time / 1000 % 60);
    const minutes = Math.trunc(time / 1000 / 60 % 60);
    const hours = Math.trunc(time / 1000 / 60 / 60 % 60);

    return `${_pad(hours, 2)}:${_pad(minutes, 2)}:${_pad(seconds, 2)}.${_pad(milliseconds, 3)}`;
}

const _pad = (value, size = 2) => String(value).padStart(size, '0')
