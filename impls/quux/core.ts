import {
  MalType,
  makeNumber,
  makeList,
  makeTrue,
  makeFalse,
  makeNil,
  makeString,
  makeClojureAtom,
} from "./types";
import { LOG } from "./utils";
import { isEqual } from "lodash/fp";
import { pr_str } from "./printer";
import { inspect } from "util";
import { read_str } from "./reader";

import { readFileSync } from "fs";
import { EVAL, env } from "./step7_quote"; // FIXME(QL): Circular dep

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
