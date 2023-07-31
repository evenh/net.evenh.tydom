import * as crypto from 'crypto';
import { AssertionError } from 'assert';
import { xor } from 'lodash';

export const assert: (value: unknown, message?: string) => asserts value = (
  value: unknown,
  message?: string,
) => {
  if (!value) throw new AssertionError({ message });
};

export const stringIncludes = (
  array: unknown[],
  value: string | number,
): boolean => array.includes(value) || array.includes(`${value}`);

export const sameArrays = (source: unknown[], array: unknown[]): boolean =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  source.length === array.length && xor(source, array).length === 0;

// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
export const asNumber = (maybeNumber: unknown): number =>
  parseInt(`${maybeNumber}`, 10);

const timeouts = new Map<
  string,
  { timeout: NodeJS.Timeout; reject: () => void }
>();
export const waitFor = async (key: string, ms: number): Promise<void> => {
  if (timeouts.has(key)) {
    const { timeout, reject } = timeouts.get(key)!;
    clearTimeout(timeout);
    timeouts.delete(key);
    reject();
  }
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    timeouts.set(key, { timeout, reject });
  });
  timeouts.delete(key);
};

export const decode = (string?: string): string =>
  string ? Buffer.from(string, 'base64').toString('ascii') : '';

export const sha256 = (data: crypto.BinaryLike): Promise<string> =>
  new Promise((resolve, reject) => {
    try {
      const shasum = crypto.createHash('sha256');
      shasum.update(data);
      resolve(shasum.digest('hex'));
    } catch (err) {
      reject(err);
    }
  });

export const sha256Sync = (data: crypto.BinaryLike): string => {
  const shasum = crypto.createHash('sha256');
  shasum.update(data);
  return shasum.digest('hex');
};

export interface Logger {
  /**
   * Log a INFO message to the console (stdout)
   * @param {...*} args
   */
  info(...args: unknown[]): void;

  /**
   * Log a WARN message to the console (stdout)
   * @param {...*} args
   */
  warn(...args: unknown[]): void;

  /**
   * Log a ERROR message to the console (stderr)
   * @param {...*} args
   */
  error(...args: unknown[]): void;

  /**
   * Log a DEBUG message to the console (stdout)
   * @param {...*} args
   */
  debug(...args: unknown[]): void;
}

export class DefaultLogger implements Logger {
  private readonly logFn: (...args: unknown[]) => void;
  private readonly errorFn: (...args: unknown[]) => void;
  private readonly debugEnabled: boolean;

  constructor(
    logFn: (...args: unknown[]) => void,
    errorFn: (...args: unknown[]) => void,
    debugEnabled: boolean,
  ) {
    this.logFn = logFn;
    this.errorFn = errorFn;
    this.debugEnabled = debugEnabled;
  }

  error(...args: any[]): void {
    this.errorFn(`[ERROR] ${args}`);
  }

  debug(...args: unknown[]): void {
    if (this.debugEnabled) this.logFn(`[DEBUG] ${args}`);
  }

  info(...args: unknown[]): void {
    this.logFn(`[INFO] ${args}`);
  }

  warn(...args: unknown[]): void {
    this.logFn(`[WARN] ${args}`);
  }
}
