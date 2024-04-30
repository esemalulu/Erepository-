/**
 *@NApiVersion 2.x
 *@NScriptType MassUpdateScript
 */
define(['N/error', 'N/record', 'N/log'],
    function(error,record,log) 
	{
	function each(params) 
		{        
			var LogTitle='MassUpdateCloseAllLines';
			try
			{
				
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
						value: true
					});
				}
				
								
				recTran.save();
				log.audit({
								title: LogTitle,
								details: 'RecordType:,'+params.type+': RecordId:'+params.id+': Successfully Updated '+stLineCount+' lines with isClosed value of TRUE'
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