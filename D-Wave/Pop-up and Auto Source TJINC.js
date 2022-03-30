/**
*@NApiVersion 2.x
*@NScriptType ClientScript
*/
define(['N/currentRecord', 'N/log', 'N/record', 'N/search', 'N/ui/dialog'], function (currentRecord, log, record, search, dialog) {

  function pageInit(context) {

  }

  function saveRecord(context) {

  }

  function validateField(context) {

  }
  //The checkbox added in the userevent script will trigger this function
  //a custom popup will be shown with a table of the different manufacturers for the item
  //if there are not any manufacturers then nothing will be shown
  function fieldChanged(context) {
    var currentRec = context.currentRecord;
    var vendorIdFromPO = currentRec.getValue({fieldId:'entity'});
    var sublistName = context.sublistId;
    var fieldId = context.fieldId;
    if(fieldId == 'custcol_eb_manu_select' && sublistName == 'item'){

      var itemId = currentRec.getCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'item'
      });

      var vendor = currentRec.getValue({
        fieldId: 'entity'
      });

      var customrecord_tjinc_dwvpur_vendorleadSearchObj = search.create({
        type: "customrecord_tjinc_dwvpur_vendorlead",
        filters:
        [
          ["custrecord_tjinc_dwvpur_itemname", "is",  itemId ],
          "AND",
          ["custrecord_tjinc_dwvpur_vendor", "is", vendor ]
        ],
        columns:
        [
          search.createColumn({ name: "name", label: "ID" }),
          //      search.createColumn({ name: "scriptid", label: "Script ID" }),
          search.createColumn({ name: "custrecord_tjinc_dwvpur_itemname", label: "Item Name" }),
          search.createColumn({ name: "custrecord_tjinc_dwvpur_vendor", label: "Vendor" }),
          search.createColumn({ name: "custrecord_tjinc_dwvpur_leadtime", label: "Lead time" }),
          search.createColumn({ name: "custrecord_tjinc_dwvpur_moq", label: "MOQ" }),
          //      search.createColumn({ name: "custrecord_tjinc_dwvpur_vensub", label: "Vendor Subsidiary" }),
          search.createColumn({ name: "custrecord_manufacturer", label: "Manufacturer" }),
          search.createColumn({ name: "custrecord155963581", label: "Preferred" }),
          search.createColumn({ name: "custrecord_manufacture_part_no", label: "Manufacturer Part Num" }),
          search.createColumn({ name: "custrecord_vendor_part", label: "Vendor Part Num" }),
          search.createColumn({ name: "custrecord_price", label: "Vendor Price" }),
        ]
      });
      var prefferedEverywhere = false;
      var resultsFinal = customrecord_tjinc_dwvpur_vendorleadSearchObj.run().getRange({ start: 0, end: 1000 });

      var vendorBtns = [];
      var vendorBtnsHtml = [];
      var btnHtml = '';
      for(i = 0; i < resultsFinal.length; i++){

        var manufacturer = resultsFinal[i].getValue({name: 'custrecord_manufacturer'});
        var preferred = resultsFinal[i].getValue({name: 'custrecord155963581'});
        var moq = resultsFinal[i].getValue({name: 'custrecord_tjinc_dwvpur_moq'});
        var leadTime = resultsFinal[i].getValue({name: 'custrecord_tjinc_dwvpur_leadtime'});
        var venPrice = resultsFinal[i].getValue({name: 'custrecord_price'});


        btnHtml += '<tr>'
        +'<td><button value="shadow-' + resultsFinal[i].id + '" onclick="onClick(' + resultsFinal[i].id + ')">' + manufacturer + '</button></td>'+
        '<td><p>' + preferred + '</p></td>'+
        '<td><p>' + moq + '</p></td>'+
        '<td><p>' + leadTime + '</p></td>'+
        '<td><p>$' + venPrice + '</p></td>'+
        '</tr>';
        log.debug({
          title: 'btnHtml',
          details: btnHtml
        });
        vendorBtns.push({
          label: manufacturer,
          value: resultsFinal[i].id
        });
      }
      var htmlMsg = '<script>'+
      'function onClick(id){' +
      'jQuery(`:button[value="${id}"]`).click();' +
      '}; '+
      '(function($){' +
      '$(function($, undefined){' +
      '$(".uir-message-buttons").last().hide();' +
      '$(".x-window").css("width", "700px");' +
      '});' +
      '})(jQuery);'+
      '</script>'+
      '<div class="uir-message-buttons">' +
      '<table border=1 cellpadding="6" cellspacing=0 class="hoverTable" style="width:600px !important">' +
      '<thead>' +
      '<tr>' +
      '<th><b>Manufacturer</b></th>' +
      '<th><b>Preferred</b></th>' +
      '<th><b>MOQ</b></th>' +
      '<th><b>Lead Time</b></th>' +
      '<th><b>Vendor Price</b></th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      btnHtml +
      '</tbody>' +
      '</table>' +
      '</div>';
      if(resultsFinal.length > 0){
        dialog.create({
          buttons: vendorBtns,
          title: 'Select the manufacturer',
          message: htmlMsg
        }).then(function success(selection){
          log.debug({
            title: 'selection',
            details: selection
          });
          currentRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol9',
            value: selection
          });
          currentRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_eb_manu_select',
            value: false,
            ignoreFieldChange: true
          });
        });
      }
      else{
        dialog.create({
          buttons: [{
            label: 'Ok',
            value: ''
          }],
          title: 'No manufacturers',
          message: ''
        }).then(function success(){
          currentRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_eb_manu_select',
            value: false,
            ignoreFieldChange: true
          });
        });
      }
    }
  }

  function postSourcing(context) {
    var currentRec = context.currentRecord;
    var sublistName = context.sublistId;
    var fieldId = context.fieldId;

    if (fieldId == 'item' && sublistName == 'item' && currentRec.getCurrentSublistValue({sublistId: 'item',fieldId: 'item'})) {
      try {

        var itemId = currentRec.getCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'item'
        });

        var vendor = currentRec.getValue({
          fieldId: 'entity'
        });

        var customrecord_tjinc_dwvpur_vendorleadSearchObj = search.create({
          type: "customrecord_tjinc_dwvpur_vendorlead",
          filters:
          [
            ["custrecord_tjinc_dwvpur_itemname", "is",  itemId ],
            "AND",
            ["custrecord_tjinc_dwvpur_vendor", "is", vendor ]
          ],
          columns:
          [
            search.createColumn({ name: "name", label: "ID" }),
            //      search.createColumn({ name: "scriptid", label: "Script ID" }),
            search.createColumn({ name: "custrecord_tjinc_dwvpur_itemname", label: "Item Name" }),
            search.createColumn({ name: "custrecord_tjinc_dwvpur_vendor", label: "Vendor" }),
            search.createColumn({ name: "custrecord_tjinc_dwvpur_leadtime", label: "Lead time" }),
            search.createColumn({ name: "custrecord_tjinc_dwvpur_moq", label: "MOQ" }),
            //      search.createColumn({ name: "custrecord_tjinc_dwvpur_vensub", label: "Vendor Subsidiary" }),
            search.createColumn({ name: "custrecord_manufacturer", label: "Manufacturer" }),
            search.createColumn({ name: "custrecord155963581", label: "Preferred" }),
            search.createColumn({ name: "custrecord_manufacture_part_no", label: "Manufacturer Part Num" }),
            search.createColumn({ name: "custrecord_vendor_part", label: "Vendor Part Num" }),
            search.createColumn({ name: "custrecord_price", label: "Vendor Price" }),
          ]
        });
        var prefferedEverywhere = false;
        var results = customrecord_tjinc_dwvpur_vendorleadSearchObj.run().getRange({ start: 0, end: 1000 });
        for(i = 0; i < results.length; i++){
          var preferred = results[i].getValue({name: 'custrecord155963581'});

          if(preferred) {
            prefferedEverywhere = true;
            break;
          }

        }
        var vendorId = '';

        if(prefferedEverywhere){

          for(var i = 0; i < results.length; i++){
            if(results[i].getValue({name: 'custrecord155963581'})){
              vendorId = results[i].id;
            }
          }
          if(vendorId == '' && results.length > 0){
            vendorId = results[0].id;
          }

          currentRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol9',
            value: vendorId
          });
        }
        else {
          var customrecord_tjinc_dwvpur_vendorleadSearchObj = search.create({
            type: "customrecord_tjinc_dwvpur_vendorlead",
            filters:
            [
              ["custrecord_tjinc_dwvpur_itemname","anyof",itemId],
              "AND",
              ["custrecord_tjinc_dwvpur_vendor","anyof",vendor]
            ],
            columns:
            [
              search.createColumn({name: "name", label: "ID"}),
              search.createColumn({name: "custrecord155963581", label: "Preferred"}),
              search.createColumn({name: "scriptid", label: "Script ID"}),
              search.createColumn({name: "custrecord_tjinc_dwvpur_itemname", label: "Item Name"}),
              search.createColumn({name: "custrecord_tjinc_dwvpur_vendor", label: "Vendor"}),
              search.createColumn({name: "custrecord_tjinc_dwvpur_leadtime", label: "Lead time"}),
              search.createColumn({name: "custrecord_tjinc_dwvpur_moq", label: "MOQ"}),
              search.createColumn({name: "custrecord_tjinc_dwvpur_vensub", label: "Vendor Subsidiary"}),
              search.createColumn({
                name: "lastmodified",
                sort: search.Sort.DESC,
                label: "Last Modified"
              })
            ]
          });
          var results = customrecord_tjinc_dwvpur_vendorleadSearchObj.run().getRange({ start: 0, end: 1000 });
          if(results.length > 0){
            for(var i = 0; i < 1; i++){
                vendorId = results[i].id;
            }
          }
          log.debug({
            title: 'vendorIdElse',
            details: vendorId
          });
          currentRec.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol9',
            value: vendorId
          });
        }
        
      } catch (error) {
        log.debug({
          title: 'try-catch error',
          details: error
        });
      }
    }
  }

  function lineInit(context) {

  }

  function validateDelete(context) {

  }

  function validateInsert(context) {

  }

  function validateLine(context) {

  }

  function sublistChanged(context) {

  }
  function runPrefferedSearch(itemId, vendor) {
    var customrecord_tjinc_dwvpur_vendorleadSearchObj = search.create({
      type: "customrecord_tjinc_dwvpur_vendorlead",
      filters:
      [
        ["custrecord_tjinc_dwvpur_itemname", "is",  itemId ],
        "AND",
        ["custrecord_tjinc_dwvpur_vendor", "is", vendor ],
        "AND",
        ["custrecord155963581", "is", "true"]
      ],
      columns:
      [
        search.createColumn({ name: "name", label: "ID" }),
        //      search.createColumn({ name: "scriptid", label: "Script ID" }),
        search.createColumn({ name: "custrecord_tjinc_dwvpur_itemname", label: "Item Name" }),
        search.createColumn({ name: "custrecord_tjinc_dwvpur_vendor", label: "Vendor" }),
        search.createColumn({ name: "custrecord_tjinc_dwvpur_leadtime", label: "Lead time" }),
        search.createColumn({ name: "custrecord_tjinc_dwvpur_moq", label: "MOQ" }),
        //      search.createColumn({ name: "custrecord_tjinc_dwvpur_vensub", label: "Vendor Subsidiary" }),
        search.createColumn({ name: "custrecord_manufacturer", label: "Manufacturer" }),
        search.createColumn({ name: "custrecord155963581", label: "Preferred" }),
        search.createColumn({ name: "custrecord_manufacture_part_no", label: "Manufacturer Part Num" }),
        search.createColumn({ name: "custrecord_vendor_part", label: "Vendor Part Num" }),
        search.createColumn({ name: "custrecord_price", label: "Vendor Price" }),
      ]
    });
    var results = customrecord_tjinc_dwvpur_vendorleadSearchObj.run().getRange({ start: 0, end: 1000 });
    return results;
  }
  function runWithoutPrefferedSearch(itemId, vendor){
    var customrecord_tjinc_dwvpur_vendorleadSearchObj = search.create({
      type: "customrecord_tjinc_dwvpur_vendorlead",
      filters:
      [
        ["custrecord_tjinc_dwvpur_itemname", "is",  itemId ],
        "AND",
        ["custrecord_tjinc_dwvpur_vendor", "is", vendor ]
      ],
      columns:
      [
        search.createColumn({ name: "name", label: "ID" }),
        //      search.createColumn({ name: "scriptid", label: "Script ID" }),
        search.createColumn({ name: "custrecord_tjinc_dwvpur_itemname", label: "Item Name" }),
        search.createColumn({ name: "custrecord_tjinc_dwvpur_vendor", label: "Vendor" }),
        search.createColumn({ name: "custrecord_tjinc_dwvpur_leadtime", label: "Lead time" }),
        search.createColumn({ name: "custrecord_tjinc_dwvpur_moq", label: "MOQ" }),
        //      search.createColumn({ name: "custrecord_tjinc_dwvpur_vensub", label: "Vendor Subsidiary" }),
        search.createColumn({ name: "custrecord_manufacturer", label: "Manufacturer" }),
        search.createColumn({ name: "custrecord155963581", label: "Preferred" }),
        search.createColumn({ name: "custrecord_manufacture_part_no", label: "Manufacturer Part Num" }),
        search.createColumn({ name: "custrecord_vendor_part", label: "Vendor Part Num" }),
        search.createColumn({ name: "custrecord_price", label: "Vendor Price" }),
      ]
    });
    var results = customrecord_tjinc_dwvpur_vendorleadSearchObj.run().getRange({ start: 0, end: 1000 });
    return results;
  }

  return {
    // pageInit: pageInit,
    // saveRecord: saveRecord,
    // validateField: validateField,
    fieldChanged: fieldChanged,
    postSourcing: postSourcing
    // lineInit: lineInit,
    // validateDelete: validateDelete,
    // validateInsert: validateInsert,
    // validateLine: validateLine,
    // sublistChanged: sublistChanged
  }
});
