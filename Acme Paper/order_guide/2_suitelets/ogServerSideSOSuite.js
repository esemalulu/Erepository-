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
    const {filter_params, items, shipping_address, po_number, ship_date} = body
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
    if(ship_date){
      const [y, m, d] = ship_date.toString().split("-")
      const new_date = `${m}/${d}/${y}`
      log.error("new_date", new_date)
      sales_order.setValue({fieldId: "startdate", value: new Date(new_date)})
    }

    const sublistId = "item"
    for(let line = 0; line < items.length; line++){
      const item = items[line]
      const {item_id, rate, rebate_customer, rebate_item, rebate_parent, use_selling_price} = item
      const quantity = Number(item.quantity)
      sales_order.selectNewLine({sublistId})
      try {
        sales_order.setCurrentSublistValue({
          sublistId, fieldId: "item",
          value: item_id
        })
      } catch (err) {
        log.error(" item set err", err)
        return context.response.write(JSON.stringify(err))
      }
      sales_order.setCurrentSublistValue({
        sublistId, fieldId: "rate",
        value: rate
      })
      if(rebate_item){
        if(!use_selling_price){
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "costestimatetype",
            value: "CUSTOM"
          })
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "custcol_rebate_cost",
            value: rebate_item.calculated_cost
          })
        }
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
        if(og_lib.isNotNothing(rebate_item.values.custrecord_rebate_items_sale_price)){
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "custcol_rebate_sale_price",
            value: rebate_item.values.custrecord_rebate_items_sale_price
          })

        }
        if(!use_selling_price && og_lib.isNotNothing(rebate_item.values.custrecord_rebate_discount_pct)){
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "custcol_rebate_discount_percent",
            value: rebate_item.values.custrecord_rebate_discount_pct.split("%")[0]
          })

        }
        if(!use_selling_price && og_lib.isNotNothing(rebate_item.values.custrecord_acme_rebate_item_doll_pcase)){
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
        if(og_lib.isNotNothing(rebate_item.values.custrecord_allotted_quantity)){
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
        if(!use_selling_price){
          sales_order.setCurrentSublistValue({
            sublistId, fieldId: "costestimaterate",
            value: rebate_item.calculated_cost
          })
        }
      }
      sales_order.setCurrentSublistValue({
        sublistId, fieldId: "quantity",
        value: quantity
      })
      try {
        sales_order.commitLine({sublistId})
      } catch (err) {
        log.error("err", err)
        return context.response.write(JSON.stringify(err))
      }
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
      log.error("save err", err)
      return context.response.write(JSON.stringify(err))
    }
    return context.response.write(JSON.stringify({so_id}))
  }

  return {onRequest}
})
