/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 *
 */
var ALLOWED_TRIGGER_MODES = ["create", "edit"];

define(["N/record"], function (record) {
  function afterSubmit(context) {
    try {
      var triggerMode = context.type;
      if (ALLOWED_TRIGGER_MODES.indexOf(triggerMode) == -1) {
        return;
      }
      var rec = context.newRecord;
      var createdFrom = rec.getValue({ fieldId: "createdfrom" });
      if (isEmpty(createdFrom)) {
        return;
      }
      var objItems = getSalesOrderLines(createdFrom);
      if (isEmpty(objItems)) {
        return;
      }
      copySalesOrder(createdFrom, objItems);
    } catch (error) {
      log.error("Error in afterSubmit", error.toString());
    }
  }

  function copySalesOrder(salesOrderId, objItems) {
    try {
      var soRec = record.load({
        id: salesOrderId,
        type: record.Type.SALES_ORDER,
      });
      var documentNumber = soRec.getValue({ fieldId: "tranid" });
      var rec = record.copy({
        type: record.Type.SALES_ORDER,
        id: salesOrderId,
        isDynamic: false,
      });
      var nextNumber = getNextSONumber(documentNumber);
      rec.setValue({ fieldId: "tranid", value: nextNumber });
      rec.setValue({ fieldId: "custbody_acc_odoi_route_no", value: "" });
      rec.setValue({ fieldId: "custbody_aps_stop", value: "" });
      var lineCount = rec.getLineCount({ sublistId: "item" });
      for (var i = lineCount; i >= 0; i--) {
        var lineKey = rec.getSublistValue({
          sublistId: "item",
          fieldId: "lineuniquekey",
          line: i,
        });
        if (!objItems.hasOwnProperty(lineKey)) {
          rec.removeLine({
            sublistId: "item",
            line: i,
          });
        } else {
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "quantity",
            line: i,
            value: objItems[lineKey],
          });
        }
      }
      var recId = rec.save({
        enableSourcing: true,
        ignoreMandatoryFields: true,
      });
      closeOrder(soRec);
      return recId;
    } catch (error) {
      log.error("Error in copySalesOrder", error.toString());
    }
  }

  function getNextSONumber(soNumber) {
    try {
      var splitSONumber = soNumber.split("-");
      if (splitSONumber.length > 1) {
        var nextNumber = parseInt(splitSONumber[1]) + 1;
        return splitSONumber[0] + "-" + nextNumber;
      } else {
        return soNumber + "-1";
      }
    } catch (error) {
      log.error("Error in getNextSONumber", error.toString());
    }
  }

  function closeOrder(rec) {
    try {
      var lineCount = rec.getLineCount({ sublistId: "item" });
      for (var i = 0; i < lineCount; i++) {
        var quantityInvoiced =
          rec.getSublistValue({
            sublistId: "item",
            fieldId: "quantitybilled",
            line: i,
          }) || 0;
        var quantityOrdered =
          rec.getSublistValue({
            sublistId: "item",
            fieldId: "quantity",
            line: i,
          }) || 0;
        var quantityRemaining = quantityOrdered - quantityInvoiced;
        if (quantityRemaining > 0) {
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "isclosed",
            value: true,
            line: i,
          });
        }
      }
      rec.save({ enableSourcing: true, ignoreMandatoryFields: true });
    } catch (error) {
      log.error("Error in closeOrder", error.toString());
    }
  }

  function getSalesOrderLines(internalId) {
    try {
      var rec = record.load({
        id: internalId,
        type: record.Type.SALES_ORDER,
        isDynamic: true,
      });
      var lineCount = rec.getLineCount({ sublistId: "item" });
      var objItems = {};
      for (var i = 0; i < lineCount; i++) {
        var item = rec.getSublistValue({
          sublistId: "item",
          fieldId: "item",
          line: i,
        });
        var quantityInvoiced = rec.getSublistValue({
          sublistId: "item",
          fieldId: "quantityfulfilled",
          line: i,
        });
        log.debug("quantityInvoiced", quantityInvoiced);
        var quantityOrdered =
          rec.getSublistValue({
            sublistId: "item",
            fieldId: "quantity",
            line: i,
          }) || 0;
        var lineKey = rec.getSublistValue({
          sublistId: "item",
          fieldId: "lineuniquekey",
          line: i,
        });
        var quantityRemaining = quantityOrdered - quantityInvoiced;
        if (quantityRemaining > 0) {
          objItems[lineKey] = quantityRemaining;
        }
      }
      return objItems;
    } catch (error) {
      log.error("Error in getSalesOrderLines", error.toString());
    }
  }

  function isEmpty(stValue) {
    if (
      stValue == null ||
      stValue == "" ||
      stValue == " " ||
      stValue == undefined
    ) {
      return true;
    } else {
      return false;
    }
  }

  return {
    afterSubmit: afterSubmit,
  };
});
