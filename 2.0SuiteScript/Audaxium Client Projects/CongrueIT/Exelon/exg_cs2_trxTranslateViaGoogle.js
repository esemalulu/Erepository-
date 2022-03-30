/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/https', 
        'N/search', 
        'N/ui/dialog', 
        'N/ui/message', 
        'N/record',
    	'/SuiteScripts/CongrueIT Customization/UTILITY_LIB'],
/**
 * @param {https} https
 * @param {search} search
 * @param {dialog} dialog
 * @param {message} message
 */
function(https, search, dialog, message, record, custUtil) 
{
    
	var subJson = {},
		fmJson = {},
		//User selected or set Business Unit ID
		selBuId = '';

	/**
     * Function to be executed when field is changed.
     * 
     * User Event will set the JSON values of BU-Google Lang Key and Google Translate Fld Mapping into dynamically generated 
     * fields
     * custpage_fmjsonfld = JSON object of Translate Field mapping
     * {
     * 	"hasflds":true,
     *  "fldmap":{
     * 		"1":{
     * 			"source":"xx",
     * 			"target":"xx",
     * 			"isline":false
     *		},
     *		...
     *	}
     * }
     * 
     * custpage_subsjsonfld = JSON object of BU to Google Lang Key
     * {
     * 	[BUID]:[Google Lang Key]
     * }
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {mode} context.mode
     *
     * @since 2015.2
     */
	function pageInit(context)
	{
		selBuId = context.currentRecord.getValue({
    		'fieldId':'subsidiary'
    	});
		
		//Grab value from dynamic fields and convert to JSON object
		var subJsonVal = context.currentRecord.getValue({
				'fieldId':'custpage_subsjsonfld'
			}),
			fmJsonVal = context.currentRecord.getValue({
				'fieldId':'custpage_fmjsonfld'
			});
		
		//Build out subJson object if the value is set
		if (subJsonVal)
		{
			subJson = JSON.parse(subJsonVal);
		}
		
		//Build out fmJson object if the value is set
		if (fmJsonVal)
		{
			fmJson = JSON.parse(fmJsonVal);
		}
	}
	
    /**
     * Function to be executed when field is changed.
     * 
     * User Event will set the JSON values of BU-Google Lang Key and Google Translate Fld Mapping into dynamically generated 
     * fields
     * custpage_fmjsonfld = JSON object of Translate Field mapping
     * {
     * 	"hasflds":true,
     * "fldmap":{
     * 		"1":{
     * 			"source":"xx",
     * 			"target":"xx",
     * 			"isline":false
     *		},
     *		...
     *	}
     * }
     * custpage_subsjsonfld = JSON object of BU to Google Lang Key
     * {
     * 	[BUID]:[Google Lang Key]
     * }
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.sublistId - Sublist name
     * @param {string} context.fieldId - Field name
     * @param {number} context.line - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(context) 
    {
    	
    	//If field changed is subsidiary, set the selBuId
    	if (context.fieldId == 'subsidiary')
    	{
    		selBuId = context.currentRecord.getValue({
        		'fieldId':'subsidiary'
        	});
    	}
    	
    	//We loop through fmJson to see if THIS Field is one of the fields 
    	//	Configured to do the Translation.
    	//	ONLY execute below logic if BUSINESS UNIT is set and transaction HAD translation 
    	//	field configured AND subJson for THIS SUB is available
    	if (fmJson.hasflds && selBuId && subJson[selBuId])
    	{
    		//Check to see if change is against the line
    		var changeOnLine = (!isNaN(context.line))?true:false,
    			changedFldVal = '';
    		
    		if (changeOnLine)
    		{
    			//this is line level field change
    			changedFldVal = context.currentRecord.getCurrentSublistValue({
    				'sublistId':context.sublistId,
    				'fieldId':context.fieldId
    			});
    		}
    		else
    		{
    			//this is body level field change
    			changedFldVal = context.currentRecord.getValue({
    				'fieldId':context.fieldId
    			});
    		}
    		
    		//Loop through translation field configuration to find the match 
    		for (var fm in fmJson.fldmap)
        	{
    			//fm is internal ID of the mapping field.
    			//We proceed to execute google translation ONLY if
    			//	- Field is configured to be translated
    			//	- line or is not line logic matches currently being changed
    			//	OR
    			//	- changed field is subsidiary
        		if (
        			fmJson.fldmap[fm].source == context.fieldId && 
        			fmJson.fldmap[fm].isline == changeOnLine
        		   )
        		{
        			//alert(JSON.stringify(fmJson.fldmap[fm]) + ' // Change Field Value: '+changedFldVal);
     
        			var targetFieldValue = 'null',
        				//Created 7/26/2016
        				GOOGLE_API_KEY = 'AIzaSyCNgMDw8efw3H0vnxr7geEHh7iPM1tb12Q';
        			
        			//if the source field value is empty, simply clear out the target field value
        			if (changedFldVal)
        			{
        				//1. Let's detect the language that's been entered.
        				//	Google Detect is used
        				//https://www.googleapis.com/language/translate/v2/detect?key=YOUR_API_KEY&q=Google%20Translate%20Rocks
        				var detectUrl = 'https://www.googleapis.com/language/translate/v2/detect?key='+
        								GOOGLE_API_KEY+
									   '&q='+encodeURI(changedFldVal);
        				
        				        				//Let's find out what Google Says
						var detectRes = https.get({
							'url':detectUrl
						});
						
						if (detectRes.code == '200')
						{
							var detectJson = JSON.parse(detectRes.body),
								googleDetected = detectJson.data.detections[0][0].language;
								//googleConfidence = parseFloat(detectJson.data.detections[0][0].confidence);
							
							//8/12/2016 -
							//Below is a case when the language detect is NOT the same as 
							//Subsidiary language code
							if (subJson[selBuId] != googleDetected)
							{
								var translateUrl = 'https://www.googleapis.com/language/translate/v2?key='+
												   GOOGLE_API_KEY+
					 							   '&q='+encodeURI(changedFldVal)+'&source='+googleDetected+'&target='+subJson[selBuId];
 			
					 			var trnsRes = https.get({
					 				'url':translateUrl
					 			});
					 			
					 			//alert(translateUrl);
					 			//alert(trnsRes.code);
					 			
					 			if (trnsRes.code == '200')
					 			{
					 				var resJson = JSON.parse(trnsRes.body);
					 				
					 				targetFieldValue = resJson.data.translations[0].translatedText;
					 			}
					 			else
					 			{
					 				//This is an error.
									alert('Error occured while translating language from '+googleDetected+' to '+subJson[selBuId]+': \n\n'+alert(detectRes.body));
					 			}
							}
							//ALL other cases,
							//	translate back to english.
							else
							{
								var enTranslateUrl = 'https://www.googleapis.com/language/translate/v2?key='+
								   				   GOOGLE_API_KEY+
								   				   '&q='+encodeURI(changedFldVal)+'&source='+googleDetected+'&target=en';

					 			var enTrnsRes = https.get({
					 				'url':enTranslateUrl
					 			});
					 			
					 			//alert(translateUrl);
					 			//alert(trnsRes.code);
					 			
					 			if (enTrnsRes.code == '200')
					 			{
					 				var enResJson = JSON.parse(enTrnsRes.body);
					 				
					 				targetFieldValue = enResJson.data.translations[0].translatedText;
					 			}
					 			else
					 			{
					 				//This is an error.
									alert('Error occured while translating language from '+googleDetected+' to en: \n\n'+alert(detectRes.body));
					 			}
							}
						}
						else
						{
							//This is an error.
							alert('Error occured while detecting language: \n\n'+alert(detectRes.body));
						}
        			}
        			
        			//alert(targetFieldValue);
        			
        			//Go and set the field depending on what type of field it is (body or line)
        			if (changeOnLine)
	 	    		{
        				//alert('inside sublist change to target '+fmJson.fldmap[fm].target);
	 	    			//this is line level field change
	 	    			changedFldVal = context.currentRecord.setCurrentSublistValue({
	 	    				'sublistId':context.sublistId,
	 	    				'fieldId':fmJson.fldmap[fm].target,
	 	    				'value':targetFieldValue,
	 	    				'ignoreFieldChange':false
	 	    			});
	 	    		}
	 	    		else
	 	    		{
	 	    			//alert('inside body change to target '+fmJson.fldmap[fm].target);
	 	    			//this is body level field change
	 	    			changedFldVal = context.currentRecord.setValue({
	 	    				'fieldId':fmJson.fldmap[fm].target,
	 	    				'value':targetFieldValue,
	 	    				'ignoreFieldChange':false
	 	    			});
	 	    		}
        			
        			break;
        		}
        	}
    	}
    	
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    };
    
});
