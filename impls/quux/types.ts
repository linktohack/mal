import { Env } from "./env";

export type Tokenized = string;

export type Atom =
  | { type: "true" }
  | { type: "false" }
  | { type: "nil" }
  | { type: "number"; number: number }
  | { type: "function"; function: FuncMalType }
  | {
      type: "tco_function";
      ast: MalType;
      params: MalType[];
      env: Env;
      fn: MalType;
      is_macro: boolean;
    }
  | { type: "string"; string: string }
  | { type: "keyword"; keyword: string }
  | { type: "symbol"; symbol: string }
  | { type: "clojure-atom"; atom: MalType };

export type MalType =
  | { type: "atom"; atom: Atom }
  | { type: "list"; list: MalType[] }
  | { type: "vector"; list: MalType[] }
  | { type: "hash-map"; list: MalType[] };

export type FuncMalType = (...args: MalType[]) => MalType;

// export type EnvType = MalType | FuncMalType;

export function makeTrue(): MalType {
  return { type: "atom", atom: { type: "true" } };
}
export function makeFalse(): MalType {
  return { type: "atom", atom: { type: "false" } };
}
export function makeNil(): MalType {
  return { type: "atom", atom: { type: "nil" } };
}
export function makeNumber(number: number): MalType {
  return { type: "atom", atom: { type: "number", number } };
}
export function makeFunction(f: FuncMalType): MalType {
  return { type: "atom", atom: { type: "function", function: f } };
}
export function makeTcoFunction(
  ast: MalType,
  params: MalType[],
  env: Env,
  fn: MalType,
  is_macro = false
): MalType {
  return {
    type: "atom",
    atom: { type: "tco_function", ast, params, env, fn, is_macro },
  };
}
export function makeString(string: string): MalType {
  return { type: "atom", atom: { type: "string", string } };
}
export function makeKeyword(keyword: string): MalType {
  return { type: "atom", atom: { type: "keyword", keyword } };
}
export function makeSymbol(symbol: string): MalType {
  return { type: "atom", atom: { type: "symbol", symbol } };
}
export function makeClojureAtom(atom: MalType): MalType {
  return { type: "atom", atom: { type: "clojure-atom", atom } };
}

export function makeList(...list: MalType[]): MalType {
  return { type: "list", list };
}
export function makeVector(...list: MalType[]): MalType {
  return { type: "vector", list };
}
export function makeHashMap(...list: MalType[]): MalType {
  return { type: "hash-map", list };
}

type Result<T, E> = { type: "ok"; ok: MalType } | { type: "err"; err: Error };
