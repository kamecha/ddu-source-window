import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v2.5.0/types.ts";
import { ActionData } from "../@ddu-kinds/window.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.5.0/deps.ts";
import * as fn from "https://deno.land/x/denops_std@v4.0.0/function/mod.ts";
import {
  ensureArray,
  ensureNumber,
  ensureString,
} from "https://deno.land/x/unknownutil@v2.0.0/mod.ts";

type Params = {
  format: string;
  ignoreBufNames?: string[];
};

type TabInfo = {
  tabnr: number;
  variables: Record<string, unknown>;
  windows: number[];
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
async function getTabName(denops: Denops, tabnr: number): Promise<string> {
  // tabbyが認識できるかどうかチェック
  if (!(await denops.call("ddu#source#window#lua_check", "tabby"))) {
    return "";
  }
  try {
    const tabName = await denops.call("ddu#source#window#get_tab_name", tabnr);
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
          for (const winnr of tab.windows) {
            const bufNum = ensureNumber(await fn.winbufnr(args.denops, winnr));
            const bufName = ensureString(await fn.bufname(args.denops, bufNum));
            if (args.sourceParams.ignoreBufNames?.includes(bufName)) {
              continue;
            }
            const regexp = new RegExp("(\s|\t|\n|\v)", "g");
            const text: string = args.sourceParams.format
              .replaceAll(regexp, " ")
              .replaceAll("%tn", tab.tabnr.toString())
              .replaceAll("%T", await getTabName(args.denops, tab.tabnr))
              .replaceAll("%wn", winnr.toString())
              .replaceAll("%w", bufName);
            items.push({
              word: text,
              action: {
                tabnr: tab.tabnr,
                winnr: winnr,
              },
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
      format: "tab:%tn:%w",
      ignoreBufNames: ["ddu-ff-filter-default", "ddu-ff-default"],
    };
  }
}
