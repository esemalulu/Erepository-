/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

Ext4.define('RA.Cmp.Cache.Base', {
	extend: 'Ext4.data.JsonStore',
	autoLoad: false,

	/**
	 * Loads a record from NetSuite via Suitelet.
	 * When creating a subclass, include config for data model.
	 * As the result may be network-dependent, this function accepts a callback parameter which will be called once a response is successfully received.
	 * The same callback function will be called even if the record already exists in the cache/store.
	 *
	 * @param recordId - By default, the Internal ID of the record to be loaded, unless target Suitelet has a special behavior.
	 * @param callback - Function that receives the loaded record for processing. Called whether or not the record exists in the cache.
	 *                   This function will receive an array containing a single record (technical limitation). Make sure to work around this when writing the callback function.
	 */
	loadRecord: function (recordId, callback) {
		var record = this.getById(Number(recordId));

		if (record) {
			callback([record]);
		} else {
			this.load({
				addRecords: true,
				callback: callback,
				params: {
					recordId: recordId
				}
			});
		}
	},
});