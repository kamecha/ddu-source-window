import { ActionData } from "../@ddu-kinds/window.ts";
import { getTabName } from "../@ddu-sources/window.ts";
import {
  BaseColumn,
  ensureNumber,
  ensureString,
  fn,
  GetLengthArguments,
  GetTextArguments,
  GetTextResult,
} from "../deps.ts";

export type Params = {
  format: string;
};

export class Column extends BaseColumn<Params> {
  async getLength(args: GetLengthArguments<Params>): Promise<number> {
    const lengths = await Promise.all(
      args.items.map(async (item) => {
        const action = item.action as ActionData;
        const bufNum = ensureNumber(
          await fn.winbufnr(args.denops, action.winid),
        );
        const bufName = ensureString(await fn.bufname(args.denops, bufNum));
        const regexp = new RegExp("(\s|\t|\n|\v)", "g");
        const text: string = args.columnParams.format
          .replaceAll(regexp, " ")
          .replaceAll("%tn", action.tabnr.toString())
          .replaceAll("%T", await getTabName(args.denops, action.tabnr))
          .replaceAll("%wi", action.winid.toString())
          .replaceAll("%w", bufName);
        const textLength = (new TextEncoder()).encode(text).length;
        return textLength;
      }),
    );
    return Promise.resolve(Math.max(...lengths));
  }
  async getText(args: GetTextArguments<Params>): Promise<GetTextResult> {
    const action = args.item.action as ActionData;
    const bufNum = ensureNumber(await fn.winbufnr(args.denops, action.winid));
    const bufName = ensureString(await fn.bufname(args.denops, bufNum));
    const regexp = new RegExp("(\s|\t|\n|\v)", "g");
    const text: string = args.columnParams.format
      .replaceAll(regexp, " ")
      .replaceAll("%tn", action.tabnr.toString())
      .replaceAll("%T", await getTabName(args.denops, action.tabnr))
      .replaceAll("%wi", action.winid.toString())
      .replaceAll("%w", bufName);
    console.log("format: " + args.columnParams.format);
    console.log("text: " + text);
    const textLength = (new TextEncoder()).encode(text).length;
    const padding = " ".repeat(args.endCol - args.startCol - textLength);
    return {
      text: text + padding,
    };
  }
  params(): Params {
    return {
      format: "",
    };
  }
}
