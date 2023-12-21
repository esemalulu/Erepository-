/* eslint-disable max-len */
/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/https', 'N/url'], (search, record, https, url) => {
  const afterSubmit = context => {
    const SHIPPED_STATUS = 'C';
    const { newRecord, type } = context;
    const IS_DELETE = type.toLowerCase() === 'delete';
    const IS_SHIP = type.toLowerCase() === 'ship';
    const IS_EDIT = type.toLowerCase() === 'edit';
    const IS_CREATE = type.toLowerCase() === 'create';
    if (IS_DELETE) return;

    const newIfStatus = newRecord.getValue('shipstatus');
    let oldIfStatus = '';
    if (IS_EDIT) {
      const { oldRecord } = context;
      oldIfStatus = oldRecord.getValue('shipstatus');
    }

    if (
      IS_SHIP ||
      (newIfStatus === SHIPPED_STATUS && newIfStatus != oldIfStatus) ||
      (IS_CREATE && newIfStatus === SHIPPED_STATUS)
    ) {
      const createdFrom = newRecord.getValue('createdfrom');
      log.audit('createdFrom', createdFrom);
      const tranType = search.lookupFields({
        type: search.Type.TRANSACTION,
        id: createdFrom,
        columns: 'type'
      });
      const recType = tranType.type.length ? tranType.type[0].value : '';
      log.audit('recType', recType);
      if (recType.toLowerCase() !== 'salesord') return;
      if (!checkBOSitem(createdFrom)) return;
0
      try {
        const invoiceSO = createInvoice(newRecord, createdFrom);
      } catch (e) {
        log.audit('Error', e);
      }
    }
  };

  const createInvoice = (newRecord, soId) => {
    const paramObj = {};
    paramObj.recId = soId;
    paramObj.ifId = newRecord.id;

    // paramObj.paymentMethod = paymentMethod;

    const suiteletURL = url.resolveScript({
      scriptId: 'customscript_mhi_yyf_if_bos_sl',
      deploymentId: 'customdeploy_mhi_yyf_if_bos_sl',
      returnExternalUrl: true,
      params: paramObj
    });
    https.get({
      url: suiteletURL
    });
  };

  const isEmpty = obj => Object.keys(obj).length === 0;

  const checkBOSitem = createdFromId => {
    const soRec = record.load({
      type: 'salesorder',
      id: createdFromId
    });

    const lineCount = soRec.getLineCount('item');
    for (let i = 0; i < lineCount; i += 1) {
      const isBOSItem = soRec.getSublistValue('item', 'custcol_mhi_yyf_is_bos', i);

      if (isBOSItem) {
        return true;
      }
    }

    return false;
  };

  return {
    afterSubmit
  };
});
