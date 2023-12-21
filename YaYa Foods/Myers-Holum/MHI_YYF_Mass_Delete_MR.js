/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define([
  'N/record',
  'N/search',
  'N/runtime',
  'N/file',
  'N/transaction',
  'N/log',
  'N/url',
  'N/format'
], (record, search, runtime, file, transaction, log, url, format) => {
  function getInputData() {
    return search.load('customsearch2089');
  }

  function map(context) {
    const searchResults = JSON.parse(context.value);
    log.debug('searchResults', searchResults);

    const recId = searchResults.values.internalid.value;
    const lineId = searchResults.values.line;
    context.write({
      key: recId,
      value: {
        recId,
        lineId
      }
    });
  }

  function reduce(context) {
    try {
      const recId = context.key;
      log.debug(' recId', recId);

      log.debug(' Reduce .values', context.values);

      const invAdjRec = record.load({
        type: 'inventoryadjustment',
        id: recId
      });

      const deleteLines = context.values;

      const invAdjLineCount = invAdjRec.getLineCount('inventory');

      if (deleteLines.length == invAdjLineCount) {
        record.delete({
          type: 'inventoryadjustment',
          id: recId
        });
      } else {
        for (let i = deleteLines.length - 1; i >= 0; i -= 1) {
          const lineDetail = JSON.parse(deleteLines[i]);
          const { lineId } = lineDetail;
          const index = invAdjRec.findSublistLineWithValue('inventory', 'line', lineId);

          if (index != -1) {
            invAdjRec.removeLine('inventory', index);
          }
        }

        invAdjRec.save({
          ignoreMandatoryFields: true
        });
      }
    } catch (e) {
      log.error('Error', e);
    }
  }

  function summarize(summary) {}

  return {
    getInputData,
    map,
    reduce,
    summarize
  };
});
