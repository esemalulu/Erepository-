/**
*@NApiVersion 2.1
*@NScriptType ScheduledScript
*/
define([
  'N/config',
  'N/plugin',
  'N/record',
  'N/search',
  'N/runtime',
  'N/ui/dialog',
  'N/format',
  'N/task',
  'N/file',
  'N/http',
  'N/email',
  '/SuiteBundles/Bundle 429314/q_2_lib.js',
  '/SuiteScripts/order_guide/order_guide_lib_2.js'
],
function(config, plugin, record, search, runtime, dialog, format, task, file, http, email, q_control, og_lib) {


function execute(context){

  function fileFunction(q_item){
    log.error("q_item", JSON.stringify(q_item))
    var basic_filters = [
      ["isinactive", "is", "F"]
    ]
    var data = JSON.parse(q_item.data)
    var customer_id = data.customer_id
    var invoice_id = data.invoice_id
    log.error("customer_id, invoice_id", JSON.stringify([customer_id, invoice_id]))

    var nl_invoice
    try {
      nl_invoice = record.load({
        type: "invoice",
        id: invoice_id
      })
    } catch (err) {
      log.error("error", "failed to load invoice " + invoice_id)
      return
    }

    var units = og_lib.get4000(
      search.create({
        type: "unitstype",
        filters: basic_filters,
        columns: og_lib.createColumns(["name", "internalid"])
      }).run()
    )

    var customer_history_guide = og_lib.getOrderGuides([
      ["custrecord_history_managed", "is", "T"],
      "AND",
      ["custrecord_guide_customers", "is", customer_id]
    ])
    if(!customer_history_guide[0]){

      var locations = og_lib.get4000(
        search.create({
          type: "location",
          filters: basic_filters,
          columns: og_lib.createColumns(["name", "internalid", "subsidiary"])
        }).run()
      )

      var subsidiaries = og_lib.get4000(
        search.create({
          type: "subsidiary",
          filters: basic_filters,
          columns: og_lib.createColumns(["name", "internalid"])
        }).run()
      )

      var nl_customer = record.load({
        type: "customer",
        id: customer_id
      })

      var new_history_guide = record.create({
        type: og_lib.GUIDES_RECORD
      })

      new_history_guide.setValue({
        fieldId: "custrecord_linked_guide_name",
        value: nl_customer.getValue({fieldId: "entityid"}) + " History Guide"
      })
      new_history_guide.setValue({
        fieldId: "custrecord_guide_locations",
        value: og_lib.getUniqueValuesFromArray(locations, ["id"])
      })
      new_history_guide.setValue({
        fieldId: "custrecord_subsidiaries",
        value: og_lib.getUniqueValuesFromArray(subsidiaries, ["id"])
      })
      new_history_guide.setValue({
        fieldId: "custrecord_guide_customers",
        value: customer_id
      })
      new_history_guide.setValue({
        fieldId: "custrecord_history_managed",
        value: true
      })
      var new_guide_id = new_history_guide.save()
      customer_history_guide = og_lib.getOrderGuides([
        ["internalid", "is", new_guide_id]
      ])
    }

    if(!customer_history_guide){
      throw new Error("Error finding customer's history guide")
    }
    if(!customer_history_guide[0]){
      throw new Error("Error finding customer's history guide")
    }
    customer_history_guide = customer_history_guide[0]
    var invoice_line_count = nl_invoice.getLineCount({
      sublistId: "item"
    })
    var unique_invoice_items = []
    var invoice_item_map = {}
    for(var j = 0; j < invoice_line_count; j++){
      var item_id = nl_invoice.getSublistValue({
        sublistId: "item",
        fieldId: "item",
        line: j
      })
      if(!og_lib.includes(unique_invoice_items, item_id)){
        unique_invoice_items.push(item_id)
        invoice_item_map[item_id] = j
      }
    }
    unique_invoice_items = og_lib.getUniqueValuesFromArray(unique_invoice_items, [])

    var all_other_invoices_lines = og_lib.get4000(
      search.create({
        type: "invoice",
        filters:
          [
            ["type","anyof","CustInvc"],
            "AND",
            ["mainline","is","F"],
            "AND",
            ["taxline", "is", "F"],
            "AND",
            ["shipping", "is", "F"],
            "AND",
            ["cogs", "is", "F"],
            "AND",
            ["entity", "is", customer_id],
            "AND",
            ["item", "anyof"].concat(unique_invoice_items)
         ],
         columns:
          [
            search.createColumn({name: "item", sort: search.Sort.ASC}),
            search.createColumn({name: "quantity"}),
            search.createColumn({name: "amount"}),
            search.createColumn({name: "trandate", sort: search.Sort.DESC}),
            search.createColumn({name: "rate"}),
            search.createColumn({name: "line"}),
            search.createColumn({name: "unit"})
          ]
        }).run()
      )
      log.error("all invoie liens", JSON.stringify(all_other_invoices_lines))
    for(var i = 0; i < unique_invoice_items.length; i++){
      var item_id = unique_invoice_items[i]
      var invoice_line_number = invoice_item_map[item_id]
      var existing_record = og_lib.arrayFind(customer_history_guide.items,
        function(it){
          return it.item_id == item_id
        }
      )
      var most_recent_invoice_line = og_lib.arrayFind(all_other_invoices_lines,
        function(it){
          return it.values.item[0].value == item_id
        }
      )
      var converted_line_date = new Date(most_recent_invoice_line.values.trandate)
      var this_invoice_date = new Date(nl_invoice.getValue({fieldId: "trandate"}))


      var nl_guide_item
      if(!existing_record){
        nl_guide_item = record.create({type: og_lib.GUIDE_ITEMS_RECORD})
      } else {
        if(this_invoice_date >= converted_line_date){
          nl_guide_item = record.load({
            type: og_lib.GUIDE_ITEMS_RECORD,
            id: existing_record.id
          })
        }
        if(this_invoice_date < converted_line_date){
          continue
        }
      }
      if(!nl_guide_item){
        continue
      }

      var this_unit_id = nl_invoice.getSublistValue({
        sublistId: "item",
        fieldId: "units",
        line: invoice_line_number
      })

      var unit_record = og_lib.arrayFind(units,
        function(un){
          return un.id == this_unit_id
        }
      )

      var current_guide = nl_guide_item.getValue({fieldId: "custrecord_linked_guide_id"})
      var current_item = nl_guide_item.getValue({fieldId: "custrecord_guide_item"})

      var line_quantity = nl_invoice.getSublistValue({
        sublistId: "item",
        fieldId: "quantity",
        line: invoice_line_number
      })
      var line_rate = nl_invoice.getSublistValue({
        sublistId: "item",
        fieldId: "rate",
        line: invoice_line_number
      })

      if(!current_guide){
        nl_guide_item.setValue({
          fieldId: "custrecord_linked_guide_id",
          value: customer_history_guide.id
        })
      }
      if(!current_item){
        nl_guide_item.setValue({
          fieldId: "custrecord_guide_item",
          value: item_id
        })
      }
      nl_guide_item.setValue({
        fieldId: "custrecord_guide_quantity",
        value: line_quantity
      })
      if(unit_record){
        nl_guide_item.setValue({
          fieldId: "custrecord_unit",
          value: unit_record.id
        })
      }
      nl_guide_item.setValue({
        fieldId: "custrecord_history_date",
        value: this_invoice_date
      })
      nl_guide_item.setValue({
        fieldId: "custrecord_history_rate",
        value: line_rate
      })
      log.error("item updated")
      try {
        nl_guide_item.save()
      } catch(err){
        continue
      }
    }


    log.error({title: "custom logic", details: JSON.stringify(q_item.id)})
  }

  q_control.queueProcessHandler(fileFunction)


}
return {
  execute: execute
};
});
