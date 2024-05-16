function getCustomerPrices(customer_id, item_ids){
  var prices = nlapiSearchRecord("pricing", null,
    [
      new nlobjSearchFilter("customer", null, "anyof", customer_id),
      new nlobjSearchFilter("iteminternalid", null, "anyof", item_ids)
    ],
    [
      new nlobjSearchColumn("pricelevel"),
      new nlobjSearchColumn("item").setSort(false),
      new nlobjSearchColumn("pricinggroup","item",null)
    ]
  )
  return JSON.parse(JSON.stringify(prices))
}


function guidesSalesOrdersRestlet(req, res){
  var body = req;

  try {
    var mode = body.mode

    if(mode == "get_item_prices"){

      var customer = body.customer
      var location = body.location
      var subsidiary = body.subsidiary
      var item_ids = body.items

      if(!customer){
        throw new Error("Customer not defined")
      }

      var prices = getCustomerPrices(customer, item_ids)
      if(!prices){
        throw new Error("Could not find customer prices")
      }

      var module_settings = getModuleSettings()
      var rebates
      var advanced_pricing_records
      var rebate_config

      if(module_settings){

        if(module_settings.columns.custrecord_rebates_module){
          var url = nlapiResolveURL(
            "SUITELET", "customscript_get_customer_reb_2_suite",
            "customdeploy_get_customer_reb_2_suite", true
          )
          var response = nlapiRequestURL(url,
            JSON.stringify({
              customer: customer,
              location: location,
              subsidiary: subsidiary
            }), null, "POST")
          nlapiLogExecution("ERROR", "rebates response", JSON.stringify(response))
          if(response.body){
            var response_body = JSON.parse(response.body.split("<!--")[0])
            rebates = response_body.rebates
            rebate_config = response_body.rebate_config
          }
        }

        if(module_settings.columns.custrecord_advanced_pricing_module){
          var url = nlapiResolveURL(
            "SUITELET", "customscript_advanced_pricing_suitelet",
            "customdeploy_advanced_pricing_suitelet", true
          )
          var response = nlapiRequestURL(url,
            JSON.stringify({
              mode: "get_records",
              location: location,
              subsidiary: subsidiary,
              item: body.items
            })
          )
          if(response.body){
            var response_body = JSON.parse(response.body)
            advanced_pricing_records = response_body.records
          }
        }
      }

      var id_filters = [
        ["internalidnumber", "greaterthan", 0]
      ]
      var item_invoice_date_filters = id_filters.concat([
        "AND",
        ["transaction.type", "anyof", "Invoice"]
      ])

      var invoice_lines = getResultsBeyond1000(
        [
          new nlobjSearchFilter("entity", null, "is", customer),
          new nlobjSearchFilter("mainline", null, "is", "F"),
          new nlobjSearchFilter("shipping", null, "is", "F"),
          new nlobjSearchFilter("cogs", null, "is", "F"),
          new nlobjSearchFilter("taxline", null, "is", "F")
        ],
        [
          new nlobjSearchColumn("item",null),
          new nlobjSearchColumn("quantity"),
          new nlobjSearchColumn("trandate").setSort(true),
          new nlobjSearchColumn("internalid"),
          new nlobjSearchColumn("rate")
        ],
        "invoice", null, null, [], true
      )
      if(!invoice_lines){
        invoices_lines = []
      }

      var response_body = {
        prices: prices,
        rebates: rebates,
        advanced_pricing_records: advanced_pricing_records,
        rebate_config: rebate_config,
        invoice_lines: invoice_lines
      }
      return JSON.stringify(response_body)

    }

  } catch (err) {
    var response_body = {error: err}
    return JSON.stringify(response_body)
  }
}
