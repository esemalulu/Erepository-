//this file has several script records all with their own deployments
//deployed to rebate item details to source item id from mpn/sap/upc on CREATE
//deployed to rebate customer to source customer id from customer_number on CREATE/EDIT
//deployed to rebate parent to source contract number beforeLoad in UI AutoGenerateContractNumber
//  deployed to parent beforeSubmit to source rebate_parent_vendor from vendor_id beforeSubmitParent
//  deployed to parent afterSubmit to increment internal contract number AutoGenerateSubmit

function errLog(a, b){
  nlapiLogExecution("ERROR", a, b)
}

function beforeSubmit(type, form) {

  if (type == "create") {
    var tempFlag = 0;
    var mpnValue = nlapiGetFieldValue("custrecord_rebate_vendor_name");
    var rbtParent = nlapiGetFieldValue("custrecord_rebate_items_parent");
    var upcValue = nlapiGetFieldValue("custrecord_rebate_item_upc");
    var sapValue = nlapiGetFieldValue("custrecord_rebate_item_sap_code");

    var parentRec = nlapiLoadRecord("customrecord_rebate_parent", rbtParent);
    var parentVendor = parentRec.getFieldValue(
      "custrecord_rebate_parent_vendor"
    );
    var itemId = nlapiGetFieldValue("custrecord_rebate_items_item");
    //  var vendorID = nlapiGetFieldValue('custrecord_rebate_vendor_id');
    if (itemId) {
    } else {
      if (mpnValue) {
        var columns = [];
        columns[0] = new nlobjSearchColumn("vendorname");
        columns[1] = new nlobjSearchColumn("internalid");
        columns[2] = new nlobjSearchColumn("vendor");

        var filters = [];
        filters[0] = new nlobjSearchFilter("vendorname", null, "is", mpnValue);
        filters[1] = new nlobjSearchFilter("isinactive", null, "is", "F")

        var searchRecord = nlapiSearchRecord("item", null, filters, columns);
        if (searchRecord) {
          for (var j = 0; searchRecord != null && j < searchRecord.length; j++) {
            var cusResult = searchRecord[j];
            var itemName = cusResult.getValue("internalid");
            var itemRec = nlapiLoadRecord("inventoryitem", itemName);
            var vendorListCount = itemRec.getLineItemCount("itemvendor");
            for (v = 1; v <= vendorListCount; v++) {
              var vendorID = itemRec.getLineItemValue(
                "itemvendor",
                "vendor",
                v
              );

              if (vendorID == parentVendor) {
                // match accept it
                nlapiSetFieldValue("custrecord_rebate_items_item", itemName);
                tempFlag = 1;
              } else {
                // no match reject it
              }
            }
          }
          if (tempFlag == 0) {
            throw new Error("No Match For Parent Vendor With This Item Code");
          }
        } else {
          throw new Error("No Item Exists With That MPN Value");
        }
      }
      if (upcValue) {
        var columns = [];
        columns[0] = new nlobjSearchColumn("custrecord_sdb_acme_upc");
        columns[1] = new nlobjSearchColumn("internalid");
        columns[2] = new nlobjSearchColumn("custrecord_sdb_acme_item");

        var filters = [];
        filters[0] = new nlobjSearchFilter(
          "custrecord_sdb_acme_upc",
          null,
          "is",
          upcValue
        );

        var searchRecord = nlapiSearchRecord(
          "customrecord_sdb_acme_upc_sap_uom",
          null,
          filters,
          columns
        );
        if (searchRecord) {
          for (
            var j = 0;
            searchRecord != null && j < searchRecord.length;
            j++
          ) {
            var cusResult = searchRecord[j];
            var itemName = cusResult.getValue("custrecord_sdb_acme_item");
            var itemRec = nlapiLoadRecord("inventoryitem", itemName);
            var vendorListCount = itemRec.getLineItemCount("itemvendor");
            for (v = 1; v <= vendorListCount; v++) {
              var vendorID = itemRec.getLineItemValue(
                "itemvendor",
                "vendor",
                v
              );

              if (vendorID == parentVendor) {
                // match accept it
                nlapiSetFieldValue("custrecord_rebate_items_item", itemName);
                tempFlag = 1;
              } else {
                // no match reject it
              }
            }
          }
          if (tempFlag == 0) {
            throw new Error("No Match For Parent Vendor With This Item Code");
          }
        } else {
          throw new Error("No Item Exists With That UPC Value");
        }
      }
      if (sapValue) {
        var columns = [];
        columns[0] = new nlobjSearchColumn("custrecord_sdb_acme_upc");
        columns[1] = new nlobjSearchColumn("internalid");
        columns[2] = new nlobjSearchColumn("custrecord_sdb_acme_item");
        columns[3] = new nlobjSearchColumn("custrecord_sdb_acme_sap");

        var filters = [];
        filters[0] = new nlobjSearchFilter(
          "custrecord_sdb_acme_sap",
          null,
          "is",
          sapValue
        );

        var searchRecord = nlapiSearchRecord(
          "customrecord_sdb_acme_upc_sap_uom",
          null,
          filters,
          columns
        );
        if (searchRecord) {
          for (var j = 0; searchRecord != null && j < searchRecord.length; j++) {
            var cusResult = searchRecord[j];
            var itemName = cusResult.getValue("custrecord_sdb_acme_item");
            var itemRec = nlapiLoadRecord("inventoryitem", itemName);
            var vendorListCount = itemRec.getLineItemCount("itemvendor");
            for (v = 1; v <= vendorListCount; v++) {
              var vendorID = itemRec.getLineItemValue(
                "itemvendor",
                "vendor",
                v
              );

              if (vendorID == parentVendor) {
                // match accept it
                nlapiSetFieldValue("custrecord_rebate_items_item", itemName);
                tempFlag = 1;
              } else {
                // no match reject it
              }
            }
          }
          if (tempFlag == 0) {
            throw new Error("No Match For Parent Vendor With This Item Code");
          }
        } else {
          throw new Error("No Item Exists With That UPC Value");
        }
      }
    }
  }

  if(type !== "delete"){
    var item_value = nlapiGetFieldValue("custrecord_rebate_items_item")
    var mpn_value = nlapiGetFieldValue("custrecord_rebate_vendor_name")
    if(!item_value){
      return
    }
    var item_record = nlapiLoadRecord("inventoryitem", item_value)
    var mpn_value = item_record.getFieldValue("vendorname")
    if(!mpn_value){
      return
    }
    nlapiSetFieldValue("custrecord_rebate_vendor_name", mpn_value)
  }

}


