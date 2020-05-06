import {
  MalType,
  makeNumber,
  makeList,
  makeTrue,
  makeFalse,
  makeNil,
  makeString,
  makeClojureAtom,
  FuncMalType,
  is_symbol,
  is_true,
  is_nil,
  is_false,
  is_string,
  makeSymbol,
  makeKeyword,
  makeVector,
  is_vector,
  is_list,
  makeHashMap,
  is_hash_map,
  is_keyword,
} from "./types";
import { LOG } from "./utils";
import { isEqual, flatten } from "lodash/fp";
import { pr_str } from "./printer";
import { inspect } from "util";
import { read_str } from "./reader";

import { readFileSync } from "fs";
import { EVAL, env } from "./step9_try"; // FIXME(QL): Circular dep

export const core: { [k: string]: (...args: MalType[]) => MalType } = {
  "+": (...args) => {
    LOG("+", args);
    const number = args.reduce((prev, curr) => {
      if (curr.type !== "atom" || curr.atom.type !== "number") {
        throw new Error("+ can be use with number");
      }
      return prev + curr.atom.number;
    }, 0);
    return makeNumber(number);
  },

  "-": (...args) => {
    LOG("-", args);
    const [first, ...rest] = args;
    if (first.type !== "atom" || first.atom.type !== "number") {
      throw new Error("- can be use with number");
    }
    const number = rest.reduce((prev, curr) => {
      if (curr.type !== "atom" || curr.atom.type !== "number") {
        throw new Error("- can be use with number");
      }
      return prev - curr.atom.number;
    }, first.atom.number);
    return makeNumber(number);
  },

  "*": (...args) => {
    LOG("*", args);
    const number = args.reduce((prev, curr) => {
      if (curr.type !== "atom" || curr.atom.type !== "number") {
        throw new Error("* can be use with number");
      }
      return prev * curr.atom.number;
    }, 1);
    return makeNumber(number);
  },

  "/": (...args) => {
    LOG("/", args);
    const [first, ...rest] = args;
    if (first.type !== "atom" || first.atom.type !== "number") {
      throw new Error("/ can be use with number");
    }
    const number = rest.reduce((prev, curr) => {
      if (curr.type !== "atom" || curr.atom.type !== "number") {
        throw new Error("/ can be use with number");
      }
      return prev / curr.atom.number;
    }, first.atom.number);
    return makeNumber(number);
  },

  prn: (...args) => {
    console.log(args.map((it) => pr_str(it, true)).join(" ")); // FIXME(QL): Why print here?
    return makeNil();
  },

  "pr-str": (...args) => {
    return makeString(args.map((it) => pr_str(it, true)).join(" "));
  },

  str: (...args) => {
    return makeString(args.map((it) => pr_str(it, false)).join(""));
  },

  println: (...args) => {
    console.log(args.map((it) => pr_str(it, false)).join(" ")); // FIXME(QL): Why print here?
    return makeNil();
  },

  list: makeList,

  "list?": (...args) => {
    return args[0] && args[0].type === "list" ? makeTrue() : makeFalse();
  },

  "empty?": (...args) => {
    if (!args[0] || (args[0].type !== "list" && args[0].type !== "vector")) {
      throw new Error("args must be a list or a vector");
    }
    return args[0].list.length === 0 ? makeTrue() : makeFalse();
  },

  count: (...args) => {
    if (!args[0] || (args[0].type !== "list" && args[0].type !== "vector")) {
      return makeNumber(0);
    }
    LOG("count", inspect(args, false, 10));
    return makeNumber(args[0].list.length);
  },

  "read-string": (first, ...rest) => {
    if (!first || first.type !== "atom" || first.atom.type !== "string") {
      throw new Error("expect string");
    }
    return read_str(first.atom.string);
  },

  slurp: (first, ...rest) => {
    if (!first || first.type !== "atom" || first.atom.type !== "string") {
      throw new Error("expect string");
    }
    LOG("slurp", first.atom.string, readFileSync(first.atom.string, "utf-8"));
    return makeString(readFileSync(first.atom.string, "utf-8"));
  },

  cons: (first, second, ...rest) => {
    if (!second || (second.type !== "list" && second.type !== "vector")) {
      throw new Error("expect list or vector");
    }
    return makeList(first, ...second.list);
  },

  concat: (...args) => {
    return makeList(
      ...args.reduce((prev, current) => {
        if (
          !current ||
          (current.type !== "list" && current.type !== "vector")
        ) {
          throw new Error("expect list or vector");
        }
        return prev.concat(current.list);
      }, [] as MalType[])
    );
  },

  nth: (list, index, ...rest) => {
    if (!index || index.type !== "atom" || index.atom.type !== "number") {
      throw new Error("expect number");
    }
    if (!list || (list.type !== "list" && list.type !== "vector")) {
      throw new Error("expect list or vector");
    }
    if (list.list[index.atom.number]) {
      return list.list[index.atom.number];
    }

    throw new Error("index out of range");
  },

  first: (list, ...args) => {
    if (list && list.type === "atom" && list.atom.type === "nil") {
      return makeNil();
    }

    if (!list || (list.type !== "list" && list.type !== "vector")) {
      throw new Error("expect list or vector");
    }

    return list.list[0] || makeNil();
  },

  rest: (list, ...args) => {
    if (list && list.type === "atom" && list.atom.type === "nil") {
      return makeList();
    }

    if (!list || (list.type !== "list" && list.type !== "vector")) {
      throw new Error("expect list or vector");
    }

    const [_, ...realRest] = list.list;
    return makeList(...realRest);
  },

  throw: (first, ...rest) => {
    throw new Error(pr_str(first, true));
  },

  apply: (fn, ...args) => {
    const realArgs = args.reduce((prev, curr) => {
      if (curr.type === "list" || curr.type === "vector") {
        return prev.concat(curr.list);
      }
      return prev.concat(curr);
    }, [] as MalType[]);

    let realFn: FuncMalType | undefined;
    if (fn && fn.type === "atom" && fn.atom.type === "tco_function") {
      realFn = (fn.atom.fn as any).atom.function;
    }

    if (fn && fn.type === "atom" && fn.atom.type === "function") {
      realFn = fn.atom.function;
    }

    if (realFn) {
      return realFn(...realArgs);
    }

    throw new Error("expect function");
  },

  map: (fn, args) => {
    let realFn: FuncMalType | undefined;
    if (fn && fn.type === "atom" && fn.atom.type === "tco_function") {
      realFn = (fn.atom.fn as any).atom.function;
    }

    if (fn && fn.type === "atom" && fn.atom.type === "function") {
      realFn = fn.atom.function;
    }

    if (!args || (args.type !== "list" && args.type !== "vector")) {
      throw new Error("exect sequential");
    }

    if (realFn) {
      return makeList(...(args.list.map((it) => realFn!(it)) as MalType[]));
    }

    throw new Error("expect function");
  },

  "symbol?": (first, ...rest) => {
    return is_symbol(first) ? makeTrue() : makeFalse();
  },

  "keyword?": (first, ...rest) => {
    return is_keyword(first) ? makeTrue() : makeFalse();
  },

  "nil?": (first, ...rest) => {
    return is_nil(first) ? makeTrue() : makeFalse();
  },

  "true?": (first, ...rest) => {
    return is_true(first) ? makeTrue() : makeFalse();
  },

  "false?": (first, ...rest) => {
    return is_false(first) ? makeTrue() : makeFalse();
  },

  symbol: (first, ...rest) => {
    if (!first || first.type !== "atom" || first.atom.type !== "string") {
      throw new Error("expect string");
    }
    return makeSymbol(first.atom.string);
  },

  keyword: (first, ...rest) => {
    if (first && first.type === "atom" && first.atom.type === "keyword") {
      return first;
    }

    if (!first || first.type !== "atom" || first.atom.type !== "string") {
      throw new Error("expect string");
    }
    return makeKeyword(":" + first.atom.string);
  },

  vector: (...args) => {
    return makeVector(...args);
  },

  "vector?": (first, ...rest) => {
    return is_vector(first) ? makeTrue() : makeFalse();
  },

  "sequential?": (first, ...rest) => {
    return is_vector(first) || is_list(first) ? makeTrue() : makeFalse();
  },

  "hash-map": (...args) => {
    if (args.length % 2 !== 0) {
      throw new Error("expect even number of arguments");
    }

    return makeHashMap(...args);
  },

  "map?": (first, ...rest) => {
    return is_hash_map(first) ? makeTrue() : makeFalse();
  },

  assoc: (hashMap, ...args) => {
    if (!hashMap || hashMap.type !== "hash-map") {
      throw new Error("expect hash-map");
    }

    if (args.length % 2 !== 0) {
      throw new Error("expect even number of arguments");
    }

    const newHashMap = {
      type: "hash-map" as const,
      list: new Map<MalType, MalType>(),
    }; // FIXME(QL): A lot of union...

    hashMap.list.forEach((val, key) => {
      newHashMap.list.set(key, val);
    });

    for (let index = 0; index < args.length / 2; index++) {
      newHashMap.list.set(args[2 * index], args[2 * index + 1]);
    }

    return newHashMap;
  },

  dissoc: (hashMap, ...args) => {
    if (!hashMap || hashMap.type !== "hash-map") {
      throw new Error("expect hash-map");
    }

    const newHashMap = {
      type: "hash-map" as const,
      list: new Map<MalType, MalType>(),
    }; // FIXME(QL): A lot of union...

    hashMap.list.forEach((val, key) => {
      const eqlKey = isEqual(key);
      const found = args.find(eqlKey);
      if (!found) {
        newHashMap.list.set(key, val);
      }
    });

    return newHashMap;
  },

  get: (hashMap, key, ...rest) => {
    if (hashMap && hashMap.type === "atom" && hashMap.atom.type === "nil") {
      return makeNil();
    }

    if (!hashMap || hashMap.type !== "hash-map") {
      throw new Error("expect hash-map");
    }

    // return hashMap.list.get(key) || makeNil();
    let found: MalType | undefined;
    const eqlKey = isEqual(key);
    hashMap.list.forEach((val, key2) => {
      if (eqlKey(key2)) {
        found = val;
      }
    });
    return found || makeNil(); //FIXME(QL): Try native implement instead...
  },

  "contains?": (hashMap, key, ...rest) => {
    if (hashMap && hashMap.type === "atom" && hashMap.atom.type === "nil") {
      return makeFalse();
    }

    if (!hashMap || hashMap.type !== "hash-map") {
      throw new Error("expect hash-map");
    }

    // return (hashMap.list.get(key) && makeTrue()) || makeFalse();
    let found: MalType | undefined;
    const eqlKey = isEqual(key);
    hashMap.list.forEach((val, key2) => {
      if (eqlKey(key2)) {
        found = val;
      }
    });
    return (found && makeTrue()) || makeFalse(); //FIXME(QL): Try native implement instead...
  },

  keys: (hashMap, ...rest) => {
    if (!hashMap || hashMap.type !== "hash-map") {
      throw new Error("expect hash-map");
    }

    return makeList(...hashMap.list.keys());
  },

  vals: (hashMap, ...rest) => {
    if (!hashMap || hashMap.type !== "hash-map") {
      throw new Error("expect hash-map");
    }

    return makeList(...hashMap.list.values());
  },

  eval: (first, ...rest) => {
    return EVAL(first, env);
  },

  atom: (first, ...rest) => {
    return makeClojureAtom(first);
  },

  "atom?": (first, ...rest) => {
    return first && first.type === "atom" && first.atom.type === "clojure-atom"
      ? makeTrue()
      : makeFalse();
  },

  "reset!": (first, second, ...rest) => {
    if (!first || first.type !== "atom" || first.atom.type !== "clojure-atom") {
      throw new Error("expect clojuure-atom");
    }
    if (!second) {
      throw new Error("expect second");
    }

    first.atom.atom = second;
    return second;
  },

  "swap!": (first, second, ...rest) => {
    if (!first || first.type !== "atom" || first.atom.type !== "clojure-atom") {
      throw new Error("expect clojuure-atom");
    }
    let f: ((...args: MalType[]) => MalType) | undefined;
    if (second && second.type === "atom" && second.atom.type === "function") {
      f = second.atom.function;
    }

    if (
      second &&
      second.type === "atom" &&
      second.atom.type === "tco_function"
    ) {
      f = (second.atom.fn as any).atom.function;
    }

    if (!f) {
      throw new Error("expect function");
    }
    const newVal = f(...[first.atom.atom, ...rest]); // FIXME(QL): Strong typing
    first.atom.atom = newVal;
    return newVal;
  },

  deref: (first, ...rest) => {
    if (!first || first.type !== "atom" || first.atom.type !== "clojure-atom") {
      throw new Error("expect clojure-atom");
    }
    return first.atom.atom;
  },

  "=": (first, ...rest) => {
    // const [first, ...rest] = args;
    if (!first) {
      throw new Error("must have at least two element");
    }

    for (let index = 0; index < rest.length; index++) {
      if (!isEqual(first)(rest[index])) {
        return makeFalse();
      }
    }

    return makeTrue();
  },

  "<": (first, second) => {
    if (!first || first.type !== "atom" || first.atom.type !== "number") {
      throw new Error("arg0 must be a number");
    }
    if (!second || second.type !== "atom" || second.atom.type !== "number") {
      throw new Error("arg1 must be a number");
    }
    return first.atom.number < second.atom.number ? makeTrue() : makeFalse();
  },

  "<=": (first, second) => {
    if (!first || first.type !== "atom" || first.atom.type !== "number") {
      throw new Error("arg0 must be a number");
    }
    if (!second || second.type !== "atom" || second.atom.type !== "number") {
      throw new Error("arg1 must be a number");
    }
    return first.atom.number <= second.atom.number ? makeTrue() : makeFalse();
  },

  ">": (first, second) => {
    if (!first || first.type !== "atom" || first.atom.type !== "number") {
      throw new Error("arg0 must be a number");
    }
    if (!second || second.type !== "atom" || second.atom.type !== "number") {
      throw new Error("arg1 must be a number");
    }
    return first.atom.number > second.atom.number ? makeTrue() : makeFalse();
  },

  ">=": (first, second) => {
    if (!first || first.type !== "atom" || first.atom.type !== "number") {
      throw new Error("arg0 must be a number");
    }
    if (!second || second.type !== "atom" || second.atom.type !== "number") {
      throw new Error("arg1 must be a number");
    }
    return first.atom.number >= second.atom.number ? makeTrue() : makeFalse();
  },
};
