/**
 * Copyright (c) 1998-2018 Oracle-NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * * Version    Date            Author           		Remarks
 *   1.00       20 Sept, 2019	Mahesh Pragada		    Initial Version
 *
 * 
 * @NApiVersion 2.x
 * @NScriptType Restlet
 **/

define(['N/search', 'N/record'],
	function (search, record) {
		function getshipment(context) {
			var logTitle = 'savedSearchToJSONLog';
			var objResult = {};
			
				var filtersArray = [];
				var ShipCharges = "";
				if (context.ShipCharges != "")
					ShipCharges = context.ShipCharges
				else
					ShipCharges = "0.11"
				// if order is not null then fliter with order number else 
				// fliter with ocontainer LP number

				if (context.order != "") {
					filtersArray.push(
						["isinactive", "is", "F"],
						"AND",
						["custrecord_wmsse_ship_void", "ISNOT", "R"],
						"AND",
						["custrecord_wmsse_ship_orderno", "IS", context.ordernumber]
					);

				}
				else if (context.contlp != "") {
					filtersArray.push(
						["isinactive", "is", "F"],
						"AND",
						["custrecord_wmsse_ship_void", "ISNOT", "R"],
						"AND",
						["custrecord_wmsse_ship_contlp", "IS", context.CntLP]
					);

				}
				//Crweate a search on Shipamnifest
				var customrecord_wmsse_trn_SearchObj = search.create({
					type: "customrecord_wmsse_ship_manifest",
					filters: filtersArray,
					columns: []
				});
				//run the search and get the results
				var searchResultCount = customrecord_wmsse_trn_SearchObj.runPaged().count;
				log.debug("customrecord_wmsse_trn_SearchObj result count", searchResultCount);
				customrecord_wmsse_trn_SearchObj.run().each(function (result) {

					//load each record from ship manifest with internal id and update Tracking # and Shipping charges and etc...
					var id = record.submitFields({
						type: 'customrecord_wmsse_ship_manifest',
						id: result.id,
						values: {
							custrecord_wmsse_ship_masttrackno: context.MasterTrackNo,
							custrecord_wmsse_ship_charges: ShipCharges,
							custrecord_wmsse_ship_actwght: context.actuvalweight,
							custrecord_wmsse_ship_void: context.updatestatus,
							custrecord_wmsse_ship_trackno: context.trackingnumber,
							custrecord_wmsse_ship_system: context.ComputerName,
							custrecord_wmsse_ship_labelpath: context.LabelFilePath,
							custrecord_wmsse_ship_reprint: false


						}
					});
					return true;
				});
		
			return { "success": true }
		}
		function Bartender(context) {
			var logTitle = 'savedSearchToJSONLog';
			var objResult1 = {};
			log.debug("context.InternalID", context.InternalID);
			
				var filtersArray = [];

				if (context.InternalID != "") 
				{
					var iIds= context.InternalID.split(',');
					filtersArray.push(
						["internalid", "anyof", iIds]						
					);

				}				
				//Create a search on Shipamnifest
				var customrecord_wmsse_trn_SearchObj = search.create({
					type: "customrecord_wmsse_ext_labelprinting",
					filters: filtersArray,
					columns: []
				});
				//run the search and get the results
				var searchResultCount = customrecord_wmsse_trn_SearchObj.runPaged().count;
				log.debug("customrecord_wmsse_trn_SearchObj result count", searchResultCount);
				customrecord_wmsse_trn_SearchObj.run().each(function (result) {

					//load each record from ship manifest with internal id and update Tracking # and Shipping charges and etc...
					log.debug('result.id' , result.id);
					var id = record.submitFields({
						type: 'customrecord_wmsse_ext_labelprinting',
						id: result.id,
						values: {						
							custrecord_wmsse_label_printoption: true
						}
					});
					return true;
				});
		
			return { "success": true }
		}

		function ZEBRA(context) {
			var logTitle = 'savedSearchToJSONLog';
			var objResult1 = {};
			log.debug("ZEBRA context.InternalID", context.InternalID);
			
				var filtersArray = [];

				if (context.InternalID != "") 
				{
					var iIds= context.InternalID.split(',');
					filtersArray.push(
						["internalid", "anyof", iIds]						
					);

				}				
				//Create a search on Shipamnifest
				var customrecord_wmsse_trn_SearchObj = search.create({
					type: "customrecord_wmsse_labelprinting",
					filters: filtersArray,
					columns: []
				});
				//run the search and get the results
				var searchResultCount = customrecord_wmsse_trn_SearchObj.runPaged().count;
				log.debug("customrecord_wmsse_trn_SearchObj result count", searchResultCount);
				customrecord_wmsse_trn_SearchObj.run().each(function (result) {

					//load each record from ship manifest with internal id and update Tracking # and Shipping charges and etc...
					log.debug('result.id' , result.id);
					var id = record.submitFields({
						type: 'customrecord_wmsse_labelprinting',
						id: result.id,
						values: {						
							custrecord_wmse_label_print: true
						}
					});
					return true;
				});
		
			return { "success": true }
		}
		function Submit(context)
		{
			log.debug('context.type' , context.type);
			if(context.type == "getshipmet")
			{
				getshipment(context);
				return { "success": true }
				
			}
			else if(context.type == "bartender")
			{
				Bartender(context);
				return { "success": true }
			}
			else if(context.type == "ZEBRA")
			{
				ZEBRA(context);
				return { "success": true }
			}
		}
		return {
			post: Submit
		};
	});
