/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  'N/config', 'N/plugin', 'N/record', 'N/search', 'N/runtime',
  'N/ui/dialog', 'N/format', 'N/task', 'N/file', 'N/log',
  "/SuiteScripts/order_guide/order_guide_lib_2.js"
],
(config, plugin, record, search, runtime, dialog, format, task, file, log, og_lib) => {

  const getMostRecentInvoiceLines = (count, customer, subsidiary) => {
    let most_recent_invoices = []

    const invoices = og_lib.get4000(
      search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "CustInvc"],
          "AND",
          ["entity", "anyof", customer],
          "AND",
          ["subsidiary", "anyof", subsidiary],
          "AND",
          ["taxline", "is", "F"],
          "AND",
          ["cogs", "is", "F"],
          "AND",
          ["shipping", "is", "F"],
          "AND",
          ["mainline", "is", "F"]
        ],
        columns: og_lib.createColumns(
          ["tranid", "item", "rate", "quantity", "amount", "location", "unit"]
        ).concat(
          search.createColumn({name: "trandate", sort: search.Sort.DESC})
        )
      }).run()
    )
    if(!invoices){
      return []
    }
    if(!invoices.length){
      return []
    }

    let unique_tranids = []
    let i = 0
    while(unique_tranids.length < count){
      const line = invoices[i]
      if(!line){
        break
      }
      if(!line.values){
        break
      }
      if(!unique_tranids.includes(line.values.tranid)){
        unique_tranids.push(line.values.tranid)
      }
      if(unique_tranids.length >= count){
        break
      }
      most_recent_invoices.push(line)
      i++
    }


    return most_recent_invoices
  }

  const addIdFilter = (filters, ids) => {
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

  const onRequest = context => {
    if(context.request.method !== "POST"){
      throw new Error("Unsupported HTTP request method")
    }
    var body = {}
    if(context.request.body){
      body = JSON.parse(context.request.body)
    }
    log.error("req body", JSON.stringify(body))
    const {request_from, customer, location, subsidiary} = body
    const user_id = runtime.getCurrentUser().id
    const custom_columns = og_lib.getUserCustomColumn(user_id)
    const module_settings = og_lib.getModuleSettings()

    if(!module_settings){
      throw new Error("Please configure module settings record")
    }

    var customer_columns = og_lib.createColumns([
      "entityid", "companyname",
      "pricinggroup", "pricelevel",
      "custentity_warehouse"
    ])
    customer_columns.push(
      search.createColumn({
        name: "internalid",
        sort: search.Sort.ASC
      })
    )
    var customer_custom_price_columns = og_lib.createColumns([
      "entityid", "itempricinglevel", "itempricingunitprice", "pricingitem"
    ])
    if(module_settings.values.custrecord_use_altname_customer){
      customer_columns = customer_columns.concat(og_lib.createColumns(["altname"]))
      customer_custom_price_columns = customer_custom_price_columns.concat(og_lib.createColumns(["altname"]))
    }

    const locations = og_lib.get4000(
      search.create({
        type: "location",
        filters: addIdFilter(og_lib.basic_filters, [location]),
        columns: og_lib.createColumns(["name", "internalid", "subsidiary"])
      }).run()
    )

    const subsidiaries = og_lib.get4000(
      search.create({
        type: "subsidiary",
        filters: addIdFilter(og_lib.basic_filters, [subsidiary]),
        columns: og_lib.createColumns(["name", "internalid"])
      }).run()
    )

    const customer_filters = addIdFilter(og_lib.basic_and_id_filters, [customer])
    const customers = og_lib.recursiveIDProtectedSearch(
      [], customer_filters, "customer", customer_filters,
      customer_columns, ["id"]
    )

    let guide_filters = null
    if(customer){
      guide_filters = [
        ["custrecord_guide_customers", "anyof", customer],
        "AND",
        ["isinactive", "is", "F"]
      ]
    }
    var order_guides = og_lib.getOrderGuides(guide_filters)

    const customer_custom_price_filters = addIdFilter([["pricingitem", "noneof", "@NONE@"]], [customer])
    let customer_custom_prices = []
    if(request_from === "order_creator"){
      customer_custom_prices = og_lib.get4000(
        search.create({
          type: "customer",
          filters: customer_custom_price_filters,
          columns: customer_custom_price_columns
        }).run()
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

    let most_recent_invoices = []
    if(request_from === "order_creator"){
      most_recent_invoices = getMostRecentInvoiceLines(5, customer, subsidiary)
      for(let line of most_recent_invoices){
        if(!unique_items_on_guides.includes(line.values.item[0].value)){
          unique_items_on_guides.push(line.values.item[0].value)
        }
      }
    }
    const cpl_item_ids = []
    log.error("custom custom", customer_custom_prices)
    for(let line of customer_custom_prices){
      const id = line.values.pricingitem
      if(!cpl_item_ids.includes(id)) cpl_item_ids.push(id)
    }
    const expr = []
    for(let id of cpl_item_ids){
      expr.push(
        ["itemid", "is", id]
      )
      if(cpl_item_ids.indexOf(id) < (cpl_item_ids.length - 1)) expr.push("OR")
    }
    const has_items = unique_items_on_guides.length > 0
    let items = []
    if(has_items){
      items = og_lib.getItemRecords([["internalid", "anyof"].concat(unique_items_on_guides)], module_settings, subsidiary)
      if(cpl_item_ids.length){
        items = items.concat(
          og_lib.getItemRecords([expr], module_settings, subsidiary)
        )
      }
    }
    const price_levels = has_items ? og_lib.getPriceLevels(items.map((it) => it.id)) : []

    const units = og_lib.get4000(
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

    let customer_address_book = []
    if(request_from === "order_creator"){
      customer_address_book = og_lib.getCustomerAddresses(customers[0].id)
    }

    var response_body = {
      order_guides: og_lib.sortOrderGuideItems(order_guides, items, module_settings),
      locations,
      subsidiaries,
      items,
      customers,
      customer_custom_prices,
      module_settings,
      units,
      price_levels,
      user_id,
      custom_columns,
      most_recent_receipts,
      most_recent_invoices,
      customer_address_book
    }
    return context.response.write(JSON.stringify(response_body))

  }

  return {onRequest}
})
