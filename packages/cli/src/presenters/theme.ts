const ANSI = {
  reset: '\u001B[0m',
  bold: '\u001B[1m',
  dim: '\u001B[2m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  cyan: '\u001B[36m',
} as const;

function supportsColor(): boolean {
  return Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
}

function wrap(code: string, text: string): string {
  if (!supportsColor()) {
    return text;
  }

  return `${code}${text}${ANSI.reset}`;
}

export function title(text: string): string {
  return wrap(ANSI.bold, text);
}

export function dim(text: string): string {
  return wrap(ANSI.dim, text);
}

export function ok(text: string): string {
  return wrap(ANSI.green, text);
}

export function warn(text: string): string {
  return wrap(ANSI.yellow, text);
}

export function error(text: string): string {
  return wrap(ANSI.red, text);
}

export function info(text: string): string {
  return wrap(ANSI.cyan, text);
}

export function badge(label: string, good: boolean): string {
  return good ? ok(`[${label}]`) : error(`[${label}]`);
}
