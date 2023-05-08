" pum.vimのnoice.vim検知を参考にした
function! util#_luacheck(module) abort
  return has('nvim') && luaeval(
        \ 'type(select(2, pcall(require, _A.module))) == "table"',
        \ #{ module: a:module })
endfunction
