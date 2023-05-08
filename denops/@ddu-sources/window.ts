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
  const tabName = await denops.eval(
    `luaeval('require("tabby.tab").get_name(${tabnr})')`,
  );
  return ensureString(tabName);
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
          const tabName = await getTabName(args.denops, tab.tabnr);
          for (const winnr of tab.windows) {
            const bufNum = ensureNumber(await fn.winbufnr(args.denops, winnr));
            const bufName = ensureString(await fn.bufname(args.denops, bufNum));
            const regexp = new RegExp("(\s|\t|\n|\v)", "g");
            const text: string = args.sourceParams.format
              .replaceAll(regexp, " ")
              .replaceAll("%n", tab.tabnr.toString())
              .replaceAll("%T", tabName)
              .replaceAll("%w", bufName);
            items.push({
              word: text,
              action: {
                tabnr: tab.tabnr,
                winnr: winnr
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
      format: "tab:%n:%w",
    };
  }
}
