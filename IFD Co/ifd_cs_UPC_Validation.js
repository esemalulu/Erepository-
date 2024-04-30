define(['N/record','N/search','N/ui/dialog', 'N/log'], function (record, search, dialog, log) {
    /**
    *@NApiVersion 2.0
    *@NScriptType ClientScript
	*@author Westley Bennett, Created on 01/06/2021
    */
	function validateField(context) {
		var record = context.currentRecord;
		var upc = record.getValue('upccode');
		if (context.fieldId != 'upccode' || upc === "") return true;
		
		else
		{
			var regEx = /^[0-9]+$/;
			var ScriptName = '\n\n ScriptName: ifd_cs_UPC_Validation.js';
			
			if (!regEx.test(upc)) 
			{
				alert('ERROR on field validation: The UPC field contains invalid characters. Please use numbers only. No spaces, letters, or punctuation. You will not be able to save this record in this state.' + ScriptName);
				return true;
			}
			else if (upc.length > 14) 
			{
				alert('ERROR on field validation: The UPC field is longer than the maximum allowed 14 characters. Please reduce the number of characters. You will not be able to save this record in this state.' + ScriptName);
				return true;
			}
			else return true;	
		}
    }
	
	function saveRecord(context) {
		var record = context.currentRecord;
		var upc = record.getValue('upccode');
		if (upc === "") return true;
		
		else
		{
			var regEx = /^[0-9]+$/;
			var ScriptName = '\n\n ScriptName: ifd_cs_UPC_Validation.js';
			
			if (!regEx.test(upc)) 
			{
				alert('ERROR on record save: The UPC field contains invalid characters. Please use numbers only. No spaces, letters, or punctuation.' + ScriptName);
				return false;
			}
			else if (upc.length > 14) 
			{
				alert('ERROR on record save: The UPC field is longer than the maximum allowed 14 characters. Please reduce the number of characters.' + ScriptName);
				return false;
			}
			else return true;	
		}
    }

    return {
        validateField: validateField,
		saveRecord : saveRecord
    }

});