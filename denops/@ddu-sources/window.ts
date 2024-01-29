import { BaseSource, ensure, fn, is } from "../deps.ts";
import type { DduOptions, Denops, Item, Predicate } from "../deps.ts";
import { ActionData } from "../@ddu-kinds/window.ts";

type Params = {
  format: string;
  ignoreBufNames?: string[];
};

type TabInfo = {
  tabnr: number;
  variables: Record<string, unknown>;
  windows: number[];
};

export const isTabInfo: Predicate<TabInfo> = is.ObjectOf({
  tabnr: is.Number,
  variables: is.RecordOf(is.Unknown),
  windows: is.ArrayOf(is.Number),
});

export type WindowInfo = {
  botline: number;
  bufnr: number;
  height: number;
  loclist: number;
  quickfix: number;
  terminal: number;
  tabnr: number;
  topline: number;
  variables: Record<string, unknown>;
  width: number;
  winbar: number;
  wincol: number;
  textoff: number;
  winid: number;
  winnr: number;
  winrow: number;
};

export const isWindowInfo: Predicate<WindowInfo> = is.ObjectOf({
  botline: is.Number,
  bufnr: is.Number,
  height: is.Number,
  loclist: is.Number,
  quickfix: is.Number,
  terminal: is.Number,
  tabnr: is.Number,
  topline: is.Number,
  variables: is.RecordOf(is.Unknown),
  width: is.Number,
  winbar: is.Number,
  wincol: is.Number,
  textoff: is.Number,
  winid: is.Number,
  winnr: is.Number,
  winrow: is.Number,
});

export async function checkTabby(denops: Denops, text: string): Promise<void> {
  if (text.includes("%T")) {
    await denops.call(
      "ddu#util#print_error",
      "tabby format (%T) is deprecated",
    );
  }
}

// ↓luaでこれを書くとtabの名前が取れる
/*
lua << EOF
local tab = require('tabby.tab')
print(tab.get_name(1))
EOF
*/
export async function getTabName(
  denops: Denops,
  tabnr: number,
): Promise<string> {
  // tabbyが認識できるかどうかチェック
  if (!(await denops.call("ddu#source#window#lua_check", "tabby"))) {
    return "";
  }
  try {
    const tabPages = ensure(
      await denops.call("ddu#source#window#get_tabpages"),
      is.ArrayOf(is.Number),
    );
    const tabName = await denops.call(
      "ddu#source#window#get_tab_name",
      tabPages[tabnr - 1],
    );
    return ensure(tabName, is.String);
  } catch (e) {
    console.error(e);
    return "";
  }
}

export class Source extends BaseSource<Params> {
  kind = "window";

  gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const tabinfo = ensure(
          await fn.gettabinfo(args.denops),
          is.ArrayOf(isTabInfo),
        );
        const items: Item<ActionData>[] = [];
        for (const tab of tabinfo) {
          for (const winid of tab.windows) {
            const wininfos = ensure(
              await fn.getwininfo(args.denops, winid),
              is.ArrayOf(isWindowInfo),
            );
            if (wininfos.length === 0) {
              continue;
            }
            const wininfo = wininfos[0];
            const bufName = ensure(
              await fn.bufname(args.denops, wininfo.bufnr),
              is.String,
            );
            const currentDduOptions =
              (await args.denops.call("ddu#custom#get_current")) as Partial<
                DduOptions
              >;
            const dduWinIds: number[] = ensure(
              await args.denops.call(
                "ddu#ui#winids",
                currentDduOptions["name"],
              ),
              is.ArrayOf(is.Number),
            );
            if (
              args.sourceParams.ignoreBufNames?.includes(bufName) ||
              dduWinIds.includes(wininfo.winid)
            ) {
              continue;
            }
            const regexp = new RegExp("(\s|\t|\n|\v)", "g");
            checkTabby(args.denops, args.sourceParams.format);
            const text: string = args.sourceParams.format
              .replaceAll(regexp, " ")
              .replaceAll("%tn", wininfo.tabnr.toString())
              // deprecated
              .replaceAll("%T", await getTabName(args.denops, wininfo.tabnr))
              .replaceAll("%wi", wininfo.winid.toString())
              .replaceAll("%w", bufName);
            items.push({
              word: text,
              action: wininfo,
            });
          }
        }
        controller.enqueue(items);
        controller.close();
      },
    });
  }

  params(): Params {
    return {
      format: "%tn:%w:%wi",
      // deprecated
      ignoreBufNames: ["ddu-ff-filter-default", "ddu-ff-default"],
    };
  }
}
