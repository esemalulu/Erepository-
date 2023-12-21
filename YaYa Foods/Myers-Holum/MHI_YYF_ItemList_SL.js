/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NAmdConfig /SuiteScripts/Myers-Holum/Libraries/MHI_YYF_Configurations.json
 */
define(['mapping', 'N/ui/serverWidget', 'N/currentRecord', 'N/search', 'N/runtime'], (mapping, serverWidget, current, search, runtime) => {
  const { ITEM } = mapping;

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
    const PARAMS = request.parameters;
    try {
      PARAMS.method = request.method;
      const LOGTITLE = request.method + ': ';

      log.debug(LOGTITLE, 'START OF SUITELET EXECUTION | ' + runtime.getCurrentScript().getRemainingUsage());
      log.debug(LOGTITLE, 'PARAMS=' + JSON.stringify(PARAMS));

      if (request.method === 'GET' && PARAMS.customer) {
        const OBJFORM = createFormObject('Select Item', true);

        // Add drop-down and options to navigate to specific page
        const FLD_ITEM = OBJFORM.addField({
          id: 'custpage_item',
          label: 'Select Item',
          type: serverWidget.FieldType.SELECT
        });
        FLD_ITEM.addSelectOption({
          value: '',
          text: ''
        });

        const SEARCHOBJ = search.create({
          type: search.Type.ITEM,
          filters: [
            [
              ['type', 'anyof', 'Assembly', 'InvtPart'],
              'AND',
              [ITEM.CUSTOMER, 'noneof', '@NONE@'],
              'AND',
              [ITEM.CUSTOMER, 'anyof', PARAMS.customer]
            ],
            'OR',
            ['type', 'anyof', 'NonInvtPart']
          ],
          columns: [
            search.createColumn({
              name: 'itemid',
              sort: search.Sort.ASC
            })
          ]
        });
        const RESULTS = getAllSearchResults(SEARCHOBJ.run());

        for (let i = 0; i < RESULTS.length; i += 1) {
          log.debug(i, RESULTS[i]);
          FLD_ITEM.addSelectOption({
            value: RESULTS[i].id,
            text: RESULTS[i].getValue({
              name: 'itemid'
            })
          });
        }

        OBJFORM.addButton({
          id: 'custpage_btn_submit',
          label: 'Submit',
          functionName: 'submitItem()'
        });
        response.writePage(OBJFORM);
      }
    } catch (ERROR) {
      log.error(request.method + '_ERROR', ERROR);
      const ERRORFORM = createFormObject(ERROR.name, true);
      ERRORFORM.addField({
        id: 'label_error',
        type: serverWidget.FieldType.LABEL,
        label: ERROR.message
      });
      response.writePage(ERRORFORM);
    }
  };

  // This function creates a form object
  function createFormObject(FORM_NAME, HIDE_BAR) {
    const OBJFORM = serverWidget.createForm({
      title: FORM_NAME,
      hideNavBar: HIDE_BAR
    });
    OBJFORM.clientScriptModulePath = 'SuiteScripts/Myers-Holum/Client-Scripts/MHI_YYF_ItemList_CS.js';
    return OBJFORM;
  }

  /**
     * This function return more than the max 1000 records for a search
     * @param {Object} searchResult - search.ResultSet; pass over result set of search
     */
  function getAllSearchResults(searchResult) {
    let arrResults = [];
    let resultSet = [];
    const MAX_SEARCH_SIZE = 1000;
    let count = 0;

    do {
      resultSet = searchResult.getRange({
        start: count,
        end: count + MAX_SEARCH_SIZE
      });
      arrResults = arrResults.concat(resultSet);
      count += MAX_SEARCH_SIZE;
    } while (resultSet.length > 0);

    return arrResults;
  }

  return {
    onRequest
  };
});
