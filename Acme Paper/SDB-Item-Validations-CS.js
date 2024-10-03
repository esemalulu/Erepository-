/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(["N/ui/dialog", "N/record"], function (dialog, record) {

  function saveRecord(context) {
    try {

      var currRecord = context.currentRecord;
      var lineCount = currRecord.getLineCount({
        sublistId: "itemvendor"
      })
      var vendorPrice = false;
      for (let i = 0; i < lineCount; i++) {
        currRecord.selectLine({
          sublistId: "itemvendor",
          line: i
        })
        var actualPrice = currRecord.getCurrentSublistValue({
          sublistId: "itemvendor",
          fieldId: "purchaseprice",
        });
        console.log("actualPrice", actualPrice)
        if (actualPrice) {
          vendorPrice = true;
        }
      }
      if (!actualPrice) {
        dialog.alert({
          title: 'Vendor purchase price empty',
          message: 'The Purhcase Price under the vendor subtab is mandatory.'
        })
      }
      return actualPrice
    } catch (error) {
      console.log("Error at SaveRecord", error)
    }
  }

  function pageInit(context) {
    try {
      var newRecord = context.currentRecord;
      if (location.href.includes('converttoinvtpart')) updateItemFields(newRecord)
    } catch (e) {
      log.debug('pageInit:', e);
    }
  }

  function updateItemFields(newRecord) {
    try {
      log.debug('VALUES TO SET', { item: newRecord.id, type: newRecord.type, expenseaccount: newRecord.getValue('expenseaccount') })
      if (newRecord.getValue('expenseaccount') != 429) updateOriginalItem(newRecord); //EXPENSE ACCOUNT
    } catch (error) {
      log.error('ERROR updateItemFields: ', error);
    }
  }

  function updateOriginalItem(newRecord) {
    try {
      var objRecord = record.load({ type: 'noninventoryitem', id: newRecord.id });
      objRecord.setValue('expenseaccount', 429); //EXPENSE ACCOUNT
      objRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
      location.reload();
    } catch (error) {
      log.error('ERROR updateOriginalItem: ', error);
    }
  }

  return {
    saveRecord: saveRecord,
    pageInit: pageInit
  }
});
