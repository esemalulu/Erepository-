/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([
  'N/search',
  'N/ui/serverWidget'
], function(search, ui) {

  var beforeLoad = function(context) {

    if (context.type != 'edit') return
    if (context.newRecord.id != '23') return

    var mTab = context.form.addTab({
      id: 'custpage_manufacturing', label: 'Revenue'
    })
    context.form.insertTab({
      tab: mTab, nexttab: 'rltnshptab'
    })
    context.form.addField({
      id: 'custpage_first', type: ui.FieldType.INTEGER, label: 'Some Revenue Specific Field', container: 'custpage_manufacturing'
    })
    var sl = context.form.addSublist({
      id: 'custpage_mft_list', type: ui.SublistType.INLINEEDITOR, label: 'Item', tab: 'custpage_manufacturing'
    })
    ;[
      {id: 'item', type: ui.FieldType.SELECT, label: 'Item', values: (function() {
        return [
          {id: '0', name: 'Select...'},
          {id: '17', name: 'Revenue - Cellular Tower'},
          {id: '24', name: 'Revenue - Solar Ground Mount'},
          {id: '22', name: 'Revenue - Wind'}
        ]
      })()},
      {id: 'description', type: ui.FieldType.TEXTAREA, label: 'Description'},
      {id: 'qty', type: ui.FieldType.INTEGER, label: 'Quantity'},
      {id: 'rate', type: ui.FieldType.CURRENCY, label: 'Rate'},
      {id: 'amount', type: ui.FieldType.CURRENCY, label: 'Amount'}
    ].map(function(fld) {
      var field = sl.addField(fld)
      if (fld.values) fld.values.map(function(option) {
        field.addSelectOption({
          value: option.id, text: option.name
        })
      })
    })

    var mTab = context.form.addTab({
      id: 'custpage_manufacturing2', label: 'Purchase'
    })
    context.form.insertTab({
      tab: mTab, nexttab: 'rltnshptab'
    })
    context.form.addField({
      id: 'custpage_second', type: ui.FieldType.INTEGER, label: 'Some Purchase Specific Field', container: 'custpage_manufacturing2'
    })
    var sl = context.form.addSublist({
      id: 'custpage_mft_list2', type: ui.SublistType.INLINEEDITOR, label: 'Item', tab: 'custpage_manufacturing2'
    })
    ;[
      {id: 'item', type: ui.FieldType.SELECT, label: 'Item', values: (function() {
        return [
          {id: '0', name: 'Select...'},
          {id: '17', name: 'Purchase Cellular Tower Lease Asset'},
          {id: '24', name: 'Purchase Solar Ground Mount Lease Asset'},
          {id: '22', name: 'Purchase Solar Rooftop Lease Asset'},
          {id: '30', name: 'Purchase Wind Lease Asset'}
        ]
      })()},
      {id: 'description', type: ui.FieldType.TEXTAREA, label: 'Description'},
      {id: 'qty', type: ui.FieldType.INTEGER, label: 'Quantity'},
      {id: 'rate', type: ui.FieldType.CURRENCY, label: 'Rate'},
      {id: 'amount', type: ui.FieldType.CURRENCY, label: 'Amount'}
    ].map(function(fld) {
      var field = sl.addField(fld)
      if (fld.values) fld.values.map(function(option) {
        field.addSelectOption({
          value: option.id, text: option.name
        })
      })
    })

    //run a few local things
    context.form.addField({
      id: 'custpage_runjs', label: 'RunJS', type: ui.FieldType.INLINEHTML
    }).defaultValue = "<script type='text/javascript'>" +
                        "jQuery(document).ready(function() { jQuery('#itemslnk').hide(); jQuery('#items_wrapper').hide(); setTimeout(function() { jQuery('#custpage_manufacturingtxt').click() }, 3000); })"+
                      "</script>"

  }

  return {
    beforeLoad: beforeLoad
  }

})
