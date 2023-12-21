/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 * @author Ards Bautista
 * @overview The script runs validation.
 */
define(['mapping', 'N/record', 'N/search', 'N/error', 'N/url', 'N/https'], (mapping, record, search, error, url, https) => {
  const { EFFECTIVE_PURCH } = mapping.CUSTOM;
  const { SL_EFFECTIVE_PURCHASE } = mapping.SCRIPT;

  /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {string} context.type - Trigger type
     * @param {Form} context.form - Current form
     * @Since 2015.2
     */
  const beforeLoad = (context) => {

  };

  /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     * @Since 2015.2
     */
  const beforeSubmit = (context) => {
    const recObj = context.newRecord;
    const recType = recObj.type;
    const event = context.type;

    let logTitle = 'beforeSubmit_' + recType + '_' + event + '_';

    if (recObj.id) logTitle += recObj.id;

    try {
      if (event != 'create' && event != 'edit') return;
      log.debug(logTitle, '*** Start of Execution ***');

      if (recType == EFFECTIVE_PURCH.TYPE) {
        const vendorId = recObj.getValue({ fieldId: EFFECTIVE_PURCH.VENDOR }) || '';
        const itemId = recObj.getValue({ fieldId: EFFECTIVE_PURCH.ITEM }) || '';
        const currencyId = recObj.getValue({ fieldId: EFFECTIVE_PURCH.CURRENCY }) || '';
        const unitId = recObj.getValue({ fieldId: EFFECTIVE_PURCH.UOM }) || '';
        const tierQty = recObj.getValue({ fieldId: EFFECTIVE_PURCH.TIER_QTY }) || '';
        const startDate = recObj.getValue({ fieldId: EFFECTIVE_PURCH.START }) || '';
        const endDate = recObj.getValue({ fieldId: EFFECTIVE_PURCH.END }) || '';
        const unitCost = recObj.getValue({ fieldId: EFFECTIVE_PURCH.UNIT_COST }) || '';

        if (event == 'edit' && endDate && new Date() > endDate) {
          throw error.create({
            message: 'The End Date has already passed. You cannot edit this record.',
            name: 'RECORD_CAN_NO_LONGER_BE_EDITED'
          });
        }

        log.debug(logTitle, 'startDate=' + startDate + ' endDate=' + endDate);

        if (endDate && startDate > endDate) {
          throw error.create({
            message: 'Start Date should not be greater than End Date.',
            name: 'INVALID_VALUE'
          });
        }

        const strStart = formatMMDDYYYY(startDate) || '';
        const strEnd = formatMMDDYYYY(endDate) || '';
        log.debug(logTitle, 'strStart=' + strStart + ' strEnd=' + strEnd);

        const params = {
          action: 'CHECK_FOR_OVERLAP_DUPLICATE',
          id: '',
          vendor: vendorId,
          item: itemId,
          currency: currencyId,
          unit: unitId,
          qty: tierQty,
          start: strStart,
          end: strEnd,
          cost: unitCost
        };

        if (recObj.id) params.id = recObj.id;

        log.debug(logTitle, 'params=' + JSON.stringify(params));
        const hasOverlapDates = accessSuitelet(params);
        log.debug(logTitle, 'hasOverlapDates=' + hasOverlapDates);

        if (hasOverlapDates) {
          throw error.create({
            message: 'Please change the Start Date and/or End Date as they overlap with an Effective Date Pricing (Purchase) entry.',
            name: 'INVALID_VALUE'
          });
        }
      }
    } catch (errorLog) {
      log.error(logTitle, errorLog);
      const errorDisplay = errorLog.name + ': ' + errorLog.message;
      throw errorDisplay;
    }
  };

  /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     * @Since 2015.2
     */
  const afterSubmit = (context) => {

  };

  function formatMMDDYYYY(dDate) {
    if (!dDate) return '';

    const yyyy = dDate.getFullYear();
    const mm = appendZero(dDate.getMonth() + 1);
    const dd = appendZero(dDate.getDate());

    const fDate = mm + '/' + dd + '/' + yyyy;

    return fDate;
  }

  function appendZero(val) {
    let num = val;
    if (num < 10) num = '0' + num;
    return num.toString();
  }

  function accessSuitelet(PARAMS) {
    const scriptUrl = url.resolveScript({
      deploymentId: SL_EFFECTIVE_PURCHASE.DEP,
      scriptId: SL_EFFECTIVE_PURCHASE.ID,
      params: PARAMS,
      returnExternalUrl: true
    });
    const response = https.get({ url: scriptUrl });
    log.debug('accessSuitelet', response.body);
    const body = JSON.parse(response.body);

    if (body.error) {
      throw body.error;
    }

    return body.result;
  }

  return {
    beforeLoad,
    beforeSubmit,
    afterSubmit
  };
});
