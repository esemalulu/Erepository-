/**
 * Module Description
 * 
 * @version 1.0.0
 * @author Richard <Elim Solutions>
 * @date 24 Oct 2013
 * @summary
 * The purpose of this script is a temp patch
 * field "[ES] APPROX. CONV. TO TRANSFER UNIT" need to source field "[ES] APPROX. WEIGHABLE UNIT TYPE (TO)"
 * but somehow it works in sandbox, not in production (2016.1)
 * the sourced value shows up on the Item form, but disappears after saving the form.
 * 
 * Also during the temp patch scripting, we found nlapiGetFieldValue and objRec.getFieldValue failed to 
 * get value from target field "[ES] APPROX. WEIGHABLE UNIT TYPE (TO)" and always return null.
 * The target field does store value after form submitted.
 * So has to use the lookupfield, and submitfield, which is not very good way. But it works.
 *
 */
function beforeLoad(){
	
}

function beforeSubmit(type){
}

function afterSubmit(type){
	try{
		if(type=="create" || type=="edit" || type=="xedit"){
			/*
			 ////this not working
			var objRecNew = nlapiGetNewRecord();
			var stUnitTypeInid = objRecNew.getFieldValue("custitem_es_weighable_unit_type_to");
			*/
			var stUnitTypeInid = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(),  "custitem_es_weighable_unit_type_to");
			nlapiLogExecution("DEBUG", "afterSubmit", "stUnitTypeInid: "+stUnitTypeInid);

			var fltConversionToUnit = null;////default to null; in case of missing data
			
			if(stUnitTypeInid!=undefined && stUnitTypeInid!=null && stUnitTypeInid!=""){
				var stConversionToUnit = nlapiLookupField("customrecord_es_weighable_unit_types", stUnitTypeInid,  "custrecord_wut_conversion");
				
				if(stConversionToUnit!=undefined && stConversionToUnit!=null && stConversionToUnit!=""){
					fltConversionToUnit = parseFloat(stConversionToUnit);
					nlapiLogExecution("DEBUG", "afterSubmit", "coverted fltConversionToUnit: "+fltConversionToUnit);
				}
			}
	
			nlapiLogExecution("DEBUG", "afterSubmit", "final fltConversionToUnit: "+fltConversionToUnit);
			
			/*
			 ////this not working
			 objRecNew.setFieldValue("custitem_es_appox_conversion_transf", fltConversionToUnit);
			 * */
			nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(),  "custitem_es_appox_conversion_transf", fltConversionToUnit);
		}////if type
	}
	catch(error){}
	
}