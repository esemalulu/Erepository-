/**
 *@NApiVersion 2.x
 *@NScriptType MassUpdateScript
 */
define(['N/error', 'N/record', 'N/log'],
    function(error,record,log) 
	{
        function each(params) 
		{
            try 
			{ 
				
				record.delete({
												type: params.type,
												id: params.id,
											});
				
				log.debug({
							title: 'MassUpdateScript-DeleteRecord Completed',
							details: 'RecordType:,'+params.type+': RecordId:'+params.id+': Successfully deleted.'
						});
				
				
			} //end try
			catch (e) 
			{
				log.error({
							title: e.name,
							details: 'RecordType:'+params.type+': RecordId:'+params.id+': Error Message'+e.message
						});
				
			}
        }
        return {
            each: each
        };
    });