function getVendorWithVendorID(vendor_id){
  if(!vendor_id){
    return null
  }
  var columns = [
    new nlobjSearchColumn("entityid"),
    new nlobjSearchColumn("internalid")
  ]
  var filters = [new nlobjSearchFilter("entityid", null, "is", vendor_id)]
  var results = nlapiSearchRecord("vendor", null, filters, columns)
  if(!results){
    return null
  }
  results = JSON.parse(JSON.stringify(results))
  return results[0]
}

function beforeSubmitParent(type, form) {

  if(type == "create" || type == "edit"){
    var vendor_id = nlapiGetFieldValue("custrecord_rebate_vendor_id")
    if(!vendor_id){
      return
    }
    errLog("vendor_id", vendor_id)
    var this_vendor = getVendorWithVendorID(vendor_id)
    errLog("thsi vend", JSON.stringify(this_vendor))
    if(!this_vendor){
      throw new Error("No vendor exists with this entityid")
    }
    nlapiSetFieldValue("custrecord_rebate_parent_vendor", this_vendor.id)
  }

}

//parent beforeLoad
//this fires on import, handling the auto-gen for every line of an import
function AutoGenerateContractNumber(type, form) {
  if(type == "create" || type == "copy"){
    form
      .getField("custrecord_acme_internal_con_num")
      .setDisplayType("disabled");
    var cusRecAuto = nlapiLoadRecord(
      "customrecord_acme_autogen_contract_num",
      1
    );
    var startingValue = cusRecAuto.getFieldValue("custrecord_starting_number");
    startingValue = parseInt(startingValue);
    var startingValueResult = startingValue + parseInt(1);
    startingValueResult = startingValueResult.toFixed(0);
    nlapiSetFieldValue("custrecord_acme_internal_con_num", startingValueResult);
  }
}

