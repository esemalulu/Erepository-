/* eslint-disable max-len */
/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/https', 'N/url'], (search, record, https, url) => {
  const billedStatus = 'G';
  const SHIPPED_STATUS = 'C';
  const PICKED_STATUS = 'A';

  function afterSubmit(context) {
    const { newRecord, type } = context;
    const IS_DELETE = type.toLowerCase() === 'delete';
    const IS_EDIT = type.toLowerCase() === 'edit';
    const IS_CREATE = type.toLowerCase() === 'create';
    if (IS_DELETE) return;
    const newIfStatus = newRecord.getValue('shipstatus');

    const customer = newRecord.getValue('entity');
    if (!customer) return;
    if (newIfStatus != SHIPPED_STATUS) return;

    try {
      const isBOP = checkOrderBOP(newRecord);
      log.debug('isBOP', isBOP);

      if (!isBOP) return;

      record.submitFields({
        type: 'itemfulfillment',
        id: newRecord.id,
        values: {
          shipstatus: PICKED_STATUS
        }
      });

      const createdFrom = newRecord.getValue('createdfrom');

      const tranType = search.lookupFields({
        type: search.Type.TRANSACTION,
        id: createdFrom,
        columns: 'type'
      });
      const recType = tranType.type.length ? tranType.type[0].value : '';
      if (recType.toLowerCase() !== 'salesord') return;

      const soRec = record.load({
        type: 'salesorder',
        id: createdFrom
      });

      const lineCount = soRec.getLineCount('item');

      for (let i = 0; i < lineCount; i += 1) {
        soRec.setSublistValue('item', 'isclosed', i, true);
      }

      soRec.save();
    } catch (e) {
      log.error('ERROR', e);
    }
  }

  function checkOrderBOP(newRecord) {
    const lineCount = newRecord.getLineCount('item');

    const itemList = [];
    for (let i = 0; i < lineCount; i += 1) {
      const item = newRecord.getSublistValue('item', 'item', i);
      itemList.push(item);
    }

    const itemSearchObj = search.create({
      type: 'item',
      filters: [['internalid', 'anyof', itemList], 'AND', ['custitem_mhi_yyf_is_bop', 'is', 'T']],
      columns: [
        search.createColumn({
          name: 'itemid',
          sort: search.Sort.ASC
        }),
        'internalid',
        'salesdescription',
        'type',
        'baseprice',
        'custitem_atlas_item_planner',
        'islotitem'
      ]
    });

    const searchResultCount = itemSearchObj.runPaged().count;

    return searchResultCount > 0;
  }

  return {
    afterSubmit
  };
});
