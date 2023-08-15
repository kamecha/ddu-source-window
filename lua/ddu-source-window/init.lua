local M = {}

---get tabpages
---@return number[]
function M.get_tabpages()
	local tabpages =  vim.api.nvim_list_tabpages()
	local ret = {}
	for _, tabpage in ipairs(tabpages) do
		print(tabpage)
		table.insert(ret, tabpage)
	end
	return ret
end

---get tab's name
---@param tabid number
---@return string
function M.get_tab_name(tabid)
	local tab = require("tabby.tab")
	return tab.get_name(tabid)
end

return M
