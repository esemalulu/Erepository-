/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
 define([
   'N/log',
   "/SuiteScripts/order_guide/order_guide_lib_2.js",
   "N/url",
   "N/https",
   "N/search"
 ],
 (log, og_lib, url, https, search) => {



  const onRequest = context => {

    if(context.request.method !== "POST"){
      return
    }

    let request = {}
    if(context.request.body){
      request = JSON.parse(context.request.body)
    } else {
      throw new Error("No request body provided")
    }

    const {mode, customer, location, subsidiary, items} = request
    let {module_settings} = request

    if(!customer){
      throw new Error("Customer not provided")
    }
    if(!items){
      throw new Error("Items not provided")
    }
    if(!items.length){
      throw new Error("Items not provided")
    }

    const prices = og_lib.getSearchResults(
      "pricing",
      [
        ["customer", "is", customer],
        "AND",
        ["iteminternalid", "anyof", items]
      ],
      og_lib.createColumns(["pricelevel", "item", "unitprice"])
    )

    if(!prices){
      throw new Error("Could not find customer prices")
    }

    const unique_prices = prices.filter((pric, index) => {
      const json = JSON.stringify(pric)
      return index === prices.findIndex((p) => JSON.stringify(p) === json)
    })

    if(!module_settings){
      module_settings = og_lib.getModuleSettings()
    }
    var rebates
    var advanced_pricing_records
    var rebate_config

    if(module_settings){

      if(module_settings.values.custrecord_rebates_module){
        const script_url = url.resolveScript({
          scriptId: "customscript_get_customer_reb_2_suite",
          deploymentId: "customdeploy_get_customer_reb_2_suite",
          returnExternalUrl: true
        })
        log.error("script url", script_url)
        const response = https.post({
          url: script_url,
          body: JSON.stringify({customer, location, subsidiary})
        })

        log.error("rebates response", JSON.stringify(response))
        if(response.body){
          var response_body = JSON.parse(response.body.split("<!--")[0])
          rebates = response_body.rebates
          rebate_config = response_body.rebate_config
        }
      }

      if(module_settings.values.custrecord_advanced_pricing_module){
        const script_url = url.resolveScript({
          scriptId: "customscript_advanced_pricing_suitelet",
          deploymentId: "customdeploy_advanced_pricing_suitelet",
          returnExternalUrl: true
        })
        var response = https.post({
          url: script_url,
          body: JSON.stringify({
            mode: "get_records",
            location,
            subsidiary,
            items
          })
        })
        if(response.body){
          var response_body = JSON.parse(response.body)
          advanced_pricing_records = response_body.records
        }
      }
    }

    var response_body = {
      prices: unique_prices,
      rebates: rebates,
      advanced_pricing_records: advanced_pricing_records,
      rebate_config: rebate_config
    }

    return context.response.write(JSON.stringify(response_body))
  }

  return {
    onRequest
  }
})
