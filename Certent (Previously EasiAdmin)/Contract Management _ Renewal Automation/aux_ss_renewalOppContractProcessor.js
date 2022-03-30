/**
 * Contract Management & Renewal Automation related.
 * Scheduled script to run Daily to generate Renewal Opportunity off of
 * Contracts coming up for renewal.
 *
 * Important Notes:
 * - Item Grouping from previous opportunity MUST be maintained.
 * - Up charge MUST be based on Original Full Amount
 *
*/

/**
 * Returns it in JSON Object format:
 * {
 * 		[itemid]:{
 * 			'name':'',
 * 			'recordtype':'',
 * 			'itemtype':'',
 * 			'baseprice':'',
 * 			'tier':{
 * 				'pricelevelid':{
 * 					'pricelevelname':'',
 * 					'rate':''
 * 				},
 * 				...
 * 			}
 * 		}
 * }
 */

//Script Level Setting
//Last Proc ID
var	paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb135_lastprocid'),
	//Custom Anniversary Date is used for testing and AdHoc execution purposes.
	//When date is passed in, script will use THIS date instead of attempting to calculate from current date
	//	as Contract Anniversary Date filter value
	paramCustomAnniversaryDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb135_ctanvidate'),

	//Pass this in when you ONLY want to renew a single customer
	paramRenewCustomer = nlapiGetContext().getSetting('SCRIPT','custscript_sb135_renewcustomer'),

	//7/17/2016
	//Add in two additional parameters to allow for
	//	Auto Renewal Processing
	paramUseAnviDateAsRenewDate = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb135_anviasrenewaldate'),
	paramContractToProc = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb135_proccontract');

//Company Level Preference
var paramCraErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb131_primaryerr'),
	paramCraCcNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ccerr'),
	paramAcctNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_acctnotifier'),
	paramDefaultQuoteForm = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb131_defquoteform'),
	paramNewOppFormId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_newoppform'),
	paramRenewOppFormId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_renewoppform'),
	paramRecurringItemTypes = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_recuritemtypeids');

	paramActiveStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctractiveid'),
	paramPendingRenewalStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrpendrenewid'),
	paramRenewedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrrenewedid'),
	paramDelayedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrexpiredid'),
	paramTerminatedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrterminatedid'),
	paramDefaultAnnualUplift = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_defupliftperct'),

	paramRenewalNumFromEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_numdays_renewalopp'),
	paramExpCloseDateNumFromEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_numdays_expclosedate'),
	paramFirstRminderNumFromEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_numdays_upcomingrenewal'),
	paramSecondReminderNumFromEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_numdays_renewalreminder'),

	//9/19/2016
	//Default Sales Rep to use when Relationship Manager by Pillar is NOT set on client record
	paramDefaultSalesRep = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb131_defsalesrep'),

	//10/10/2016
	//Enhancement #2
	//Subsidiary Exclusion List
	paramSubsExcludeIds = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_subsexclude');

//10/10/2016
//Enhancement #2
//We know that this will comma separated list of IDs.
//Remove any spaces if the value is set and run split to turn it into an array
if (paramSubsExcludeIds)
{
	//Remove extra spaces
	paramSubsExcludeIds = strGlobalReplace(paramSubsExcludeIds, ' ', '');

	//Turn it into an array
	paramSubsExcludeIds = paramSubsExcludeIds.split(',');
}
else
{
	//If not set, just simply turn it into Empty String
	paramSubsExcludeIds = [];
}

if (paramCraCcNotifier)
{
	paramCraCcNotifier = paramCraCcNotifier.split(',');
}
else
{
	paramCraCcNotifier = null;
}

if (paramRecurringItemTypes)
{
	paramRecurringItemTypes = paramRecurringItemTypes.split(',');
}

var EM_PILLAR = '1',
	DM_PILLAR = '2',
	//9/19/2016
	//Enhancement request to handle DN Pillar
	//Reference to BOTH_PILLAR Removed
	DN_PILLAR = '5';

/**
 * Main Entry function for Contract Renewal Processor
 */
