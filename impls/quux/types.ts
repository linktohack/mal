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
  | { type: "clojure-atom"; atom: MalType }
  | { type: "error"; atom: MalType };

export type MalType =
  | { type: "atom"; atom: Atom }
  | { type: "list"; list: MalType[] }
  | { type: "vector"; list: MalType[] }
  | { type: "hash-map"; list: Map<MalType, MalType> };

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
export function makeError(atom: MalType): MalType {
  return { type: "atom", atom: { type: "error", atom } };
}

export function makeList(...list: MalType[]): MalType {
  return { type: "list", list };
}
export function makeVector(...list: MalType[]): MalType {
  return { type: "vector", list };
}
export function makeHashMap(...list: MalType[]): MalType {
  const map = new Map<MalType, MalType>();
  if (list.length % 2 === 1) {
    throw new Error("expect even number of arguments");
  }
  for (let index = 0; index < list.length / 2; index++) {
    const k = list[2 * index];
    const v = list[2 * index + 1];
    map.set(k, v);
  }
  return { type: "hash-map", list: map };
}

export function is_symbol(ast: MalType) {
  return ast && ast.type === "atom" && ast.atom.type === "symbol";
}
export function is_keyword(ast: MalType) {
  return ast && ast.type === "atom" && ast.atom.type === "keyword";
}
export function is_number(ast: MalType) {
  return ast && ast.type === "atom" && ast.atom.type === "number";
}
export function is_string(ast: MalType) {
  return ast && ast.type === "atom" && ast.atom.type === "string";
}
export function is_error(ast: MalType) {
  return ast && ast.type === "atom" && ast.atom.type === "error";
}
export function is_nil(ast: MalType) {
  return ast && ast.type === "atom" && ast.atom.type === "nil";
}
export function is_true(ast: MalType) {
  return ast && ast.type === "atom" && ast.atom.type === "true";
}
export function is_false(ast: MalType) {
  return ast && ast.type === "atom" && ast.atom.type === "false";
}

export function is_list(ast: MalType) {
  return ast && ast.type === "list";
}

export function is_vector(ast: MalType) {
  return ast && ast.type === "vector";
}
export function is_hash_map(ast: MalType) {
  return ast && ast.type === "hash-map";
}

type Result<T, E> = { type: "ok"; ok: MalType } | { type: "err"; err: Error };
