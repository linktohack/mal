import { inspect } from "util";
import { LOG } from "./utils";
import { MalType, makeFunction, makeList } from "./types";
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
    // if (binds.length !== exprs.length) {
    //   LOG("Env", inspect({ binds, exprs }, false, 10));
    //   throw new Error("not enough/too much argument");
    // }

    for (let index = 0; index < binds.length; index++) {
      const bind = this.binds[index];
      const expr = this.exprs[index];

      if (
        bind.type === "atom" &&
        bind.atom.type === "symbol" &&
        bind.atom.symbol === "&"
      ) {
        const next = this.binds[index + 1];
        const gabarge = this.binds[index + 2];

        if (!next || gabarge) {
          throw new Error("there should be only one symbol after &");
        }

        if (next.type !== "atom" || next.atom.type !== "symbol") {
          throw new Error("arg must be a symbol");
        }
        this.set(next.atom.symbol, makeList(...exprs.slice(index)));
        break;
      }

      if (bind.type !== "atom" || bind.atom.type !== "symbol") {
        throw new Error("arg must be a symbol");
      }

      LOG("bind", bind.atom.symbol, expr);

      this.set(bind.atom.symbol, expr);
    }
  }

  set(k: string, v: MalType): MalType {
    this.data[k] = v;
    return v;
  }

  find(k: string): MalType | undefined {
    return this.data[k] || this.outer?.find(k);
  }

  get(k: string): MalType {
    const found = this.find(k);
    if (!found) {
      throw new Error(`${k} not found`);
    }
    return found;
  }
}
