local M = {}

---get tab's name
---@param tabid number
---@return string
function M.get_tab_name(tabid)
	local tab = require("tabby.tab")
	return tab.get_name(tabid)
end

return M
