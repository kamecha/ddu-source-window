import { BaseKind } from "https://deno.land/x/ddu_vim@v2.5.0/base/kind.ts";
import {
  ActionFlags,
  Actions,
  DduItem,
  PreviewContext,
  Previewer,
} from "https://deno.land/x/ddu_vim@v2.5.0/types.ts";
import { Denops } from "https://deno.land/x/denops_std@v3.9.0/mod.ts";
import { WindowLayout } from "../@ddu-sources/window.ts";
import { fn } from "https://deno.land/x/ddu_vim@v1.13.0/deps.ts";
import {
  ensureNumber,
  ensureObject,
  ensureString,
} from "https://deno.land/x/unknownutil@v2.1.0/mod.ts";

export interface ActionData {
  tabnr: number;
  winid: number;
}

type Params = Record<never, never>;

type PreviewParams = {
  border: string[];
  focusBorder: string[];
};

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
          await fn.win_gotoid(args.denops, action.winid);
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
    const focusBorder = params.focusBorder ??
      ["╔", "═", "╗", "║", "╝", "═", "╚", "║"];
    const contents: string[] = [];
    // previewContextのheight,widthに沿ってcontentsを初期化
    for (let i = 0; i < args.previewContext.height; i++) {
      contents.push(" ".repeat(args.previewContext.width));
    }
    const winLayout = await fn.winlayout(
      args.denops,
      action.tabnr,
    ) as WindowLayout;
    return {
      kind: "nofile",
      contents: await this.winLayoutPreview(
        args.denops,
        contents,
        winLayout,
        action.winid,
        border,
        focusBorder,
      ),
    };
  }
  async winLayoutPreview(
    denops: Denops,
    contents: string[],
    winLayout: WindowLayout,
    winid: number,
    border: string[],
    focusBorder: string[],
  ): Promise<string[]> {
    if (contents.length === 0) {
      return [];
    }
    const winLayoutPreview: string[] = contents;

    const winLayoutPreviewRec = async (
      winlayout: WindowLayout,
      winid: number,
      i: number,
      j: number,
      width: number,
      height: number,
      border: string[],
      focusBorder: string[],
    ) => {
      if (winlayout[0] === "leaf") {
        const bufnr = ensureNumber(await fn.winbufnr(denops, winlayout[1]));
        const title = ensureString(await fn.bufname(denops, bufnr));
        this.leafLayout(
          j,
          i,
          width,
          height,
          title,
          winLayoutPreview,
          winlayout[1] === winid ? focusBorder : border,
        );
        return;
      }
      if (winlayout[0] === "col") {
        const next_height = Math.floor(height / winlayout[1].length);
        for (let k = 0; k < winlayout[1].length; k++) {
          const next_i = i + next_height * k;
          await winLayoutPreviewRec(
            winlayout[1][k],
            winid,
            next_i,
            j,
            width,
            next_height,
            border,
            focusBorder,
          );
        }
        return;
      }
      if (winlayout[0] === "row") {
        const next_width = Math.floor(width / winlayout[1].length);
        for (let k = 0; k < winlayout[1].length; k++) {
          const next_j = j + next_width * k;
          await winLayoutPreviewRec(
            winlayout[1][k],
            winid,
            i,
            next_j,
            next_width,
            height,
            border,
            focusBorder,
          );
        }
        return;
      }
    };
    await winLayoutPreviewRec(
      winLayout,
      winid,
      0,
      0,
      contents[0].length,
      contents.length,
      border,
      focusBorder,
    );
    return winLayoutPreview;
  }
  // x, y, width, heightの関係
  // 全体がcontents配列
  // *がtitle
  //                              width
  //                    ┌───┬───┬───┬───┬───┬───┐
  //                      x
  //        ┌   ┌───┬───┬───┬───┬───┬───┬───┬───┐
  //        │ y │   │   │ + │ - │ - │ - │ - │ + │
  //        ├   ├───┼───┼───┼───┼───┼───┼───┼───┤
  //        │   │   │   │ | │   │   │   │   │ | │
  //        ├   ├───┼───┼───┼───┼───┼───┼───┼───┤
  // height │   │   │   │ | │   │ * │ * │   │ | │
  //        ├   ├───┼───┼───┼───┼───┼───┼───┼───┤
  //        │   │   │   │ | │   │   │   │   │ | │
  //        ├   ├───┼───┼───┼───┼───┼───┼───┼───┤
  //        │   │   │   │ + │ - │ - │ - │ - │ + │
  //        └   └───┴───┴───┴───┴───┴───┴───┴───┘
  leafLayout(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    contents: string[],
    border: string[],
  ) {
    // validation
    if (
      y < 0 || y >= contents.length || x < 0 || x >= contents[0].length ||
      width < 0 || height < 0
    ) {
      return;
    }
    if (y + height > contents.length || x + width > contents[0].length) {
      return;
    }
    const border8: string[] = [];
    for (let i = 0; i < 8; i++) {
      border8.push(border[i % border.length]);
    }

    // draw
    for (let i = y; i < y + height; i++) {
      if (i === y) {
        contents[i] = contents[i].slice(0, x) + border8[0] +
          border8[1].repeat(width - 2) + border8[2] +
          contents[i].slice(x + width);
      } else if (i === y + height - 1) {
        contents[i] = contents[i].slice(0, x) + border8[6] +
          border8[5].repeat(width - 2) + border8[4] +
          contents[i].slice(x + width);
      } else {
        // 中央にtitleを表示
        if (i === y + Math.floor(height / 2)) {
          // titleがwidthを越える場合は後ろだけを表示
          if (title.length > width - 2) {
            contents[i] = contents[i].slice(0, x) + border8[7] +
              title.slice(-(width - 2)) + border8[3] +
              contents[i].slice(x + width);
          } else {
            // titleを中央に表示
            const title_x = Math.floor((width - 2 - title.length) / 2);
            contents[i] = contents[i].slice(0, x) + border8[7] +
              " ".repeat(title_x) + title +
              " ".repeat(width - 2 - title.length - title_x) + border8[3] +
              contents[i].slice(x + width);
          }
          continue;
        }
        contents[i] = contents[i].slice(0, x) + border8[7] +
          " ".repeat(width - 2) + border8[3] + contents[i].slice(x + width);
      }
    }
  }
}
