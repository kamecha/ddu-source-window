import { BaseKind } from "https://deno.land/x/ddu_vim@v2.5.0/base/kind.ts";
import { ActionFlags, Actions, DduItem, PreviewContext, Previewer } from "https://deno.land/x/ddu_vim@v2.5.0/types.ts";
import { Denops } from "https://deno.land/x/denops_std@v3.9.0/mod.ts";
import { WindowLayout } from "../@ddu-sources/window.ts";
import { fn } from "https://deno.land/x/ddu_vim@v1.13.0/deps.ts";
import { ensureNumber, ensureObject, ensureString } from "https://deno.land/x/unknownutil@v2.1.0/mod.ts";

export interface ActionData {
  tabnr: number;
  winnr: number;
}

type Params = Record<never, never>;

type PreviewParams = {
  border: string[];
  focusBorder: string[];
}

export class Kind extends BaseKind<Params> {
  actions: Actions<Params> = {
    open: async (args: {
      denops: Denops;
      kindParams: Params;
      items: DduItem[];
    }) => {
      for (const item of args.items) {
        if (item.action) {
          const action = item.action as ActionData;
          await fn.win_gotoid(args.denops, action.winnr);
        }
      }
      return ActionFlags.None;
    },
  };
  params(): Params {
    return {};
  }
  async getPreviewer(args: {
    denops: Denops;
    previewContext: PreviewContext;
    actionParams: unknown;
    item: DduItem;
  }): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    if (!action) {
      return undefined;
    }
    const params = ensureObject(args.actionParams) as PreviewParams;
    const border = params.border ?? ["┌", "─", "┐", "│", "┘", "─", "└", "│"];
    const focusBorder = params.focusBorder ?? ["╔", "═", "╗", "║", "╝", "═", "╚", "║"];
    // 全部2重線にする
    const contents: string[] = [];
    // previewContextのheight,widthに沿ってcontentsを初期化
    for (let i = 0; i < args.previewContext.height; i++) {
      contents.push(" ".repeat(args.previewContext.width));
    }
    const winLayout = await fn.winlayout(args.denops, action.tabnr) as WindowLayout;
    return {
      kind: "nofile",
      contents: await this.winLayoutPreview(args.denops, contents, winLayout, action.winnr, border, focusBorder)
    }
  }
  async winLayoutPreview(denops: Denops, contents: string[], winLayout: WindowLayout, winnr: number, border: string[], focusBorder: string[]): Promise<string[]> {
    if (contents.length === 0) {
      return [];
    }
    const winLayoutPreview: string[] = contents;
    const winLayoutPreviewRec = async (
      winlayout: WindowLayout,
      winnr: number,
      i: number,
      j: number,
      width: number,
      height: number,
      border: string[],
      focusBorder: string[]
    ) => {
      if (winlayout[0] === "leaf") {
        const bufName = ensureNumber(await fn.winbufnr(denops, winlayout[1]));
        const title = ensureString( await fn.bufname(denops, bufName) );
        this.leafLayout(
          j,
          i,
          width,
          height,
          title,
          winLayoutPreview,
          ( winlayout[1] === winnr ? focusBorder : border )
        );
      }
      if (winlayout[0] === "col") {
        const next_height = Math.floor( height / winlayout[1].length );
        for (let k = 0; k < winlayout[1].length; k++) {
          const next_i = i + next_height * k;
          await winLayoutPreviewRec(winlayout[1][k], winnr, next_i, j, width, next_height, border, focusBorder);
        }
      }
      if (winlayout[0] === "row") {
        const next_width = Math.floor( width / winlayout[1].length );
        for (let k = 0; k < winlayout[1].length; k++) {
          const next_j = j + next_width * k;
          await winLayoutPreviewRec(winlayout[1][k], winnr, i, next_j, next_width, height, border, focusBorder);
        }
      }
    }
    await winLayoutPreviewRec(winLayout, winnr, 0, 0, contents[0].length, contents.length, border, focusBorder);
    return winLayoutPreview;
  }
  leafLayout(x: number, y: number, width: number, height: number, title: string, contents: string[], border: string[]) {
    // validation
    if (y < 0 || y >= contents.length || x < 0 || x >= contents[0].length) {
      return;
    }
    if (width < 2 ||  height < 2) {
      return;
    }
    // borderの配列を8つの要素に変換(borderの要素が8より小さいと順に繰り返す)
    // double style
    // [ "╔", "═", "╗", "║", "╝", "═", "╚", "║" ] => [ "╔", "═", "╗", "║", "╝", "═", "╚", "║" ]
    // [ "+", "-", "+", "|" ] => [ "+", "-", "+", "|", "+", "-", "+", "|" ]
    const border8:string[] = [];
    for (let i = 0; i < 8; i++) {
      border8.push(border[i % border.length]);
    }
    // draw
    const limitHeight = Math.min(y + height, contents.length - 1);
    // const limitWidth = Math.min(x + width, contents[0].length - 1);
    for (let i = y; i < limitHeight; i++) {
      if ( i === y ) {
        contents[i] = contents[i].slice(0, x) + border8[0] + border8[1].repeat(width - 2) + border8[2] + contents[i].slice( x + width );
      } else if ( i === limitHeight - 1 ) {
        contents[i] = contents[i].slice(0, x) + border8[6] + border8[5].repeat(width - 2) + border8[4] + contents[i].slice( x + width );
      } else {
        // 中央にtitleを表示
        if ( i === Math.floor( (y + limitHeight) / 2 ) ) {
          // titleがwidthを越える場合は後ろだけを表示
          if ( title.length > width - 2 ) {
            contents[i] = contents[i].slice(0, x) + border8[7] + title.slice(-(width - 2)) + border8[3] + contents[i].slice( x + width );
          } else {
            // titleを中央に表示
            const title_x = Math.floor( (width - 2 - title.length) / 2 );
            contents[i] = contents[i].slice(0, x) + border8[7] + " ".repeat(title_x) + title + " ".repeat(width - 2- title.length - title_x) + border8[3] + contents[i].slice( x + width );
          }
          continue;
        }
        contents[i] = contents[i].slice(0, x) + border8[7] + " ".repeat(width - 2) + border8[3] + contents[i].slice( x + width );
      }
    }
  }
}
