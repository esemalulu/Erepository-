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

    let location_lookup = []
    for(let line of most_recent_invoices){
      if(!line.values.location[0]){
        location_lookup.push(line.id)
      }
    }
    if(location_lookup.length > 0){
      const header_loc_invoices = og_lib.get4000(search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "CustInvc"],
          "AND",
          ["internalid", "anyof"].concat(location_lookup),
          "AND",
          ["mainline", "is", "T"]
        ],
        columns: og_lib.createColumns(["location"])
      }).run())
      for(let i = 0; i < most_recent_invoices.length; i++){
        if(!most_recent_invoices[i].values.location[0]){
          const invoice = header_loc_invoices.find((inv) => inv.id == most_recent_invoices[i].id)
          if(!invoice) continue
          most_recent_invoices[i].values.location = invoice.values.location
        }
      }

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
    var request = {}
    if(context.request.body){
      request = JSON.parse(context.request.body)
    }
    log.error("req body", JSON.stringify(request))
    const {request_from, customer, location, subsidiary, oc_from_og_app} = request
    let {module_settings} = request

    const user_id = runtime.getCurrentUser().id
    if(!module_settings){
      module_settings = og_lib.getModuleSettings()
    }
    if(!module_settings){
      throw new Error("Please configure module settings record")
    }

    const custom_columns = !oc_from_og_app ? og_lib.getUserCustomColumn(user_id) : null

    var customer_columns = og_lib.createColumns([
      "entityid", "companyname",
      "pricinggroup", "pricelevel",
      "custentity_warehouse",
      "custentity_credit_codech"
    ])
    customer_columns.push(
      search.createColumn({
        name: "internalid",
        sort: search.Sort.ASC
      })
    )

    var customer_custom_price_columns = og_lib.createColumns(["itempricingunitprice", "pricingitem"])
    if(module_settings.values.custrecord_use_altname_customer){
      customer_columns = customer_columns.concat(og_lib.createColumns(["altname"]))
      customer_custom_price_columns = customer_custom_price_columns.concat(og_lib.createColumns(["altname"]))
    }
    const customer_custom_price_filters = addIdFilter([["pricingitem", "noneof", "@NONE@"]], [customer])
    let customer_custom_prices = []
    if(request_from === "order_creator"){
      customer_custom_prices = og_lib.getSearchResults("customer", customer_custom_price_filters, customer_custom_price_columns)
    }
    if(customer_custom_prices){
      if(customer_custom_prices.length){
        let copy = JSON.parse(JSON.stringify(customer_custom_prices))
        customer_custom_prices = []
        for(let item of copy){
          const same_itemid = copy.filter((it) => it.values.pricingitem === item.values.pricingitem)
          if(same_itemid.length > 1) continue
          customer_custom_prices.push(item)
        }
      }
    }

    let locations = null
    let subsidiaries = null
    if(!oc_from_og_app){
      locations = og_lib.get4000(
        search.create({
          type: "location",
          filters: addIdFilter(og_lib.basic_filters, [location]),
          columns: og_lib.createColumns(["name", "internalid", "subsidiary"])
        }).run()
      )
      subsidiaries = og_lib.get4000(
        search.create({
          type: "subsidiary",
          filters: addIdFilter(og_lib.basic_filters, [subsidiary]),
          columns: og_lib.createColumns(["name", "internalid"])
        }).run()
      )
    }

    const units = !oc_from_og_app ? og_lib.get4000(
      search.create({
        type: "unitstype",
        filters: og_lib.basic_filters,
        columns: og_lib.createColumns(["name", "internalid"])
      }).run()
    ) : null

    const customers = og_lib.getSearchResults("customer", addIdFilter(og_lib.basic_and_id_filters, [customer]), customer_columns)
    let guide_filters = null
    if(customer){
      guide_filters = [["custrecord_guide_customers", "anyof", customer]]
    }
    const order_guides = og_lib.getOrderGuides(guide_filters)
    let unique_items_on_guides = []
    for(let guide of order_guides){
      unique_items_on_guides = unique_items_on_guides.concat(
        guide.items.map((it) => it.item_id)
      )
    }

    let most_recent_invoices = []
    if(request_from === "order_creator" && module_settings.values.custrecord_load_most_recent_invoices){
      most_recent_invoices = getMostRecentInvoiceLines(5, customer, subsidiary)
    }
    const cpl_item_ids = []
    const expr = []
    for(let line of customer_custom_prices){
      const item_id = line.values.pricingitem
      cpl_item_ids.push(item_id)
      expr.push(["itemid", "is", item_id])
      expr.push("OR")
    }
    expr.pop()
    for(let line of most_recent_invoices){
      unique_items_on_guides.push(line.values.item[0].value)
    }
    unique_items_on_guides = unique_items_on_guides.filter((id, index) => unique_items_on_guides.indexOf(id) === index)
    const has_items = unique_items_on_guides.length > 0 || cpl_item_ids.length > 0
    let items = []
    if(has_items){
      const item_filters = [["isinactive", "is", "F"]]
      if(unique_items_on_guides.length > 0){
        item_filters.push("AND")
        item_filters.push(["internalid", "anyof"].concat(unique_items_on_guides))
      }
      if(cpl_item_ids.length){
        const joiner = unique_items_on_guides.length > 0 ? "OR" : "AND"
        item_filters.push(joiner)
        item_filters.push(expr)
      }
      items = og_lib.getItemRecords(item_filters, module_settings, subsidiary)
    }
    let price_levels = []
    if(unique_items_on_guides.length > 0){
      price_levels = og_lib.getPriceLevels(
        unique_items_on_guides,
        og_lib.getUniqueValuesFromArray(
          customers.map((cust) => Number(cust.values.pricelevel[0]?.value)), []
        )
      )
    }
    let most_recent_receipts = []
    if(request_from === "order_creator" && has_items && module_settings.values.custrecord_load_most_recent_receipts){
      most_recent_receipts = og_lib.getMostRecentItemReceipts(items.map((it) => it.id))
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
