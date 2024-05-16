/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/record', 'N/ui/dialog','N/search'],
/**
 * @param {log} log
 * @param {record} record
 */
function(log, record, dialog, search) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
    	
 /*   	dialog.alert({
    	    title: 'I am an Alert',
    	    message: 'Page init' 
    	});  */

    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(context) {
    	
    	
    	
    	var currentRecord = context.currentRecord;
        var sublistName = context.sublistId;
        var fieldName = context.fieldId;
       	var count = currentRecord.getLineCount('item');
       	var loc= currentRecord.getValue({ fieldId: 'location'});
    	
    	if ( fieldName == 'location' && sublistName != 'item')
        {
    		
    	/*	dialog.alert({
        	    title: 'I am an Alert',
        	    message: 'Loc chnaged.' + loc
        	}); */
    		
    	/*	dialog.alert({
        	    title: 'I am an Alert',
        	    message: 'count = .' + count
        	});  */
    		
    	
    		for (var i=0; i<count; i++)
    			{
    			
    			currentRecord.selectLine({ sublistId: 'item', line: i});
    			
    			currentRecord.setCurrentSublistValue({
                       sublistId: 'item',
                       fieldId: 'location',
                       value: loc,
                       ignoreFieldChange: true
                  	});
                   
                   currentRecord.commitLine({sublistId: 'item'});
                  
    			}
    	
        }
      
    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
   function postSourcing(context) {
            var objRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var sublistFieldName = context.fieldId;
     
            var currentRecord = context.currentRecord;
            var loc= currentRecord.getValue({ fieldId: 'location'});
               
           
				if (sublistName === 'item' && sublistFieldName == 'item') 
				{
     				var rate1;
					var line1 = context.line;
					var item = objRecord.getCurrentSublistValue({
					 sublistId: "item", 
					 fieldId: "item"
					 });
                  
                   					
					
					if ( item > 0)
					{
					var invoiceSearchObj = search.create({
						   type: "salesorder",
						   filters:
						   [
							  ["mainline","is","F"], 
							  "AND", 
							  ["type","anyof","SalesOrd"], 
							  "AND", 
							  ["shipping","is","F"], 
							  "AND", 
							  ["taxline","is","F"], 
							  "AND", 
							  ["item","anyof",item]
						   ],
						   columns:
						   [
							  search.createColumn({name: "rate", label: "Item Rate"}),
							  search.createColumn({
                                 name: "datecreated",
                                 sort: search.Sort.DESC,
                                 label: "Date Created"
                              }),
                                   search.createColumn({
                                   name: "formulanumeric",
                                   formula: "({rate}*{quantity})/{quantityuom}",
                                   label: "Formula (Numeric)"
                                }),
							  search.createColumn({name: "entity", label: "Name"})
						   ]
						});
						var searchResultCount = invoiceSearchObj.runPaged().count;
					//	alert("invoiceSearchObj result count"+searchResultCount);
						invoiceSearchObj.run().each(function(result){
						   // .run().each has a limit of 4,000 results
						 rate1 = result.getValue({name: "formulanumeric", label: "Formula (Numeric)"})
                         // rate1 = rate1.toFixed(2).toString();
						   return false;
						});
                      
                     
						
					/*	if(!rate1){
							 rate1 = objRecord.getCurrentSublistValue({
						 sublistId: "item", 
						 fieldId: "rate"
						 });
						} */
					
						if (rate1 != undefined)
                        {
                            objRecord.setCurrentSublistValue({
                             sublistId: "item", 
                             fieldId: "custcol_last_sold_price", 
                             value: parseFloat(rate1).toFixed(2)
                             });	
                          
                        }
                      
                      objRecord.setCurrentSublistValue({
                             sublistId: "item", 
                             fieldId: "location", 
                             value: loc
                             });	
                       
					}
				}
				
			
        }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

    }

    return {
    //    pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing
      //  sublistChanged: sublistChanged,
      //  lineInit: lineInit,
      //  validateField: validateField,
      //  validateLine: validateLine,
      //  validateInsert: validateInsert,
      //  validateDelete: validateDelete,
       // saveRecord: saveRecord
    };
    
});
