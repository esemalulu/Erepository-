/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(
[
  'N/record',
  'N/search',
  'N/log',
  "/SuiteScripts/order_guide/order_guide_lib_2.js"
],
(record, search, log, og_lib) => {

  function isNotNothing(value){
  if(JSON.stringify(value) === "null"){
    return false
  }
  if(JSON.stringify(value) === "undefined"){
    return false
  }
  if(value === ""){
    return false
  }
  if(value === null){
    return false
  }
  if(value === undefined){
    return false
  }
  if(value === NaN){
    return false
  }
  return true
}

  const onRequest = context => {

    if(context.request.method !== "POST"){
      return
    }

    let body = {}
    if(context.request.body){
      body = JSON.parse(context.request.body)
    } else {
      throw new Error("No request body provided")
    }

    log.error("body", body)
    const {filter_params, items, shipping_address, po_number} = body
    if(!items || !items.length){
      throw new Error("Request must include items")
    }
    if(!filter_params){
      throw new Error("Please include sales order parameters")
    }
    const {location, subsidiary, customer} = filter_params
    if(!location || !subsidiary || !customer){
      throw new Error("Please include all sales order parameters")
    }

    const sales_order = record.create({
      type: "salesorder",
      isDynamic: true
    })
    sales_order.setValue({fieldId: "entity", value: customer})
    sales_order.setValue({fieldId: "subsidiary", value: subsidiary})
    sales_order.setValue({fieldId: "location", value: location})

    const sublistId = "item"
    for(let line = 0; line < items.length; line++){
      const item = items[line]
      const {item_id, rate, rebate_customer, rebate_item, rebate_parent} = item
      const quantity = Number(item.quantity)
      sales_order.selectNewLine({sublistId})
      sales_order.setCurrentSublistValue({
        sublistId, fieldId: "item",
        value: item_id
      })
      sales_order.setCurrentSublistValue({
        sublistId, fieldId: "rate",
        value: rate
      })
      if(rebate_item){
        sales_order.setCurrentSublistValue({
          sublistId, fieldId: "costestimatetype",
          value: "CUSTOM"
        })
        sales_order.setCurrentSublistValue({
          sublistId, fieldId: "custcol_rebate_cost",
          value: rebate_item.calculated_cost
        })
        sales_order.setCurrentSublistValue({
          sublistId, fieldId: "custcol_rebate_parent_id",
          value: rebate_parent.id
        })
        if(rebate_customer){
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "custcol_rebate_end_user_agree",
            value: rebate_customer.values.custrecord_rebate_customer_enduserag
          })
        }
        if(isNotNothing(rebate_item.values.custrecord_rebate_items_sale_price)){
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "custcol_rebate_sale_price",
            value: rebate_item.values.custrecord_rebate_items_sale_price
          })

        }
        if(isNotNothing(rebate_item.values.custrecord_rebate_discount_pct)){
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "custcol_rebate_discount_percent",
            value: rebate_item.values.custrecord_rebate_discount_pct
          })

        }
        if(isNotNothing(rebate_item.values.custrecord_acme_rebate_item_doll_pcase)){
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "custcol_rebate_dollar_per_case",
            value: rebate_item.values.custrecord_acme_rebate_item_doll_pcase
          })
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "custcol_rebate_dollar_per_case_amt",
            value: quantity * rebate_item.values.custrecord_acme_rebate_item_doll_pcase
          })
        }
        if(rebate_parent.values.custrecord_rebate_excl_frm_rebate_report){
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "custcol_rebate_excl_frm_rebate_report",
            value: rebate_parent.values.custrecord_rebate_excl_frm_rebate_report
          })

        }
        if(isNotNothing(rebate_item.values.custrecord_allotted_quantity)){
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "custcol_rebate_item_allotted_quantity",
            value: rebate_item.values.custrecord_allotted_quantity
          })
        }
        sales_order.setCurrentSublistValue({
          sublistId, fieldId: "custcol_rebate_vendor",
          value: rebate_parent.values.custrecord_rebate_parent_vendor[0].value
        })
        sales_order.setCurrentSublistValue({
          sublistId, fieldId: "custcol_rebate_item_id",
          value: rebate_item.id
        })
        sales_order.setCurrentSublistValue({
          sublistId, fieldId: "costestimaterate",
          value: rebate_item.calculated_cost
        })
      }
      sales_order.setCurrentSublistValue({
        sublistId, fieldId: "quantity",
        value: quantity
      })
      sales_order.commitLine({sublistId})
    }
    sales_order.setValue({
      fieldId: 'shipaddresslist',
      value: shipping_address
    })
    sales_order.setValue({
      fieldId: "otherrefnum",
      value: po_number
    })
    log.error("saving so")
    let so_id

    try {
      so_id = sales_order.save()
    } catch (err) {
      return context.response.write(JSON.stringify(err))
    }
    return context.response.write(JSON.stringify({so_id}))
  }

  return {onRequest}
})
