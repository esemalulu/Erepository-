/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 * @author Ards Bautista
 * @overview The script
 */
define(['mapping', 'N/record', 'N/search', 'N/format', 'N/runtime', 'N/email'], (mapping, record, search, format, runtime, email) => {
  const { ITEM, SEARCH, SCRIPT } = mapping;
  const { ITEM_PRICING } = mapping.CONST;
  const { EFFECTIVE_SALES } = mapping.CUSTOM;

  /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
  const getInputData = () => {
    log.debug('getInputData', '*** Start of Execution ***');
    const searchId = runtime.getCurrentScript().getParameter({
      name: SCRIPT.MR_EFFECTIVE_PRICING.SEARCH
    });

    if (searchId) {
      return search.load({
        id: searchId // **FOR SCRIPT USE** MHI | YYF | Effective Date Pricing (Sales)
      });
    }
  };

  /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
  const map = (context) => {
    const itemId = context.key;
    const logTitle = 'map_' + itemId;
    const objData = JSON.parse(context.value);
    log.debug(logTitle, objData);

    objData.values.recordType = objData.recordType;

    const itemStartDate = objData.values[ITEM.START_DATE] || '';
    const itemEndDate = objData.values[ITEM.END_DATE] || '';
    const itemMatCost = parseFloat(objData.values[ITEM.MATERIAL_COST] || 0);
    const itemMatHand = parseFloat(objData.values[ITEM.MATERIAL_HAND] || 0);
    const itemCoPack = parseFloat(objData.values[ITEM.CO_PACK] || 0);
    const itemBasePrice = parseFloat(objData.values.baseprice || 0);

    const currency = objData.values[EFFECTIVE_SALES.CURRENCY + '.' + EFFECTIVE_SALES.ITEM.toUpperCase()].value;
    const startDate = objData.values[EFFECTIVE_SALES.START + '.' + EFFECTIVE_SALES.ITEM.toUpperCase()] || '';
    const endDate = objData.values[EFFECTIVE_SALES.END + '.' + EFFECTIVE_SALES.ITEM.toUpperCase()] || '';
    const materialCost = parseFloat(objData.values[EFFECTIVE_SALES.MAT_COST + '.' + EFFECTIVE_SALES.ITEM.toUpperCase()] || 0);
    const materialHand = parseFloat(objData.values[EFFECTIVE_SALES.MAT_HAND + '.' + EFFECTIVE_SALES.ITEM.toUpperCase()] || 0);
    const coPack = parseFloat(objData.values[EFFECTIVE_SALES.CO_PACK + '.' + EFFECTIVE_SALES.ITEM.toUpperCase()] || 0);
    const basePrice = parseFloat(objData.values[EFFECTIVE_SALES.BASE_PRICE + '.' + EFFECTIVE_SALES.ITEM.toUpperCase()] || 0);

    context.write({
      key: itemId,
      value: {
        item: {
          start: itemStartDate,
          end: itemEndDate,
          matcost: itemMatCost,
          mathand: itemMatHand,
          copack: itemCoPack,
          base: itemBasePrice
        },
        pricing: {
          currency,
          start: startDate,
          end: endDate,
          matcost: materialCost,
          mathand: materialHand,
          copack: coPack,
          base: basePrice
        },
        type: objData.recordType
      }
    });
  };

  /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
  const reduce = (context) => {
    const itemId = context.key;
    const logTitle = 'reduce_' + itemId;
    log.debug(logTitle, 'objData=' + JSON.stringify(context.values));

    const arrData = [];
    for (let i = 0; i < context.values.length; i += 1) {
      const objData = JSON.parse(context.values[i]);
      arrData.push(objData);
    }

    // const objData = JSON.parse(context.values[0]);
    log.debug(logTitle, 'arrData=' + JSON.stringify(arrData));

    const itemType = arrData[0].type;

    if (!itemId || !itemType) return;

    const recObj = record.load({
      type: itemType,
      id: itemId,
      isDynamic: false
    });
    const listCurrency = [];

    for (let i = 0; i < arrData.length; i += 1) {
      const itemInfo = arrData[i].item;
      const priceInfo = arrData[i].pricing;

      if (i == 0) {
        recObj.setValue({
          fieldId: ITEM.MATERIAL_COST,
          value: priceInfo.matcost || 0
        });
        recObj.setValue({
          fieldId: ITEM.MATERIAL_HAND,
          value: priceInfo.mathand || 0
        });
        recObj.setValue({
          fieldId: ITEM.CO_PACK,
          value: priceInfo.copack || 0
        });
        const dStartDate = format.parse({
          value: priceInfo.start,
          type: format.Type.DATE
        });
        const dEndDate = format.parse({
          value: priceInfo.end,
          type: format.Type.DATE
        });
        recObj.setValue({
          fieldId: ITEM.START_DATE,
          value: dStartDate || ''
        });
        recObj.setValue({
          fieldId: ITEM.END_DATE,
          value: dEndDate || ''
        });
      }

      const currencyId = priceInfo.currency;
      let pricingSublist = '';

      if (currencyId == 1) pricingSublist = ITEM_PRICING.CAD;
      else if (currencyId == 2) pricingSublist = ITEM_PRICING.USD;
      else if (currencyId == 4) pricingSublist = ITEM_PRICING.EURO;

      log.debug(logTitle, 'currencyId=' + currencyId + ' pricingSublist=' + pricingSublist);

      if (!pricingSublist) return;

      const indexLine = recObj.findSublistLineWithValue({
        sublistId: pricingSublist,
        fieldId: 'pricelevel',
        value: 1
      });
      recObj.setSublistValue({
        sublistId: pricingSublist,
        fieldId: 'price_1_',
        line: indexLine,
        value: priceInfo.base
      });

      listCurrency.push(currencyId);
    }

    recObj.save({
      disableTriggers: true,
      enableSourcing: true,
      ignoreMandatoryFields: true
    });

    log.audit(logTitle, 'Item has been updated with new prices.');

    context.write({
      key: itemId,
      value: listCurrency
    });
  };


  /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
  const summarize = (summary) => {
    const logTitle = 'summarize_';
    try {
      const errorReduce = [];
      summary.reduceSummary.errors.iterator().each((key, value) => {
        log.error(logTitle + 'errorReduce_' + key, value);
        errorReduce.push({
          stage: 'reduce',
          key,
          error: JSON.parse(value)
        });
        return true;
      });

      const success = [];
      summary.output.iterator().each((key, value) => {
        log.debug(logTitle + key, value);
        success.push({
          key,
          value
        });

        return true;
      });

      log.debug(logTitle + 'errorReduce', errorReduce);
      log.debug(logTitle + 'success', success);

      // let bodyStr = '';
      // if (success.length > 0) {
      //   bodyStr += '\n';
      //   bodyStr += 'The following are the successful records processed:';
      //   bodyStr += '<ul>';
      //   for (let i = 0; i < success.length; i += 1) {
      //     const { key, value } = success[i];
      //     bodyStr += '<li>ID: ' + key + ' - ' + value + '</li>';
      //   }

      //   bodyStr += '</ul>';
      //   bodyStr += '\n';
      // }

      // const bodyTable = organizeErrors(errorReduce);

      // if (bodyTable) bodyStr += ' The following are the errors during the script execution:';

      // bodyStr += '\n\n' + bodyTable;
      // const emailInfo = {
      //   subject: 'MHI | YYF | Effective Pricing | MR',
      //   body: bodyStr,
      //   user: runtime.getCurrentScript().getParameter({
      //     name: SCRIPT.MR_EFFECTIVE_PRICING.USER
      //   })
      // };

      // sendEmailNotification(logTitle, emailInfo);
    } catch (error) {
      log.error(logTitle, error);
    }
  };

  /**
   * This function organizes the array of errors into a string of table.
   * @param {Array} errorList - This contains a list of errors
   * @returns String
   */
  function organizeErrors(errorList) {
    let str = '';

    for (let i = 0; i < errorList.length; i += 1) {
      const data = errorList[i];
      str += '<tr>';
      str += '<td>' + data.stage + '</td>';
      str += '<td>' + data.key + '</td>';
      str += '<td>' + data.error.name + ': ' + data.error.message + '</td>';
      str += '</tr>';
    }

    if (errorList.length > 0) {
      str = `
          <style>
          table, th, td {
            border: 1px solid black;
            border-collapse: collapse
          }
          </style>
          <table>
            <tr>
              <th>STAGE</th>
              <th>KEY</th>
              <th>ERROR</th>
            </tr>`
            + str + `
          </table>
        `;
    }

    return str;
  }

  // This function sends an email notification to the user who ran the TC/PC Split
  function sendEmailNotification(logTitle, emailInfo) {
    log.debug('emailInfo', emailInfo);
    const { subject, body, user } = emailInfo;

    email.send({
      author: user,
      body,
      recipients: user,
      subject
    });
    log.debug(logTitle, 'An email notification has been sent successfully.');
  }

  return {
    getInputData,
    map,
    reduce,
    summarize
  };
});
