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
  'N/https'
], (record, search, runtime, file, transaction, log, url, https) => {
  const currentScript = runtime.getCurrentScript();
  function getInputData() {
    const searchId = currentScript.getParameter({
      name: 'custscript_mhi_yyf_bos_search'
    });
    return search.load({
      id: searchId
    });
  }

  function map(context) {
    const searchResults = JSON.parse(context.value);
    log.debug('searchResults', searchResults.values);

    try {
      const recId = searchResults.values['GROUP(internalid)'].value;
      const createdFrom = searchResults.values['GROUP(createdfrom)'].value;

      const paramObj = {};
      paramObj.recId = createdFrom;
      paramObj.ifId = recId;

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
    } catch (e) {
      log.error('error', e.message);
    }
  }

  function reduce(context) {}

  function summarize(summary) {}

  return {
    getInputData,
    map,
    reduce,
    summarize
  };
});
