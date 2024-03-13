/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {
	function afterSubmit(context) {
		if (context.type === 'edit' || context.type === 'xedit') {
			updateCsmOnRelatedProjects(context);
		}
	}

    // https://issues.corp.rapid7.com/browse/APPS-7957
    // when the CSM is edited on Customer => update CSM field on all related projects with all statuses, except 'delete'
	function updateCsmOnRelatedProjects(context) {
		var CSM_FIELD = 'custentityr7accountmanager';
		var DELETED_STATUS = '76'; // project 'Delete' status ID
		try {
			var newRec = context.newRecord;
			var oldRec = context.oldRecord;

			// if the CSM is changed on the customer
			if (
				(context.type === 'edit' && newRec.getValue({ fieldId: CSM_FIELD }) !== oldRec.getValue({ fieldId: CSM_FIELD })) ||
				(context.type === 'xedit' && newRec.getFields().indexOf(CSM_FIELD) >= 0)
			) {
				var customerId = newRec.id;
				var newCsmId = newRec.getValue({ fieldId: CSM_FIELD });
				// log.debug({ title: 'customer ID: ', details: customerId });
				// search for related projects
				var filters = [];
				filters.push(
					search.createFilter({
						name: 'internalid',
						join: 'customer',
						operator: search.Operator.ANYOF,
						values: customerId
					})
				);
				// exclude projects with delete status from the search results
				filters.push(
					search.createFilter({
						name: 'status',
						operator: search.Operator.NONEOF,
						values: DELETED_STATUS
					})
				);
				var columns = search.createColumn({ name: 'internalid' });
				var projectSearch = search.create({ type: search.Type.JOB, filters: filters, columns: columns });

				// for each project set updated CSM
				projectSearch.run().each(function(result) {
					var projectId = result.getValue('internalid');
					log.debug({ title: 'project ID: ', details: projectId });
					var values = {};
					values[CSM_FIELD] = newCsmId;
					record.submitFields({
						type: record.Type.JOB,
						id: projectId,
						values: values
					});
					return true;
				});
			}
		} catch (e) {
			log.debug({ title: 'error occured on afterSubmit stage: ', details: e });
		}
	}
	return {
		afterSubmit: afterSubmit
	};
});
