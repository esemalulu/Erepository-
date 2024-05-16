/**
 * @NApiVersion 2.x
 * @NScriptType MassUpdateScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type          : Mass Update Script 
 * Script Name        : ACME MU CPC Line Records
 * Version                 : 2.0
 * Description         : This script will run a mass update to delete records.
 */

define(['N/log', 'N/runtime', 'N/record'],

		function(log, runtime, record) {

	function each(params) {
		try{
			var curRecordType = params.type;
			var curRecordId = params.id;
			log.debug('curRecordType is '+curRecordType, 'curRecordId is '+curRecordId);
			if(curRecordType && curRecordId){
				var deletedCPCLRecId = record.delete({
				       type: curRecordType,
				       id: curRecordId,
				    });
				log.audit('deletedCPCLRecId ', deletedCPCLRecId);
			}
		}catch(eachFuncError){
			log.error('Error Occurred In each function is ', JSON.stringify(eachFuncError));
		}
	}

	return {
		each: each
	};

});
