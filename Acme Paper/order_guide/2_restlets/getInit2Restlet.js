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

  function postFunction(request){

    var request_from = request.request_from

    var user_id = runtime.getCurrentUser().id
    var custom_columns = []
    if(request_from == "order_creator"){
      custom_columns = og_lib.getUserCustomColumn(user_id)
    }

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

    var customer = request.customer
    var location = request.location
    var subsidiary = request.subsidiary

    var module_settings = og_lib.getModuleSettings()
    if(!module_settings){
      throw new Error("Please configure module settings record")
    }

    var customer_columns = og_lib.createColumns([
      "entityid", "companyname",
      "pricinggroup", "pricelevel"
    ])
    customer_columns.push(
      search.createColumn({
        name: "internalid",
        sort: search.Sort.ASC
      })
    )
    var customer_custom_price_columns = og_lib.createColumns([
      "entityid",
      "itempricinglevel",
      "itempricingunitprice",
      "pricingitem"
    ])
    if(module_settings.values.custrecord_use_altname_customer){
      customer_columns = customer_columns.concat(og_lib.createColumns(["altname"]))
      customer_custom_price_columns = customer_custom_price_columns.concat(og_lib.createColumns(["altname"]))
    }

    var locations = og_lib.get4000(
      search.create({
        type: "location",
        filters: addIdFilter(og_lib.basic_filters, [location]),
        columns: og_lib.createColumns(["name", "internalid", "subsidiary"])
      }).run()
    )

    var subsidiaries = og_lib.get4000(
      search.create({
        type: "subsidiary",
        filters: addIdFilter(og_lib.basic_filters, [subsidiary]),
        columns: og_lib.createColumns(["name", "internalid"])
      }).run()
    )

    var customer_filters = addIdFilter(og_lib.basic_and_id_filters, [customer])
    var customers = og_lib.recursiveIDProtectedSearch(
      [], customer_filters, "customer", customer_filters,
      customer_columns, ["id"]
    )

    var guide_filters = null
    if(customer){
      guide_filters = [
        ["custrecord_guide_customers", "anyof", customer],
        "AND",
        ["isinactive", "is", "F"]
      ]
    }
    var order_guides = og_lib.getOrderGuides(guide_filters)

    var customer_custom_price_filters = addIdFilter([["pricingitem", "noneof", "@NONE@"]], [customer])
    var customer_custom_prices = []
    if(request_from == "order_creator"){
      customer_custom_prices = og_lib.recursiveIDProtectedSearch(
        [], customer_custom_price_filters, "customer",
        customer_custom_price_filters,
        customer_custom_price_columns, ["id"]
      )
    }

    const unique_items_on_guides = []
    for(let guide of order_guides){
      for(let item of guide.items){
        if(!unique_items_on_guides.includes(item.item_id)){
          unique_items_on_guides.push(item.item_id)
        }
      }
    }
    const has_items = unique_items_on_guides.length > 0
    const items = has_items ?
      og_lib.getItemRecords([["internalid", "anyof"].concat(unique_items_on_guides)], module_settings, subsidiary)
      : []
    const price_levels = has_items ? og_lib.getPriceLevels(unique_items_on_guides) : []

    var units = og_lib.get4000(
      search.create({
        type: "unitstype",
        filters: og_lib.basic_filters,
        columns: og_lib.createColumns(["name", "internalid"])
      }).run()
    )

    let most_recent_receipts = []
    if(request_from == "order_creator" && has_items){
      most_recent_receipts = og_lib.getMostRecentItemReceipts(unique_items_on_guides)
    }

    var response_body = {
      locations: locations,
      subsidiaries: subsidiaries,
      items: items,
      customers: customers,
      order_guides: og_lib.sortOrderGuideItems(order_guides, items, module_settings),
      customer_custom_prices: customer_custom_prices,
      module_settings: module_settings,
      units: units,
      price_levels: price_levels,
      user_id: user_id,
      custom_columns: custom_columns,
      most_recent_receipts: most_recent_receipts
    }
    return JSON.stringify(response_body)
  }

  return {
    post : postFunction
  }
})
