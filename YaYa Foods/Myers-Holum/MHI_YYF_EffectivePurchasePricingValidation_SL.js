/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 */
define(['mapping', 'N/ui/serverWidget', 'N/record', 'N/search', 'N/error', 'N/format'], (mapping, serverWidget, record, search, error, format) => {
  const { EFFECTIVE_PURCH } = mapping.CUSTOM;

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

      if (params.action == 'ASSESS_LINE') {
        const {
          item, vendor, currency, date, uom, qty
        } = params;

        if (!item || !vendor || !currency || !date || !uom) strReturn = false;
        else {
          const dDate = format.parse({
            value: date, // yyyy-mm-dd
            type: format.Type.DATE
          });
          const strDate = dDate.getFullYear() + '-' + appendZero(dDate.getMonth() + 1) + '-' + appendZero(dDate.getDate());
          let strFormula = 'CASE WHEN {' + EFFECTIVE_PURCH.END + '} IS NULL THEN 1 ';
          strFormula += 'WHEN {' + EFFECTIVE_PURCH.END + '} IS NOT NULL AND {' + EFFECTIVE_PURCH.END + '} >= TO_DATE(\'' + strDate + '\', \'yyyy-mm-dd\') THEN 1 ';
          strFormula += 'ELSE 0 END';

          const searchObj = search.create({
            type: EFFECTIVE_PURCH.TYPE,
            filters: [
              [EFFECTIVE_PURCH.VENDOR, 'anyof', vendor],
              'AND',
              [EFFECTIVE_PURCH.ITEM, 'anyof', item],
              'AND',
              [EFFECTIVE_PURCH.CURRENCY, 'anyof', currency],
              'AND',
              [EFFECTIVE_PURCH.UOM, 'anyof', uom],
              'AND',
              [EFFECTIVE_PURCH.START, 'onorbefore', date]
              // 'AND',
              // [EFFECTIVE_PURCH.TIER_QTY, 'greaterthanorequalto', qty]
            ],
            columns: [
              search.createColumn({
                name: EFFECTIVE_PURCH.TIER_QTY,
                sort: search.Sort.DESC
              }),
              EFFECTIVE_PURCH.UNIT_COST,
              search.createColumn({
                name: EFFECTIVE_PURCH.END,
                sort: search.Sort.DESC
              }),
              search.createColumn({
                name: 'formulanumeric',
                formula: strFormula
              })
            ]
          });
          log.debug(logTitle, 'searchObj=' + JSON.stringify(searchObj));
          const resultSet = searchObj.run().getRange({
            start: 0,
            end: 1000
          });
          log.debug(logTitle, 'resultSet=' + JSON.stringify(resultSet));

          const objInfo = {};

          if (resultSet.length > 0) objInfo.hasOtherRef = true;

          for (let i = 0; i < resultSet.length; i += 1) {
            const tierQty = parseFloat(resultSet[i].getValue({ name: EFFECTIVE_PURCH.TIER_QTY }) || 0);
            const unitCost = resultSet[i].getValue({ name: EFFECTIVE_PURCH.UNIT_COST }) || 0;
            const validRange = resultSet[i].getValue({ name: 'formulanumeric' });

            log.debug(logTitle, i + ' validRange=' + validRange + ' tierQty=' + tierQty + ' qty=' + qty);
            if (validRange == 1 && qty >= tierQty) {
              objInfo.cost = parseFloat(unitCost);
              objInfo.qty = parseFloat(tierQty);
              objInfo.ref = resultSet[i].id;
              break;
            }
          }

          if (!objInfo.ref) objInfo.cost = 0;
          log.debug(logTitle, 'objInfo=' + JSON.stringify(objInfo));
          strReturn = JSON.stringify(objInfo);
        }
      }

      if (params.action == 'ASSESS_LIST') {
        const { vendor, currency, date } = params;

        const list = JSON.parse(params.list);
        const arrItems = Object.keys(list);
        const arrUnits = Object.values(list).reduce((grp, obj) => grp.concat(Object.keys(obj)), []);

        if (arrItems.length == 0 || !vendor || !currency || !date) strReturn = false;
        else {
          const dDate = format.parse({
            value: date, // yyyy-mm-dd
            type: format.Type.DATE
          });
          const strDate = dDate.getFullYear() + '-' + appendZero(dDate.getMonth() + 1) + '-' + appendZero(dDate.getDate());
          let strFormula = 'CASE WHEN {' + EFFECTIVE_PURCH.END + '} IS NULL THEN 1 ';
          strFormula += 'WHEN {' + EFFECTIVE_PURCH.END + '} IS NOT NULL AND {' + EFFECTIVE_PURCH.END + '} >= TO_DATE(\'' + strDate + '\', \'yyyy-mm-dd\') THEN 1 ';
          strFormula += 'ELSE 0 END';

          const searchObj = search.create({
            type: EFFECTIVE_PURCH.TYPE,
            filters: [
              [EFFECTIVE_PURCH.VENDOR, 'anyof', vendor],
              'AND',
              [EFFECTIVE_PURCH.ITEM, 'anyof', arrItems],
              'AND',
              [EFFECTIVE_PURCH.CURRENCY, 'anyof', currency],
              'AND',
              [EFFECTIVE_PURCH.UOM, 'anyof', arrUnits],
              'AND',
              [EFFECTIVE_PURCH.START, 'onorbefore', date]
            ],
            columns: [
              search.createColumn({
                name: EFFECTIVE_PURCH.TIER_QTY,
                sort: search.Sort.DESC
              }),
              search.createColumn({
                name: EFFECTIVE_PURCH.END,
                sort: search.Sort.DESC
              }),
              EFFECTIVE_PURCH.ITEM,
              EFFECTIVE_PURCH.UOM,
              EFFECTIVE_PURCH.UNIT_COST,
              search.createColumn({
                name: 'formulanumeric',
                formula: strFormula
              })
            ]
          });
          log.debug(logTitle, 'searchObj=' + JSON.stringify(searchObj));
          const resultSet = searchObj.run().getRange({
            start: 0,
            end: 1000
          });
          log.debug(logTitle, 'resultSet=' + JSON.stringify(resultSet));

          const objInfo = {};
          for (let i = 0; i < resultSet.length; i += 1) {
            const itemId = resultSet[i].getValue({ name: EFFECTIVE_PURCH.ITEM });
            const unitId = resultSet[i].getValue({ name: EFFECTIVE_PURCH.UOM });
            const tierQty = parseFloat(resultSet[i].getValue({ name: EFFECTIVE_PURCH.TIER_QTY }) || 0);
            const unitCost = resultSet[i].getValue({ name: EFFECTIVE_PURCH.UNIT_COST }) || 0;
            const validRange = resultSet[i].getValue({ name: 'formulanumeric' });

            log.debug(logTitle, i + ' validRange=' + validRange + ' tierQty=' + tierQty + ' qty=' + list[itemId][unitId]);
            if (validRange == 1) {
              if (list[itemId] && list[itemId][unitId]) {
                if (!objInfo[itemId]) objInfo[itemId] = {};
                if (!objInfo[itemId][unitId]) objInfo[itemId][unitId] = { cost: 0, ref: '' };

                if (list[itemId][unitId] >= tierQty) {
                  objInfo[itemId][unitId] = { cost: parseFloat(unitCost), ref: resultSet[i].id };
                  break;
                }
              }
            }
          }

          log.debug(logTitle, 'objInfo=' + JSON.stringify(objInfo));
          strReturn = JSON.stringify(objInfo);
        }
      }

      if (params.action == 'CHECK_FOR_OVERLAP_DUPLICATE') {
        const {
          id, vendor, item, currency, unit, qty, start, end, cost
        } = params;

        if (!vendor || !item || !currency || !unit || !qty || !start || !cost) {
          throw error.create({
            message: 'Please populate all mandatory fields.',
            name: 'MISSING_PARAMETER'
          });
        }

        log.debug(logTitle, start + ' - ' + end + ' typeof ' + typeof start);

        let strFormula = '';

        if (!end) { // Has No End Date entered
          strFormula += 'CASE WHEN (({custrecord_yaya_eff_purch_enddate} IS NOT NULL AND {custrecord_yaya_eff_purch_startdate} <= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') AND {custrecord_yaya_eff_purch_enddate} >= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\')) ';
          strFormula += 'OR ({custrecord_yaya_eff_purch_enddate} IS NULL AND ({custrecord_yaya_eff_purch_startdate} >= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') OR {custrecord_yaya_eff_purch_startdate} <= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\'))) ';
          strFormula += ') THEN 1 ELSE 0 END';
        } else { // Has an End Date entered
          strFormula += 'CASE WHEN (({custrecord_yaya_eff_purch_enddate} IS NOT NULL AND {custrecord_yaya_eff_purch_startdate} >= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') AND {custrecord_yaya_eff_purch_startdate} <= TO_DATE(\'' + end + '\', \'mm/dd/yyyy\')) ';
          strFormula += 'OR ({custrecord_yaya_eff_purch_enddate} IS NOT NULL AND {custrecord_yaya_eff_purch_enddate} >= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') AND {custrecord_yaya_eff_purch_enddate} <= TO_DATE(\'' + end + '\', \'mm/dd/yyyy\')) ';
          strFormula += 'OR ({custrecord_yaya_eff_purch_enddate} IS NOT NULL AND {custrecord_yaya_eff_purch_startdate} <= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') AND {custrecord_yaya_eff_purch_enddate} >= TO_DATE(\'' + end + '\', \'mm/dd/yyyy\')) ';
          strFormula += 'OR ({custrecord_yaya_eff_purch_enddate} IS NOT NULL AND {custrecord_yaya_eff_purch_startdate} >= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') AND {custrecord_yaya_eff_purch_enddate} <= TO_DATE(\'' + end + '\', \'mm/dd/yyyy\')) ';
          strFormula += 'OR ({custrecord_yaya_eff_purch_enddate} IS NULL AND ({custrecord_yaya_eff_purch_startdate} <= TO_DATE(\'' + start + '\', \'mm/dd/yyyy\') OR {custrecord_yaya_eff_purch_startdate} <= TO_DATE(\'' + end + '\', \'mm/dd/yyyy\'))) ';
          strFormula += ') THEN 1 ELSE 0 END';
        }

        log.debug(logTitle, strFormula);

        const searchPurch = search.create({
          type: EFFECTIVE_PURCH.TYPE,
          filters: [
            [EFFECTIVE_PURCH.VENDOR, 'anyof', vendor],
            'AND',
            [EFFECTIVE_PURCH.ITEM, 'anyof', item],
            'AND',
            [EFFECTIVE_PURCH.CURRENCY, 'anyof', currency],
            'AND',
            [EFFECTIVE_PURCH.UOM, 'anyof', unit],
            'AND',
            [EFFECTIVE_PURCH.TIER_QTY, 'equalto', qty],
            // 'AND',
            // [EFFECTIVE_PURCH.UNIT_COST, 'equalto', cost],
            'AND',
            ['formulanumeric: ' + strFormula, 'equalto', 1]
          ],
          columns: [
            search.createColumn({
              name: 'formulanumeric',
              formula: strFormula
            })
          ]
        });

        if (id) {
          searchPurch.filters.push(search.createFilter({
            name: 'internalid',
            operator: 'noneof',
            values: id
          }));
        }

        log.debug('searchPurch', searchPurch);
        log.debug('searchPurch', searchPurch.filterExpression);

        const resultPurch = searchPurch.run().getRange({
          start: 0,
          end: 1000
        });
        log.debug(logTitle, resultPurch);

        strReturn = resultPurch.length > 0;
      }

      log.debug(logTitle, 'strReturn=' + JSON.stringify(strReturn));
      response.write(JSON.stringify({ result: strReturn }));
    } catch (errorLog) {
      log.error(logTitle, errorLog);
      response.write(JSON.stringify({ error: errorLog }));
    }
  };

  function appendZero(val) {
    let num = val;
    if (num < 10) num = '0' + num;
    return num.toString();
  }

  return {
    onRequest
  };
});
