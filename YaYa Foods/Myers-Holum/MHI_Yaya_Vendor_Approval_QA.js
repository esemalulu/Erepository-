/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(['N/record', 'N/search', 'N/ui/message', 'N/runtime'], (record, search, message, runtime) => {
  const onAction = (context) => {
    try {
      const PARAMS = runtime.getCurrentScript();
      const PARAM_VAL = PARAMS.getParameter({
        name: 'custscript_return_value_set_approval_2'
      });
      const billRec = context.newRecord;
      const currentStatus = billRec.getValue({
        fieldId: 'approvalstatus'
      });
      const poID = billRec.getSublistValue({
        sublistId: 'item',
        fieldId: 'orderdoc',
        line: 0
      });
      log.debug('poID', poID);
      if (poID == null || poID == '') {
        return 0;
      }
      // if standalone then don't do anything -> returns current status

      const check = checkApproval(context.newRecord, currentStatus, poID);
      log.debug('record', context.newRecord);
      log.debug('record id', context.newRecord.id);

      log.debug('check', check);
      return check;
    } catch (e) {
      log.error('error', e);
    }
  };

  const checkApproval = (billRecord, currentStatus, poID) => {
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
      return 0;
    }
    // if created from PO but no blanket PO -> returns current status

    const blanketPO = [];
    blanketpurchaseorderSearchObj.run().each((result) => {
      // .run().each has a limit of 4,000 results
      log.debug('result', result);
      const blanketPOid = result.getValue({
        name: 'internalid'
      });
      blanketPO.push(blanketPOid);

      return true;
    });

    const blanketPOrec = record.load({
      type: 'blanketpurchaseorder',
      id: blanketPO[0]
    });
    const billed = blanketPOrec.getValue({
      fieldId: 'billedamount'
    });
    const max = blanketPOrec.getValue({
      fieldId: 'maximumamount'
    });
    log.debug('billed', billed);
    log.debug('max', max);

    if (billed <= max) {
      return 2;
    }

    return 1;

    // if created by blanket PO and billed > max then approve, else pending
  };

  return {
    onAction
  };
});
