/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(['N/record', 'N/search'], (record, search) => {
  const onAction = (context) => {
    try {
      // return 2 if BPO exists 1 if not
      const billRec = context.newRecord;
      const poID = billRec.getSublistValue({
        sublistId: 'item',
        fieldId: 'orderdoc',
        line: 0
      });
      log.debug('poID', poID);
      if (poID == null || poID == '') {
        return 1;
      }

      const check = checkApproval(poID);
      log.debug('record', context.newRecord);

      log.debug('check', check);
      return check;
    } catch (e) {
      log.error('error', e);
    }
  };

  const checkApproval = (poID) => {
    const blanketpurchaseorderSearchObj = search.create({
      type: 'blanketpurchaseorder',
      filters:
          [
            ['type', 'anyof', 'BlankOrd'],
            'AND',
            ['purchaseorder.internalid', 'anyof', poID]
          ],
      columns:
          [
            'internalid'
          ]
    });
    const searchResultCount = blanketpurchaseorderSearchObj.runPaged().count;
    log.debug('blanketpurchaseorderSearchObj result count', searchResultCount);
    if (searchResultCount == 0) {
      return 1;
    } // if no blanket POs

    // else return 2
    return 2;
  };

  return {
    onAction
  };
});
