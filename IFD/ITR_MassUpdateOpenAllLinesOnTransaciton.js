/**
 *@NApiVersion 2.x
 *@NScriptType MassUpdateScript
 */
define(['N/error', 'N/record', 'N/log'],
    function(error,record,log) 
	{
	function each(params) 
		{        
			var LogTitle='MassUpdateAllOpenLines';
			try
			{
				var stScriptParameterToSetLinesOpenClosed ='N/A';
				/* stScriptParameterToSetLinesOpenClosed = runtime.getCurrentScript().getParameter("custscript_setlinecloseoropen");
					log.debug(LogTitle,'params.type:'+params.type+': params.id:'+ params.id +': stScriptParameterToSetLinesOpenClosed:'+stScriptParameterToSetLinesOpenClosed);
					
					if (isEmpty(stScriptParameterToSetLinesOpenClosed))
					{
						
						log.error	({
										title: LogTitle,
										details:  'Error Script Parameter with id custscript_setLineClosedOrOpen could not be read Current value of custscript_setLineClosedOrOpen:'+ custscript_setLineClosedOrOpen': RecordType:,'+params.type+': RecordId:'+params.id+':'
									});
						return false;
					}
					*/
			
			
				/*var recTran = context.newRecord;
				log.debug(LogTitle,'TYPE:'+ recTran.type);*/
				
					var recTran = record.load	({
												type: params.type,
												id: params.id,
												isDynamic: false,
											});

				var stLineCount = recTran.getLineCount	({
															sublistId: 'item'
														});
					
				log.debug	({	
								title:LogTitle,
								details:'record.type:'+recTran.type+': Id:'+ recTran.id +': stLineCount:'+stLineCount
							});

			
				for	(var icnt = 0; icnt < stLineCount;icnt++)
				{
					
					recTran.setSublistValue({
						sublistId: 'item',
						fieldId: 'isclosed',
						line: icnt,
						value: false
					});
				}
				
				recTran.setValue({
									fieldId: 'custbody_conversion_transaction',
									value: false
								});
								
				recTran.save();
				log.audit({
								title: LogTitle,
								details: 'RecordType:,'+params.type+': RecordId:'+params.id+': Successfully Updated '+stLineCount+' lines with isClosed value of '+stScriptParameterToSetLinesOpenClosed+'.'
							});
				
				
			}
			catch (e) 
			{
				log.error({
							title: e.name,
							details: 'RecordType:'+params.type+': RecordId:'+params.id+': Error Message'+e.message
						});
				
			}//end catch
	}// end each
	return {
		each: each
	};
});