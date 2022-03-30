/**
 * @copyright Copyright (c) 2008-2016 Elim Solutions Inc.
 * 50 McIntosh Drive, Suite 110, Markham, ON, Canada<br/>
 * All Rights Reserved.<br/>
 *<br/>
 * This software is the confidential and proprietary information of
 * Elim Solutions ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Elim Solutions.
 *
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * @module MRScript
 * @description Map/Reduce Script.
 * @deployment scheduled
 * @author Fan Lu
 * @date 2017/01/04
 * @version 1.0.0.0
 */
define(['N/record', 'N/search', 'N/task', 'N/runtime'],
	/**
 * @param {record} record
 * @param {search} search
 */
	function(record, search, task, runtime) {
		return /** @alias module: MRScript */{
			/**
			 * Marks the beginning of the Map/Reduce process and generates input data.
			 *
			 * @typedef {Object} ObjectRef
			 * @property {number} id - Internal ID of the record instance
			 * @property {string} type - Record type id
			 *
			 * @return {Array|Object|Search|RecordRef} inputSummary
			 * @since 2015.1
			 */
			getInputData: function getInputData() {
				var ret = [];
				log.audit({title: 'Process Search', details: runtime.getCurrentScript().getParameter({name: 'custscript_transaction_search'})});
				var resultSet = search.load({id: runtime.getCurrentScript().getParameter({name: 'custscript_transaction_search'})/*'customsearch_es_po_department'*/}).run();
				for (var idx = 0; idx < 5; idx += 1) {
					var results = resultSet.getRange({start:idx * 1000, end: (idx + 1) * 1000});
					if (!results || results.length < 1) {
						break;
					}
					for (var i = 0; results && i < results.length; i += 1) {
						ret.push({
							id: results[i].id,
							type: results[i].recordType,
							item: results[i].getValue({name: 'item'}),
							dp: results[i].getValue({name: 'department', join: 'item'}),
						});
					}
				}
				return ret;
				//return {type:'search', id: 819};
			},
			/**
			 * Executes when the map entry point is triggered and applies to each key/value pair.
			 *
			 * @param {MapContext} context - Data collection containing the key/value pairs to process through the map stage
			 * @since 2015.1
			 */
			map: function (context) {
				var obj = JSON.parse(context.value);
				log.debug({title: 'Map', details: context});
				context.write({key: obj.id, value: JSON.stringify({type: obj.type, id: obj.item, dp: obj.dp})});
			},
			/**
			 * Executes when the reduce entry point is triggered and applies to each group.
			 *
			 * @param {ReduceContext} context - Data collection containing the groups to process through the reduce stage
			 * @since 2015.1
			 */
			reduce: function (context) {
				log.debug({title: 'Reduce', details: context});
				//var poRecord = record.load({type: record.Type.PURCHASE_ORDER, id: context.key});
				//var count = poRecord.getLineCount({sublistId: 'item'});
				var items = [];
				for (var i = 0; i < context.values.length; i += 1) {
					items.push(JSON.parse(context.values[i]));
				}
				var poRecord = record.load({type: items[0].type, id: context.key});
				var count = poRecord.getLineCount({sublistId: 'item'});
				for (var i = 0; i < count; i += 1) {
					var item = poRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
					for (var j = 0; j < items.length; j += 1) {
						if (items[j].id == item) {
							poRecord.setSublistValue({sublistId: 'item', fieldId: 'department', line: i, value: items[j].dp});
							break;
						}
					}
				}
				poRecord.save({ignoreMandatoryFields: true});
				context.write({key: context.key, value: items.length});
			},
			/**
			 * Executes when the summarize entry point is triggered and applies to the result set.
			 *
			 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
			 * @since 2015.1
			 */
			summarize: function (summary) {
				log.debug({title: 'Summary', details: summary});
				log.debug({title: 'Input Summary', details: summary.inputSummary});
				log.debug({title: 'Map Summary', details: summary.mapSummary});
				//summary.mapSummary.keys.iterator().each(function(key){
					//log.debug({title: 'Map Key', details: key});
					//return true;
				//});
				var keys = 0; 
				summary.mapSummary.errors.iterator().each(function(key, error){
					log.debug({title: 'Map Error', details: key + ' -- ' + error});
					return true;
				});
				log.debug({title: 'Reduce Summary', details: summary.reduceSummary});
				summary.reduceSummary.keys.iterator().each(function(key){
					//log.debug({title: 'Reduce Key', details: key});
					return true;
				});
				summary.reduceSummary.errors.iterator().each(function(key, error){
					log.debug({title: 'Reduce Error', details: key + ' -- ' + error});
					return true;
				});
				summary.output.iterator().each(function(key, value){
					keys += 1;
					log.debug({title: 'Output', details: key + ' -- ' + value});
					return true;
				});
				log.debug({title: 'keys', details: keys});
				if (keys > 0) {
					var currentScript = runtime.getCurrentScript();
					var scriptTask = task.create({taskType: task.TaskType.MAP_REDUCE,
						scriptId: currentScript.id,
						params: {custscript_transaction_search: runtime.getCurrentScript().getParameter({name: 'custscript_transaction_search'})}});
					scriptTask.scriptId = currentScript.id;
					scriptTask.deploymentId = currentScript.deploymentId;
					var id = scriptTask.submit();
					log.debug({title: 'id', details: id});
				}
			}
		};
	});
