import {
  MalType,
  makeNumber,
  makeList,
  makeTrue,
  makeFalse,
  makeNil,
  makeString,
} from "./types";
import { LOG } from "./utils";
import { isEqual } from "lodash/fp";
import { pr_str } from "./printer";
import { inspect } from "util";
import { read_str } from "./reader";

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
    }, 0);
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
