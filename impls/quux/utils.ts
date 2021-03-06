export function LOG(...args: any[]) {
  if (process.env.LOG) {
    console.log(...args);
  }
}

export function assertNever(x: never) {
  return new Error(`epecting x to be never: ${x}`);
}