//parent afterSubmit
function AutoGenerateSubmit(type) {
  if(type == "create"){
    var cusRecAuto = nlapiLoadRecord(
      "customrecord_acme_autogen_contract_num",
      1
    );
    var startingValue = cusRecAuto.getFieldValue("custrecord_starting_number");
    startingValue = parseInt(startingValue);
    var startingValueResult = startingValue + parseInt(1);
    startingValueResult = startingValueResult.toFixed(0);

    var currentNum = nlapiGetFieldValue("custrecord_acme_internal_con_num");
    currentNum = parseInt(currentNum);
    currentNum = currentNum.toFixed(0);
    if (currentNum == startingValueResult) {
      // save the new record number
      cusRecAuto.setFieldValue("custrecord_starting_number", currentNum);
      var redID = nlapiSubmitRecord(cusRecAuto);
    } else if (currentNum < startingValueResult) {
      // someone else saved a record before this one
      cusRecAuto.setFieldValue(
        "custrecord_starting_number",
        startingValueResult
      );
      var redID = nlapiSubmitRecord(cusRecAuto);
    }
  }
}

function customerNumberFind(type, form) {
  if (type == "create") {
    var customerNumber = nlapiGetFieldValue("custrecord_customer_number");

    if (customerNumber) {
      var columns = [];
      columns[0] = new nlobjSearchColumn("entityid");
      columns[1] = new nlobjSearchColumn("internalid");
      var filters = [];
      filters = new nlobjSearchFilter("entityid", null, "is", customerNumber);

      var searchRecord = nlapiSearchRecord("customer", null, filters, columns);

      if (searchRecord) {
        for (var j = 0; searchRecord != null && j < searchRecord.length; j++) {
          var cusResult = searchRecord[j];
          //	var vendorName = cusResult.getValue('entityid');
          var custInternalID = cusResult.getValue("internalid");
        }

        var customerRec = nlapiLoadRecord("customer", custInternalID);
        var kcNum = customerRec.getFieldValue(
          "custentity_custom_kc_customer_no"
        );
        nlapiSetFieldValue("custrecord_rebate_customer_enduserag", kcNum);
        nlapiSetFieldValue(
          "custrecord_rebate_customer_customer",
          custInternalID
        );
      } else {
        throw new Error("No Customer Exists With That Customer Number");
      }
    }
  }

  if (type == "edit") {
    var customerNumber = nlapiGetFieldValue("custrecord_customer_number");

    if (customerNumber) {
      var columns = [];
      columns[0] = new nlobjSearchColumn("entityid");
      columns[1] = new nlobjSearchColumn("internalid");
      var filters = [];
      filters = new nlobjSearchFilter("entityid", null, "is", customerNumber);

      var searchRecord = nlapiSearchRecord("customer", null, filters, columns);

      if (searchRecord) {
        for (var j = 0; searchRecord != null && j < searchRecord.length; j++) {
          var cusResult = searchRecord[j];
          //	var vendorName = cusResult.getValue('entityid');
          var custInternalID = cusResult.getValue("internalid");
        }

        nlapiSetFieldValue(
          "custrecord_rebate_customer_customer",
          custInternalID
        );
      }
    }
  }
}
