/**
 * Scheduled script to run hourly to process SWX Assets loaded from SWX Asset Monthly Load Stage custom record.
 * System will do following for each record loaded
 * 1. Identify Product Name to Netsuite Item
 * 2. Identify Account Name to NetSuite Customer
 * 3. Import matched records into SWX Customer Asset record.
 * 4. When Customer and Item IDs are not identified, staged records will be marked as Pending Research.
 *  	- This is to ensure no duplicate entries are created in Customer Asset Record.
 * 		- When item(s) and/or customer(s) are manaully mapped, those marked as Pending Research will be 
 * 			reset to null so that it can be reprocessed by scheduled script.
 */
var ctx = nlapiGetContext();
var paramProductToItemSearchId = ctx.getSetting('SCRIPT','custscript_pending_prodtoitem_searchid');
var paramAccountToCustomerSearchId = ctx.getSetting('SCRIPT','custscript_pending_accttocust_searchid');
var paramValidStatusId = ctx.getSetting('SCRIPT','custscript_validstatusid');
var paramPendResearchStatusId = ctx.getSetting('SCRIPT','custscript_pendresearchstatusid');
var paramSendNotificationTo = ctx.getSetting('SCRIPT','custscript_sendnotificationto');
	
//exit count set higher since we are using searchRecord API which returns 1000 results.
var EXIT_COUNT= 5000;

