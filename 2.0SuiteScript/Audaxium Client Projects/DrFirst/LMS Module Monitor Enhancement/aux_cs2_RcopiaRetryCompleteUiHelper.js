/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/format', 
        'N/record', 
        'N/ui/dialog',
        '/SuiteScripts/AX LMS Module/UTILITY_LIB'],
/**
 * @param {format} format
 * @param {record} record
 * @param {dialog} dialog
 */
function(format, record, dialog, custUtil) 
{
    
	//grab currentRecord Object from context on page init
	var curObj = null;
	
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(context) 
    {
    	curObj = context.currentRecord;
    	
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.line - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(context) 
    {
    	//As each qsl_process value changes, we need to make sure only ONE is checked 
    	//	At any given time
    	
    	//NS BUG ISSUE
		//	Any client side automation against qsl_process Checkbox is being taken out due to NS defect
		/**
    	if (context.fieldId == 'qsl_process')
    	{
    		console.log('Called at line '+context.line);
    		
    		var procBoxVal = curObj.getSublistValue({
    			'sublistId':context.sublistId,
    			'fieldId':context.fieldId,
    			'line':context.line
    		});
    		
    		console.log(procBoxVal);
    		
    		//Only process if value is checked
    		if (procBoxVal)
    		{
    			var listCount = curObj.getLineCount({
    				'sublistId':context.sublistId
    			});
    			
    			console.log('is Dynamic: '+curObj.isDynamic);
    			
    			//Loop through and make sure ONLY THIS line is checked
    			for (var li=0; li < listCount; li+=1)
    			{
    				if (li != context.line)
    				{
    					console.log('Before selecting the line line is '+li);
    					curObj.selectLine({
    						'sublistId':context.sublistId,
    						'line':li
    					});
    					
    					var curID = curObj.getCurrentSublistValue({
    						'sublistId':context.sublistId,
    						'fieldId':'qsl_queueidhide'
    					});
    					
    					var getCurId = curObj.getSublistValue({
    						'sublistId':context.sublistId,
    						'fieldId':'qsl_queueidhide',
    						'line':li
    					});
    					
    					console.log('Select Line Queue ID: '+curID);
    					console.log('GetSublistVlaue Queue ID: '+getCurId);
    					
    					curObj.setCurrentSublistValue({
    						'sublistId':context.sublistId,
    						'fieldId':'qsl_process',
    						'value':false,
    						'ignoreFieldChange':true
    					});
    					
    					curObj.commitLine({
    						'sublistId':context.sublistId
    					});
    					
    					//console.log('line '+li+' selected');
    					
    					//context.currentRecord.setSublistValue({
    					//	'sublistId':context.sublistId,
    					//	'fieldId':'qsl_process',
    					//	'line':li,
    					//	'value':false
    					//});
    					
    					
    				}
    			}
    		}
    	}
    	*/
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
    function saveRecord(context) 
    {
    	//7/17/2016 - NS has a defect where you can NOT set default field value as empty or null
    	//			  As work around we are using STRING value of null to indicate empty value option
    	var queueSelVal = curObj.getValue({
	    		'fieldId':'custpage_qselfld'
	    	}),
	    	actionSelVal = curObj.getValue({
	    		'fieldId':'custpage_aselfld'
	    	});
    	
    	if (!queueSelVal || queueSelVal == 'null')
    	{
    		dialog.alert({
    			'title':'Missing Required Info',
    			'message':'Please select the Queue # you wish to process'
    		});
    		
    		return false;
    	}
    	
    	if (!actionSelVal || actionSelVal == 'null')
    	{
    		dialog.alert({
    			'title':'Missing Required Info',
    			'message':'Please select action you wish to take'
    		});
    		
    		return false;
    	}
    	
    	return true;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
    
});
