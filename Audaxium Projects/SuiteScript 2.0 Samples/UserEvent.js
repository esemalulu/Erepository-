
/**
 * @NApiVersion 2.0
 */
define(['N/record'],
	function(record)
	{
		function beforeLoad(context)
		{
			log.debug('before load',context.type);
		}
		return {
			beforeLoad:beforeLoad
		};
	}
);
