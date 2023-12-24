import {
  BaseColumn,
  GetLengthArguments,
  GetTextArguments,
  GetTextResult,
} from "../deps.ts";

export type Params = {
  format: string;
};

export class Column extends BaseColumn<Params> {
  getLength({}: GetLengthArguments<Params>): Promise<number> {
    throw new Error("Method not implemented.");
  }
  getText({}: GetTextArguments<Params>): Promise<GetTextResult> {
    throw new Error("Method not implemented.");
  }
  params(): Params {
    return {
      format: "",
    };
  }
}