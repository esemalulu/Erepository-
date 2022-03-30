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
 * @author
 * @date
 * @version 1.0.0.0
 */
define(['N/record', 'N/search', 'N/runtime'],
	/**
 * @param {record} record
 * @param {search} search
 */
	function(record, search, runtime) {
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
				return search.load({id: runtime.getCurrentScript().getParameter({name: 'custscript_icr_search'})});
			},
			/**
			 * Executes when the map entry point is triggered and applies to each key/value pair.
			 *
			 * @param {MapContext} context - Data collection containing the key/value pairs to process through the map stage
			 * @since 2015.1
			 */
			map: function (context) {
				var value = JSON.parse(context.value);
				log.debug({title: 'value', details: value});
				var transaction = record.load({type:value.recordType, id: value.id});
				transaction.setValue({fieldId: 'department', value: value.values['department.item'].value});
				transaction.save({});
			},
			/**
			 * Executes when the summarize entry point is triggered and applies to the result set.
			 *
			 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
			 * @since 2015.1
			 */
			summarize: function (summary) {
				summary.mapSummary.errors.iterator().each(function(key, error){
					log.error({title: 'Map Error', details: key + ' -- ' + error});
					return true;
				});
			}
		};
	});