function processCtrAssetRenewals()
{
	var logTblHeader = '<tr><td>Contract (Internal ID)</td>'+
					   '<td>End Company (Internal ID)</td>'+
					   '<td>Billing Entity (Internal ID)</td>'+
					   '<td>Renewal Date</td>'+
					   '<td>Contract Anniversary Date</td>'+
					   '<td>Contract Term</td>'+
					   '<td>Contract Term From/To</td>'+
					   '<td>Status</td>'+
					   '<td>Renewal Opp (Internal ID)</td>'+
					   '<td>Detail</td></tr>',
		logTblBody = '',
		curDateObj = new Date(),
		//Date the Renewal was executed
		renewalDate = '',
		ctAnviDate = '';

	try
	{
		//Search for ALL Upcoming Renewal Contracts.
		//1. Status is Active
		//	- We do not care for those marked as Delayed or Terminated.
		//	- Status of Pending Renewal means it's already gone through the process.
		//2. Inactive is F
		//3. Current date is "paramRenewalNumFromEndDate" from Contract Anniversary date

		//If Custom contract anniversary date is passed in as script parameter,
		//	Use that date as ctAnviDate; Contract Anniversary date filter
		if (paramCustomAnniversaryDate)
		{
			ctAnviDate = paramCustomAnniversaryDate;
			//Renewal date is X days from passed in ctAnviDate
			renewalDate = nlapiDateToString(
								nlapiStringToDate(ctAnviDate), -1*(parseInt(paramRenewalNumFromEndDate))
						  );

			//7/17/2016
			//If use anvi date as renewal date is passed in, use ctAnviDate as renewal Date
			//	This is for Auto Renewal processing ONLY
			if (paramUseAnviDateAsRenewDate == 'T')
			{
				renewalDate = ctAnviDate;
			}

		}
		//Otherwise, we are going to calculate based on paramRenewalNumFromEndDate
		else
		{
			ctAnviDate = nlapiAddDays(curDateObj, paramRenewalNumFromEndDate);
			ctAnviDate = nlapiDateToString(ctAnviDate);
			//Renewal date is current date
			renewalDate = nlapiDateToString(curDateObj);
		}

		log('debug','Num of Days to Renew //Today // CtAnviDate', paramRenewalNumFromEndDate+' // '+renewalDate+' // '+ctAnviDate);

		var ctflt = [new nlobjSearchFilter('custrecord_crc_status', null, 'anyof', paramActiveStatusId),
		             new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		             new nlobjSearchFilter('custrecord_crc_startdate', null, 'on', ctAnviDate)];

		if (paramLastProcId)
		{
			ctflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}

		if (paramRenewCustomer)
		{
			ctflt.push(new nlobjSearchFilter('custrecord_crc_billingentity', null, 'anyof', paramRenewCustomer));
		}

		//7/17/2016
		//If paramContractToProc is passed in, add the filter.
		//	This is for Auto Renewal processing ONLY
		//	and it ensures that we ONLY process renewal against THIS contract
		if (paramContractToProc)
		{
			ctflt.push(new nlobjSearchFilter('internalid', null, 'anyof', paramContractToProc));
		}

		//10/13/2016
		//Part of Enhancement #2
		//if paramSubsExcludeIds has IDs in the array, ONLY return list of sales orders that
		//does NOT belong to identified subsidiaries
		if (paramSubsExcludeIds.length > 0)
		{
			//We do NOT process ANY Contract where linked Billing Entity Subsidiary is one of exclusion subsidiary
			ctflt.push(new nlobjSearchFilter('subsidiary', 'custrecord_crc_billingentity', 'noneof', paramSubsExcludeIds));
		}

		//Return columns. Some needed for logging purposes
		var ctcol = [
		             new nlobjSearchColumn('internalid').setSort(true),
		             new nlobjSearchColumn('name'),
		             new nlobjSearchColumn('custrecord_crc_contractterm'),
		             new nlobjSearchColumn('custrecord_crc_termstartdate'),
		             new nlobjSearchColumn('custrecord_crc_termenddate'),
		             new nlobjSearchColumn('custrecord_crc_enduser'),
		             new nlobjSearchColumn('custrecord_crc_billingentity'),
		             new nlobjSearchColumn('custrecord_crc_upliftpct'),
		             new nlobjSearchColumn('custrecord_crc_renewopp'),
		             new nlobjSearchColumn('custrecord_crc_ctrpillar'),
					 new nlobjSearchColumn('custrecord_crc_startdate'),
		             new nlobjSearchColumn('custentityrelationship_manager','custrecord_crc_billingentity'), //EM Manager
		             new nlobjSearchColumn('custentity_rm_filing','custrecord_crc_billingentity'), //DM Manager
		             //9/19/2016
		             //Bring out DN Manager info
		             new nlobjSearchColumn('custentity_relmgr_dn','custrecord_crc_billingentity'),
		             //10/14/2016
		             //Part of Enhancement #2
		             //Bring out Contract Currency so that Renewal Opp can be created with same currency
		             new nlobjSearchColumn('custrecord_crc_ctrcurrency')
		             ];

		//Search for all upcoming renewal contracts
		var ctrs = nlapiSearchRecord('customrecord_axcr_contract', null, ctflt, ctcol);

		//Loop through each
		for (var i=0; ctrs && i < ctrs.length; i+=1)
		{
			//1. Grab list of ALL contract column values
			var ctjson = {
				'id':ctrs[i].getValue('internalid'),
				'name':ctrs[i].getValue('name'),
				'terminmonths':ctrs[i].getValue('custrecord_crc_contractterm'),
				'termstart':ctrs[i].getValue('custrecord_crc_termstartdate'),
				'termend':ctrs[i].getValue('custrecord_crc_termenddate'),
				'enduserid':ctrs[i].getValue('custrecord_crc_enduser'),
				'endusertext':ctrs[i].getText('custrecord_crc_enduser'),
				'billentityid':ctrs[i].getValue('custrecord_crc_billingentity'),
				'billentitytext':ctrs[i].getText('custrecord_crc_billingentity'),
				'uplift':ctrs[i].getValue('custrecord_crc_upliftpct'),
				'oppref':ctrs[i].getValue('custrecord_crc_renewopp'),
				'pillar':ctrs[i].getValue('custrecord_crc_ctrpillar'),
				'pillartext':ctrs[i].getText('custrecord_crc_ctrpillar'),
				'conanidate':ctrs[i].getValue('custrecord_crc_startdate'),
				'emmgrname':ctrs[i].getText('custentityrelationship_manager','custrecord_crc_billingentity'),
				'dmmgrname':ctrs[i].getText('custentity_rm_filing','custrecord_crc_billingentity'),
				//9/19/2016
				//Grab DN Relationship Manager from Billing Entity
				'dncmgrname':ctrs[i].getText('custentity_relmgr_dn','custrecord_crc_billingentity'),
				//10/14/2016
				//Part of Enhancement #2
				//add contract currency to ctjson
				'currency':ctrs[i].getValue('custrecord_crc_ctrcurrency')
			};

			//9/19/2016
			// Convert pillar into an array split by ,
			// We've converted all Contract Modules' Custom Records' Pillar field to multiselect
			if (ctjson.pillar)
			{
				ctjson.pillar = ctjson.pillar.split(',');
			}

			log('debug','contract json',JSON.stringify(ctjson));

			try
			{
				//1. Grab list of ALL Assets linked to THIS contract where
				//	- Asset Status = Active
				//	- Is Recurring = CHECKED
				//	- Is Cancelled = NOT CHECKED
				//	- Is Inactive = NOT CHECKED
				//	- Entitlement End Date matches Contract Anniversasry date
				var asflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
				             new nlobjSearchFilter('custrecord_cra_assetstatus', null, 'anyof', paramActiveStatusId),
				             new nlobjSearchFilter('custrecord_cra_recurring', null, 'is', 'T'),
				             new nlobjSearchFilter('custrecord_cra_iscancelled', null, 'is', 'F'),
				             new nlobjSearchFilter('custrecord_cra_contract', null, 'anyof', ctjson.id),
				             new nlobjSearchFilter('custrecord_cra_entenddate', null, 'on', ctAnviDate)],
				    ascol = [
				             new nlobjSearchColumn('internalid'),
				             new nlobjSearchColumn('custrecord_cra_item'),
				             new nlobjSearchColumn('custrecord_cra_itemqty'),
				             new nlobjSearchColumn('custrecord_cra_isaddedtocontract'), //Mark to indicate if it was Added to contract
				             new nlobjSearchColumn('custrecord_cra_actualsalesprice'), //Actual = Amount
				             new nlobjSearchColumn('custrecord_cra_originalsalesprice'), //Original = Original Full Amount
				             new nlobjSearchColumn('custrecord_cra_pricingtier'),
				             new nlobjSearchColumn('custrecord_cra_parentitemgrp').setSort(),
				             new nlobjSearchColumn('custrecord_cra_parentitemgrpqty'),
				             new nlobjSearchColumn('custrecord_cra_billingschedule'),
				             //7/16/2016
				             //	Grab Is Recurring, Is Concession and Is Add On To Install Base values out
				             new nlobjSearchColumn('custrecord_cra_recurring'), //Grab is recurring flag
				             new nlobjSearchColumn('custrecord_cra_isconcession') //Grab is concession flag
				             ],
				    asrs = nlapiSearchRecord('customrecord_axcr_assets', null, asflt, ascol),

				    itemGroupIds = [],
				    //Item Group JSON will keep track of all items within that group.
				    //	This will become very useful when removing items to default list of Item Group elements
				    //	It is also assumed that all items within a single group are treated as ONE.
				    //		This means all items qty and amount will be added up.
				    //		It assume it uses same price level.
				    /**
				    {
						[item group id]:{
							'qty':xx,
							'[itemit]':{
								'qty':xx,
								'amount':xx,
								'pricetier':xx
							},
							'[itemit]':{
								'qty':xx,
								'amount':xx,
								'pricetier':xx
							},
							...
						}
				    }
				    */
				    itemGroupJson = {},

				    //Ind. Item JSON will keep track of all Individual stand alone items that are NOT part of group.
				    //	It is assume that Stand Alone items that has same ITEM but different price level are treated as DIFFERENT.
				    /**
				    {
						[itemid-pricetier]:{
							'itemid':xx,
							'itemqty':xx,
							'pricetier':xx,
							'amount':xx
						}
				    }
				    */
				    indItemJson = {};

				if (!asrs)
				{
					//2. Check to see if there are any results. IF NO Result, we set the status as COMPLETEd.
					logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
								  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
								  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
								  '<td>'+renewalDate+'</td>'+
								  '<td>'+ctAnviDate+'</td>'+
								  '<td>'+ctjson.terminmonths+'</td>'+
								  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
								  '<td>Skip</td>'+
								  '<td></td>'+
								  '<td>There are no recurring asset for this contract. '+
								  'This contract will auto expire end of the term</td></tr>';
				}
				else
				{
					/********************** CORE PROCESS to generate Renewal Opportunity ****************************/
					//3. Build JSON object of items to add to renewal Opportunity.
					//	- It is important to note that when dealing with Item Group in Script.
					//		- Item Group must be added.
					//		- Item line fully committed
					//		- THIS process will expand out all elements in between Group and EndGroup tags.
					//	- Item line is considered UNIQUE if it has different price level.
					for (var a=0; a < asrs.length; a+=1)
					{
						var aPriceTier = (asrs[a].getValue('custrecord_cra_pricingtier')?
											asrs[a].getValue('custrecord_cra_pricingtier'):'-1'
										 ),
							indJsonKey = asrs[a].getValue('custrecord_cra_item')+
									  	 '-'+
									  	 aPriceTier,
							//isIgi flag indicates if the asset line is part of an Item Group
							isIgi = (asrs[a].getValue('custrecord_cra_parentitemgrp')?true:false),
							igId = asrs[a].getValue('custrecord_cra_parentitemgrp'),
							igQty = asrs[a].getValue('custrecord_cra_parentitemgrpqty'),
							aItemId = asrs[a].getValue('custrecord_cra_item'),
							aItemQty = asrs[a].getValue('custrecord_cra_itemqty'),
							//aItemAmount = asrs[a].getValue('custrecord_cra_actualsalesprice'),
							//8/9/2016 - Always uses Original Amount (Annual Renewal Amount)
							aItemAmount = asrs[a].getValue('custrecord_cra_originalsalesprice'),
							aBillingSchedule = asrs[a].getValue('custrecord_cra_billingschedule'),

							//7/16/2016 - Grab Is Concession and Is Recurring Field Value Out
							aIsConcession = asrs[a].getValue('custrecord_cra_isconcession'),
							aIsRecurring = asrs[a].getValue('custrecord_cra_recurring'),
							aIsAddedToContract = asrs[a].getValue('custrecord_cra_isaddedtocontract');

							newSalesTeam = [],
							salesTeamWarning = '';

						//3/8/2016 - If asset was added on to contract, use Original amount
						//if (asrs[a].getValue('custrecord_cra_isaddedtocontract') == 'T')
						//{
						//	aItemAmount = asrs[a].getValue('custrecord_cra_originalsalesprice');
						//	log('debug','This is Added','Using Original Amount of '+aItemAmount);
						//}

						//7/16/2016 -
						//Use Original Full Amount IF aIsConcession OR aIsAddedToContract is checked
						//if (aIsConcession == 'T' || aIsAddedToContract == 'T')
						//{
						//	aItemAmount = asrs[a].getValue('custrecord_cra_originalsalesprice');
						//}

						//If Item Group Asset, add to itemGroupJson
						if (isIgi)
						{
							//Add to itemGroupIds array
							if (!itemGroupIds.contains(igId))
							{
								itemGroupIds.push(igId);
							}

							//Add item group element if it doesn't exist
							if (!itemGroupJson[igId])
							{
								//default qty to 0
								itemGroupJson[igId] = {
									'qty':0
								};
							}
							//Add item group qty
							itemGroupJson[igId].qty = parseFloat(itemGroupJson[igId].qty)
													  +
													  parseFloat(igQty);


							//Add item element if it doeosn't exist
							if (!itemGroupJson[igId][aItemId])
							{
								//Default item element qty and amount to 0
								itemGroupJson[igId][aItemId] = {

									'qty':0,
									'amount':0,
									'pricetier':''
								};
							}

							itemGroupJson[igId][aItemId].pricetier = aPriceTier;

							itemGroupJson[igId][aItemId].qty = parseFloat(itemGroupJson[igId][aItemId].qty)
															   +
															   parseFloat(aItemQty);

							itemGroupJson[igId][aItemId].amount = parseFloat(itemGroupJson[igId][aItemId].amount)
																  +
																  parseFloat(aItemAmount);

							itemGroupJson[igId][aItemId].billingsch = aBillingSchedule;
						}
						//Other wise add to indItemJson
						else
						{
							if (!indItemJson[indJsonKey])
							{
								//Default itemqty and amount to 0
								indItemJson[indJsonKey] = {
									'itemid':aItemId,
									'itemqty':0,
									'pricetier':aPriceTier,
									'amount':0,
									'billingsch':aBillingSchedule
								};
							}

							//add to amount and qty
							indItemJson[indJsonKey].itemqty = parseFloat(indItemJson[indJsonKey].itemqty)
															  +
															  parseFloat(aItemQty);

							indItemJson[indJsonKey].amount = parseFloat(indItemJson[indJsonKey].amount)
															 +
															 parseFloat(aItemAmount);
						}

					}//END Building For Loop


					//4/7/2016 - Need to RESET Sales Team to match Billing Customers' EM or DM managers.
					//9/19/2016 - We are now defaulting sales rep to Default Sales Rep if appropriate EM/DM/DN Managers are not set
					// 			  IF NEW Pillar is introduced, below code must be changed.
					if (ctjson.pillar.indexOf(EM_PILLAR) > -1)
					{
						log('debug','EM Pillar Check', '');
						if (!ctjson.emmgrname)
						{
							salesTeamWarning += 'No RM-Equity (EM) Rel. Mgr. Defined for Billing Customer // ';
						}
						else
						{
							log('debug','Look up Sales Rep', 'emp:'+ctjson.emmgrname);
							//look up em pillar manager name
							var emgbss = nlapiSearchGlobal('emp:'+ctjson.emmgrname);
							if (!emgbss || (emgbss && emgbss.length > 1))
							{
								salesTeamWarning += 'No or Multiple employees found for RM-Equity (EM) for '+
												   ctjson.emmgrname+' defined on Billing Customer // ';
							}
							else
							{
								//Only add to newSalesTeam if it hasn't been added yet
								if (newSalesTeam.indexOf(emgbss[0].getId()) == -1)
								{
									newSalesTeam.push(emgbss[0].getId());
								}
							}
						}
					}//end check for em pillar

					if (ctjson.pillar.indexOf(DM_PILLAR) > -1)
					{
						log('debug','DM Pillar Check', '');
						if (!ctjson.dmmgrname)
						{
							salesTeamWarning += 'No RM-File (DM) Rel. Mgr. Defined for Billing Customer // ';
						}
						else
						{
							log('debug','Look up Sales Rep', 'emp:'+ctjson.dmmgrname);

							var dmgbss = nlapiSearchGlobal('emp:'+ctjson.dmmgrname);
							if (!dmgbss || (dmgbss && dmgbss.length > 1))
							{
								salesTeamWarning += 'No or Multiple employees found for RM-File (DM) for '+
												   ctjson.dmmgrname+' defined on Billing Customer // ';
							}
							else
							{
								//Only add to newSalesTeam if it hasn't been added yet
								if (newSalesTeam.indexOf(dmgbss[0].getId()) == -1)
								{
									newSalesTeam.push(dmgbss[0].getId());
								}

							}
						}
					}//end check for dm pillar

					//9/19/2016
					// Add check for DN Pillar
					if (ctjson.pillar.indexOf(DN_PILLAR) > -1)
					{
						log('debug','DN Pillar Check', '');
						if (!ctjson.dncmgrname)
						{
							salesTeamWarning += 'No RM-DN Manager (DN) Rel. Mgr. Defined for Billing Customer // ';
						}
						else
						{
							log('debug','Look up Sales Rep', 'emp:'+ctjson.dncmgrname);

							var dncgbss = nlapiSearchGlobal('emp:'+ctjson.dncmgrname);
							if (!dncgbss || (dncgbss && dncgbss.length > 1))
							{
								salesTeamWarning += 'No or Multiple employees found for RM-DN Manager (DN) for '+
												   ctjson.dncmgrname+' defined on Billing Customer //';
							}
							else
							{
								//Only add to newSalesTeam if it hasn't been added yet
								if (newSalesTeam.indexOf(dncgbss[0].getId()) == -1)
								{
									newSalesTeam.push(dncgbss[0].getId());
								}
							}
						}

					}

					//9/19/2016 Modification
					//	We need to build the sales team to include George M if warning is present
					//	check to make sure default isn't already in it.
					if (salesTeamWarning && newSalesTeam.indexOf(paramDefaultSalesRep) == -1)
					{
						log('debug','Adding Default Sales Rep', salesTeamWarning);
						newSalesTeam.push(paramDefaultSalesRep);
					}

					log('debug','newSalesTeam', newSalesTeam.toString());
					log('debug','salesTeamWarning', salesTeamWarning);

					//4. Build Renewal Opportunity that is based on previous Opp.
					//		- Brand NEW opportunity is created instead of being copied.

					log('debug','Create Opp Start: itemGroupJson', JSON.stringify(itemGroupJson));
					log('debug','Create Opp Start: indItemJson', JSON.stringify(indItemJson));


					//8/26/2016:
					//Need to go around the fact that legacy load will NOT have previous Opportunity
					//	WE NEED TO Make sure it grabs EVERYTHING IT needs from Billing Entity
					//
					var ctLookupVals = {
							'channelpartner':'',
							'customercategory':''
						},
						renewalOpp = nlapiCreateRecord('opportunity', {recordmode:'dynamic', customform:paramRenewOppFormId});

					if (ctjson.oppref)
					{
						log('debug','Looking up info via oppref', ctjson.oppref);

						var ctOppFlds = ['custbody_working_w_channel_partner','custbody_customer_category'],
							ctOppVals = nlapiLookupField('opportunity',ctjson.oppref, ctOppFlds);

						ctLookupVals.channelpartner = ctOppVals['custbody_working_w_channel_partner'];
						ctLookupVals.customercategory = ctOppVals['custbody_customer_category'];
					}
					else
					{
						log('debug','Looking up info via billing entity', ctjson.billentityid);

						//At this point, we assume this was loaded as legacy load
						var billEntFlds = ['custentity_wrok_w_channel_partner','category'],
							billEntVals = nlapiLookupField('customer', ctjson.billentityid, billEntFlds);

						ctLookupVals.channelpartner = billEntVals['custentity_wrok_w_channel_partner'];
						ctLookupVals.customercategory = billEntVals['category'];
					}


					renewalOpp.setFieldValue('entity', ctjson.billentityid);
					renewalOpp.setFieldValue('trandate',renewalDate);
					renewalOpp.setFieldValue('custbody_end_customer', ctjson.enduserid);
					renewalOpp.setFieldValue('custbody_customer_category', ctLookupVals.customercategory);
					renewalOpp.setFieldValue('custbody_renewal','T');
					renewalOpp.setFieldValue('custbody_axcr_contractanivdate', ctjson.conanidate);
					//2/19/2016 - Auto check custbody_axcr_iscratrx checkbox to indicate that this is a Contract Module Opp
					renewalOpp.setFieldValue('custbody_axcr_iscratrx','T');
					renewalOpp.setFieldValue('custbody_working_w_channel_partner', ctLookupVals.channelpartner);
					//Expected Close Date: X number of days before Bill End Date
					//8/3/2016 - This should be BEFORE END DATE not AFTER And Date
					renewalOpp.setFieldValue(
						'expectedclosedate',
						nlapiDateToString(
							nlapiAddDays(
								nlapiStringToDate(ctAnviDate),
								(-1*parseInt(paramExpCloseDateNumFromEndDate))
							)
						)
					);
					//8/9/2016 - Auto set the class to Renewal
					//renewalOpp.setFieldValue('class', ctOppVals['class']);
					//This needs to be based on Channel Partner.
					//IF Channel partner field is BLANK, it should be Dirct > Renewal Class
					//Other wise, Renewal Class should be based on Channel Partner field.
					//Working with Channel parter is sourced from Yes/No List (customlist_yes_no_list)
					//	custom list.
					var YES_VALUE = '2';
					if (ctLookupVals.channelpartner == YES_VALUE)
					{
						//Set the class to Partner Channel Renewal Class
						renewalOpp.setFieldValue('class', nlapiGetContext().getSetting('SCRIPT', 'custscript_sb135_partnerrenewalval'));

						//10/14/2016
						//Part of Enhancement #2
						//If Deal type is Reseller (Working with Channel Partner == Yes), We Default Check
						//custbody_axcr_unsubrenewalemail checkbox.
						//This will unsubscribe it from Automated Renewal Notification emails
						renewalOpp.setFieldValue('custbody_axcr_unsubrenewalemail', 'T');

					}
					else
					{
						//Set the class to Direct Channel Renewal Class
						renewalOpp.setFieldValue('class', nlapiGetContext().getSetting('SCRIPT', 'custscript_sb135_directrenewalval'));
					}


					renewalOpp.setFieldValue('custbody_axcr_contractterm', ctjson.terminmonths);
					renewalOpp.setFieldValue('custbody_axcr_contractreference', ctjson.id);
					//10/14/2016
					//Part of Enhancement #2
					//Set the currency of the Opportunity to match contract
					renewalOpp.setFieldValue('currency', ctjson.currency);

					//7/16/2016 - Add Contract Uplift %
					renewalOpp.setFieldValue('custbody_axcr_upliftperc', ctjson.uplift);

					//4/7/2016 - if newSalesTeam is available, clear out existing and populate with new
					if (newSalesTeam.length > 0)
					{
						//1. Remove ALL existing
						var stline = renewalOpp.getLineItemCount('salesteam');
						for (var r=stline; r >= 1; r-=1)
						{
							renewalOpp.removeLineItem('salesteam', r, false);
						}

						for (var s=0; s < newSalesTeam.length; s+=1)
						{
							renewalOpp.selectNewLineItem('salesteam');
							renewalOpp.setCurrentLineItemValue('salesteam', 'employee', newSalesTeam[s]);
							if (s==0)
							{
								renewalOpp.setCurrentLineItemValue('salesteam','isprimary','T');
							}

							if (newSalesTeam.length > 1)
							{
								//modify it so that first two gets 50/50. If there are 3rd or more, set contribution as 0
								if (s==0 || s==1)
								{
									renewalOpp.setCurrentLineItemValue('salesteam', 'contribution', '50');
								}
								else
								{
									renewalOpp.setCurrentLineItemValue('salesteam', 'contribution', '0');
								}
							}
							else
							{
								renewalOpp.setCurrentLineItemValue('salesteam', 'contribution', '100');
							}
							renewalOpp.commitLineItem('salesteam', true);
						}
					}

					//Begin adding All Asset Line Items.
					var upchargePerc = ctjson.uplift,
						upchargedAmount = '';

					//Upcharge percentage is default to 1 if not specified.
					if (upchargePerc)
					{
						upchargePerc = (parseFloat(upchargePerc.replace('%','')) / 100) + 1;
					}
					else
					{
						upchargePerc = 1;
					}


					//4. Add the item Groups First.
					/**
					 * itemGroupJson format
				    {
						[item group id]:{
							'qty':xx,
							'[itemit]':{
								'qty':xx,
								'amount':xx,
								'pricetier':xx
							},
							'[itemit]':{
								'qty':xx,
								'amount':xx,
								'pricetier':xx
							},
							...
						}
				    }
				    */

					//Calculate new billing start and end date.
					//Equates to [Previous Billing End date] + 1 Day
					var newBillStart=nlapiDateToString(
										nlapiAddDays(
											nlapiStringToDate(ctAnviDate),
											1
										)
								     ),
						//7/16/2016
						// - Renewals will always generate with 12 months billing end date
						//Equates to [Previous Billing End Date] + 12 Months - 1 Day
						newBillEnd=nlapiDateToString(
										nlapiAddDays(
											nlapiAddMonths(
												nlapiStringToDate(newBillStart),
												12
											),
											-1
										)
								   );


					log('debug','ct anvi date // new start // new end', ctAnviDate+' // '+newBillStart+' // '+newBillEnd);

					if (itemGroupIds.length > 0)
					{
						for (var ig=0; ig < itemGroupIds.length; ig+=1)
						{
							renewalOpp.selectNewLineItem('item');
							renewalOpp.setCurrentLineItemValue('item', 'item', itemGroupIds[ig]);
							renewalOpp.commitLineItem('item', false);

							//After Adding EACH item GROUPS, we need to go through and match it up with itemGroupJson
							//	- Find the item group line (start of GROUP)
							var igiLine = renewalOpp.findLineItemValue('item', 'item', itemGroupIds[ig]);

							//Start looping from igiLine and go until it hits First EndGroup line
							var l = igiLine;
							while (renewalOpp.getLineItemValue('item','itemtype',l) != 'EndGroup')
							{
								var lineItJson = itemGroupJson[itemGroupIds[ig]],
									lineItemId = renewalOpp.getLineItemValue('item','item',l);

								//If line item IS item group, ONLY update the quantity
								if (itemGroupIds[ig] == renewalOpp.getLineItemValue('item','item',l))
								{
									renewalOpp.setLineItemValue('item','quantity',l, lineItJson.qty);
								}
								else
								{
									//AFter EACH removal, we need to set the l to igiLine to make sure the LOOP will work properly
									//	- THIS Concept, credit goes to Eli S.!
									if (!lineItJson[lineItemId])
									{
										log('debug','Remove item from item Group '+itemGroupIds[ig], renewalOpp.getLineItemValue('item','item',l));
										renewalOpp.removeLineItem('item', l, false);
										l = igiLine;
									}
									else
									{
										//This needs to be kept. Update the line.
										/** MUST BE TESTED VERY CAREFULLY **/
										upchargedAmount = parseFloat(lineItJson[lineItemId].amount)
														  *
														  upchargePerc;

										renewalOpp.setLineItemValue('item', 'quantity', l, lineItJson[lineItemId].qty);
										renewalOpp.setLineItemValue('item', 'price', l, lineItJson[lineItemId].pricetier);
										renewalOpp.setLineItemValue('item', 'custcol_axcr_origfullamount', l, upchargedAmount);
										renewalOpp.setLineItemValue('item', 'amount', l, upchargedAmount);

										//7/16/2016 -
										//Renewal ONLY occurs for Recurring Items.
										//	This is already done via search criteria
										//Check to see if item being added is recurring
										//if (paramRecurringItemTypes.contains(itemjson[lineItemId].itemtype))
										//{
											renewalOpp.setLineItemValue('item', 'custcol_contract_start_date', l, newBillStart);
											renewalOpp.setLineItemValue('item', 'custcol_contract_end_date', l, newBillEnd);
										//}

										//Custom column field to capture billing schedule previously set on the So.
										renewalOpp.setLineItemValue('item','custcol_axcr_renewbillsch', l, lineItJson[lineItemId].billingsch);

										//7/16/2016 -
										//Auto check the Is Recurring and Is CRA Column Values
										//	This is because ONLY the recurring items get renewed
										//	And any records being returned in THIS process is already assumed to be CRA item
										renewalOpp.setLineItemValue('item','custcol_axcr_iscraitem', l, 'T');
										renewalOpp.setLineItemValue('item','custcol_axcr_iscrarenewingitem', l, 'T');
									}
								}

								l += 1;
							}
						}
					}

					/**
					 * indItemJson format:
				    {
						[itemid-pricetier]:{
							'itemid':xx,
							'itemqty':xx,
							'pricetier':xx,
							'amount':xx
						}
				    }
				    */
					//5a. Loop through and add individual items
					for (var ij in indItemJson)
					{
						/** MUST BE TESTED VERY CAREFULLY **/
						upchargedAmount = parseFloat(indItemJson[ij].amount)
										  *
										  upchargePerc;

						//TODO:Set billing start and end dates

						renewalOpp.selectNewLineItem('item');
						renewalOpp.setCurrentLineItemValue('item', 'item', indItemJson[ij].itemid);
						renewalOpp.setCurrentLineItemValue('item', 'quantity', indItemJson[ij].itemqty);
						renewalOpp.setCurrentLineItemValue('item', 'price', indItemJson[ij].pricetier);
						renewalOpp.setCurrentLineItemValue('item', 'custcol_axcr_origfullamount', upchargedAmount);
						renewalOpp.setCurrentLineItemValue('item', 'amount', upchargedAmount);

						//7/16/2016 -
						//Renewal ONLY occurs for Recurring Items.
						//	This is already done via search criteria
						//Check to see if item being added is recurring
						//if (paramRecurringItemTypes.contains(itemjson[indItemJson[ij].itemid].itemtype))
						//{
							renewalOpp.setCurrentLineItemValue('item', 'custcol_contract_start_date', newBillStart);
							renewalOpp.setCurrentLineItemValue('item', 'custcol_contract_end_date', newBillEnd);
						//}

						renewalOpp.setCurrentLineItemValue('item','custcol_axcr_renewbillsch', indItemJson[ij].billingsch);

						//7/16/2016 -
						//Auto check the Is Recurring and Is CRA Column Values
						//	This is because ONLY the recurring items get renewed
						//	And any records being returned in THIS process is already assumed to be CRA item
						renewalOpp.setCurrentLineItemValue('item','custcol_axcr_iscraitem', 'T');
						renewalOpp.setCurrentLineItemValue('item','custcol_axcr_iscrarenewingitem', 'T');

						renewalOpp.commitLineItem('item', false);
					}

					//6. Save the Opportunity.
					ctjson.oppref = nlapiSubmitRecord(renewalOpp, true, true);

					//7. Once this is Successful, set contract as Pending Renewal

					var ctrUpdFlds = ['custrecord_crc_status','custrecord_crc_latestrenewopp'],
						ctrUpdVals = [paramPendingRenewalStatusId, ctjson.oppref];
					nlapiSubmitField('customrecord_axcr_contract', ctjson.id, ctrUpdFlds, ctrUpdVals, true);

					//8. Build out the result.
					log('debug','Success Processing '+ctjson.id, 'Renewal Opp created: '+ctjson.oppref);

					//9/19/2016
					//	Request to add Opp # as well as Internal ID
					var oppTranId = nlapiLookupField('opportunity', ctjson.oppref, 'tranid', false);

					logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
								  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
								  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
								  '<td>'+renewalDate+'</td>'+
								  '<td>'+ctAnviDate+'</td>'+
								  '<td>'+ctjson.terminmonths+'</td>'+
								  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
								  '<td>Success'+(salesTeamWarning?' WITH Warning':'')+'</td>'+
								  '<td>Renewal Opp # '+oppTranId+' (Internal ID '+ctjson.oppref+') // '+salesTeamWarning+'</td>'+
								  '<td></td></tr>';

				}
			}
			catch (procerr)
			{
				log('error','Error Processing '+ctjson.id, getErrText(procerr));

				logTblBody += '<tr><td>'+ctjson.name+' ('+ctjson.id+')</td>'+
							  '<td>'+ctjson.endusertext+' ('+ctjson.enduserid+')</td>'+
							  '<td>'+ctjson.billentitytext+' ('+ctjson.billentityid+')</td>'+
							  '<td>'+renewalDate+'</td>'+
							  '<td>'+ctAnviDate+'</td>'+
							  '<td>'+ctjson.terminmonths+'</td>'+
							  '<td>'+ctjson.termstart+' to '+ctjson.termend+'</td>'+
							  '<td>Failed</td>'+
							  '<td></td>'+
							  '<td>'+getErrText(procerr)+'</td></tr>';

			}

			//Add In Reschedule Logic
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / ctrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);

			//------------ Reschedule check -------------------
			if ((i+1)==1000 || ((i+1) < ctrs.length && nlapiGetContext().getRemainingUsage() < 1000))
			{
				//reschedule
				log(
					'audit',
					'Getting Rescheduled at',
					'Contract ID '+ctjson.id+' // #'+ctjson.name
				);

				var param = {
					'custscript_sb135_lastprocid':paramLastProcId,
					'custscript_sb135_ctanvidate':paramCustomAnniversaryDate
				};

				//execute reschedule
				nlapiScheduleScript(
					nlapiGetContext().getScriptId(),
					nlapiGetContext().getDeploymentId(),
					param
				);
				break;
			}
		}//End of Loop
	}
	catch(procerr)
	{
		//Log and and generate customized Error Message
		log(
			'error',
			'CRA_ERROR_RENEWAL_PROCESS',
			'Unexpected Error while processing Contract Renewal '+getErrText(procerr)
		);

		//Generate Custom Error Email Notification
		nlapiSendEmail(
			-5,
			paramCraErrorNotifier,
			'CRA Renewal Process Error',
			'Error Processing Contract Renewal on '+nlapiDateToString(curDateObj)+' '+
				'. Unexpected Script Termination due to below error.<br/><br/>'+
				getErrText(procerr),
			paramCraCcNotifier,
			null,
			null,
			null,
			true
		);

	}

	//Generate csvLog. This is being done here just in case something errors during processing that terminates the script
	if (logTblBody)
	{
		nlapiSendEmail(
			-5,
			paramAcctNotifier,
			'Contract Renewal Process Log',
			'Renewal Process Log for '+nlapiDateToString(curDateObj)+'<br/><br/>'+
				'<table border="1">'+
				logTblHeader+
				logTblBody+
				'</table>'
		);
	}
}
