/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/log", "N/record", "N/search", "N/ui/serverWidget", 'N/format','N/ui/message','N/query'], function (log, record, search, serverWidget, format,message,query) {

    function onRequest(context) {
        try{

            let form = serverWidget.createForm({ title: 'Dead Inventory Report', hideNavBar: true });
            form.clientScriptModulePath = 'SuiteScripts/SDB-dead-inventory-report-CS.js';

            let today = new Date();
            let startMonth = new Date(`${today.getMonth()+1}/1/${today.getFullYear()}`);


            const pageNum = context.request?.parameters?.page || 1;
            let salesDateParamFrom = context.request?.parameters?.salesDateFrom;

            if (salesDateParamFrom == '' || !salesDateParamFrom) salesDateParamFrom = getDateString(startMonth);
            log.debug('salesDateParamFrom',salesDateParamFrom);
            
            
            let salesDateParamTo = context.request?.parameters?.salesDateTo || getDateString(today);

            log.debug("dates",`${salesDateParamFrom} ${salesDateParamTo}`)
            let transactionType = context.request?.parameters?.transactionType || "";
            log.debug("transactionType",transactionType)
    
            const pageSize = context.request?.parameters?.pageSize || 500; // Default page size
    
            // Calculate start and end indexes for sublist data retrieval
            const startIndex = (pageNum - 1) * pageSize;
            const endIndex = startIndex + pageSize - 1;
    
            //*ADD FIELDS TO FORM
    
            //Array build with fields
            let searchHeaderFields = [
                {
                    id: 'custpage_gotopage_select',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Select Pages'
                },
                {
                    id: 'custpage_transaction_type',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Search in Transaction',
                },
                {
                    id: 'custpage_sales_date_from',
                    type: serverWidget.FieldType.DATE,
                    label: 'From Date'
                },
                {
                    id: 'custpage_sales_date_to',
                    type: serverWidget.FieldType.DATE,
                    label: 'To Date'
                },
            ];
    
            form = addFieldsToForm(form,searchHeaderFields);

            let transactionSelect = form.getField('custpage_transaction_type');
            transactionSelect.addSelectOption({
                value : '',
                text : 'Purchase and Sales Order'
            });
            transactionSelect.addSelectOption({
                value : 'po',
                text : 'Purchase Order'
            });
            transactionSelect.addSelectOption({
                value : 'so',
                text : 'Sales Order'
            });
            transactionSelect.defaultValue = transactionType;

    
            //*ADD SEARCH BUTTON TO FORM
    
            log.debug("form",form);
    
    
            //*CHOOSE COLUMNS FOR SUBLIST VALUES
    
            let columnHeaders = ["Item", "Description"];
    
            //*SET DATE FORMATS
            //------Date Params-----------
            let salesDateObj = {
                saleDateFrom: salesDateParamFrom!="none" ? formatDatePreference(salesDateParamFrom) : salesDateParamFrom,
                saleDateTo: formatDatePreference(salesDateParamTo) || '',
            }
            log.debug('salesDateObj', salesDateObj);
            //-------------END------------ 
    
            //----- Set Date Reference -----
            const dateSalesFrom = form.getField('custpage_sales_date_from');
            const dateSalesTo = form.getField('custpage_sales_date_to');
            if (salesDateParamFrom!="none") dateSalesFrom.defaultValue = salesDateObj.saleDateFrom;
            if (salesDateParamTo) dateSalesTo.defaultValue = salesDateObj.saleDateTo;

            // -----------------
            const sublitsData = {
                form,
                columnHeaders,
                pageNum,
                startIndex,
                endIndex,
                salesDateObj,
                transactionType
            }
            
            //getDeadItems(sublitsData.salesDateObj.saleDateFrom,sublitsData.salesDateObj.saleDateTo,sublitsData.transactionType);
       
    
            form = createSublist(sublitsData);
    
            context.response.writePage(form);
        }catch(e){
            log.error('ERROR in onRequest',e);
        }
    }

    function createSublist(sublitsData){
        try {

            // create diferents Sublist 
            const sublist = sublitsData.form.addSublist({
                id: "custpage_items_dead" + (sublitsData.transactionType ? "_": ""),
                label: "Dead items" + (sublitsData.transactionType=='po' ? " in Purchase Orders": sublitsData.transactionType=='so' ? " in Sales Orders" : " in Purchase and Sales Orders"),
                type: serverWidget.SublistType.LIST
            });
            
            // Adding columns to form
            
            sublitsData.columnHeaders.forEach(column => {
                sublist.addField({
                    id: "custpage_" + sublitsData.transactionType + column?.toLowerCase(),
                    label: column,
                    type: serverWidget.FieldType.TEXT,
                });
            });

            // Show result number 
            const totalResults = sublitsData.form.addField({
                id: 'custpage_total_results',
                type: serverWidget.FieldType.TEXT,
                label: 'Total Results'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });


            // Searchs
            // const allItems = searchAllItems();
            // const aliveItems = getItemsAlive(sublitsData.salesDateObj.saleDateFrom,sublitsData.salesDateObj.saleDateTo,sublitsData.stransactionType);
            const deadItems = getDeadItems(sublitsData.salesDateObj.saleDateFrom,sublitsData.salesDateObj.saleDateTo,sublitsData.transactionType);

            totalResults.defaultValue = `Total results: ${deadItems.length}`;

            var totalPages = Math.ceil(deadItems.length / 500);

            const goToPageSelect = sublitsData.form.getField('custpage_gotopage_select');
            //goToPageSelect.defaultValue = selectPages;

            for (var i = 0; i < totalPages; i++) {
                goToPageSelect.addSelectOption({
                    value : i + 1,
                    text : `Page ${i + 1}`
                });
            }
            goToPageSelect.defaultValue = sublitsData.pageNum;

            // -----------------------------------------------------------------

            const searchResults = deadItems.slice(sublitsData.startIndex, sublitsData.endIndex);
       
            // Draw Sublist
            log.debug('sublist',sublist);
            setSublistValues(sublist, 'custpage_'+sublitsData.transactionType, searchResults);
            log.debug('sublitsData.form',sublitsData.form);

            return sublitsData.form;
        }catch(e){
            log.error('ERROR in createSublist',e);
        }
    }

    // function set SublistValues all sublist
    function setSublistValues(sublist, prefix, results) {
        try{
            //log.debug('results',results)
            const column = ["Item", "Description"];
 
            results.forEach(function (result,i) {
                //log.debug('result',result)

                result.values.forEach((value,j) => {
                    const thisColumn = column[j]?.toLowerCase();
                    if(!thisColumn) return;

                    sublist.setSublistValue({
                        id: prefix + thisColumn,
                        line: i,
                        value: value || "N/A"
                    });

                });
            })
            
        }catch(e){
            log.error('ERROR in setSublistValues',e);
        }
 
    }

    function getDeadItems(from,to,type){
        try{

            const notInSO =  ` (
                SELECT DISTINCT item.id
                FROM item 
                    LEFT JOIN transactionLine as line on line.item = item.id
                    LEFT JOIN transaction as tran on line.transaction = tran.id
                    WHERE (
                        tran.type = 'SalesOrd'
                        AND tran.trandate <= TO_DATE('${to}', 'MM-DD-YYYY')
                        AND tran.trandate >= TO_DATE('${from}', 'MM-DD-YYYY') 
                    )  
            )`

            const notInPO = ` (
                SELECT DISTINCT item.id
                FROM item 
                    LEFT JOIN transactionLine as line on line.item = item.id
                    LEFT JOIN transaction as tran on line.transaction = tran.id
                    WHERE (
                        tran.type = 'PurchOrd'
                        AND tran.trandate <= TO_DATE('${to}', 'MM-DD-YYYY')
                        AND tran.trandate >= TO_DATE('${from}', 'MM-DD-YYYY') 
                    )  
            )`;

           

            let completeQuery;
            if(!type) completeQuery = notInPO + ' AND item.id NOT IN' + notInSO;
            else if (type=='so') completeQuery=notInSO;
            else completeQuery=notInPO;
            
            const sqlStr = `
                SELECT item.id as id, item.displayname as displayname,
                FROM item
                WHERE item.id NOT IN ${completeQuery} AND item.isinactive='F'`;

          
            // const sqlStr = `
            //     SELECT item.id as id, item.displayname as displayname,
            //     FROM item
            //     WHERE item.id (${!type ? notInBoth : (type == 'so') ? 'NOT IN' + notInSO : 'NOT IN' +notInPO})`;

            // const sqlStr = `
            // SELECT item.id as id, item.displayname as displayname, SUM(inventorybalance.quantityavailable) as available
            // FROM item
            // LEFT JOIN inventorybalance ON
		    //     (inventorybalance.item = item.id)
            // WHERE item.id NOT IN (
            //     SELECT item.id
            //     FROM item 
            //         LEFT JOIN transactionLine as line on line.item = item.id
            //         LEFT JOIN transaction as tran on line.transaction = tran.id
            //         WHERE ${!type ? "(tran.type = 'PurchOrd' OR tran.type = 'SalesOrd')" : `tran.type = '${type}'`} 
            //     AND tran.trandate <= TO_DATE('${to}', 'MM-DD-YYYY')
            //     AND tran.trandate >= TO_DATE('${from}', 'MM-DD-YYYY')
            //     GROUP BY item.id, item.itemid
            // )
            // GROUP BY item.
            // `;


            log.debug('sqlStr',sqlStr);

            const range = 1000;
            const allResults = []

            query.runSuiteQLPaged({query: sqlStr,pageSize: range})
                .iterator().each((page) => {
                    allResults.push(...page.value?.data.results);
                    return true;
                })
               
            
            //log.debug("allResults",allResults); 

            return allResults;

        }catch(e){
            log.error('ERROR IN GETDEADITEMS',e);
        }
     
    }

    function formatDatePreference(date) {
        try {
            if (!date) return false
            // Formatear la fecha según el formato deseado
            var newDate = new Date(date);
            //newDate.setDate(newDate.getDate() + 1);
            //log.debug('newDate reference', newDate);

            var formattedDateString = format.parse({
                value: newDate,
                type: format.Type.DATE
            });

            var formattedDate = format.format({
                value: formattedDateString,
                type: format.Type.DATE
            });

            return formattedDate;
        } catch (err) {
            log.debug('error en: formatDatePreference', err)
        }

    }

    function addFieldsToForm(form,fields){
        try {
            fields.forEach(field => {
                const fieldForm = form.addField({
                    id: field.id,
                    type: field.type,
                    label: field.label
                });
                if(field.value) fieldForm.defaultValue = field.value;
                
            })
            log.debug("form addFieldsToForm",form);

            return form;
        }catch(e){
            log.error('ERROR in addFieldsToForm',e);
        }
    }

    function getDateString(currentDate)
    {
        try{
            const year = currentDate.getFullYear();
            const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
            const day = currentDate.getDate().toString().padStart(2, '0');
            log.debug('formattedDate',`${month}-${day}-${year}`);
            const formattedDate = `${month}-${day}-${year}`;
            return formattedDate;

        }catch(e) {
            log.error('ERROR IN getDateString',e)
        }
    }

   

    return {
        onRequest: onRequest
    }
});
