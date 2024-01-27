import { BaseSource, ensureArray, ensureString, fn } from "../deps.ts";
import type { DduOptions, Denops, Item } from "../deps.ts";
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

export type LeafLayout = ["leaf", number];
export type RowLayout = ["row", WindowLayout[]];
export type ColLayout = ["col", WindowLayout[]];
export type WindowLayout = LeafLayout | RowLayout | ColLayout;

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
    const tabPages = ensureArray<number>(
      await denops.call("ddu#source#window#get_tabpages"),
    );
    const tabName = await denops.call(
      "ddu#source#window#get_tab_name",
      tabPages[tabnr - 1],
    );
    return ensureString(tabName);
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
        const tabinfo = ensureArray<TabInfo>(await fn.gettabinfo(args.denops));
        const items: Item<ActionData>[] = [];
        for (const tab of tabinfo) {
          for (const winid of tab.windows) {
            const wininfos = ensureArray<WindowInfo>(
              await fn.getwininfo(args.denops, winid),
            );
            if (wininfos.length === 0) {
              continue;
            }
            const wininfo = wininfos[0];
            const bufName = ensureString(
              await fn.bufname(args.denops, wininfo.bufnr),
            );
            const currentDduOptions =
              (await args.denops.call("ddu#custom#get_current")) as Partial<
                DduOptions
              >;
            const dduWinIds: number[] = ensureArray<number>(
              await args.denops.call(
                "ddu#ui#winids",
                currentDduOptions["name"],
              ),
            );
            if (
              args.sourceParams.ignoreBufNames?.includes(bufName) ||
              dduWinIds.includes(wininfo.winid)
            ) {
              continue;
            }
            const regexp = new RegExp("(\s|\t|\n|\v)", "g");
            const text: string = args.sourceParams.format
              .replaceAll(regexp, " ")
              .replaceAll("%tn", wininfo.tabnr.toString())
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
