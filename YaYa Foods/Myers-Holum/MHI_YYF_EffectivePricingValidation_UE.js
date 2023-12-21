/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 */
define(['mapping', 'N/record', 'N/search', 'N/error', 'N/format', 'N/runtime', 'N/email', 'N/url', 'N/https'], (
  mapping, record, search, error, format, runtime, email, url, https
) => {
  const { ITEM, TRAN } = mapping;
  const { ITEM_PRICING, EMAIL_INFO } = mapping.CONST;
  const { INCOME_PLACEHOLDER } = mapping.CONST.ACCOUNT;
  const { SL_EFFECTIVE_PRICING } = mapping.SCRIPT;
  const { EFFECTIVE_SALES } = mapping.CUSTOM;

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
    const exeContext = runtime.executionContext;
    let logTitle = 'beforeSubmit_' + exeContext + '_' + event + '_' + recType;

    if (recObj.id) logTitle += '_' + recObj.id;

    try {
      log.debug(logTitle, '*** Start of Execution ***');

      if (event == 'delete') return;

      if (recType == 'assemblyitem' || recType == 'lotnumberedassemblyitem' || recType == 'serializedassemblyitem') {
        const incomeAccount = recObj.getValue({
          fieldId: 'incomeaccount'
        });
        const materialCostAccount = recObj.getValue({
          fieldId: ITEM.MATERIAL_COST_ACCOUNT
        });
        const materialHandAccount = recObj.getValue({
          fieldId: ITEM.MATERIAL_HAND_ACCOUNT
        });
        const coPackAccount = recObj.getValue({
          fieldId: ITEM.CO_PACK_ACCOUNT
        });

        if (incomeAccount != INCOME_PLACEHOLDER) return;

        const missingAccounts = [];

        if (!materialCostAccount) missingAccounts.push('Material Cost Account');
        if (!materialHandAccount) missingAccounts.push('Material Handling Account');
        if (!coPackAccount) missingAccounts.push('Co-Pack Account');

        if (missingAccounts.length > 0) {
          throw error.create({
            message: 'Please enter the following field values: ' + missingAccounts + '.',
            name: 'ITEM_VALIDATION'
          });
        }

        // Validating the Amount
        const itemBasePrice = getItemBasePrice(recObj, logTitle) || 0;
        const materialCost = parseFloat(recObj.getValue({
          fieldId: ITEM.MATERIAL_COST
        }) || 0);
        const materialHand = parseFloat(recObj.getValue({
          fieldId: ITEM.MATERIAL_HAND
        }) || 0);
        const coPack = parseFloat(recObj.getValue({
          fieldId: ITEM.CO_PACK
        }) || 0);
        const itemCostTotal = materialCost + materialHand + coPack;

        if (itemBasePrice.toFixed(2) != itemCostTotal.toFixed(2)) {
          throw error.create({
            message: 'Base Price is not equal to the sum of Material Cost, Material Handling, and Co-Pack',
            name: 'ITEM_VALIDATION'
          });
        }

        const missingDates = [];

        const startDate = recObj.getValue({
          fieldId: ITEM.START_DATE
        });
        const endDate = recObj.getValue({
          fieldId: ITEM.END_DATE
        });

        if (!startDate) missingDates.push('Start Date');
        if (!endDate) missingDates.push('End Date');

        if (missingDates.length > 0 && (materialCost || materialHand || coPack)) {
          throw error.create({
            message: 'Please enter the following field values: ' + missingDates + '.',
            name: 'ITEM_VALIDATION'
          });
        }

        if (startDate) {
          if (startDate > endDate) {
            throw error.create({
              message: 'Start Date should not be greater than End Date.',
              name: 'ITEM_VALIDATION'
            });
          }
        }
      }

      const warningMessages = [];
      if (recType == 'salesorder' || recType == 'invoice' || recType == 'creditmemo') {
        const createdFrom = recObj.getValue({
          fieldId: 'createdfrom'
        });
        const tranDate = recObj.getValue({
          fieldId: 'trandate'
        });
        const fTranDate = format.format({
          value: tranDate,
          type: format.Type.DATE
        });
        const count = recObj.getLineCount({
          sublistId: 'item'
        });

        // GET ALL ITEMS
        const arrItems = [];
        for (let i = 0; i < count; i += 1) {
          const lineItem = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            line: i
          });
          if (arrItems.indexOf(lineItem) == -1) arrItems.push(lineItem);
        }

        log.debug(logTitle, 'arrItems=' + JSON.stringify(arrItems));

        if (arrItems.length == 0) return;

        // GET VALID ITEMS AND ITEMS WITHIN DATE RANGE
        const returnItems = accessSuitelet({ action: 'VALIDATE_ITEM_LIST', itemList: arrItems.toString(), tranDate: fTranDate });
        log.debug(logTitle, 'returnItems=' + JSON.stringify(returnItems));

        const validItems = returnItems.validItems || [];
        const withinRangeItems = returnItems.withinRangeItems || [];
        log.debug(logTitle, 'validItems=' + JSON.stringify(validItems));
        log.debug(logTitle, 'withinRangeItems=' + JSON.stringify(withinRangeItems));

        if (validItems.length == 0) return;

        // EVALUATE TRANSACTION ITEMS
        for (let i = 0; i < count; i += 1) {
          const lineItem = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            line: i
          });

          if (validItems.indexOf(lineItem) == -1) continue;

          const lineAmount = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'amount',
            line: i
          }) || 0;
          const lineMatCost = parseFloat(recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.TOTAL_MATCOST,
            line: i
          }) || 0);
          const lineMatHandling = parseFloat(recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.TOTAL_MATHAND,
            line: i
          }) || 0);
          const lineCoPack = parseFloat(recObj.getSublistValue({
            sublistId: 'item',
            fieldId: TRAN.TOTAL_COPACK,
            line: i
          }) || 0);
          const lineRate = recObj.getSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            line: i
          }) || 0;
          const lineCostTotal = lineMatCost + lineMatHandling + lineCoPack;
          const logObj = {
            lineAmount, lineMatCost, lineMatHandling, lineCoPack, lineRate, lineCostTotal
          };
          log.debug(logTitle + ' - ' + i, logObj);

          if (lineAmount.toFixed(2) != lineCostTotal.toFixed(2)) {
            throw error.create({
              message: 'Line Amount is not equal to the sum of Total Material Cost, Total Material Handling Cost, and Total Co-Pack Price',
              name: 'TRANSACTION_VALIDATION_LINE_' + (i + 1)
            });
          }

          if (!createdFrom && (lineRate == 0 || withinRangeItems.indexOf(lineItem) == -1)) {
            warningMessages.push(error.create({
              message: 'The item does not have an active price ($0).',
              name: 'TRANSACTION_VALIDATION_LINE_' + (i + 1)
            }));
          }

          if (!createdFrom && event == 'create' && withinRangeItems.indexOf(lineItem) == -1) {
            recObj.setSublistValue({
              sublistId: 'item',
              fieldId: 'rate',
              line: i,
              value: 0
            });
            recObj.setSublistValue({
              sublistId: 'item',
              fieldId: TRAN.MATCOST,
              line: i,
              value: 0
            });
            recObj.setSublistValue({
              sublistId: 'item',
              fieldId: TRAN.MATHAND,
              line: i,
              value: 0
            });
            recObj.setSublistValue({
              sublistId: 'item',
              fieldId: TRAN.COPACK,
              line: i,
              value: 0
            });
          }
        }

        log.debug(logTitle, 'warningMessages found: ' + warningMessages.length);
      }

      if (warningMessages.length > 0 && recType != 'salesorder' && recType != 'workorder') {
        let bodyStr = '\n';
        bodyStr += 'User: ' + runtime.getCurrentUser().name;
        bodyStr += '<br/>';
        bodyStr += 'Context: ' + exeContext + ' (' + event + ')';
        if (event == 'edit') {
          bodyStr += '<br/>';
          bodyStr += 'Record ID: ' + recObj.id;
        }

        bodyStr += '<br/><br/>';
        bodyStr += 'The following are warning messages on the transaction:';
        bodyStr += '<ul>';
        for (let i = 0; i < warningMessages.length; i += 1) {
          const { name, message } = warningMessages[i];
          bodyStr += '<li>' + name + ' : ' + message + '</li>';
        }

        bodyStr += '</ul>';
        bodyStr += '\n';

        // email.send({
        //   author: EMAIL_INFO.SENDER,
        //   body: bodyStr,
        //   recipients: EMAIL_INFO.RECEIVER,
        //   subject: 'Warning Messages on ' + recType.toUpperCase()
        // });
        // log.debug(logTitle, 'An email notification has been sent.');
      }

      if (recType == EFFECTIVE_SALES.TYPE) {
        const materialCost = parseFloat(recObj.getValue({ fieldId: EFFECTIVE_SALES.MAT_COST }) || 0);
        const materialHandling = parseFloat(recObj.getValue({ fieldId: EFFECTIVE_SALES.MAT_HAND }) || 0);
        const coPack = parseFloat(recObj.getValue({ fieldId: EFFECTIVE_SALES.CO_PACK }) || 0);
        const basePrice = parseFloat(recObj.getValue({ fieldId: EFFECTIVE_SALES.BASE_PRICE }) || 0);

        const costTotal = materialCost + materialHandling + coPack;
        log.debug(logTitle, 'costTotal=' + costTotal + ' basePrice=' + basePrice);

        if (costTotal.toFixed(2) != basePrice.toFixed(2)) {
          throw error.create({
            message: 'Base Price is not equal to the sum of Material Cost, Material Handling, and Co-Pack',
            name: 'EFFECTIVE_SALES_VALIDATION'
          });
        }

        const startDate = recObj.getValue({ fieldId: EFFECTIVE_SALES.START });
        const endDate = recObj.getValue({ fieldId: EFFECTIVE_SALES.END });
        log.debug(logTitle, 'startDate=' + startDate + ' endDate=' + endDate);

        if (startDate > endDate) {
          throw error.create({
            message: 'Start Date should not be greater than End Date.',
            name: 'EFFECTIVE_SALES_VALIDATION'
          });
        }

        const strStart = formatMMDDYYYY(startDate) || '';
        const strEnd = formatMMDDYYYY(endDate) || '';
        log.debug(logTitle, 'strStart=' + strStart + ' strEnd=' + strEnd);

        // CHECK FOR OVERLAP - This is not yet working so we'll comment it for now.
        const itemId = recObj.getValue({ fieldId: EFFECTIVE_SALES.ITEM }) || '';
        const currency = recObj.getValue({ fieldId: EFFECTIVE_SALES.CURRENCY }) || '';

        if (itemId && strStart && strEnd && currency) {
          const params = {
            action: 'CHECK_FOR_OVERLAP', id: '', item: itemId, start: strStart, end: strEnd, currency
          };
          if (recObj.id) params.id = recObj.id;
          log.debug(logTitle, 'params=' + JSON.stringify(params));
          const hasOverlapDates = accessSuitelet(params);
          log.debug(logTitle, 'hasOverlapDates=' + hasOverlapDates);

          if (hasOverlapDates) {
            throw error.create({
              message: 'Please change the Start Date and End Date as they overlap with an Effective Date Pricing (Sales) entry.',
              name: 'EFFECTIVE_SALES_VALIDATION'
            });
          }
        }
      }
    } catch (errorLog) {
      log.error(logTitle, errorLog);
      throw errorLog.name + ' : ' + errorLog.message;
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
    const recObj = context.newRecord;
    const recType = recObj.type;
    const event = context.type;
    const exeContext = runtime.executionContext;
    const logTitle = 'afterSubmit_' + exeContext + '_' + event + '_' + recType + '_' + recObj.id;

    try {
      log.debug(logTitle, '*** Start of Execution ***');

      if (event == 'delete') return;

      let addtlInfo = '';
      const warningMessages = [];

      if (recType == 'workorder') {
        const tranObj = record.load({
          type: recType,
          id: recObj.id,
          isDynamic: true
        });
        const assemblyItem = tranObj.getValue({
          fieldId: 'assemblyitem'
        });
        const prodStartDate = tranObj.getValue({
          fieldId: 'startdate'
        });
        log.debug(logTitle, 'prodStartDate=' + prodStartDate);

        const STR = 'CASE WHEN TO_DATE(\'' + formatMMDDYYYY(prodStartDate) + '\', \'mm/dd/yyyy\') >= TO_DATE(TO_CHAR({' + ITEM.START_DATE + '}, \'mm/dd/yyyy\'), \'mm/dd/yyyy\') '
        + 'AND TO_DATE(\'' + formatMMDDYYYY(prodStartDate) + '\', \'mm/dd/yyyy\') <= TO_DATE(TO_CHAR({' + ITEM.END_DATE + '}, \'mm/dd/yyyy\'), \'mm/dd/yyyy\') THEN 1 ELSE 0 END';

        const searchObj = search.create({
          type: search.Type.ITEM,
          filters: [
            ['internalid', 'anyof', assemblyItem]
          ],
          columns: [
            search.createColumn({
              name: 'incomeaccount'
            }),
            search.createColumn({
              name: 'formulanumeric',
              formula: STR
            })
          ]
        });
        const resultSet = searchObj.run().getRange({
          start: 0,
          end: 1
        });
        log.debug(logTitle, STR);
        log.debug(logTitle, 'result=' + JSON.stringify(resultSet[0]));

        const incomeAccount = parseFloat(resultSet[0].getValue({
          name: 'incomeaccount'
        })) || 0;
        log.debug(logTitle, 'incomeAccount=' + incomeAccount);

        if (incomeAccount == INCOME_PLACEHOLDER) {
          const isWithinRange = parseFloat(resultSet[0].getValue({
            name: 'formulanumeric'
          })) || 0;
          const itemRecordType = resultSet[0].recordType;
          const itemObj = record.load({
            type: itemRecordType,
            id: assemblyItem
          });
          const itemBasePrice = getItemBasePrice(itemObj, logTitle) || 0;
          log.debug(logTitle, 'itemBasePrice=' + itemBasePrice + ' isWithinRange=' + isWithinRange);

          if (itemBasePrice == 0 || !isWithinRange) {
            warningMessages.push(error.create({
              message: 'There is no active price ($0) for this item on the planned production start date.',
              name: 'TRANSACTION_VALIDATION'
            }));
          }

          addtlInfo += '<br/><br/>';
          addtlInfo += '<b>Work Order#</b> ' + (tranObj.getValue({ fieldId: 'tranid' }) || '') + '<br/>';
          addtlInfo += '<b>Transaction Date:</b> ' + (tranObj.getText({ fieldId: 'trandate' }) || '') + '<br/>';
          addtlInfo += '<b>Item Number (Assembly Item):</b> ' + (tranObj.getText({ fieldId: 'assemblyitem' }) || '') + '<br/>';
          addtlInfo += '<b>Production Start Date:</b> ' + (tranObj.getText({ fieldId: 'startdate' }) || '') + '<br/>';
          addtlInfo += '<b>Production End Date:</b> ' + (tranObj.getText({ fieldId: 'enddate' }) || '') + '<br/>';
          addtlInfo += '<b>Created By:</b> ' + (findCreator(recType, tranObj.id));
        }

        if (warningMessages.length > 0) {
          let bodyStr = '\n';
          bodyStr += 'User: ' + runtime.getCurrentUser().name;
          bodyStr += '<br/>';
          bodyStr += 'Context: ' + exeContext + ' (' + event + ')';
          bodyStr += '<br/>';
          bodyStr += 'Record ID: ' + recObj.id;

          bodyStr += addtlInfo;
          bodyStr += '<br/><br/>';
          bodyStr += 'The following are warning messages on the transaction:';
          bodyStr += '<ul>';
          for (let i = 0; i < warningMessages.length; i += 1) {
            const { name, message } = warningMessages[i];
            bodyStr += '<li>' + name + ' : ' + message + '</li>';
          }

          bodyStr += '</ul>';
          bodyStr += '\n';

          // email.send({
          //   author: EMAIL_INFO.SENDER,
          //   body: bodyStr,
          //   recipients: EMAIL_INFO.RECEIVER,
          //   subject: 'Warning Messages on ' + recType.toUpperCase()
          // });
          // log.debug(logTitle, 'An email notification has been sent.');
        }
      }
    } catch (errorLog) {
      log.error(logTitle, errorLog);
    }
  };

  function getItemBasePrice(recObj, logTitle) {
    const pricingCAD = recObj.getLineCount({
      sublistId: ITEM_PRICING.CAD
    });
    const pricingUSD = recObj.getLineCount({
      sublistId: ITEM_PRICING.USD
    });
    const pricingEURO = recObj.getLineCount({
      sublistId: ITEM_PRICING.EURO
    });

    let itemBasePrice = 0;

    if (pricingCAD > -1) {
      const indexCAD = recObj.findSublistLineWithValue({
        sublistId: ITEM_PRICING.CAD,
        fieldId: 'pricelevel',
        value: 1
      });
      itemBasePrice = recObj.getSublistValue({
        sublistId: ITEM_PRICING.CAD,
        fieldId: 'price_1_',
        line: indexCAD
      }) || 0;
      log.debug(logTitle, 'CAD itemBasePrice=' + itemBasePrice);
    }

    if (pricingUSD > -1 && itemBasePrice == 0) {
      const indexUSD = recObj.findSublistLineWithValue({
        sublistId: ITEM_PRICING.USD,
        fieldId: 'pricelevel',
        value: 1
      });
      itemBasePrice = recObj.getSublistValue({
        sublistId: ITEM_PRICING.USD,
        fieldId: 'price_1_',
        line: indexUSD
      }) || 0;
      log.debug(logTitle, 'USD itemBasePrice=' + itemBasePrice);
    }

    if (pricingEURO > -1 && itemBasePrice == 0) {
      const indexEURO = recObj.findSublistLineWithValue({
        sublistId: ITEM_PRICING.EURO,
        fieldId: 'pricelevel',
        value: 1
      });
      itemBasePrice = recObj.getSublistValue({
        sublistId: ITEM_PRICING.EURO,
        fieldId: 'price_1_',
        line: indexEURO
      }) || 0;
      log.debug(logTitle, 'EURO itemBasePrice=' + itemBasePrice);
    }

    return itemBasePrice;
  }

  function accessSuitelet(PARAMS) {
    const scriptUrl = url.resolveScript({
      deploymentId: SL_EFFECTIVE_PRICING.DEP,
      scriptId: SL_EFFECTIVE_PRICING.ID,
      params: PARAMS,
      returnExternalUrl: true
    });
    const response = https.get({ url: scriptUrl });
    log.debug('accessSuitelet', response.body);
    const body = JSON.parse(response.body);

    if (body.error) {
      const errObj = body.error;
      throw errObj;
    } else {
      return body.result;
    }
  }

  function formatMMDDYYYY(objDate) {
    // var objDate = format.parse({ value: strDate, type: format.Type.DATE });
    const dd = objDate.getDate();
    const mm = objDate.getMonth() + 1;
    const yyyy = objDate.getFullYear();
    return mm + '/' + dd + '/' + yyyy;
  }

  function findCreator(recType, recId) {
    let strCreator = '';

    if (!recType || !recId) return strCreator;

    const searchObj = search.create({
      type: recType,
      filters: [
        ['internalid', 'anyof', recId],
        'AND',
        ['mainline', 'is', true],
        'AND',
        ['systemnotes.type', 'is', 'T']
      ],
      columns: [
        search.createColumn({
          name: 'name',
          join: 'systemNotes'
        })
      ]
    });
    const resultSet = searchObj.run().getRange({
      start: 0,
      end: 1
    });

    if (resultSet.length > 0) {
      strCreator = resultSet[0].getText({
        name: 'name',
        join: 'systemNotes'
      });
    }

    return strCreator;
  }

  return {
    beforeSubmit,
    afterSubmit
  };
});
