import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { Kind } from "./window.ts";
import { WindowLayout } from "../@ddu-sources/window.ts";
import { Denops } from "https://deno.land/x/denops_core@v4.0.0/mod.ts";

Deno.test("leafLayout", () => {
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
  const before: string[] = [
    "        ",
    "        ",
    "        ",
    "        ",
    "        ",
  ]
  const after: string[] = [
    "  +----+",
    "  |    |",
    "  | ** |",
    "  |    |",
    "  +----+",
  ];
  const border: string[] = ["+", "-", "+", "|"];
  const title = "**";
  const kind = new Kind();
  kind.leafLayout(2, 0, 6, 5, title, before, border);
  assertEquals(before, after);
});

Deno.test("winlayout for only one window", async (denops: Denops) => {
  const before: string[] = [
    "0123456789",
    "0123456789",
    "0123456789",
    "0123456789",
    "0123456789",
  ]
  const after: string[] = [
    "+========+",
    "|12345678|",
    "|12345678|",
    "|12345678|",
    "+========+",
  ]
  const border: string[] = ["+", "-", "+", "|"];
  const focusBorder: string[] = ["+", "=", "+", "|"];
  const winLayout: WindowLayout = [ "leaf", 1000 ];
  const winnr = winLayout[1];
  const kind = new Kind();
  await kind.winLayoutPreview(denops , before, winLayout, winnr, border, focusBorder);
  assertEquals(before, after);
})
