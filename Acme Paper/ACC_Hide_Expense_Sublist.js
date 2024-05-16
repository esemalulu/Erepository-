/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget'],
	function (serverWidget)
	{
		function beforeLoad(context)
		{
			try
			{
				log.debug('beforeSubmit', '*****START*****');
				var currentForm = context.form;
				var expenseSublist = currentForm.getSublist({
					id: 'expense'
				});
                log.debug("expenseSublist", expenseSublist)
                // Code commented due to not being able to edit a VRMA
                // To fix
				// expenseSublist.displayType = serverWidget.SublistDisplayType.HIDDEN;
				log.debug('beforeSubmit', '*****END*****');
			} 
			catch (error)
			{
				log.error("error", error);
			}

		}

		return {
			beforeLoad: beforeLoad
		};
	});
