/**
 * @NApiVersion 2.1
 * @NScriptType RESTlet
 */
define(
[
  'N/config',
  'N/plugin',
  'N/record',
  'N/search',
  'N/runtime',
  'N/ui/dialog',
  'N/format',
  'N/task',
  'N/file',
  'N/log',
  "/SuiteScripts/order_guide/order_guide_lib_2.js"
],
function(config, plugin, record, search, runtime, dialog, format, task, file, log, og_lib) {

  function addIdFilter(filters, ids){
    if(!ids){
      return filters
    }
    if(ids.length == 0){
      return filters
    }
    if(!ids[0]){
      return filters
    }
    var copy = JSON.parse(JSON.stringify(filters))
    copy.push("AND")
    copy.push(["internalid", "anyof"].concat(ids))
    return copy
  }

  function addSubLocFilter(filters, location, subsidiary){
    if(!location && !subsidiary){
      return filters
    }
    var copy = JSON.parse(JSON.stringify(filters))
    if(location){
      copy.push("AND")
      copy.push(["location", "anyof", location])
    }
    if(subsidiary){
      copy.push("AND")
      copy.push(["subsidiary", "anyof", subsidiary])
    }
    return copy
  }

  function postFunction(request){

    const request_from = request.request_from

    const user_id = runtime.getCurrentUser().id
    const filters = request.filters
    const subsidiary = request.subsidiary

    const module_settings = og_lib.getModuleSettings()
    if(!module_settings){
      throw new Error("Please configure module settings record")
    }
    log.error("", JSON.stringify([filters, subsidiary]))
    const items = og_lib.getItemRecords(filters, module_settings, subsidiary)
    const unique_item_ids = items.length > 0 ? og_lib.getUniqueValuesFromArray(items, ["id"]) : []
    const price_levels = items.length > 0 ? og_lib.getPriceLevels(unique_item_ids) : []
    const most_recent_receipts = items.length > 0 ? og_lib.getMostRecentItemReceipts(unique_item_ids) : []

    const response_body = {
      items,
      price_levels,
      most_recent_receipts
    }
    return JSON.stringify(response_body)
  }

  return {
    post : postFunction
  }
})
