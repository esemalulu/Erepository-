/**
 * Copyright (c) 2018 IT Rationale, Inc (www.itrationale.com). All rights
 * reserved.
 * 
 * This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.*

 *
 * @NApiVersion 2.x
 * @author Meih Helig
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Version     Date          Author             Remarks
 * 1.00        07-24-2018    Meih Helig     Initial Development
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
					var palletGroupId = newRec.getValue({
						fieldId: 'custrecord_ifd_palletgroupfield'
					});
					palletGroupId = palletGroupId.trim();
					
					var itemNumberId = newRec.getValue({
						fieldId: 'custrecord_ifd_palletgroupitem'
					});
					
					var itemArr = search.lookupFields({
							type: 'item',
							id: itemNumberId,
							columns: ['itemid']
						});
					var itemNumber = itemArr.itemid;
					
					log.debug(DEBUG_IDENTIFIER,"palletGroupId: "+palletGroupId+" itemNumberId: "+itemNumberId+" itemNumber: "+itemNumber);
					
					var concatenatedValue = palletGroupId+'+'+itemNumber;
					log.debug(DEBUG_IDENTIFIER,"concatenatedValue: "+concatenatedValue);
					
					newRec.setValue({
							fieldId:'externalid',
							value: concatenatedValue
							});						
					
					log.debug(DEBUG_IDENTIFIER,"Succsessfully updated pallet group recordid: "+recID+" externalid to "+concatenatedValue);
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
					var palletGroupId = newRec.getValue({
						fieldId: 'custrecord_ifd_palletgroupfield'
					});
					palletGroupId = palletGroupId.trim();
					
					var itemNumberId = newRec.getValue({
						fieldId: 'custrecord_ifd_palletgroupitem'
					});
					
					var itemArr = search.lookupFields({
							type: 'item',
							id: itemNumberId,
							columns: ['itemid']
						});
					var itemNumber = itemArr.itemid;
					
					log.debug(DEBUG_IDENTIFIER,"palletGroupId: "+palletGroupId+" itemNumberId: "+itemNumberId+" itemNumber: "+itemNumber);
					
					var concatenatedValue = palletGroupId+'+'+itemNumber;
					log.debug(DEBUG_IDENTIFIER,"concatenatedValue: "+concatenatedValue);
					
					
						record.submitFields({
								type: 'customrecord_ifd_palletgroups',
								id: recID,
								values: {
									externalid: concatenatedValue
								}
							});
					
					log.debug(DEBUG_IDENTIFIER,"Succsessfully updated pallet group recordid: "+recID+" externalid to "+concatenatedValue);
			}
			catch(ex)
			{					
				log.error(DEBUG_IDENTIFIER,"Unsucessfully updated the externalid due to: "+ex.name+" "+ex.message);
				
				 var id =  record.delete({
	         	    type: 'customrecord_ifd_palletgroups',
	         	    id: recID,
	         	});
				
				log.debug('Deleted Pallet Group Record ID',id);
				
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