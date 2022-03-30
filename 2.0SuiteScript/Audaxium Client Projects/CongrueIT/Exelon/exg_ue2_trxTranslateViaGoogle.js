/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 
        'N/search',
        'N/ui/serverWidget',
        'N/runtime',
        '/SuiteScripts/CongrueIT Customization/UTILITY_LIB'],
/**
 * @param {config} config
 * @param {email} email
 * @param {error} error
 * @param {record} record
 * @param {search} search
 */
function(record, search, serverw, runtime, custUtil) 
{
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {string} context.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(context) 
    {
    	//Only execute for User Interface
    	if (runtime.executionContext != runtime.ContextType.USER_INTERFACE)
    	{
    		return;
    	}
    	
    	//Only execute if trigger type is CREATE, EDIT, COPY
    	if (context.type == context.UserEventType.COPY || 
    		context.type == context.UserEventType.CREATE ||
    		context.type == context.UserEventType.EDIT)
    	{
    		//1. Grab list of ALL Subsidiary and thier language
        	var subSearch = search.create({
    	    		'type':search.Type.SUBSIDIARY,
    	    		'filters':[
    	    		           	['isinactive', search.Operator.IS, false],
    	    		           	'AND',
    	    		           	['custrecord_bu_googletranslangkey', search.Operator.ISNOTEMPTY,'']
    	    		          ],
    	    		'columns':['internalid',
    	    		           'custrecord_bu_googletranslangkey']
    	    	}),
    	    	subCols = subSearch.columns,
    	    	subrs = subSearch.run().getRange({
    	    		'start':0,
    	    		'end':1000
    	    	});
        	
        	//2. Loop through the result of subSearch and build JSON
        	var subsLangJson = {};
        	for (var s=0; subrs && s < subrs.length; s+=1)
        	{
        		var buId = subrs[s].getValue(subCols[0]),
        			googleLangKey = subrs[s].getValue(subCols[1]);
        		
        		subsLangJson[buId] = googleLangKey;
        	}
        	
        	//3. Add in Dynamic fields to store subs/google lang JSON string version of each
        	var subsJsonFld = context.form.addField({
        		'id':'custpage_subsjsonfld',
        		'label':'BU Json Value',
        		'type':serverw.FieldType.TEXTAREA
        	});
        	subsJsonFld.defaultValue = JSON.stringify(subsLangJson);
        	//hide this field
        	subsJsonFld.updateDisplayType({
        		'displayType':serverw.FieldDisplayType.HIDDEN
        	});
        	
        	//1. Grab list of ALL Google Translate Rec/Fld Mapping 
        	//	 (customrecord_google_translatemap) that matches
        	//		THIS Record Type
        	var fldmapSearch = search.create({
    	    		'type':'customrecord_google_translatemap',
    	    		'filters':[
    	    		           	['isinactive', search.Operator.IS, false],
    	    		           	'AND',
    	    		           	['custrecord_gtmf_recordid', search.Operator.IS, context.newRecord.type]
    	    		          ],
    	    		'columns':['internalid',
    	    		           'custrecord_gtmf_src_fldid',
    	    		           'custrecord_gtmf_trg_fldid',
    	    		           'custrecord_gtmf_islinefld']
    	    	}),
    	    	fldmapCols = fldmapSearch.columns,
    	    	fmrs = fldmapSearch.run().getRange({
    	    		'start':0,
    	    		'end':1000
    	    	});
        	
        	//2. Loop through the result of fldmapSearch and build JSON
        	var fldmapJson = {
        		'hasflds':false,
        		'fldmap':{}
        	};
        	for (var f=0; fmrs && f < fmrs.length; f+=1)
        	{
        		fldmapJson.hasflds = true;
        		
        		var fmId = fmrs[f].getValue(fldmapCols[0]),
        			sourceId = fmrs[f].getValue(fldmapCols[1]),
        			targetId = fmrs[f].getValue(fldmapCols[2]),
        			isLine = fmrs[f].getValue(fldmapCols[3]);
        		
        		fldmapJson.fldmap[fmId] = {
        			'source':sourceId,
        			'target':targetId,
        			'isline':isLine
        		};
        	}
        	
        	//3. Add in Dynamic field to store fldmap JSON string
        	var fmJsonFld = context.form.addField({
        		'id':'custpage_fmjsonfld',
        		'label':'FieldMap Json Value',
        		'type':serverw.FieldType.TEXTAREA
        	});
        	fmJsonFld.defaultValue = JSON.stringify(fldmapJson);
        	//hide this field
        	fmJsonFld.updateDisplayType({
        		'displayType':serverw.FieldDisplayType.HIDDEN
        	});
    	}
    	
    	log.debug('fldmapJson', JSON.stringify(fldmapJson));
    	
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    };
    
});
