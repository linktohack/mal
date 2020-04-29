import { inspect } from "util";
import { LOG } from "./utils";
import { MalType, EnvType } from "./types";

export class Env {
  data: {
    [k: string]: EnvType;
  } = {
    "+": (...args) => {
      LOG("+", args);
      const number = args.reduce((prev, curr) => {
        if (curr.type !== "atom" || curr.atom.type !== "number") {
          throw new Error("+ can be use with number");
        }
        return prev + curr.atom.number;
      }, 0);
      return {
        type: "atom",
        atom: { type: "number", number },
      };
    },
    "-": (...args) => {
      LOG("-", args);
      const number = args.reduce((prev, curr) => {
        if (curr.type !== "atom" || curr.atom.type !== "number") {
          throw new Error("- can be use with number");
        }
        return prev - curr.atom.number;
      }, 0);
      return {
        type: "atom",
        atom: { type: "number", number },
      };
    },
    "*": (...args) => {
      LOG("*", args);
      const number = args.reduce((prev, curr) => {
        if (curr.type !== "atom" || curr.atom.type !== "number") {
          throw new Error("* can be use with number");
        }
        return prev * curr.atom.number;
      }, 0);
      return {
        type: "atom",
        atom: { type: "number", number },
      };
    },
    "/": (...args) => {
      LOG("/", args);
      const number = args.reduce((prev, curr) => {
        if (curr.type !== "atom" || curr.atom.type !== "number") {
          throw new Error("/ can be use with number");
        }
        return prev / curr.atom.number;
      }, 0);
      return {
        type: "atom",
        atom: { type: "number", number },
      };
    },
  };
  constructor(public outer?: Env) {}

  set(
    k: any,
    v: ((...args: any[]) => MalType) | MalType
  ): ((...args: any[]) => MalType) | MalType {
    this.data[k] = v;
    return v;
  }

  find(k: any): ((...args: any[]) => MalType) | MalType {
    return (
      this.data[k] ||
      this.outer?.find(k) || { type: "atom", atom: { type: "nil" } }
    );
  }

  get(k: any): ((...args: any[]) => MalType) | MalType {
    const found = this.find(k) as MalType;
    if (found.type === "atom" && found.atom.type === "nil") {
      throw new Error(`${k} not found`);
    }
    return found;
  }
}
