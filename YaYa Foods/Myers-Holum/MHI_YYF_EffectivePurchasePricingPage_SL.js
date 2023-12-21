/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 */
define(['mapping', 'N/ui/serverWidget', 'N/record', 'N/search', 'N/error', 'N/format', 'N/runtime', 'N/url', 'N/https'], (
  mapping, serverWidget, record, search, error, format, runtime, url, https
) => {
  const pageLimit = 400;
  const { EFFECTIVE_PURCH } = mapping.CUSTOM;
  const { SL_PURCHASE_PRICE_TABLE } = mapping.SCRIPT;

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

    try {
      const params = request.parameters;
      params.method = request.method;
      const logTitle = request.method + ': ';
      log.debug(logTitle, '*** Start of Execution | ' + runtime.getCurrentScript().getRemainingUsage() + ' ***');
      log.debug(logTitle, 'params=' + JSON.stringify(params));
      if (request.method === 'GET') {
        // This loads the home page of the suitelet
        const mainForm = createFormObject('Effective Purchase Price Table', false);
        createHeader(mainForm, params);
        const mainSub = createTable(mainForm, params);
        const pagedData = retrieveData(params);
        const pageCount = Math.ceil(pagedData.count / pageLimit);
        log.debug('pageCount', pageCount);

        let pageId = parseFloat(params.custpage_pageid) || 0;
        if (pageId >= pageCount) pageId = pageCount - 1;

        log.debug(logTitle, 'pageId=' + pageId);
        createPagination(mainForm, pageId, pagedData);

        const resultSet = fetchSearchResult(pagedData, pageId);
        populateTable(mainSub, resultSet, {});
        mainSub.label = mainSub.label + ' (' + resultSet.length + ')';

        mainForm.addButton({
          id: 'custpage_btn_new',
          label: 'New Purchase Price',
          functionName: 'newPrice()'
        });
        mainForm.addSubmitButton({
          label: 'Update Lines'
        });
        response.writePage(mainForm);
      } else if (request.method == 'POST') {
        const subId = 'custpage_tbl_data';
        const count = request.getLineCount({
          group: subId
        });
        const lineInfo = {};

        log.debug(logTitle, runtime.getCurrentScript().getRemainingUsage());
        for (let i = 0; i < count; i += 1) {
          const isMarked = request.getSublistValue({
            group: subId,
            name: 'custpage_tbl_mark',
            line: i
          });

          if (isMarked != 'T') continue;

          const priceId = request.getSublistValue({
            group: subId,
            name: 'custpage_tbl_id',
            line: i
          });
          const vendorId = request.getSublistValue({
            group: subId,
            name: 'custpage_tbl_vendor',
            line: i
          }) || '';
          const itemId = request.getSublistValue({
            group: subId,
            name: 'custpage_tbl_item',
            line: i
          }) || '';
          const currencyId = request.getSublistValue({
            group: subId,
            name: 'custpage_tbl_currency',
            line: i
          }) || '';
          const uomId = request.getSublistValue({
            group: subId,
            name: 'custpage_tbl_uom',
            line: i
          }) || '';
          const tierQty = parseFloat(request.getSublistValue({
            group: subId,
            name: 'custpage_tbl_qty',
            line: i
          }) || 0);
          const startDate = request.getSublistValue({
            group: subId,
            name: 'custpage_tbl_startdate',
            line: i
          }) || '';
          const endDate = request.getSublistValue({
            group: subId,
            name: 'custpage_tbl_enddate',
            line: i
          }) || '';
          const unitCost = parseFloat(request.getSublistValue({
            group: subId,
            name: 'custpage_tbl_cost',
            line: i
          }) || 0);

          if (!lineInfo[priceId]) {
            lineInfo[priceId] = {
              vend: vendorId,
              item: itemId,
              curr: currencyId,
              uom: uomId,
              qty: tierQty,
              start: startDate,
              end: endDate,
              cost: unitCost
            };
            const objData = lineInfo[priceId];

            const priceInfo = {};
            // priceInfo[EFFECTIVE_PURCH.VENDOR] = objData.vend;
            // priceInfo[EFFECTIVE_PURCH.ITEM] = objData.item;
            priceInfo[EFFECTIVE_PURCH.CURRENCY] = objData.curr;
            priceInfo[EFFECTIVE_PURCH.UOM] = objData.uom;
            priceInfo[EFFECTIVE_PURCH.TIER_QTY] = objData.qty;
            priceInfo[EFFECTIVE_PURCH.START] = objData.start;
            priceInfo[EFFECTIVE_PURCH.END] = objData.end;
            priceInfo[EFFECTIVE_PURCH.UNIT_COST] = objData.cost;

            record.submitFields({
              type: EFFECTIVE_PURCH.TYPE,
              id: priceId,
              values: priceInfo
            });
            log.audit(logTitle + i, 'The price has been updated. ID=' + priceId + ' Remaining Usage=' + runtime.getCurrentScript().getRemainingUsage());
          }
        }

        log.debug(logTitle, 'lineInfo=' + JSON.stringify(lineInfo));
        const arrIds = Object.keys(lineInfo);

        const postForm = createFormObject('Effective Purchase Price Table - UPDATE', false);
        createHeader(postForm, params);
        const postSub = createTable(postForm, params);

        const pagedData = retrieveData(params);
        const pageCount = Math.ceil(pagedData.count / pageLimit);
        log.debug('pageCount', pageCount);

        let pageId = parseFloat(params.custpage_pageid) || 0;
        if (pageId >= pageCount) pageId = pageCount - 1;

        log.debug(logTitle, 'pageId=' + pageId);
        // createPagination(postForm, pageId, pagedData);

        const resultSet = fetchSearchResult(pagedData, pageId);
        populateTable(postSub, resultSet, { list: arrIds, method: request.method });
        postSub.label = postSub.label + ' (' + arrIds.length + ')';

        postForm.addField({
          id: 'custpage_message',
          label: 'The script has finished updating ' + Object.keys(lineInfo).length + ' prices.',
          type: serverWidget.FieldType.LABEL
        });
        // const scriptUrl = url.resolveScript({
        //   scriptId: SL_PURCHASE_PRICE_TABLE.ID,
        //   deploymentId: SL_PURCHASE_PRICE_TABLE.DEP,
        //   params: {}
        // });
        // postForm.addField({
        //   id: 'custpage_html',
        //   label: 'HTML',
        //   type: serverWidget.FieldType.INLINEHTML
        // }).defaultValue = '<script>setTimeout(function() { window.location.href = "' + scriptUrl + '"; }, 5000);</script>';
        addHomeButton(postForm);
        response.writePage(postForm);
      }
    } catch (errorLog) {
      log.error(request.method + '_ERROR', errorLog);
      const errorForm = createFormObject(errorLog.name, false);
      errorForm.addField({
        id: 'label_error',
        type: serverWidget.FieldType.LABEL,
        label: errorLog.message || ' '
      });
      addHomeButton(errorForm);
      response.writePage(errorForm);
    }
  };

  // This function creates a form object
  function createFormObject(formName, hideBar) {
    const formObj = serverWidget.createForm({
      title: formName,
      hideNavBar: hideBar
    });
    formObj.clientScriptModulePath = 'SuiteScripts/Myers-Holum/Client-Scripts/MHI_YYF_EffectivePurchasePricingPage_CS.js';
    return formObj;
  }

  // This function creates the header fields
  function createHeader(formObj, params) {
    formObj.addFieldGroup({
      id: 'header',
      label: 'Available Filters'
    });
    const fldVendor = formObj.addField({
      id: 'custpage_vendor',
      label: 'Vendor',
      source: 'vendor',
      container: 'header',
      type: serverWidget.FieldType.SELECT
    });
    const fldItem = formObj.addField({
      id: 'custpage_item',
      label: 'Item',
      source: 'item',
      container: 'header',
      type: serverWidget.FieldType.SELECT
    });
    const fldDateStart = formObj.addField({
      id: 'custpage_startdate',
      label: 'Start Date',
      container: 'header',
      type: serverWidget.FieldType.DATE
    });
    fldItem.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });
    fldDateStart.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });

    if (params.custpage_vendor) fldVendor.defaultValue = params.custpage_vendor;
    if (params.custpage_item) fldItem.defaultValue = params.custpage_item;
    if (params.custpage_startdate) fldDateStart.defaultValue = params.custpage_startdate;

    if (params.method == 'POST') {
      fldVendor.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
      fldItem.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
      fldDateStart.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
    }
  }

  // This function creates the data table
  function createTable(formObj, params) {
    const sublistObj = formObj.addSublist({
      id: 'custpage_tbl_data',
      label: 'Purchase Price Lines',
      type: serverWidget.SublistType.LIST
    });

    if (params.method == 'GET') sublistObj.addMarkAllButtons();

    const colMarked = sublistObj.addField({
      id: 'custpage_tbl_mark',
      label: 'Update',
      type: serverWidget.FieldType.CHECKBOX
    });
    sublistObj.addField({
      id: 'custpage_tbl_id',
      label: 'ID',
      type: serverWidget.FieldType.TEXT
    });
    const colJSON = sublistObj.addField({
      id: 'custpage_tbl_json',
      label: 'JSON',
      type: serverWidget.FieldType.TEXTAREA
    });
    const colVendor = sublistObj.addField({
      id: 'custpage_tbl_vendor',
      label: 'Vendor',
      type: serverWidget.FieldType.SELECT,
      source: 'vendor'
    });
    const colItem = sublistObj.addField({
      id: 'custpage_tbl_item',
      label: 'Item',
      type: serverWidget.FieldType.SELECT,
      source: 'item'
    });
    const colCurr = sublistObj.addField({
      id: 'custpage_tbl_currency',
      label: 'Currency',
      type: serverWidget.FieldType.SELECT,
      source: 'currency'
    });
    const colUom = sublistObj.addField({
      id: 'custpage_tbl_uom',
      label: 'Unit of Measure',
      type: serverWidget.FieldType.SELECT,
      source: -221
    });
    const colQty = sublistObj.addField({
      id: 'custpage_tbl_qty',
      label: 'Tier Quantity',
      type: serverWidget.FieldType.INTEGER
    });
    const colStart = sublistObj.addField({
      id: 'custpage_tbl_startdate',
      label: 'Effective Start Date',
      type: serverWidget.FieldType.DATE
    });
    const colEnd = sublistObj.addField({
      id: 'custpage_tbl_enddate',
      label: 'Effective End Date',
      type: serverWidget.FieldType.DATE
    });
    const colCost = sublistObj.addField({
      id: 'custpage_tbl_cost',
      label: 'Unit Cost',
      type: serverWidget.FieldType.FLOAT
    });

    colJSON.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
    colVendor.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
    colItem.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });

    if (params.method == 'GET') {
      colQty.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
      colStart.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
      colEnd.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
      colCost.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
    }

    if (params.method == 'POST') {
      colMarked.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
      colCurr.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
      colUom.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
    }

    return sublistObj;
  }

  function retrieveData(params) {
    const searchObj = search.create({
      type: EFFECTIVE_PURCH.TYPE,
      filters: [],
      columns: [
        EFFECTIVE_PURCH.VENDOR,
        EFFECTIVE_PURCH.ITEM,
        EFFECTIVE_PURCH.CURRENCY,
        EFFECTIVE_PURCH.UOM,
        EFFECTIVE_PURCH.TIER_QTY,
        EFFECTIVE_PURCH.START,
        EFFECTIVE_PURCH.END,
        EFFECTIVE_PURCH.UNIT_COST
      ]
    });

    if (params.custpage_vendor) {
      searchObj.filters.push(search.createFilter({
        name: EFFECTIVE_PURCH.VENDOR,
        operator: 'anyof',
        values: params.custpage_vendor
      }));
    }

    if (params.custpage_item) {
      searchObj.filters.push(search.createFilter({
        name: EFFECTIVE_PURCH.ITEM,
        operator: 'anyof',
        values: params.custpage_item
      }));
    }

    if (params.custpage_startdate) {
      searchObj.filters.push(search.createFilter({
        name: EFFECTIVE_PURCH.START,
        operator: 'onorafter',
        values: params.custpage_startdate
      }));
    }

    log.debug('filters', searchObj.filters);
    const pagedData = searchObj.runPaged({
      pageSize: pageLimit
    });
    log.debug('pagedData', pagedData);

    return pagedData;
  }

  function createPagination(formObj, pageId, pagedData) {
    const dataCount = pagedData.count;
    const pageCount = Math.ceil(dataCount / pageLimit);

    // Add drop-down and options to navigate to specific page
    const selectOptions = formObj.addField({
      id: 'custpage_pageid',
      label: 'Select Page',
      type: serverWidget.FieldType.SELECT
    });

    for (let i = 0; i < pageCount; i += 1) {
      if (i == pageCount - 1) {
        selectOptions.addSelectOption({
          value: i,
          text: ((i * pageLimit) + 1) + ' - ' + (dataCount)
        });
      } else {
        selectOptions.addSelectOption({
          value: i,
          text: ((i * pageLimit) + 1) + ' - ' + ((i + 1) * pageLimit)
        });
      }
    }

    selectOptions.defaultValue = pageId.toString();
  }

  function fetchSearchResult(pagedData, pageId) {
    const data = [];

    if (pageId == -1) return data;

    const searchPage = pagedData.fetch({
      index: pageId
    });

    // log.debug('searchPage', searchPage);

    searchPage.data.forEach((result) => {
      data.push(result);
    });

    return data;
  }

  // This function populates the data for the revenue table
  function populateTable(sub, results, params) {
    let index = 0;
    const { list, method } = params; // Only needed in POST

    for (let i = 0; i < results.length; i += 1) {
      const pricingId = results[i].id;
      const vendorId = results[i].getValue({ name: EFFECTIVE_PURCH.VENDOR });
      const itemId = results[i].getValue({ name: EFFECTIVE_PURCH.ITEM });
      const currencyId = results[i].getValue({ name: EFFECTIVE_PURCH.CURRENCY });
      const uomId = results[i].getValue({ name: EFFECTIVE_PURCH.UOM });
      const tierQty = results[i].getValue({ name: EFFECTIVE_PURCH.TIER_QTY });
      const startDate = results[i].getValue({ name: EFFECTIVE_PURCH.START });
      const endDate = results[i].getValue({ name: EFFECTIVE_PURCH.END });
      const unitCost = results[i].getValue({ name: EFFECTIVE_PURCH.UNIT_COST });
      const jsonObj = {
        vend: vendorId,
        item: itemId,
        curr: currencyId,
        uom: uomId,
        qty: tierQty,
        start: startDate,
        end: endDate,
        cost: unitCost
      };

      if (method == 'POST' && list.indexOf(pricingId) == -1) continue; // Only filters on POST

      // SET THE LINE VALUES
      if (pricingId) sub.setSublistValue({ id: 'custpage_tbl_id', line: index, value: pricingId });
      if (jsonObj) sub.setSublistValue({ id: 'custpage_tbl_json', line: index, value: JSON.stringify(jsonObj) });
      if (vendorId) sub.setSublistValue({ id: 'custpage_tbl_vendor', line: index, value: vendorId });
      if (itemId) sub.setSublistValue({ id: 'custpage_tbl_item', line: index, value: itemId });
      if (currencyId) sub.setSublistValue({ id: 'custpage_tbl_currency', line: index, value: currencyId });
      if (uomId) sub.setSublistValue({ id: 'custpage_tbl_uom', line: index, value: uomId });
      if (tierQty) sub.setSublistValue({ id: 'custpage_tbl_qty', line: index, value: tierQty });
      if (startDate) sub.setSublistValue({ id: 'custpage_tbl_startdate', line: index, value: startDate });
      if (endDate) sub.setSublistValue({ id: 'custpage_tbl_enddate', line: index, value: endDate });
      if (unitCost) sub.setSublistValue({ id: 'custpage_tbl_cost', line: index, value: unitCost });

      index += 1;
    }
  }

  function addHomeButton(formObj) {
    formObj.addButton({
      id: 'custpage_btn_home',
      label: 'Return',
      functionName: 'loadSuitelet({},"_self")'
    });
  }

  function formatYYYYMMDD(strDate) {
    if (!strDate) return '';

    const dDate = format.parse({
      value: strDate,
      type: format.Type.DATE
    });

    const yyyy = dDate.getFullYear();
    const mm = appendZero(dDate.getMonth() + 1);
    const dd = appendZero(dDate.getDate());

    const fDate = yyyy + mm + dd;

    return fDate;
  }

  function appendZero(val) {
    let num = val;
    if (num < 10) num = '0' + num;
    return num.toString();
  }

  return {
    onRequest
  };
});
