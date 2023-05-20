" pum.vimのnoice.vim検知を参考にした
function! ddu#source#window#lua_check(module) abort
  return has('nvim') && luaeval(
        \ 'type(select(2, pcall(require, _A.module))) == "table"',
        \ #{ module: a:module })
endfunction

" tabbyのlua関数をvimscriptでラップする
function! ddu#source#window#get_tab_name(tabid) abort
  return luaeval(
        \ 'require("ddu-source-window").get_tab_name(_A.tabid)',
        \ #{ tabid: a:tabid })
endfunction
