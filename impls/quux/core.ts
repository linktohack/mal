import { MalType, makeNumber, makeList, makeTrue, makeFalse, makeNil } from "./types";
import { LOG } from "./utils";
import { isEqual } from "lodash/fp";
import { pr_str } from "./printer";

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
    const number = args.reduce((prev, curr) => {
      if (curr.type !== "atom" || curr.atom.type !== "number") {
        throw new Error("- can be use with number");
      }
      return prev - curr.atom.number;
    }, 0);
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
    const number = args.reduce((prev, curr) => {
      if (curr.type !== "atom" || curr.atom.type !== "number") {
        throw new Error("/ can be use with number");
      }
      return prev / curr.atom.number;
    }, 0);
    return makeNumber(number);
  },

  prn: (...args) => {
    console.log(pr_str(args[0])); // FIXME(QL): Why print here?
    return makeNil()
  },

  list: makeList,

  "list?": (...args) => {
    return args[0] && args[0].type === "list" ? makeTrue() : makeFalse();
  },

  "empty?": (...args) => {
    if (!args[0] || args[0].type !== "list") {
      throw new Error("args must be a list");
    }
    return args[0].list.length === 0 ? makeTrue() : makeFalse();
  },

  count: (...args) => {
    if (!args[0] || (args[0].type !== "list" && args[0].type !== "vector")) {
      return makeNumber(0);
    }
    return makeNumber(args[0].list.length);
  },

  "=": (...args) => {
    if (!args[1]) {
      throw new Error("must have at least two element");
    }

    for (let index = 1; index < args.length; index++) {
      if (!isEqual(args[0])(args[index])) {
        return makeFalse();
      }
    }

    return makeTrue();
  },

  "<": (...args) => {
    if (!args[0] || args[0].type !== "atom" || args[0].atom.type !== "number") {
      throw new Error("arg0 must be a number");
    }
    if (!args[1] || args[1].type !== "atom" || args[1].atom.type !== "number") {
      throw new Error("arg1 must be a number");
    }
    return args[0].atom.number < args[1].atom.number ? makeTrue() : makeFalse();
  },

  "<=": (...args) => {
    if (!args[0] || args[0].type !== "atom" || args[0].atom.type !== "number") {
      throw new Error("arg0 must be a number");
    }
    if (!args[1] || args[1].type !== "atom" || args[1].atom.type !== "number") {
      throw new Error("arg1 must be a number");
    }
    return args[0].atom.number <= args[1].atom.number
      ? makeTrue()
      : makeFalse();
  },

  ">": (...args) => {
    if (!args[0] || args[0].type !== "atom" || args[0].atom.type !== "number") {
      throw new Error("arg0 must be a number");
    }
    if (!args[1] || args[1].type !== "atom" || args[1].atom.type !== "number") {
      throw new Error("arg1 must be a number");
    }
    return args[0].atom.number > args[1].atom.number ? makeTrue() : makeFalse();
  },

  ">=": (...args) => {
    if (!args[0] || args[0].type !== "atom" || args[0].atom.type !== "number") {
      throw new Error("arg0 must be a number");
    }
    if (!args[1] || args[1].type !== "atom" || args[1].atom.type !== "number") {
      throw new Error("arg1 must be a number");
    }
    return args[0].atom.number >= args[1].atom.number
      ? makeTrue()
      : makeFalse();
  },
};
