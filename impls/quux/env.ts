import { inspect } from "util";
import { LOG } from "./utils";
import { MalType, makeFunction } from "./types";
import { core } from "./core";

export class Env {
  data: {
    [k: string]: MalType;
  } = {};
  constructor(
    public outer?: Env,
    public binds: MalType[] = [],
    public exprs: MalType[] = []
  ) {
    Object.keys(core).forEach((k) => {
      this.data[k] = makeFunction(core[k]);
    });

    if (binds.length !== exprs.length) {
      LOG("Env", inspect({ binds, exprs }, false, 10));
      throw new Error("not enough/too much argument");
    }

    for (let index = 0; index < binds.length; index++) {
      const bind = this.binds[index];
      const expr = this.exprs[index];

      if (bind.type !== "atom" || bind.atom.type !== "symbol") {
        throw new Error("arg must be a symbol");
      }

      this.set(bind.atom.symbol, expr);
    }
  }

  set(k: string, v: MalType): MalType {
    this.data[k] = v;
    return v;
  }

  find(k: string): MalType {
    return (
      this.data[k] ||
      this.outer?.find(k) || { type: "atom", atom: { type: "nil" } }
    );
  }

  get(k: string): MalType {
    const found = this.find(k) as MalType;
    if (found.type === "atom" && found.atom.type === "nil") {
      throw new Error(`${k} not found`);
    }
    return found;
  }
}
