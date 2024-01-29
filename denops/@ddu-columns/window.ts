import { ActionData } from "../@ddu-kinds/window.ts";
import { checkTabby, getTabName } from "../@ddu-sources/window.ts";
import {
  BaseColumn,
  ensure,
  fn,
  GetLengthArguments,
  GetTextArguments,
  GetTextResult,
  is,
} from "../deps.ts";

export type Params = {
  format: string;
};

export class Column extends BaseColumn<Params> {
  async getLength(args: GetLengthArguments<Params>): Promise<number> {
    const lengths = await Promise.all(
      args.items.map(async (item) => {
        const action = item.action as ActionData;
        const bufNum = ensure(
          await fn.winbufnr(args.denops, action.winid),
          is.Number,
        );
        const bufName = ensure(
          await fn.bufname(args.denops, bufNum),
          is.String,
        );
        const regexp = new RegExp("(\s|\t|\n|\v)", "g");
        checkTabby(args.denops, args.columnParams.format);
        const text: string = args.columnParams.format
          .replaceAll(regexp, " ")
          .replaceAll("%tn", action.tabnr.toString())
          // deprecated
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
    const bufNum = ensure(
      await fn.winbufnr(args.denops, action.winid),
      is.Number,
    );
    const bufName = ensure(await fn.bufname(args.denops, bufNum), is.String);
    const regexp = new RegExp("(\s|\t|\n|\v)", "g");
    const text: string = args.columnParams.format
      .replaceAll(regexp, " ")
      .replaceAll("%tn", action.tabnr.toString())
      // deprecated
      .replaceAll("%T", await getTabName(args.denops, action.tabnr))
      .replaceAll("%wi", action.winid.toString())
      .replaceAll("%w", bufName);
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
