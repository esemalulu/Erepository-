/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

function() {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     * 
     * 
     */
	
  function lineInitfun(context) {   		
		
      	//Setting location on field change
    	var currentRecord = context.currentRecord;    
       // var sublistName = context.sublistId;
       // var fieldName = context.fieldId;
     //  	var count = currentRecord.getLineCount('item');
       	var loc= currentRecord.getValue({ fieldId: 'location'});
       	
      var lineloc = currentRecord.getSublistValue({
    sublistId: 'item',
    fieldId: 'location'
   
});
       	
       	
       	if(lineloc != loc && isEmpty(lineloc))
         {
       	currentRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'location',
            value: loc,
            ignoreFieldChange: true
        });    }  
	}
    function pageInit(context) 
    {
    	//alert('context'+context);
    	if (context.mode == 'edit' )
            return;
    	var currentRec = context.currentRecord;
    	var stdShipDate = currentRec.getValue({fieldId : 'shipdate'});
    	log.debug('Ship Date', stdShipDate);
    	currentRec.setValue({fieldId : 'startdate', value:stdShipDate});
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
    function fieldChanged(context)
    {
    	  var currentRec = context.currentRecord;
          var fieldName = context.fieldId;
          if (fieldName === 'shipdate')
          {
        	  var stdShipDate = currentRec.getValue({fieldId : 'shipdate'});
        	  currentRec.setValue({fieldId : 'startdate', value:stdShipDate});
          }
    }

   
    function postSourcing(context) {
    	  var currentRec = context.currentRecord;
          var fieldName = context.fieldId;
          if (fieldName === 'trandate')
          {
        	  var stdShipDate = currentRec.getValue({fieldId : 'shipdate'});
        	  currentRec.setValue({fieldId : 'startdate', value:stdShipDate});
          }
      
    
      
      
    }

   
    return {
        pageInit: pageInit,
    //    lineInit: lineInitfun,
        postSourcing: postSourcing
    };
    
});
