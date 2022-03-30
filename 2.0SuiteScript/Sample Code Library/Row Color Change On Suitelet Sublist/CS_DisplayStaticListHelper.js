/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record'],
/**
 * @param {record} record
 */
function(record) {
    
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
    	/**
    	 * ON Page Init, we are gonna go through list of sublist and
    	 * IF Category is Individual, we are going to change the ROW color to #B2FF33 (Light Green)
    	 * Sublist ID: custpage_list
    	 * Category Column: list_leadcategory
    	 * 
    	 */
    	
    		//Grab Generated Sublist as current record from context
    	var slrec = context.currentRecord,
    		//Grab total line available on custpage_list sublist
    		lineCount = slrec.getLineCount({
    			'sublistId':'custpage_list'
    		});
    	
    	//Let's loop through and change Row color for Individual Leads
    	for (var i=0; i < lineCount; i+=1)
    	{
    			//this variable stores the cell color to be used
    		var tdColor = '#B2FF33', //(Light Green)
    			//Grab the category value
    			catValue = slrec.getSublistValue({
    				'sublistId':'custpage_list',
    				'fieldId':'list_leadcategoryhide',
    				'line':i
    			});
    		
    		//Row Change core
    		if (catValue == 'Individual')
    		{
    			//We are going to be using HTML DOM object to accomplish our goal.
    			//IMPORTANT:
    			//	Hacking DOM object isn't supported by NetSuite.
    			//	IF NetSuite changes the way forms and element IDs are generated,
    			//	THIS WILL Fail.
    			
    			//NetSuite uses following format to generate TR Element ID:
    			//	[ID of sublist]+"row"+[line Index]
    			//	Example: 
    			//		Line 1 of sublist would be custpage_listrow0
    			var trDom = document.getElementById('custpage_listrow'+i),
    				//We now grab child element of the TR tag.
    				//  These will be individual TD tags that represents the columns 
    				//	we've added on the Suitelet Sublist
    				trDomChild = trDom.children;
    			
    			console.log(trDom);
    			
    			//IMPORTANT:
    			//	Based on CURRENT generation, we know that last column is hidden
    			//	We ONLY want to change the back ground color of Cells being SHOWN
    			//	This can be coordinated during your SL development.
    			//	This Maybe NS SS2.0 defect
    			for (var t=0; t < (trDomChild.length-1); t+=1)
    			{
    				//get the child TD DOM element
    				var tdDom = trDomChild[t];
    				
    				console.log(tdDom);
    				
    				//We are now going to override the style of THIS CELL 
    				//	and change the background color
    				//	by using setAttribute method of DOM object
    				tdDom.setAttribute(
    					'style',
    					//This is the magic CSS that changes the color
    					//	This is Same method used when NetSuite returns saved search results
    					//	with user defined row high lighting logic!
    					'background-color: '+tdColor+'!important;border-color: white '+tdColor+' '+tdColor+' '+tdColor+'!important;'
    				);
    				
    				console.log(tdDom);
    			}
    		}
    	}
    	
    }

    
    return {
        pageInit: pageInit
    };
    
});