function ProcessMonthlySwxAssetLoad(type) {

	var curProcessAssetLoadText = '';
	
	//Mod request: 11/11/2013
	//Query SWX Items to Not Renew (customrecord_ax_swx_norenew_items) custom record for Active NOT Renwe Items
	//	- Active means those records NOT checked as "Inactive"
	var itemsNotToRenew = new Array();
	try {
		
		//Mod request: 11/11/2013
		//- Instead of using part number to identify Not to be Renewed items, use custom record.
		//  This is because part number may change. 
		var norenewflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		var norenewcol = [new nlobjSearchColumn('custrecord_swxinr_item')];
		var norenewrs = nlapiSearchRecord('customrecord_ax_swx_norenew_items', null, norenewflt, norenewcol);
		for (var nr=0; norenewrs && nr < norenewrs.length; nr++) {
			if (!itemsNotToRenew.contains(norenewrs[nr].getValue('custrecord_swxinr_item'))) {
				itemsNotToRenew.push(norenewrs[nr].getValue('custrecord_swxinr_item'));
			}
		}
		
		//search for pending assets to process
		var pendingFlt = [new nlobjSearchFilter('custrecord_ax_swxa_processed', null, 'is', 'F'),
						  new nlobjSearchFilter('isinactive', null, 'is','F')];
		
		var pendingCol = [new nlobjSearchColumn('internalid').setSort(true),
		                  new nlobjSearchColumn('custrecord_ax_swxa_account'), new nlobjSearchColumn('custrecord_ax_swxa_entitle_enddate'),
		                  //new nlobjSearchColumn('custrecord_ax_swxa_endcust_regdate'), new nlobjSearchColumn('custrecord_ax_swxa_upgrade_kidreq'),
		                  new nlobjSearchColumn('custrecord_ax_swxa_productname'), new nlobjSearchColumn('custrecord_ax_swxa_qty'),
		                  new nlobjSearchColumn('custrecord_ax_swxa_seatid'), new nlobjSearchColumn('custrecord_ax_swxa_assetnum'),
		                  new nlobjSearchColumn('custrecord_ax_swxa_serialnum'), new nlobjSearchColumn('custrecord_ax_swxa_partnum'),
		                  //new nlobjSearchColumn('custrecord_ax_swxa_orig_order'), 
		                  new nlobjSearchColumn('custrecord_ax_swxa_endcust_contact_nm'),
		                  new nlobjSearchColumn('custrecord_ax_swxa_endcust_contact_email'), new nlobjSearchColumn('custrecord_ax_swxa_endcust_contact_ph'),
		                  //new nlobjSearchColumn('custrecord_ax_swxa_endcust_site'),
		                  new nlobjSearchColumn('custrecord_ax_swxa_endcust_ctry'),
		                  new nlobjSearchColumn('custrecord_ax_swxa_endcust_addr'), new nlobjSearchColumn('custrecord_ax_swxa_endcust_addr2'),
		                  new nlobjSearchColumn('custrecord_ax_swxa_endcust_city'), new nlobjSearchColumn('custrecord_ax_swxa_endcust_state'),
		                  new nlobjSearchColumn('custrecord_ax_swxa_endcust_zip')];
		var pendingRslt = nlapiSearchRecord('customrecord_ax_swxa_stage', null, pendingFlt, pendingCol);
		
		var isRescheduled = false;
		var hasRecordsToProcess = false;
		
		for (var i=0; pendingRslt && i < pendingRslt.length; i++) {
			
			if (!hasRecordsToProcess) {
				hasRecordsToProcess = true;
			}
			
			//0. Objectize result row for easy access
			var pobj = new Object();
			pobj.id = pendingRslt[i].getId();
			pobj.accountname = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_account'));
			pobj.entitleenddate = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_entitle_enddate'));
			//pobj.registereddate = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_regdate'));
			//pobj.upgradekit = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_upgrade_kidreq'));
			pobj.productname = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_productname'));
			pobj.qty = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_qty'));
			pobj.seatid = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_seatid'));
			pobj.assetnum = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_assetnum'));
			pobj.serialnum = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_serialnum'));
			pobj.partnum = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_partnum'));
			//pobj.origorder = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_orig_order'));
			pobj.contactname = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_contact_nm'));
			pobj.contactemail = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_contact_email'));
			pobj.contactphone = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_contact_ph'));
			//pobj.site = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_site'));
			pobj.country = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_ctry'));
			pobj.addr1 = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_addr'));
			pobj.addr2 = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_addr2'));
			pobj.city = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_city'));
			pobj.state = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_state'));
			pobj.zip = nvlval(pendingRslt[i].getValue('custrecord_ax_swxa_endcust_zip'));
			//match related
			pobj.customerid = '';
			pobj.itemid = '';
			pobj.customerassetid = '';
			//mod 1/6/2014 - Capture existing customer assets' searial number and entitlement date 
			//				 to make sure these data points are DIFFERENT before updating
			pobj.customerassetentdate = '';
			
			pobj.customeracctmapid = '';
			pobj.customeracctmatches = new Array();
			pobj.customeracctmatchnotes = '';
			pobj.itemprodmapid = '';
			pobj.itemprodmatches = new Array();
			pobj.itemprodmatchnotes = '';
			pobj.acctmatchstatus = '';
			pobj.prodmatchstatus = '';
			pobj.stagestatus = '';
			
			curProcessAssetLoadText = pobj.id+' // '+pobj.accountname+ ' // '+pobj.productname;
			
			//Step 1. See if Account name to customer mapping exists
			/**
			 * Case1: Mapping already exists with Account Name
			 * 			Set customerId, customerAcctMapId
			 * 			!NOTE:
			 * 				- Even if match is found, customer ID maybe blank and validation status still set to Pending Validation
			 * Case2: No Mapping Exists -> Global Search on Account Name against customer Record
			 * 
			 * 			Case 2-a: Exact one to one match is found
			 * 				Set customerId ONLY
			 * 
			 * 	//MOD 1/11/2014 - Contact can be linked to entities other than Customer.
			 * 					  MUST check to make sure matched entity is CUSTOMER
			 * 					  IF entity is NOT a customer, MOVE to CASE 3 and mark as NOTHING FOUND
			 * 			Case 2-b: Multiple Matches found
			 * 				Set arCustomerAcctPotentialMatches
			 * 
			 * Case3: Nothing found
			 * 			customerId, customerAcctMapId, arCustomerAcctPotentialMatches all set to null
			 * 
			 * Step 1a - when case2b or case3, run final search using customer contact email
			 */
			
			var acctCustMapFlt = [new nlobjSearchFilter('custrecord_ax_swxacm_load_acctname', null, 'is', pobj.accountname)];
			var acctCustMapCol = [new nlobjSearchColumn('internalid'), 
			                      new nlobjSearchColumn('custrecord_ax_swxacm_customer')];
			var acctCustRslt = nlapiSearchRecord('customrecord_ax_swxac_map', null, acctCustMapFlt, acctCustMapCol);
			//flag to run secondary search using contact email
			var execContactSearch = false;
			if (acctCustRslt) {
				//set customerId and customerAcctMapId
				pobj.customerid = acctCustRslt[0].getValue('custrecord_ax_swxacm_customer');
				pobj.customeracctmapid = acctCustRslt[0].getId(); 
				
				log('debug','Account: '+pobj.accountname, 
					'Mapping Exists: '+acctCustRslt[0].getId()+' ('+acctCustRslt[0].getText('custrecord_ax_swxacm_customer')+')');
			} else {
				//Mapping does not exists, attempt to search and find matching customer in netsuite using accountname
				//Use Global Search 
				var globalSearchKeyword = 'cust:'+pobj.accountname;
				var customerGlobalSearchRslt = nlapiSearchGlobal(globalSearchKeyword);
				if (customerGlobalSearchRslt) {
					
					//Mod 12/10/2013 - Check to make sure record type is customer
					
					if (customerGlobalSearchRslt.length == 1 && customerGlobalSearchRslt[0].getRecordType() == 'customer') {
						//found one to one match using global search
						pobj.customerid = customerGlobalSearchRslt[0].getId();
						pobj.acctmatchstatus = paramValidStatusId;
						pobj.customeracctmatchnotes = 'Globa search using '+globalSearchKeyword+' found one to one match';
						log('debug','Account: '+pobj.accountname, 
							'Found Customer: '+customerGlobalSearchRslt[0].getValue('name')+' ('+customerGlobalSearchRslt[0].getId()+')');
						
					} else {
						pobj.acctmatchstatus = paramPendResearchStatusId;
						pobj.customeracctmatchnotes = 'Globa search using '+globalSearchKeyword+' found Multiple matches.';
						execContactSearch = true;
						//found multiple matches
						//loop through and set arCustomerAcctPotentialMatches
						for (var cpm=0; cpm < customerGlobalSearchRslt.length; cpm++) {
							if (customerGlobalSearchRslt[cpm].getRecordType() == 'customer' && !pobj.customeracctmatches.contains(customerGlobalSearchRslt[cpm].getId())) {
								pobj.customeracctmatches.push(customerGlobalSearchRslt[cpm].getId());
							}
							
						}
						
						log('debug','Account: '+pobj.accountname,
							'Found Multiple Matches: '+pobj.customeracctmatches.length+' found');
						
						//If GLobal Search result has no CUSTOMER record, execute contact search
						if (pobj.customeracctmatches.length == 0) {
							execContactSearch = true;
						}
					}
				} else {
					pobj.acctmatchstatus = paramPendResearchStatusId;
					pobj.customeracctmatchnotes = 'Globa search using '+globalSearchKeyword+' found No match';
					execContactSearch = true;
					log('debug','Account: '+pobj.accountname, 'Unable to find customer in NetSuite');
				}
			}
			//Step 1a. search using contact email if exists
			if (execContactSearch && pobj.contactemail) {
				var acctContactFlt = [new nlobjSearchFilter('email', null, 'is', pobj.contactemail),
				                      new nlobjSearchFilter('isinactive', null, 'is','F'),
				                      new nlobjSearchFilter('stage','parentcustomer','anyof',['CUSTOMER']),
				                      new nlobjSearchFilter('isinactive', 'parentcustomer', 'is','F')];
				var acctContactCol = [new nlobjSearchColumn('company')];
				var acctContactRslt = nlapiSearchRecord('contact', null, acctContactFlt, acctContactCol);
				if (acctContactRslt) {
					//Mod 1/11/2014 - Validate to make sure matched entity is a customer.
					//Search against Entity record to find out TYPE of record.
					var matchedEntityId = acctContactRslt[0].getValue('company');
					var etflt = [new nlobjSearchFilter('internalid', null, 'anyof',matchedEntityId),
					             new nlobjSearchFilter('isinactive', null, 'is','F')];
					var etcol = [new nlobjSearchColumn('type')];
					var etrs = nlapiSearchRecord('entity', null, etflt, etcol);
					//REturned Value MUST be "Customer"
					if (etrs && etrs.length > 0 && etrs[0] && etrs[0].getText('type') == 'Customer') {
						pobj.customeracctmatchnotes = ' || Contact search using '+pobj.contactemail+' found a match. Need validation';
						pobj.customerid = matchedEntityId;
					} else {
						pobj.customeracctmatchnotes = ' || Contact search using '+pobj.contactemail+' found found NO Match';
					}
				} else {
					pobj.customeracctmatchnotes = ' || Contact search using '+pobj.contactemail+' found NO Match';
				}
			}
			
			
			//Step 2. See if Product name to item mapping exists
			/**
			 * Case 1: Mapping already exists with Product Name
			 * 		- Set itemid and itemprodmapid
			 * 
			 * Case 2: One to One match exists with Vendor Name and Part #
			 * 		- Set itemid
			 * 		- Mark as Valid Match
			 * 
			 * Case 3: Run global search on item record with product name
			 * 		- Set potential matches
			 * 		- mark as Pending research 
			 */
			var prodItemMapFlt = [new nlobjSearchFilter('custrecord_ax_swxpim_load_productname', null, 'is', pobj.productname),
			                      new nlobjSearchFilter('isinactive', null, 'is','F')];
			var prodItemMapCol = [new nlobjSearchColumn('internalid'),
			                      new nlobjSearchColumn('custrecord_ax_swxpim_item')];
			var prodItemRslt = nlapiSearchRecord('customrecord_ax_swxpi_map', null, prodItemMapFlt, prodItemMapCol);
			if (prodItemRslt) {
				//set itemId and itemProductMapId
				pobj.itemid = prodItemRslt[0].getValue('custrecord_ax_swxpim_item');
				pobj.itemprodmapid = prodItemRslt[0].getId(); 
				
				log('debug','Product: '+pobj.productname, 
					'Mapping Exists: '+prodItemRslt[0].getId()+' ('+prodItemRslt[0].getText('custrecord_ax_swxpim_item')+')');
			} else {
				
				//Check 1: Search against Vendor Name using Part #
				//		- This seems to yield one to one match
				var itemFlt = [new nlobjSearchFilter('vendorname', null, 'is', pobj.partnum),
				               new nlobjSearchFilter('isinactive', null, 'is','F')];
				var itemCol = [new nlobjSearchColumn('internalid')];
				var itemRslt = nlapiSearchRecord('item', null, itemFlt, itemCol);
				if (itemRslt) {
					pobj.prodmatchstatus = paramValidStatusId;
					pobj.itemid = itemRslt[0].getId();
					pobj.itemprodmatchnotes = 'Found one to one match with Vendor Name using Part# of '+pobj.partnum;
					
					log('debug','Product: '+pobj.productname,
						'Vendor Name match found using Part#: '+pobj.partnum);
					
				} else {
					//Check 2: Run Global Search to see potential patches
					//		- Global match will always be marked as Pending Research
					pobj.prodmatchstatus = paramPendResearchStatusId;
					
					var globalItemSearchKeyword = 'item:'+pobj.productname;
					var itemGlobalSearchRslt = nlapiSearchGlobal(globalItemSearchKeyword);
					if (itemGlobalSearchRslt) {
						
						for (var ipm=0; ipm < itemGlobalSearchRslt.length; ipm++) {
							if (!pobj.itemprodmatches.contains(itemGlobalSearchRslt[ipm].getId())) {
								pobj.itemprodmatches.push(itemGlobalSearchRslt[ipm].getId());
							}
						}
						
						pobj.itemprodmatchnotes = 'Found one or many match(es) using global search keyword: '+globalItemSearchKeyword;
						
						log('debug','Product: '+pobj.productname,
							'Found one or many match(es) using global search keyword: '+globalItemSearchKeyword+' (Size: '+itemGlobalSearchRslt.length);
						
					} else {
						
						pobj.itemprodmatchnotes = 'Found NO match using global search keyword: '+globalItemSearchKeyword;
						
						log('debug','Product: '+pobj.productname,
								'Found NO match using global search keyword: '+globalItemSearchKeyword);
						
					}
				}
			}
			
			//Step 4: create account to customer mapping record for NEW or Unmatched account 
			log('debug','customer accoutn map ID', pobj.accountname+ ' // '+pobj.customeracctmapid);
			if (!pobj.customeracctmapid) {
				var custacctmapRec = nlapiCreateRecord('customrecord_ax_swxac_map');
				custacctmapRec.setFieldValue('name', pobj.accountname);
				custacctmapRec.setFieldValue('custrecord_ax_swxacm_customer', pobj.customerid);
				custacctmapRec.setFieldValue('custrecord_ax_swxacm_vstatus', pobj.acctmatchstatus);
				custacctmapRec.setFieldValues('custrecord_ax_swxacm_potentialmatches', pobj.customeracctmatches);
				custacctmapRec.setFieldValue('custrecord_ax_swxacm_matchnotes', pobj.customeracctmatchnotes);
				custacctmapRec.setFieldValue('custrecord_ax_swxacm_load_acctname', pobj.accountname);
				custacctmapRec.setFieldValue('custrecordax_swxacm_load_custemail', pobj.contactemail);
				
				pobj.customeracctmapid = nlapiSubmitRecord(custacctmapRec, true, true);
			}
			
			//Step 5: create product to item mapping record for NEW or Unmatched product
			if (!pobj.itemprodmapid) {
				log('debug','Adding product map: '+pobj.productname);
				var itemprodmapRec = nlapiCreateRecord('customrecord_ax_swxpi_map');
				itemprodmapRec.setFieldValue('name',pobj.productname);
				itemprodmapRec.setFieldValue('custrecord_ax_swxpim_item', pobj.itemid);
				itemprodmapRec.setFieldValue('custrecord_ax_swxpim_vstatus', pobj.prodmatchstatus);
				itemprodmapRec.setFieldValues('custrecord_ax_swxpim_potentialmatches', pobj.itemprodmatches);
				itemprodmapRec.setFieldValue('custrecord_ax_swxpim_matchnote', pobj.itemprodmatchnotes);
				itemprodmapRec.setFieldValue('custrecord_ax_swxpim_load_productname', pobj.productname);
				itemprodmapRec.setFieldValue('custrecord_ax_swxpim_load_partnum', pobj.partnum);
				
				pobj.itemprodmapid = nlapiSubmitRecord(itemprodmapRec, true, true);
			}
			
			
			log('debug','Steps 4 and 5 executed','--------------------');
			
			//Step 6: set stage status based on match process and find existing CustomerAsset ID. 
			//		-Both customer and item ID must be found to be marked as validated
			//MOD request: Customer, Item AND serial number makes it unique
			
			if (pobj.customerid && pobj.itemid)  {
				pobj.stagestatus = paramValidStatusId;
				//search for existing customer assed record
				var custAssetFlt = [new nlobjSearchFilter('custrecord_ax_cswxa_customer', null, 'anyof', pobj.customerid),
				                    new nlobjSearchFilter('custrecord_ax_cswxa_nsitem', null, 'anyof', pobj.itemid),
				                    new nlobjSearchFilter('custrecord_ax_cswxa_serialnum',null,'is',pobj.serialnum.toString())];
				//mod 1/6/2014 - Capture existing customer assets' searial number and entitlement date 
				//				 to make sure these data points are DIFFERENT before updating
				//				 Search and return entitlement date column for comparison
				var custAssetCol = [new nlobjSearchColumn('internalid'),
				                    new nlobjSearchColumn('custrecord_ax_cswxa_entitleenddt'),
				                    new nlobjSearchColumn('custrecord_ax_cswxa_qty')];
				var custAssetRslt = nlapiSearchRecord('customrecord_ax_cswx_assets', null, custAssetFlt, custAssetCol);
				//assume there is only ONE. Customer and Item ids combines make sit unique
				if (custAssetRslt) {
					pobj.customerassetid = custAssetRslt[0].getId();
					//mod 1/6/2014 - Capture existing customer assets' searial number and entitlement date 
					//				 to make sure these data points are DIFFERENT before updating
					//				 Search will return customer asset record that matches serial number.
					//				 customerassetentdate is used for comparison.
					pobj.customerassetentdate = custAssetRslt[0].getValue('custrecord_ax_cswxa_entitleenddt');
					
					//Mod 6/26/2014 - Set Current Assets Qty for comparison
					//				  if Serial Number is the same AND entitlement date is the same AND Quantity is different, 
					//				  we need to ONLY update the quantity while everything else stays the same.
					//				  This addresses people simply buying additional licenses.
					pobj.customerassetqty = custAssetRslt[0].getValue('custrecord_ax_cswxa_qty');
				}
				
			} else {
				pobj.stagestatus = paramPendResearchStatusId;
			}
			
			//Step 7: Create new Customer Asset record IF customerAssetID is null AND status is valid or update 
			if (pobj.stagestatus == paramValidStatusId) {
				
				//MOD request: Set Asset Status to Renewed except for certain customers
				//2/11/2014 Defect: 3=Renewed, 4=Not to be Renewed
				//Below mapping are incorrect
				//4 Renewed
				//5 Not to be Renewed
				
				if (!pobj.customerassetid) {
				
					var assetStatus = '3'; //Renewed
					
					//Mod Req: 11/11/2013 - look for not to be renewed item from custom record instead of using part number
					if (itemsNotToRenew.contains(pobj.itemid)) {
						assetStatus = '4';
					}
					
					var custassetRec = nlapiCreateRecord('customrecord_ax_cswx_assets');
					custassetRec.setFieldValue('custrecord_ax_cswxa_customer', pobj.customerid);
					custassetRec.setFieldValue('custrecord_ax_cswxa_acctmap', pobj.customeracctmapid);
					custassetRec.setFieldValue('custrecord_ax_cswxa_nsitem', pobj.itemid);
					custassetRec.setFieldValue('custrecord_ax_cswxa_product_map', pobj.itemprodmapid);
					custassetRec.setFieldValue('custrecord_ax_cswxa_qty', pobj.qty);
					custassetRec.setFieldValue('custrecord_ax_cswxa_seatid', pobj.seatid.toString());
					custassetRec.setFieldValue('custrecord_ax_cswxa_serialnum', pobj.serialnum.toString());
					custassetRec.setFieldValue('custrecord_ax_cswxa_assetnum', pobj.assetnum.toString());
					custassetRec.setFieldValue('custrecord_ax_cswxa_entitleenddt', pobj.entitleenddate);					
					custassetRec.setFieldValue('custrecord_ax_cswxa_registeredto', pobj.contactname);
					custassetRec.setFieldValue('custrecord_ax_cswxa_registeredto_email', pobj.contactemail);
					custassetRec.setFieldValue('custrecord_ax_cswxa_assetstatus', assetStatus);
					pobj.customerassetid = nlapiSubmitRecord(custassetRec, true, true);
				} else {
					
					//update existing asset record
					//pobj.customerassetentdate
					//mod 1/6/2014 - Capture existing customer assets' searial number and entitlement date 
					//				 to make sure these data points are DIFFERENT before updating
					//				 Search will return customer asset record that matches serial number.
					//				 customerassetentdate is used for comparison.
					if (pobj.customerassetentdate && pobj.customerassetentdate !=pobj.entitleenddate) {
						var assetUpdFlds = ['custrecord_ax_cswxa_customer',
						                    'custrecord_ax_cswxa_acctmap',
						                    'custrecord_ax_cswxa_nsitem',
						                    'custrecord_ax_cswxa_product_map',
						                    'custrecord_ax_cswxa_qty',
						                    'custrecord_ax_cswxa_seatid',
						                    'custrecord_ax_cswxa_serialnum',
						                    'custrecord_ax_cswxa_assetnum',
						                    'custrecord_ax_cswxa_entitleenddt',
						                    'custrecord_ax_cswxa_registeredto',
						                    'custrecord_ax_cswxa_registeredto_email'];
						var assetUpdVals = [pobj.customerid, 
						                    pobj.customeracctmapid,
						                    pobj.itemid,
						                    pobj.itemprodmapid,
						                    pobj.qty,
						                    pobj.seatid.toString(),
						                    pobj.serialnum.toString(),
						                    pobj.assetnum.toString(),
						                    pobj.entitleenddate,
						                    pobj.contactname,
						                    pobj.contactemail];
						
						//Mod Req: 11/27/2013
						// When asset exists, as long as items is NOT one of NOT TO BE Renewed
						//	 Modify Asset Status to Renewed
						if (!itemsNotToRenew.contains(pobj.itemid)) {
							assetUpdFlds.push('custrecord_ax_cswxa_assetstatus');
							assetUpdVals.push('3');
						}
						
						nlapiSubmitField('customrecord_ax_cswx_assets', pobj.customerassetid, assetUpdFlds, assetUpdVals, true);
						
					} else if (pobj.customerassetentdate && pobj.customerassetentdate == pobj.entitleenddate && pobj.qty != pobj.customerassetqty) {
						//Mod 6/26/2014 - Update Quantity ONLY
						nlapiSubmitField('customrecord_ax_cswx_assets', pobj.customerassetid, 'custrecord_ax_cswxa_qty', pobj.qty, true);
					}
				}
			}
			
			//Step 8: Update Asset Stage record
			var assetStageFlds = ['custrecord_ax_swxa_processed','custrecord_ax_swxa_status'];
			var assetStageVals = ['T', pobj.stagestatus];
			nlapiSubmitField('customrecord_ax_swxa_stage', pobj.id, assetStageFlds, assetStageVals, true);
			
			if (ctx.getRemainingUsage() <= EXIT_COUNT && (i+1) < pendingRslt.length) {
				isRescheduled = true;
				log('debug','Rescheduling at Internal ID ',pendingRslt[i].getId());
				var param = new Array();
				param['custscript_pending_prodtoitem_searchid'] = paramProductToItemSearchId;
				param['custscript_pending_accttocust_searchid'] = paramAccountToCustomerSearchId;
				param['custscript_validstatusid'] = paramValidStatusId;
				param['custscript_pendresearchstatusid'] = paramPendResearchStatusId;
				param['custscript_sendnotificationto'] = paramSendNotificationTo;
				
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		}
		  
		//if overall processing is completed and has processed SOME staged records send out notification
		if (hasRecordsToProcess && !isRescheduled) {
			//Send Notification with search results
			var executionDate = new Date();
			var strExecDate = (executionDate.getMonth()+1) + '/' + executionDate.getDate() + '/' + executionDate.getFullYear();
			var msg = 'System completed processing newly loaded Asset Records<br/>';
			var pendingItemMapCount = 0, pendingCustomerMapCount=0;
			var pendingItemMapResultSet = nlapiLoadSearch(null, paramProductToItemSearchId).runSearch();
			var pendingCustomerMapResultSet = nlapiLoadSearch(null, paramAccountToCustomerSearchId).runSearch();
			//get total count of pending item validation
			//Defect found 2/11/2014 - Found that Count was using pendingCustomerMapResultSet instead of pendingItemMapResultSet
			if (pendingItemMapResultSet) {
				pendingItemMapCount = pendingItemMapResultSet.getResults(0, 1000).length;
			}
			//get total count of pending customer validation
			if (pendingCustomerMapResultSet) {
				pendingCustomerMapCount = pendingCustomerMapResultSet.getResults(0, 1000).length;
			}
			msg += 'As of '+strExecDate+' following pending mapping records require your attention:<br/><br/><ul>'+
				   '<li><b># of Product to NetSuite Item Pending Validation:</b> '+pendingItemMapCount+'</li>'+
				   '<li><b># of Account to NetSuite Customer Pending Validation:</b> '+pendingCustomerMapCount+'</li></ul>'+
				   '<br/><a href="https://system.netsuite.com'+nlapiResolveURL('TASKLINK', 'LIST_SEARCHRESULTS')+'?searchid='+paramProductToItemSearchId+'">'+
				   'Pending Product to Item Search Result</a><br/>'+
				   '<a href="https://system.netsuite.com'+nlapiResolveURL('TASKLINK', 'LIST_SEARCHRESULTS')+'?searchid='+paramAccountToCustomerSearchId+'">'+
				   'Pending Account to Customer Search Result</a>';
				   
			
			var sbj = 'Loaded Assets Processed';
			nlapiSendEmail(-5, paramSendNotificationTo, sbj, msg);
			
		}
		
	} catch (assetStageError) {
		log('error','Script terminated',curProcessAssetLoadText+ ' :: '+getErrText(assetStageError));
		var errsbj = 'Error occured Processing Monthly Asset Load';
		var errmsg = 'Scheduled script terminated with following error:<br/>'+getErrText(assetStageError);
		nlapiSendEmail(-5, paramSendNotificationTo, errsbj, errmsg);
		
	}
}
