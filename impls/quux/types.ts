export type Tokenized = string;

export type Atom =
  | { type: "true" }
  | { type: "false" }
  | { type: "nil" }
  | { type: "number"; number: number }
  | { type: "string"; string: string }
  | { type: "keyword"; keyword: string }
  | { type: "symbol"; symbol: string };

export type MalType =
  | { type: "atom"; atom: Atom }
  | { type: "list"; list: MalType[] }
  | { type: "vector"; list: MalType[] }
  | { type: "hash-map"; list: MalType[] };

export type FuncMalType = (...args: MalType[]) => MalType;
export type EnvType = MalType | FuncMalType;

type Result<T, E> = { type: "ok"; ok: MalType } | { type: "err"; err: Error };
