/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 */
define(['mapping', 'N/ui/serverWidget', 'N/record', 'N/search', 'N/error', 'N/format'], (mapping, serverWidget, record, search, error, format) => {
  const { ITEM } = mapping;
  const { INCOME_PLACEHOLDER } = mapping.CONST.ACCOUNT;
  const { EFFECTIVE_SALES } = mapping.CUSTOM;

  /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
  const onRequest = (context) => {
    const { request } = context;
    const { response } = context;
    let logTitle = '';
    try {
      const params = request.parameters;
      logTitle = params.action;
      log.debug(logTitle, 'params=' + JSON.stringify(params));
      let strReturn = '';

      if (params.action == 'ASSESS_ITEM') {
        const { item } = params;

        if (!item) strReturn = false;
        else {
          const itemInfo = search.lookupFields({
            type: search.Type.ITEM,
            id: item,
            columns: ['incomeaccount']
          });
          const incomeAccount = itemInfo.incomeaccount;

          strReturn = incomeAccount.length > 0 ? incomeAccount[0].value == INCOME_PLACEHOLDER : false;
        }
      }

      if (params.action == 'WITHIN_RANGE') {
        const { item, tranDate } = params;
        const withinRangeItems = getWithinRangeItems(item, tranDate);

        strReturn = withinRangeItems.length > 0;
      }

      if (params.action == 'VALIDATE_ITEM_LIST') {
        const returnItems = { validItems: [], withinRangeItems: [] };
        const { tranDate } = params;
        let { itemList } = params;
        itemList = itemList.split(',');

        log.debug(logTitle, itemList);

        if (itemList.length == 0) strReturn = returnItems;
        else {
          returnItems.validItems = getValidItems(itemList);

          if (returnItems.validItems.length > 0) {
            returnItems.withinRangeItems = getWithinRangeItems(returnItems.validItems, tranDate);
          }

          strReturn = returnItems;
        }
      }

      if (params.action == 'CHECK_FOR_OVERLAP') {
        const {
          id, item, start, end, currency
        } = params;

        if (!item || !start || !end || !currency) return;

        log.debug(logTitle, start + ' - ' + end + ' typeof ' + typeof start);

        let strFormula = 'CASE WHEN ({custrecord_yaya_startdate} >= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') ';
        strFormula += 'AND {custrecord_yaya_startdate} <= TO_DATE(\'' + end + '\', \'mm/dd/yyyy\')) ';
        strFormula += 'OR ({custrecord_yaya_enddate} >= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') ';
        strFormula += 'AND {custrecord_yaya_enddate} <= TO_DATE(\'' + end + '\', \'mm/dd/yyyy\')) ';
        strFormula += 'OR ({custrecord_yaya_startdate} <= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') ';
        strFormula += 'AND {custrecord_yaya_enddate} >= TO_DATE(\'' + end + '\', \'mm/dd/yyyy\')) ';
        strFormula += 'OR ({custrecord_yaya_startdate} >= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') ';
        strFormula += 'AND {custrecord_yaya_enddate} <= TO_DATE(\'' + end + '\', \'mm/dd/yyyy\')) ';
        strFormula += 'THEN 1 ELSE 0 END';

        log.debug(logTitle, strFormula);

        const searchSales = search.create({
          type: EFFECTIVE_SALES.TYPE,
          filters: [
            [EFFECTIVE_SALES.ITEM, 'anyof', item],
            'AND',
            [EFFECTIVE_SALES.CURRENCY, 'anyof', currency],
            'AND',
            ['formulanumeric: ' + strFormula, 'equalto', 1]
          ],
          columns: []
        });

        if (id) {
          searchSales.filters.push(search.createFilter({
            name: 'internalid',
            operator: 'noneof',
            values: id
          }));
        }

        log.debug('searchSales', searchSales);
        log.debug('searchSales', searchSales.filterExpression);

        const resultSales = searchSales.run().getRange({
          start: 0,
          end: 1000
        });
        log.debug(logTitle, resultSales);

        strReturn = resultSales.length > 0;
      }

      log.debug(logTitle, 'strReturn=' + JSON.stringify(strReturn));
      response.write(JSON.stringify({ result: strReturn }));
    } catch (errorLog) {
      log.error(logTitle, errorLog);
      response.write(JSON.stringify({ error: errorLog }));
    }
  };

  function getValidItems(itemList) {
    const validList = [];
    const searchObj = search.create({
      type: search.Type.ITEM,
      filters: [
        ['internalid', 'anyof', itemList]
      ],
      columns: ['incomeaccount']
    });
    const resultSet = searchObj.run().getRange({
      start: 0,
      end: 1000
    });

    for (let i = 0; i < resultSet.length; i += 1) {
      const incomeAccount = resultSet[i].getValue({
        name: 'incomeaccount'
      });

      if (incomeAccount == INCOME_PLACEHOLDER) validList.push(resultSet[i].id);
    }

    return validList;
  }

  function getWithinRangeItems(itemList, tranDate) {
    const withinRangeList = [];
    const searchObj = search.create({
      type: search.Type.ITEM,
      filters: [
        ['internalid', 'anyof', itemList],
        'AND',
        [ITEM.START_DATE, 'onorbefore', tranDate],
        'AND',
        [ITEM.END_DATE, 'onorafter', tranDate]
      ]
    });
    const resultSet = searchObj.run().getRange({
      start: 0,
      end: 1000
    });

    for (let i = 0; i < resultSet.length; i += 1) {
      const itemId = resultSet[i].id;
      if (withinRangeList.indexOf(itemId) == -1) withinRangeList.push(itemId);
    }

    return withinRangeList;
  }

  return {
    onRequest
  };
});
