/**
 **
 * @NApiVersion 2.x
 * @author Manda Bigelow
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Version     Date          Author             Remarks
 * 1.00        02-22-2023    Manda Bigelow      Initial Development
 * 
 * 
 *
 *
 */
 
 define(['N/record', 'N/render', 'N/search', 'N/error'],
    function (record,render,search,error) {
		
		function beforeSubmit(context)
		{
			try {
					var DEBUG_IDENTIFIER = 'beforeSubmit';
					var type = context.type;
					var newRec = context.newRecord;					
					log.debug(DEBUG_IDENTIFIER,"type: "+type);
					
					if(context.type != context.UserEventType.CREATE && context.type != context.UserEventType.EDIT && context.type != context.UserEventType.XEDIT && context.type != context.UserEventType.COPY)
					{
						log.debug(DEBUG_IDENTIFIER, 'Type is not create, edit, xedit and copy. Script to exit.');
						return;
					}
					
					var recID = newRec.id;
					var recType = newRec.type;
					
					//getting of values:
					var ContactName = newRec.getValue({
						fieldId: 'custrecord_ifd_bs_reg_cont_name'
					});
					ContactName = ContactName.trim();
					
					var ContactEmail = newRec.getValue({
						fieldId: 'custrecord_ifd_bs_reg_cont_email'
					});

                    var ShowName = newRec.getValue({
						fieldId: 'custrecord_ifd_bs_reg_showname'
					});
                    ShowName = ShowName.trim();
					
					log.debug(DEBUG_IDENTIFIER,"ContactName: "+ContactName+" ContactEmail: "+ContactEmail+"ShowName: "+ShowName);
					
					var concatenatedValue = ContactName||ContactEmail||ShowName;
					log.debug(DEBUG_IDENTIFIER,"concatenatedValue: "+concatenatedValue);
					
					newRec.setValue({
							fieldId:'externalid',
							value: concatenatedValue
							});						
					
					log.debug(DEBUG_IDENTIFIER,"Succsessfully updated buying show contact registration recordid: "+recID+" externalid to "+concatenatedValue);
			}
			catch(ex)
			{					
				log.error(DEBUG_IDENTIFIER,"Unsucessfully updated the externalid due to: "+ex.name+" "+ex.message);
				var errorObj = error.create({
				name: ex.name,
				message: ex.message,
				notifyOff: false
				});			
				throw ex.message;
				return false;
			}
		}
		
		function afterSubmit(context)
		{
			try {
					var DEBUG_IDENTIFIER = 'afterSubmit';
					var type = context.type;
					var newRec = context.newRecord;					
					log.debug(DEBUG_IDENTIFIER,"type: "+type);
					
					if(context.type != context.UserEventType.CREATE && context.type != context.UserEventType.EDIT && context.type != context.UserEventType.XEDIT && context.type != context.UserEventType.COPY)
					{
						log.debug(DEBUG_IDENTIFIER, 'Type is not create, edit, xedit and copy. Script to exit.');
						return;
					}
					
					var recID = newRec.id;
					var recType = newRec.type;
					
					//getting of values:
					var ContactName = newRec.getValue({
						fieldId: 'custrecord_ifd_bs_reg_cont_name'
					});
					ContactName = ContactName.trim();
					
					var ContactEmail = newRec.getValue({
						fieldId: 'custrecord_ifd_bs_reg_cont_email'
					});
					
					log.debug(DEBUG_IDENTIFIER,"ContactName: "+ContactName+" ContactEmail: "+ContactEmail);
					
					var concatenatedValue = ContactName+'+'+ContactEmail;
					log.debug(DEBUG_IDENTIFIER,"concatenatedValue: "+concatenatedValue);
					
					
						record.submitFields({
								type: 'customrecord_ifd_bs_regis_contacts',
								id: recID,
								values: {
									externalid: concatenatedValue
								}
							});
					
					log.debug(DEBUG_IDENTIFIER,"Succsessfully updated buying show contact registration recordid: "+recID+" externalid to "+concatenatedValue);
			}
			catch(ex)
			{					
				log.error(DEBUG_IDENTIFIER,"Unsucessfully updated the externalid due to: "+ex.name+" "+ex.message);
				
				 var id =  record.delete({
	         	    type: 'customrecord_ifd_bs_regis_contacts',
	         	    id: recID,
	         	});
				
				log.debug('Deleted Buying Show Contact Registration Record',id);
				
				var errorObj = error.create({
				name: ex.name,
				message: ex.message,
				notifyOff: false
				});			
				throw ex.message;
				return false;
			}
		}		
		 return {
			beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
});