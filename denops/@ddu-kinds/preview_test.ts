import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { Kind } from "./window.ts";

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
