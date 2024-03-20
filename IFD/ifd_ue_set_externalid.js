/*
 * Copyright (c) 2015 IT Rationale, Inc (www.itrationale.com). All rights
 * reserved.
 * 
 * Module Description
 * 
 * Version    Date            Author               Remarks
 * 1.00       5 Mar 2018     Chetan Jumani		   Script to set the external ID
 */
/**
 * @NScriptType UserEventScript
 * @NApiVersion 2.x
 */

define([ 'N/record', 'N/runtime', 'N/log'],
		function(record, runtime, log) 
		{
			function afterSubmitFunction(scriptContext) 
			{
				try 
				{
					var FUNC_NAME = 'afterSubmitFunction SetExternalId';
					log.debug(FUNC_NAME, '----Script starts----');

					// Checking event type
					var eventType = scriptContext.type;
					log.debug(FUNC_NAME, 'Event Type :' + eventType);

					if ((eventType == scriptContext.UserEventType.CREATE) || (eventType == scriptContext.UserEventType.COPY) )
					{
						
						// Get Record Type
						var newRec = scriptContext.newRecord;
						var recType = newRec.type;
						var recid = newRec.id;
					    var scriptObj = runtime.getCurrentScript();
					
						var param_sourceField = scriptObj.getParameter({
							name : 'custscript_ifd_para_source_field'
							})
							
						if (isNullOrEmpty(param_sourceField)) 
						{
															
							log.error(FUNC_NAME, 'Script parameter source field custscript_ifd_para_source_field is empty. ');	
						}
						else
						{
							log.debug(FUNC_NAME, 'param_sourceField :' + param_sourceField);
					        
														
							var oldRecord  = record.load({
											  type: recType, 
											   id: recid,
											   isDynamic : true
										});	
											
							var newSourceValue = oldRecord.getValue({
												fieldId: param_sourceField
												});
									
							log.debug(FUNC_NAME, 'newSourceValue :' + newSourceValue);
							
							oldRecord.setValue({
									fieldId: 'externalid',
									value: newSourceValue
									});
													
							try{
							 var newRecId = oldRecord.save();
							 log.audit(FUNC_NAME, 'RecordType:'+recType+': record Id:'+recid+': External Id set to:'+newSourceValue);
							 }//end try
							 catch (ex) 
							 {
								var errorStr = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
								log.debug('Error in the afterSubmit function to save the record', errorStr);
							 }// end catch
							
						}//end else
					}//if
						
							
				}//end try 
				catch (ex) 
				{
					var errorStr = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
					log.debug('Error in the afterSubmit function to setExternalId', errorStr);
				}// end catch
				
			}//end beforeSubmitFunction
			 function isNullOrEmpty(checkValue)
			{
				return(checkValue == null || checkValue == "" || checkValue == 'null' || checkValue == undefined);
			} 
			return {
				afterSubmit : afterSubmitFunction
			};
		});
				