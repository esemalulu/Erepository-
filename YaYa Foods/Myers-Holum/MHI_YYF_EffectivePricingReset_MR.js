/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 * @author Ards Bautista
 * @overview The script retrieves all items which no longer has any active price
 * based on its Start Date and End Date. Supposedly, the item's date range fields
 * are regularly updated. Hence, if there's no more active price for the item,
 * its date range fields would be past the current date today.
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
      name: SCRIPT.MR_EFFECTIVE_RESET.SEARCH
    });

    if (searchId) {
      return search.load({
        id: searchId // **FOR SCRIPT USE** MHI | YYF | Effective Pricing End Date = TODAY
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
    const dateToday = objData.values.formuladate || '';

    log.debug(logTitle, dateToday);

    // Evaluates if there is an eligible custom record for TODAY
    const searchSales = search.create({
      type: EFFECTIVE_SALES.TYPE,
      filters: [
        ['isinactive', 'is', false],
        'AND',
        [EFFECTIVE_SALES.ITEM, 'anyof', itemId],
        'AND',
        [EFFECTIVE_SALES.START, 'onorbefore', dateToday],
        'AND',
        [EFFECTIVE_SALES.END, 'onorafter', dateToday]
      ],
      columns: [
        search.createColumn({
          name: EFFECTIVE_SALES.START,
          sort: 'ASC'
        }),
        search.createColumn({
          name: EFFECTIVE_SALES.END,
          sort: 'ASC'
        })
      ]
    });
    const resultSales = searchSales.run().getRange({
      start: 0,
      end: 1000
    });
    log.debug(logTitle, 'resultSales=' + JSON.stringify(resultSales));

    if (resultSales.length > 0) {
      log.audit(logTitle, 'There is a custom record available for an active price. ID=' + resultSales[0].id);
    } else {
      context.write({
        key: objData.id,
        value: objData.values
      });
    }
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
    const objData = JSON.parse(context.values[0]);
    log.debug(logTitle, 'objData=' + JSON.stringify(objData));

    const endDate = format.parse({
      value: objData[ITEM.END_DATE],
      type: format.Type.DATE
    });
    const today = new Date();

    if (endDate <= today) {
      const recObj = record.load({
        type: objData.recordType,
        id: itemId,
        isDynamic: false
      });

      recObj.setValue({
        fieldId: ITEM.MATERIAL_COST,
        value: 0
      });
      recObj.setValue({
        fieldId: ITEM.MATERIAL_HAND,
        value: 0
      });
      recObj.setValue({
        fieldId: ITEM.CO_PACK,
        value: 0
      });
      recObj.setValue({
        fieldId: ITEM.START_DATE,
        value: ''
      });
      recObj.setValue({
        fieldId: ITEM.END_DATE,
        value: ''
      });

      const pricingCAD = recObj.getLineCount({
        sublistId: ITEM_PRICING.CAD
      });
      const pricingUSD = recObj.getLineCount({
        sublistId: ITEM_PRICING.USD
      });
      const pricingEURO = recObj.getLineCount({
        sublistId: ITEM_PRICING.EURO
      });

      if (pricingCAD > -1) {
        const indexCAD = recObj.findSublistLineWithValue({
          sublistId: ITEM_PRICING.CAD,
          fieldId: 'pricelevel',
          value: 1
        });
        recObj.setSublistValue({
          sublistId: ITEM_PRICING.CAD,
          fieldId: 'price_1_',
          line: indexCAD,
          value: 0
        });
      }

      if (pricingUSD > -1) {
        const indexUSD = recObj.findSublistLineWithValue({
          sublistId: ITEM_PRICING.USD,
          fieldId: 'pricelevel',
          value: 1
        });
        recObj.setSublistValue({
          sublistId: ITEM_PRICING.USD,
          fieldId: 'price_1_',
          line: indexUSD,
          value: 0
        });
      }

      if (pricingEURO > -1) {
        const indexEURO = recObj.findSublistLineWithValue({
          sublistId: ITEM_PRICING.EURO,
          fieldId: 'pricelevel',
          value: 1
        });
        recObj.setSublistValue({
          sublistId: ITEM_PRICING.EURO,
          fieldId: 'price_1_',
          line: indexEURO,
          value: 0
        });
      }

      recObj.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });

      log.audit(logTitle, 'Item Prices have been set to 0.');

      context.write({
        key: itemId,
        value: objData.itemid
      });
    }
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
