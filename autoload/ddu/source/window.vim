" pum.vimのnoice.vim検知を参考にした
function! ddu#source#window#lua_check(module) abort
  return has('nvim') && luaeval(
        \ 'type(select(2, pcall(require, _A.module))) == "table"',
        \ #{ module: a:module })
endfunction
