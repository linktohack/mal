import { MalType } from "./reader";
import { inspect } from "util";
import { LOG } from "./step3_env";

export class Env {
  data: {
    [k: string]: ((...args: any[]) => MalType) | MalType;
  } = {
    "+": (a: any, b: any) => {
      LOG("+", { a, b });
      return {
        type: "atom",
        atom: { type: "number", number: a.atom.number + b.atom.number },
      };
    }, // FIXME(QL) Strong typing
    "-": (a: any, b: any) => ({
      type: "atom",
      atom: { type: "number", number: a.atom.number - b.atom.number },
    }),
    "*": (a: any, b: any) => {
      LOG("+", { a, b });
      return {
        type: "atom",
        atom: { type: "number", number: a.atom.number * b.atom.number },
      };
    }, // FIXME(QL) Strong typing
    "/": (a: any, b: any) => ({
      type: "atom",
      atom: { type: "number", number: a.atom.number / b.atom.number },
    }),
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
