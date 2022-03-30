/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/ui/serverWidget'],
/**
 * @param {runtime} runtime
 * @param {search} search
 * @param {serverWidget} serverWidget
 */
function(runtime, search, serverw) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) 
    {
    	//Let's create NS form via Server Widget Module
    	var nsform = serverw.createForm({
    		'title':'Sample Static List',
    		'hideNavBar':false
    	});
    	
    	//We are going to let THIS Suitelet reference Client Script File
    	nsform.clientScriptFileId = '5993';
    	
    	//Let's run a very simple saved search. 
    	//	Purposes of Demo we will use saved search already created.
    	var sobj = search.load({
	    		'id':'customsearch18'
	    	}),
	    	//We are gonna grab search result columns
	    	/**
	    	 * Saved Search Column Index
	    	 * 0 = Internal ID
	    	 * 1 = Sales Rep
	    	 * 2 = Lead Status
	    	 * 3 = Lead Category
	    	 */
	    	sobjCols = sobj.columns,
	    	//Run the search and grab all results
	    	sobjRs = sobj.run().getRange({
	    		'start':0,
	    		'end':1000
	    	});
	    	
    	//Lets create static list sublist
    	var slist = nsform.addSublist({
    		'id':'custpage_list',
    		'type':serverw.SublistType.LIST,
    		'label':'Sample Leads Sublist'
    	});
    	
    	//We are now gonna add columns to display
    	//Add Lead Internal ID and set the display type to INLINE
    	slist.addField({
    		'id':'list_leadid',
    		'label':'Lead ID',
    		'type':serverw.FieldType.TEXT
    	}).updateDisplayType({
    		'displayType':serverw.FieldDisplayType.INLINE
    	});
    	
    	//Add Sales Rep and set the display type to INLINE
    	slist.addField({
    		'id':'list_salesrep',
    		'label':'Sales Rep Name',
    		'type':serverw.FieldType.TEXT
    	}).updateDisplayType({
    		'displayType':serverw.FieldDisplayType.INLINE
    	});
    	
    	//Add Lead Status and set the display type to INLINE
    	slist.addField({
    		'id':'list_leadstatus',
    		'label':'Lead Status',
    		'type':serverw.FieldType.TEXT
    	}).updateDisplayType({
    		'displayType':serverw.FieldDisplayType.INLINE
    	});
    	
    	//Add Lead Category and set the display type to INLINE
    	slist.addField({
    		'id':'list_leadcategory',
    		'label':'Lead Category',
    		'type':serverw.FieldType.TEXT
    	}).updateDisplayType({
    		'displayType':serverw.FieldDisplayType.INLINE
    	});
    	
    	//Add Lead Category and set the display type to HIDDEN
    	//	This is to allow client side script to access the value
    	//	MUST BE NS Defect
    	slist.addField({
    		'id':'list_leadcategoryhide',
    		'label':'Lead Category',
    		'type':serverw.FieldType.TEXT
    	}).updateDisplayType({
    		'displayType':serverw.FieldDisplayType.HIDDEN
    	});
    	
    	//Lets loop through the result of saved search and add the rows to this sublist
    	for (var i=0; i < sobjRs.length; i+=1)
    	{
    		//set Internal ID row
    		slist.setSublistValue({
    			'id':'list_leadid',
    			//When using Column object as parameter, you use getValue method
    			'value':sobjRs[i].getValue(sobjCols[0]),
    			'line':i
    		});
    		
    		//set Sales Rep row
    		slist.setSublistValue({
    			'id':'list_salesrep',
    			//When using Column object as parameter, you use getValue method
    			'value':sobjRs[i].getText(sobjCols[1]),
    			'line':i
    		});
    		
    		//set Lead Status row
    		slist.setSublistValue({
    			'id':'list_leadstatus',
    			//When using Column object as parameter, you use getValue method
    			'value':sobjRs[i].getText(sobjCols[2]),
    			'line':i
    		});
    		
    		//set Lead Category row
    		slist.setSublistValue({
    			'id':'list_leadcategory',
    			//When using Column object as parameter, you use getValue method
    			'value':sobjRs[i].getText(sobjCols[3]),
    			'line':i
    		});
    		
    		//set Lead Category Hidden row
    		slist.setSublistValue({
    			'id':'list_leadcategoryhide',
    			//When using Column object as parameter, you use getValue method
    			'value':sobjRs[i].getText(sobjCols[3]),
    			'line':i
    		});
    		
    	}
    	
    	//Let's display the form to the user
    	context.response.writePage(nsform);
    	
    }

    return {
        onRequest: onRequest
    };
    
});
