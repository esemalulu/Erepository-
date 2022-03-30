/**
 * Contract Management & Renewal Automation related.
 * This scheduled script was originally designed to be triggered by user event script to
 * go through and execute Contract Mgmt Related functions per passed in Sales Order.
 *
 * However after 1/28/2016 discussion with Finance, "Approved Sales Order" definition equates to
 * any Sales Order with status of "Pending Billing".
 *
 * Process is being changed so that this script RUNS in Scheduled Mode
 * and process any Pending Billing Sales Order with new "Contract Processed" Flag NOT checked.
 * 	CR-Contract Processed	 	custbody_axcr_contractprocessed
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
var	paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb133_lastprocid');
	//Search Columns Must Be
	//Internal ID - Sorted DESC
	//Name
	//Trx Number
	//Contract Ref
	//Contract Status
	//Contract Anniversary Date
	//Contract Terms
	paramSoListSearch = nlapiGetContext().getSetting('SCRIPT','custscript_sb133_sossid'),
	paramAccountNotifer = nlapiGetContext().getSetting('SCRIPT','custscript_sb133_acctempid');

//Company Level Preference
var paramCraErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb131_primaryerr'),
	paramCraCcNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ccerr'),
	paramAcctNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_acctnotifier'),
	paramDefaultQuoteForm = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb131_defquoteform'),
	paramNewOppFormId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_newoppform'),
	paramRenewOppFormId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_renewoppform'),
	paramRecurringItemTypes = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_recuritemtypeids'),

	paramRenewalNumFromEndDate = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_numdays_renewalopp'),

	paramActiveStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctractiveid'),
	paramPendingRenewalStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrpendrenewid'),
	paramRenewedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrrenewedid'),
	paramDelayedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrexpiredid'),
	paramTerminatedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrterminatedid'),
	paramDefaultAnnualUplift = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_defupliftperct'), //Default Annual uplift

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


//Script Defaults
var paramDirectDealType = '1', //Direct deal type
	paramResellerDealType = '2'; //Reseller deal type

var EM_PILLAR = '1',
	DM_PILLAR = '2',
	//9/19/2016
	//Enhancement request to handle DN Pillar
	//Reference to BOTH_PILLAR Removed
	DN_PILLAR = '5';

/**
 * Main Entry function for Sales order to Contract/Asset Processor
 * Script will run against Saved Search passed in as parameter.
 *
 */
function processSoToCtrAsset()
{
	var logTblHeader = '<tr><td>SO Number (Internal ID)</td>'+
					   '<td>Clinet Name (Internal ID)</td>'+
					   '<td>Status</td>'+
					   '<td>Action Taken</td>'+
					   '<td>Detail</td></tr>',
		logTblBody = '';

	try
	{
		//Search for ALL Pending Billing Sales Order that needs to go through Contract Process
		var soflt = null;
		if (paramLastProcId)
		{
			soflt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)];
		}

		//10/13/2016
		//Part of Enhancement #2
		//if paramSubsExcludeIds has IDs in the array, ONLY return list of sales orders that
		//does NOT belong to identified subsidiaries
		if (paramSubsExcludeIds.length > 0)
		{
			//We need to first check and see if soflt is null or has a value.
			//This is because above line may have executed
			if (!soflt)
			{
				soflt = [];
			}
			soflt.push(new nlobjSearchFilter('subsidiary', null, 'noneof', paramSubsExcludeIds));
		}


		/**
		 * Search Columns are:
		 *
		 * 	Internal ID - Sorted DESC
		   	Name  (entity)
		   	Trx Number (transactionnumber)
		   	Contract Ref (custbody_axcr_contractreference)
			Contract Status (custbody_axcr_contractstatus)
			Contract Anniversary Date (custbody_axcr_contractanivdate)
			Contract Terms (custbody_axcr_contractterm)
		 */
		var sors = nlapiSearchRecord(null, paramSoListSearch, soflt, null);

		//Loop through each
		for (var i=0; sors && i < sors.length; i+=1)
		{
			//1. Decide on what action to take
			var actionToTake = '',
				sorec = null,
				newCtrRef = sors[i].getValue('custbody_axcr_contractreference'),
				soId = sors[i].getValue('internalid'),
				soNum = sors[i].getValue('transactionnumber'),
				clientId = sors[i].getValue('entity'),
				clientName = sors[i].getText('entity'),
				//Add in Logic to figure out parent Item Group and Item Group Qty
				itemGroupId = '',
				itemGroupQty = '';

			log('debug','processing SO',soId);

			try
			{
				//Load Sales Order Record for processing
				sorec = nlapiLoadRecord('salesorder',soId,{recordmode:'dynamic'});

				//7/15/2016 - Term and Uplift logic added
				//Default End Company to Bill to If Empty and check for empty Term and Uplift charge values
				var endCompany  = sorec.getFieldValue('custbody_end_customer');
				if (!sorec.getFieldValue('custbody_end_customer') ||
					!sorec.getFieldValue('custbody_axcr_contractterm') ||
					!sorec.getFieldValue('custbody_axcr_upliftperc'))
				{
					endCompany = sorec.getFieldValue('entity');

					//This is a work around due to workflow NOT being editable.
					//Sales Orders' End User field MUST be set
					sorec.setFieldValue('custbody_end_customer',sorec.getFieldValue('entity'));

					//7/15/2016
					//Set Contract Terms and Uplift ONLY IF MISSING
					//If Contract Term and Uplift isn't properly mapped over when existing workflow creates Sales Order from an Opportunity
					//(It's EMPTY in Sales Order)
					//	IF it is NOT set, we need to bring it over from linked Opportunity and set it on SO
					// SAME WITH custbody_axcr_upliftperc (Uplift value)
					if (!sorec.getFieldValue('custbody_axcr_contractterm') || !sorec.getFieldValue('custbody_axcr_upliftperc'))
					{
						var oppVals = nlapiLookupField(
										'opportunity',
										sorec.getFieldValue('opportunity'),
										['custbody_axcr_contractterm','custbody_axcr_upliftperc'],
										false
									  );
						//We need to ONLY update the contract term IF it is missing on the SO
						if (!sorec.getFieldValue('custbody_axcr_contractterm'))
						{
							sorec.setFieldValue('custbody_axcr_contractterm', oppVals['custbody_axcr_contractterm']);
						}

						if (!sorec.getFieldValue('custbody_axcr_upliftperc'))
						{
							sorec.setFieldValue('custbody_axcr_upliftperc', oppVals['custbody_axcr_upliftperc']);
						}

					}

					//Save it
					nlapiSubmitRecord(sorec, false, true);

					//Reload the SoRec
					sorec = nlapiLoadRecord('salesorder',soId,{recordmode:'dynamic'});

				}

				//***************************************** BEGIN Each Sales Order Execution *************************************************
				if (!newCtrRef)
				{
					//This is to CREATE new Contract and Asset Record since No Contract Reference was set
					/************************************** CREATE Action *******************************************************************/
					actionToTake = 'create';
					//Create action means that this is NEW Contract.
					//Before we do create action, do a search against contract table WITH THIS Sales Order
					var dupflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
					              new nlobjSearchFilter('custrecord_crc_apprso', null, 'anyof', soId)],
					    duprs = nlapiSearchRecord('customrecord_axcr_contract', null, dupflt, null);

					//If there are matching Contract(s) in the system with THIS Sales Order,
					//	Throw as ERROR.
					if (duprs && duprs.length > 0)
					{
						throw nlapiCreateError(
							'CRA_ERR_SO_PROCESS',
							'There are '+duprs.length+' Contracts with Sales Order ID '+
								soId+
								'. Action type of create will cause duplicate contract issue. '+
								'Please contact administrator',
							true
						);
					}

					//DeaTyp is based on custbody_working_w_channel_partner If Set to YES = Reseller, NO = Direct
					//IF value is neither Yes or No, throw an error.
					if (sorec.getFieldText('custbody_working_w_channel_partner') &&
						sorec.getFieldText('custbody_working_w_channel_partner') != 'Yes' &&
						sorec.getFieldText('custbody_working_w_channel_partner') != 'No')
					{
						throw nlapiCreateError(
							'CRA_ERR_SO_PROCESS',
							'Working with Channel Partner field value is neither Yes or No. '+
								'Current value is '+sorec.getFieldText('custbody_working_w_channel_partner'),
							true
						);
					}

					//8/31/2016
					//	Before starting CREATE,
					//	IF there are NO Recurring line items on the list, skip contract creation
					var hasRecurringItem = false;
					for (var cr=1; cr <= sorec.getLineItemCount('item'); cr+=1)
					{
						if (sorec.getLineItemValue('item','custcol_axcr_iscrarenewingitem',cr)=='T')
						{
							hasRecurringItem = true;
							break;
						}
					}

					if (!hasRecurringItem)
					{
						//0. Log it as skipped
						logTblBody += '<tr><td>'+soNum+' ('+soId+')</td>'+
									  '<td>'+clientName+' ('+clientId+')</td>'+
									  '<td>Skipped</td>'+
									  '<td>'+actionToTake+'</td>'+
									  '<td>SO contains ONLY Non-recurring CRA Eligible Items. Contract Creation Skipped</td>';

						//1. Update Sales Order with contract processed flag since this is being skipped
						var soUpdFlds = ['custbody_axcr_contractprocessed'],
							soUpdVals = ['T'];

						nlapiSubmitField('salesorder',soId,soUpdFlds,soUpdVals,true);
					}
					else
					{
						//Validation passed, create New Contract Record
						var dealType = paramDirectDealType;
						if (sorec.getFieldText('custbody_working_w_channel_partner') == 'Yes')
						{
							dealType = paramResellerDealType;
						}

						//If Contract Term is missing, throw an error
						if (!sorec.getFieldValue('custbody_axcr_contractterm'))
						{
							throw nlapiCreateError(
								'CRA_ERR_SO_PROCESS',
								'Missing contract term value',
								true
							);
						}

						//1. Create new Contract Record
						var newCtRec = nlapiCreateRecord(
							'customrecord_axcr_contract',
							{recordmode:'dynamic'}
						);

						//Default Name to Temporary value
						newCtRec.setFieldValue(
							'name',
							'TEMP New Contract'
						);

						//Set Deal Type
						newCtRec.setFieldValue(
							'custrecord_crc_dealtype',
							dealType
						);

						//Set the Terms in Months
						newCtRec.setFieldValue(
							'custrecord_crc_contractterm',
							sorec.getFieldValue('custbody_axcr_contractterm')
						);

						//Set Billing Entity
						newCtRec.setFieldValue(
							'custrecord_crc_billingentity',
							sorec.getFieldValue('entity')
						);


						//Set End User
						newCtRec.setFieldValue(
							'custrecord_crc_enduser',
							endCompany
						);

						//Set Latest Approved SO
						newCtRec.setFieldValue(
							'custrecord_crc_apprso',
							soId
						);

						//Set Latest Opportunity
						newCtRec.setFieldValue(
							'custrecord_crc_renewopp',
							sorec.getFieldValue('opportunity')
						);

						//7/15/2016
						//For creation of NEW contract, uplift value CAN come from Opp > SO.
						//	If the value is provided, use that value
						//	If Not, use default value
						var annUpliftVal = paramDefaultAnnualUplift;
						if (sorec.getFieldValue('custbody_axcr_upliftperc'))
						{
							annUpliftVal = sorec.getFieldValue('custbody_axcr_upliftperc');
						}
						//Set Annual Uplift
						newCtRec.setFieldValue(
							'custrecord_crc_upliftpct',
							annUpliftVal
						);

						//Contract Status to be defaulted to Active
						newCtRec.setFieldValue(
							'custrecord_crc_status',
							paramActiveStatusId
						);

						//10/14/2016
						//Part of Enhancement #2
						//Set Currency on Contract from Sales order
						newCtRec.setFieldValue(
							'custrecord_crc_ctrcurrency',
							sorec.getFieldValue('currency')
						);

						//Submit contract record
						var newCtRecId = nlapiSubmitRecord(newCtRec, true, true);

						log('debug','Contract Created',newCtRecId);

						//2. Create Assets for each of CRA eligible items on this Sales Order as well as keeping track for additional contract level information.
						//7/15/2016
						//Logic Change
						//	We are going to calculate Contract Term based on following:
						//		* Grab Earliest Billing Start Date + Terms in Months - 1 Day

						//7/15/2016 - Change
						//Earliest Billing Start Date of ALL CRA eligible item
						//This is to calculate contract term start and end date
						var ctStartDate = '',

							//Billing End Date of first CRA eligible item
							//7/15/2016 -
							//NOTE: This stays as is since ALL Billing End Date WILL be the Same for all Eligible Items
							//		Billing End Date will always be new anniversary date
							//			** Unless special UC arise (See below for details)

							ctAnvDate = '',
							ctAcvValue = 0.0, //Total amount of all CRA eligible item
							ctNameType = '', //Build as Contract ID - Pillar Type (EM, DM, DN, Combination) - Deal Type

							//9/19/2016
							// Add array of Pillar IDs
							newCtPillars = [];

						for (var b=1; b <= sorec.getLineItemCount('item'); b+=1)
						{
							if (sorec.getLineItemValue('item', 'itemtype',b) == 'Group' ||
								sorec.getLineItemValue('item', 'itemtype',b) == 'EndGroup')
							{
								//Add in Logic to grab Item Group ID and Qty
								//Assume that Things are always in order. Group comes first then EndGroup
								//When Group is encountered, you set itemGroupId and itemGroupQty
								//When EndGroup is encountered, you set itemGroupId and itemGroupQty to NULL - Resetting for next
								//Set both itemGroupId and itemGroupQty for Group
								if (sorec.getLineItemValue('item', 'itemtype',b) == 'Group')
								{
									itemGroupId = sorec.getLineItemValue('item', 'item',b);
									itemGroupQty = sorec.getLineItemValue('item', 'quantity',b);
									continue;
								}

								//Null out both itemGroupId and itemGroupQty for Group
								if (sorec.getLineItemValue('item', 'itemtype',b) == 'EndGroup')
								{
									itemGroupId = '';
									itemGroupQty = '';
									continue;
								}
							}

							//ONLY Check if it is part of CRA eligible Item line
							//7/15/2016
							//	We are now capturing if the line item is (CRA Eligible) as column field.
							//	custcol_axcr_iscraitem
							//	We can use this for comparison

							//9/19/2016
							//Track pillarValue for each line ONLY to be used on Asset Records
							var pillarValue = '';

							if (sorec.getLineItemValue('item','custcol_axcr_iscraitem',b)=='T')
							{
								//9/19/2016
								// To allow multi pillar contracts, build an array of pillars reference in this Sales Order

								log('debug','line item text DM/EM/DN check',sorec.getLineItemText('item','item',b));
								if (sorec.getLineItemText('item','item',b).indexOf('EM') > -1)
								{
									//If EM pillar isn't in the newCtPillars array, add it
									if (newCtPillars.indexOf(EM_PILLAR) == -1)
									{
										newCtPillars.push(EM_PILLAR);
									}

									pillarValue = EM_PILLAR;
								}
								else if (sorec.getLineItemText('item','item',b).indexOf('DM') > -1)
								{
									//If DM pillar isn't in the newCtPillars array, add it
									if (newCtPillars.indexOf(DM_PILLAR) == -1)
									{
										newCtPillars.push(DM_PILLAR);
									}

									pillarValue = DM_PILLAR;
								}
								else if (sorec.getLineItemText('item','item',b).indexOf('DN') > -1)
								{
									//If DN pillar isn't in the newCtPillars array, add it
									if (newCtPillars.indexOf(DN_PILLAR) == -1)
									{
										newCtPillars.push(DN_PILLAR);
									}

									pillarValue = DN_PILLAR;
								}

								//	If THIS LINEs' item type is one of them it will be marked as recurring
								//	7/15/2016 - We now capture Is Recurring at the line level
								//		custcol_axcr_iscrarenewingitem
								var isRecurring = sorec.getLineItemValue('item','custcol_axcr_iscrarenewingitem',b);
								if (isRecurring != 'T')
								{
									isRecurring = 'F';
								}

								//5/14/2016 - ACV should ONLY include Recurring item values
								if (isRecurring=='T')
								{
									//contract ACV value = Sum of All eligible line amount
									ctAcvValue = ctAcvValue
												 +
												 parseFloat(sorec.getLineItemValue('item','amount',b));
								}

								//7/15/2016
								//We need to grab contract anniversary date and Earliest Contract Start Date
								//	We need to do this as long as there are dates provided
								//	Even if the item is NOT recurring it may still hold billing start/end
								if (!ctAnvDate &&
									sorec.getLineItemValue('item','custcol_contract_end_date',b))
								{
									//Set the value of ctAnvDate (Anniversary date) to first match against
									ctAnvDate = sorec.getLineItemValue('item','custcol_contract_end_date',b);
								}

								//7/15/2016
								//as long as Start Date value is there, Compare against previous and
								//	Grab the earliest
								if (
									sorec.getLineItemValue('item','custcol_contract_start_date', b) &&
									(
										!ctStartDate ||
										nlapiStringToDate(sorec.getLineItemValue('item','custcol_contract_start_date', b)) <= ctStartDate
									)
								   )
								{
									//set ctStartDate as Date object
									ctStartDate = nlapiStringToDate(sorec.getLineItemValue('item','custcol_contract_start_date', b));
								}

								log('debug','line '+b, 'Start Date: '+ctStartDate);

								var newAssetRec = nlapiCreateRecord(
													'customrecord_axcr_assets',
													{recordmode:'dynamic'}
												  );
								//Start filling in the fields
								newAssetRec.setFieldValue(
									'custrecord_cra_contract',
									newCtRecId
								); //Set parent Contract (Just created above)

								//Set Latest Approved SO
								newAssetRec.setFieldValue(
									'custrecord_cra_linkedso',
									soId
								);

								//custrecord_cra_assetpillar
								newAssetRec.setFieldValue(
									'custrecord_cra_assetpillar',
									pillarValue
								);

								//Set Latest Opportunity
								newAssetRec.setFieldValue(
									'custrecord_cra_linkedopp',
									sorec.getFieldValue('opportunity')
								);

								newAssetRec.setFieldValue(
									'custrecord_cra_enduser',
									endCompany
								); //Set End Customer

								newAssetRec.setFieldValue(
									'custrecord_cra_billingentity',
									sorec.getFieldValue('entity')
								); //Set Billing Entity

								newAssetRec.setFieldValue(
									'custrecord_cra_assetstatus',
									paramActiveStatusId
								); //Default Asset Status (match contract)

								newAssetRec.setFieldValue(
									'custrecord_cra_item',
									sorec.getLineItemValue('item','item',b)
								); //Set Item

								newAssetRec.setFieldValue(
									'custrecord_cra_itemqty',
									sorec.getLineItemValue('item','quantity',b)
								); //Set Item Qty

								newAssetRec.setFieldValue(
									'custrecord_cra_recurring',
									isRecurring
								); //Set is recurring.

								newAssetRec.setFieldValue(
									'custrecord_cra_itemlistprice',
									itemjson[sorec.getLineItemValue('item','item',b)].baseprice
								); //Set base price

								newAssetRec.setFieldValue(
									'custrecord_cra_actualsalesprice',
									sorec.getLineItemValue('item','amount',b)
								); //Set actual sales price

								newAssetRec.setFieldValue(
									'custrecord_cra_originalsalesprice',
									sorec.getLineItemValue('item','custcol_axcr_origfullamount',b)
								); //Set original sales price

								newAssetRec.setFieldValue(
									'custrecord_cra_pricingtier',
									(sorec.getLineItemValue('item','price',b)!='-1'?sorec.getLineItemValue('item','price',b):'')
								); //Set price level used

								newAssetRec.setFieldValue(
									'custrecord_cra_parentitemgrp',
									itemGroupId
								); //Set Item Group

								newAssetRec.setFieldValue(
									'custrecord_cra_parentitemgrpqty',
									itemGroupQty
								); //Set Item Group Qty

								newAssetRec.setFieldValue(
									'custrecord_cra_billingschedule',
									sorec.getLineItemValue('item','billingschedule', b)
								); //Set Billing schedule used

								newAssetRec.setFieldValue(
									'custrecord_cra_entstartdate',
									sorec.getLineItemValue('item','custcol_contract_start_date',b)
								); //Set Entitlement Start as Billing Start

								newAssetRec.setFieldValue(
									'custrecord_cra_entenddate',
									sorec.getLineItemValue('item','custcol_contract_end_date',b)
								); //Set Entitlement End as Billing End

								//7/16/2016
								//	Map out Add to Install Base, Is Cancelled and Is Concession as well
								newAssetRec.setFieldValue(
									'custrecord_cra_isaddoninstallbase',
									sorec.getLineItemValue('item','custcoladd_on_installed_base',b)
								); // Set Add to Install Base

								newAssetRec.setFieldValue(
									'custrecord_cra_isconcession',
									sorec.getLineItemValue('item','custcolconcession',b)
								); // Set Is Concession

								newAssetRec.setFieldValue(
									'custrecord_cra_iscancelled',
									sorec.getLineItemValue('item','custcolcancelled_item',b)
								); // Set Is Cancelled

								//Save New Asset Record
								var newAssetRecId = nlapiSubmitRecord(newAssetRec, true, true);

								log('debug','Asset Created','Line '+b+' // '+newAssetRecId);

							}
						} //End For Loop for creating Assets

						//3. Update Contract with anniverary date, term start, term end and acv amount

						//7/15/2016 - Logic Change.
						//	We will initially calculate the contract Term
						//	Earliest Start + Terms In Months - 1 Day
						log('debug','Contract Term',sorec.getFieldValue('custbody_axcr_contractterm'));
						var termEndDate = '';

						//Only calculate the termEndDate if the ctStartDate is NOT empty.
						//	This can happen if we have a CRA Transaction with NO Recurring line items
						if (ctStartDate)
						{
							termEndDate = nlapiAddMonths(
									ctStartDate,
									sorec.getFieldValue('custbody_axcr_contractterm')
							);

							termEndDate = nlapiAddDays(termEndDate, -1);
						}

						//9/19/2016
						//loop through newCtPillars array and build the new contract name
						for (var npi=0; npi < newCtPillars.length; npi+=1)
						{
							if (newCtPillars[npi] == EM_PILLAR)
							{
								ctNameType += 'EM';

								if ((npi+1) != newCtPillars.length)
								{
									ctNameType += '/';
								}
							}

							if (newCtPillars[npi] == DM_PILLAR)
							{
								ctNameType += 'DM';

								if ((npi+1) != newCtPillars.length)
								{
									ctNameType += '/';
								}
							}

							if (newCtPillars[npi] == DN_PILLAR)
							{
								ctNameType += 'DN';

								if ((npi+1) != newCtPillars.length)
								{
									ctNameType += '/';
								}
							}
						}

						log('debug','new contract name type', ctNameType);

						var ctNameValue = newCtRecId+'-'+ctNameType+'-'+newCtRec.getFieldText('custrecord_crc_dealtype');

						log('debug','Ct Info ', ctNameValue+' // start/end = '+ctStartDate+' to '+termEndDate);

						var ctUpdFlds = ['name',
						                 'custrecord_crc_startdate',
						                 'custrecord_crc_acv',
						                 'custrecord_crc_startingacv',
						                 'custrecord_crc_termstartdate',
						                 'custrecord_crc_termenddate',
						                 'custrecord_crc_ctrpillar'],
							ctUpdVals = [ctNameValue,
							             ctAnvDate,
							             ctAcvValue,
							             ctAcvValue,
							             (ctStartDate?nlapiDateToString(ctStartDate):''),
							             (termEndDate?nlapiDateToString(termEndDate):''),
							             //9/19/2016
							             // Set multiselect value with an array
							             newCtPillars];

						nlapiSubmitField('customrecord_axcr_contract', newCtRecId, ctUpdFlds, ctUpdVals, false);

						//4. Update Sales Order with Matching Contract Reference and contract processed flag
						var soUpdFlds = ['custbody_axcr_contractreference','custbody_axcr_contractprocessed'],
							soUpdVals = [newCtRecId, 'T'];

						nlapiSubmitField('salesorder',soId,soUpdFlds,soUpdVals,true);

						log('debug','Sales Order updated',soId+' Updated with contract reference');

						//Defect Discovered 8/30/2016
						//We need to search for any Invoices that was created off of this Sales Order
						//	and if there is one, we need to update the contract reference on that one as well.
						//	This can happen if they take the SO all the way to item fulfillment without having
						//	Contract Module process run.  IF this step is missed, any invoice created off of SO
						//	WILL be missing contract reference.
						var invflt = [new nlobjSearchFilter('createdfrom', null, 'anyof', soId),
						              new nlobjSearchFilter('mainline', null, 'is', 'T'),
						              new nlobjSearchFilter('custbody_axcr_contractreference', null, 'anyof', '@NONE@')],
							invcol = [new nlobjSearchColumn('internalid')],
							invrs = nlapiSearchRecord('invoice', null, invflt, invcol);

						for (var inv=0; invrs && inv < invrs.length; inv+=1)
						{
							//Load and Save Record
							var invRec = nlapiLoadRecord('invoice', invrs[inv].getValue('internalid'));
							invRec.setFieldValue('custbody_axcr_contractreference', newCtRecId);
							nlapiSubmitRecord(invRec, true, true);
						}

						//7/17/2016
						//Automation Rule
						//Check to see if we need to generate automatic renewal opportunity.
						var autoRenewJson ={
							'contractid':newCtRecId,
							'billingentity':endCompany,
							'anniversarydate':ctAnvDate
						};
						procAutoRenewal(autoRenewJson);

						//Log it as success
						logTblBody += '<tr><td>'+soNum+' ('+soId+')</td>'+
									  '<td>'+clientName+' ('+clientId+')</td>'+
									  '<td>Success</td>'+
									  '<td>'+actionToTake+'</td>'+
									  '<td>SO Successfully Processed with Contract/Asset creation. </td>';

					}

				}
				else if (newCtrRef)
				{
					//Need to figure out Approval Type: Add on to Contract vs Renewal Opportunity being approved.

					//7/18/2016
					//Logic Change
					//if SO has Is Contract Redo Checked,
					//	- THIS is a Contract Redo.
					//	  Full Asset cancellation has taken place and finance is recreating the SO.
					//	  this action will simply add to existing Contract and update Contract information.

					//if Contact status is Active AND NOT A REDO
					//	based on dicussion with finance Add-On term has very specific def. for it.
					//	- Being Added TO Contract = addtocontract

					//if Contract status is Pending Renewal, Renewal Delayed AND NOT A REDO
					//	- Renewal = renewal

					//7/18/2016
					//Process Logic Change
					// First decide what the actionToTake will be.
					if (sorec.getFieldValue('custbody_axcr_isctrredo') == 'T')
					{
						actionToTake = 'redocontract';
					}
					else if (sorec.getFieldValue('custbody_axcr_contractstatus') == paramActiveStatusId &&
							 sorec.getFieldValue('custbody_axcr_isctrredo') != 'T')
					{
						actionToTake = 'addtocontract';
					}
					else if ( (sorec.getFieldValue('custbody_axcr_contractstatus') == paramPendingRenewalStatusId ||
							 sorec.getFieldValue('custbody_axcr_contractstatus') == paramDelayedStatusId) &&
							 sorec.getFieldValue('custbody_axcr_isctrredo') != 'T' )
					{
						actionToTake = 'renewal';
					}

					log('debug','Action To Take', actionToTake);

					/************************************** ADD TO CONTRACT Action *******************************************************************/
					//7/18/2016
					//Logic Change
					//For it to be considered true ADD TO CONTRACT, Is Contract Redo MUST NOT BE CHECKED
					if (actionToTake == 'addtocontract')
					{
						actionToTake = 'addtocontract';

						log(
							'audit',
							'Sales order Approve for CMA Processing',
							'SO Internal ID '+soId+' Process Contract for '+actionToTake
						);

						//1. Create New Asset records Per Eligible item under contract.
						//2. Update Contract with new ACV value
						//3. Update Sales Order as Processed

						//1. Create Assets for each of CRA eligible items on this Sales Order as well as keeping track for additional contract level information.
						for (var b=1; b <= sorec.getLineItemCount('item'); b+=1)
						{
							if (sorec.getLineItemValue('item', 'itemtype',b) == 'Group' ||
								sorec.getLineItemValue('item', 'itemtype',b) == 'EndGroup')
							{
								{
									//Add in Logic to grab Item Group ID and Qty
									//Assume that Things are always in order. Group comes first then EndGroup
									//When Group is encountered, you set itemGroupId and itemGroupQty
									//When EndGroup is encountered, you set itemGroupId and itemGroupQty to NULL - Resetting for next
									//Set both itemGroupId and itemGroupQty for Group
									if (sorec.getLineItemValue('item', 'itemtype',b) == 'Group')
									{
										itemGroupId = sorec.getLineItemValue('item', 'item',b);
										itemGroupQty = sorec.getLineItemValue('item', 'quantity',b);
										continue;
									}

									//Null out both itemGroupId and itemGroupQty for Group
									if (sorec.getLineItemValue('item', 'itemtype',b) == 'EndGroup')
									{
										itemGroupId = '';
										itemGroupQty = '';
										continue;
									}
								}
							}

							//ONLY Check if it is part of CRA eligible Item line
							//7/15/2016
							//	We are now capturing if the line item is (CRA Eligible) as column field.
							//	custcol_axcr_iscraitem
							//	We can use this for comparison
							if (sorec.getLineItemValue('item','custcol_axcr_iscraitem',b)=='T')
							{
								//If THIS LINEs' item type is one of them it will be marked as recurring
								//	7/15/2016 - We now capture Is Recurring at the line level
								//		custcol_axcr_iscrarenewingitem
								var isRecurring = sorec.getLineItemValue('item','custcol_axcr_iscrarenewingitem',b);
								if (isRecurring != 'T')
								{
									isRecurring = 'F';
								}

								var pillarValue = '';
								if (sorec.getLineItemText('item','item',b).indexOf('EM') > -1)
								{
									pillarValue = EM_PILLAR;
								}
								else if (sorec.getLineItemText('item','item',b).indexOf('DM') > -1)
								{
									pillarValue = DM_PILLAR;
								}
								//9/19/2016
								// Add in check for DN Pillar Item
								else if (sorec.getLineItemText('item','item',b).indexOf('DN') > -1)
								{
									pillarValue = DN_PILLAR;
								}

								var newAssetRec = nlapiCreateRecord(
													'customrecord_axcr_assets',
													{recordmode:'dynamic'}
												  );
								//Start filling in the fields
								newAssetRec.setFieldValue(
									'custrecord_cra_contract',
									newCtrRef
								); //Set parent Contract (Just created above)

								//Set Latest Approved SO
								newAssetRec.setFieldValue(
									'custrecord_cra_linkedso',
									soId
								);

								//Set Latest Opportunity
								newAssetRec.setFieldValue(
									'custrecord_cra_linkedopp',
									sorec.getFieldValue('opportunity')
								);

								newAssetRec.setFieldValue(
									'custrecord_cra_enduser',
									endCompany
								); //Set End Customer

								newAssetRec.setFieldValue(
									'custrecord_cra_billingentity',
									sorec.getFieldValue('entity')
								); //Set Billing Entity

								//custrecord_cra_assetpillar
								newAssetRec.setFieldValue(
									'custrecord_cra_assetpillar',
									pillarValue
								);

								newAssetRec.setFieldValue(
									'custrecord_cra_assetstatus',
									paramActiveStatusId
								); //Default Asset Status (match contract)

								newAssetRec.setFieldValue(
									'custrecord_cra_item',
									sorec.getLineItemValue('item','item',b)
								); //Set Item

								newAssetRec.setFieldValue(
									'custrecord_cra_itemqty',
									sorec.getLineItemValue('item','quantity',b)
								); //Set Item Qty

								newAssetRec.setFieldValue(
									'custrecord_cra_recurring',
									isRecurring
								); //Set is recurring.

								newAssetRec.setFieldValue(
									'custrecord_cra_itemlistprice',
									itemjson[sorec.getLineItemValue('item','item',b)].baseprice
								); //Set base price

								newAssetRec.setFieldValue(
									'custrecord_cra_actualsalesprice',
									sorec.getLineItemValue('item','amount',b)
								); //Set actual sales price

								newAssetRec.setFieldValue(
									'custrecord_cra_originalsalesprice',
									sorec.getLineItemValue('item','custcol_axcr_origfullamount',b)
								); //Set original sales price

								newAssetRec.setFieldValue(
									'custrecord_cra_pricingtier',
									(sorec.getLineItemValue('item','price',b)!='-1'?sorec.getLineItemValue('item','price',b):'')
								); //Set price level used

								newAssetRec.setFieldValue(
									'custrecord_cra_parentitemgrp',
									itemGroupId
								); //Set Item Group

								newAssetRec.setFieldValue(
									'custrecord_cra_parentitemgrpqty',
									itemGroupQty
								); //Set Item Group Qty

								newAssetRec.setFieldValue(
									'custrecord_cra_billingschedule',
									sorec.getLineItemValue('item','billingschedule', b)
								); //Set Billing schedule used

								newAssetRec.setFieldValue(
									'custrecord_cra_entstartdate',
									sorec.getLineItemValue('item','custcol_contract_start_date',b)
								); //Set Entitlement Start as Billing Start

								newAssetRec.setFieldValue(
									'custrecord_cra_entenddate',
									sorec.getLineItemValue('item','custcol_contract_end_date',b)
								); //Set Entitlement End as Billing End

								//Map out Add on to Install Base AND mark this as added to contract
								newAssetRec.setFieldValue(
									'custrecord_cra_isaddedtocontract',
									'T'
								);

								//7/16/2016
								//	Map out Add to Install Base, Is Cancelled and Is Concession as well
								newAssetRec.setFieldValue(
									'custrecord_cra_isaddoninstallbase',
									sorec.getLineItemValue('item','custcoladd_on_installed_base',b)
								); // Set Add to Install Base

								newAssetRec.setFieldValue(
									'custrecord_cra_isconcession',
									sorec.getLineItemValue('item','custcolconcession',b)
								); // Set Is Concession

								newAssetRec.setFieldValue(
									'custrecord_cra_iscancelled',
									sorec.getLineItemValue('item','custcolcancelled_item',b)
								); // Set Is Cancelled

								newAssetRec.setFieldValue(
									'custrecord_cra_isaddoninstallbase',
									sorec.getLineItemValue('item','custcoladd_on_installed_base',b)
								);

								//Save New Asset Record
								var newAssetRecId = nlapiSubmitRecord(newAssetRec, true, true);

								log('debug','Add on Asset Created','Line '+b+' // '+newAssetRecId);

							}
						} //End For Loop for add on creating Assets

						//2. Grab new ACV value for THIS contract
						var ctAcvValue = 0.0, //Total amount of all CRA eligible item
											  //5/14/2016 - This should ONLY include Recurring items
							ctAcvFlt = [new nlobjSearchFilter('custrecord_cra_contract', null, 'anyof', newCtrRef),
							            new nlobjSearchFilter('isinactive', null, 'is', 'F'),
							            new nlobjSearchFilter('custrecord_cra_recurring', null, 'is','T'),
							            new nlobjSearchFilter('custrecord_cra_assetstatus', null, 'anyof', paramActiveStatusId)],
							ctAcvCol = [new nlobjSearchColumn('custrecord_cra_actualsalesprice', null,'sum')],
							ctAcvRs = nlapiSearchRecord('customrecord_axcr_assets', null, ctAcvFlt, ctAcvCol);

						//We can assume there is atleast ONE result
						ctAcvValue = ctAcvRs[0].getValue('custrecord_cra_actualsalesprice', null,'sum');


						var ctUpdFlds = ['custrecord_crc_acv'],
							ctUpdVals = [ctAcvValue];

						nlapiSubmitField('customrecord_axcr_contract', newCtrRef, ctUpdFlds, ctUpdVals, false);

						//4. Update Sales Order with Matching Contract Reference and contract processed flag
						var soUpdFlds = ['custbody_axcr_contractprocessed'],
							soUpdVals = ['T'];

						nlapiSubmitField('salesorder',soId,soUpdFlds,soUpdVals,true);

						log('debug','Sales Order updated',soId+' Updated as processed (add to contract)');

						//Log it as success
						logTblBody += '<tr><td>'+soNum+' ('+soId+')</td>'+
									  '<td>'+clientName+' ('+clientId+')</td>'+
									  '<td>Success</td>'+
									  '<td>'+actionToTake+'</td>'+
									  '<td>SO Successfully Processed with Add On. </td>';

					}

					/************************************** RENEWAL CONTRACT Action *******************************************************************/
					//7/18/2016
					//Logic Change
					//For it to be considered true RENEWAL, Is Contract Redo MUST NOT BE CHECKED
					//Since redocontract is similar to renewal, we add it together as single code block.
					else if (actionToTake == 'redocontract' || actionToTake == 'renewal')
					{
						log(
							'audit',
							'Sales order Approve for CMA Processing',
							'SO Internal ID '+soId+' Process Contract for '+actionToTake
						);

						var ctrRefRec = nlapiLoadRecord('customrecord_axcr_contract',newCtrRef),
							curDateObj = new Date();

						//5/14/2016 - Swap out opp date to opportunity date for none prod env.
						curDate = nlapiDateToString(curDateObj);
						if (nlapiGetContext().getEnvironment()!='PRODUCTION')
						{
							//TESTING ONLY
							//FOR TESTING, use tran date of linked opportunity instead of current date.
							//	- This is to allow proper reporting during testing
							curDate = nlapiLookupField('opportunity',sorec.getFieldValue('opportunity'), 'trandate');
							/*************END TEST MODE***************/
						}

						//REHAN FOUND IT
						//As of 3/30/2016 Renewal will simply update contract and purge and add new asset records.
						//	there will be daily process introduced that will control the back up of each period.

						//*** 1. Delete ALL Current Assets for THIS Contract.
						//7/18/2016
						//Logic Change
						//	ONLY Purge the asset if it is renewal.
						//	redocontract should NOT purge exiting asset.
						if (actionToTake == 'renewal')
						{
							try
							{
								var asflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
								             new nlobjSearchFilter('custrecord_cra_contract', null, 'anyof', newCtrRef)],
									asrs = nlapiSearchRecord('customrecord_axcr_assets', null, asflt, null);

								//For Each result, Delete them
								for (var a=0; asrs && a < asrs.length; a+=1)
								{
									nlapiDeleteRecord('customrecord_axcr_assets', asrs[a].getId());
								}

							}
							catch (s1err)
							{
								throw nlapiCreateError(
									'CRA_RENEWAL_APPR_STEP_1',
									'Error Deleting current assets for contract ID '+newCtrRef+' // '+
									'Debugging from this point is Manual by Admin. ERROR Detail: '+
									'Unable to Delete Assets for Contract ID '+newCtrRef+': '+getErrText(s1err),
									true
								);
							}
						}

						//7/15/2016 - Change
						//Earliest Billing Start Date of ALL CRA eligible item
						//This is to calculate contract term start and end date
						var ctStartDate = '',

							//Billing End Date of first CRA eligible item
							//7/15/2016 -
							//NOTE: This stays as is since ALL Billing End Date WILL be the Same for all Eligible Items
							//		Billing End Date will always be new anniversary date
							//			** Unless special UC arise (See below for details)

							ctAnvDate = '',
							ctAcvValue = 0.0, //Total amount of all CRA eligible item
							ctNameType = '', //Build as Contract ID - Pillar Type (EM, DM, EM/DM) - Deal Type
							//9/19/2016
							// Add in rdCtPillars array
							rdCtPillars = [];

						//*** 2. Process NEW Assets for THIS Contract/SO
						try
						{

							for (var b=1; b <= sorec.getLineItemCount('item'); b+=1)
							{
								if (sorec.getLineItemValue('item', 'itemtype',b) == 'Group' ||
									sorec.getLineItemValue('item', 'itemtype',b) == 'EndGroup')
								{
									//Add in Logic to grab Item Group ID and Qty
									//Assume that Things are always in order. Group comes first then EndGroup
									//When Group is encountered, you set itemGroupId and itemGroupQty
									//When EndGroup is encountered, you set itemGroupId and itemGroupQty to NULL - Resetting for next
									//Set both itemGroupId and itemGroupQty for Group
									if (sorec.getLineItemValue('item', 'itemtype',b) == 'Group')
									{
										itemGroupId = sorec.getLineItemValue('item', 'item',b);
										itemGroupQty = sorec.getLineItemValue('item', 'quantity',b);
										continue;
									}

									//Null out both itemGroupId and itemGroupQty for Group
									if (sorec.getLineItemValue('item', 'itemtype',b) == 'EndGroup')
									{
										itemGroupId = '';
										itemGroupQty = '';
										continue;
									}
								}

								//ONLY Check if it is part of CRA eligible Item line
								//7/15/2016
								//	We are now capturing if the line item is (CRA Eligible) as column field.
								//	custcol_axcr_iscraitem
								//	We can use this for comparison
								if (sorec.getLineItemValue('item','custcol_axcr_iscraitem',b)=='T')
								{

									//9/19/2016
									// pillarValue is used for Asset only.
									var pillarValue = '';
									log('debug','line item text DM/EM/DN check',sorec.getLineItemText('item','item',b));
									if (sorec.getLineItemText('item','item',b).indexOf('EM') > -1)
									{
										//If EM pillar isn't in the rdCtPillars array, add it
										if (rdCtPillars.indexOf(EM_PILLAR) == -1)
										{
											rdCtPillars.push(EM_PILLAR);
										}

										pillarValue = EM_PILLAR;
									}
									else if (sorec.getLineItemText('item','item',b).indexOf('DM') > -1)
									{
										//If DM pillar isn't in the rdCtPillars array, add it
										if (rdCtPillars.indexOf(DM_PILLAR) == -1)
										{
											rdCtPillars.push(DM_PILLAR);
										}

										pillarValue = DM_PILLAR;
									}
									//9/19/2016
									//	Add in DN check
									else if (sorec.getLineItemText('item','item',b).indexOf('DN') > -1)
									{
										//If DN pillar isn't in the rdCtPillars array, add it
										if (rdCtPillars.indexOf(DN_PILLAR) == -1)
										{
											rdCtPillars.push(DN_PILLAR);
										}

										pillarValue = DN_PILLAR;
									}

//									If THIS LINEs' item type is one of them it will be marked as recurring
									//	7/15/2016 - We now capture Is Recurring at the line level
									//		custcol_axcr_iscrarenewingitem
									var isRecurring = sorec.getLineItemValue('item','custcol_axcr_iscrarenewingitem',b);
									if (isRecurring != 'T')
									{
										isRecurring = 'F';
									}

									//5/14/2016 - Only include Recurring items
									if (isRecurring == 'T')
									{
										//contract ACV value = Sum of All eligible line amount
										ctAcvValue = ctAcvValue
													 +
													 parseFloat(sorec.getLineItemValue('item','amount',b));
									}

									//7/15/2016
									//We need to grab contract anniversary date and Earliest Contract Start Date
									//	We need to do this as long as there are dates provided
									//	Even if the item is NOT recurring it may still hold billing start/end
									if (!ctAnvDate &&
										sorec.getLineItemValue('item','custcol_contract_end_date',b))
									{
										//Set the value of ctAnvDate (Anniversary date) to first match against
										ctAnvDate = sorec.getLineItemValue('item','custcol_contract_end_date',b);
									}

									//7/15/2016
									//as long as Start Date value is there, Compare against previous and
									//	Grab the earliest
									if (
										sorec.getLineItemValue('item','custcol_contract_start_date', b) &&
										(
											!ctStartDate ||
											nlapiStringToDate(sorec.getLineItemValue('item','custcol_contract_start_date', b)) <= ctStartDate
										)
									   )
									{
										//set ctStartDate as Date object
										ctStartDate = nlapiStringToDate(sorec.getLineItemValue('item','custcol_contract_start_date', b));
									}

									log('debug','line '+b, 'Start Date: '+ctStartDate);

									var newAssetRec = nlapiCreateRecord(
														'customrecord_axcr_assets',
														{recordmode:'dynamic'}
													  );
									//Start filling in the fields
									newAssetRec.setFieldValue(
										'custrecord_cra_contract',
										newCtrRef
									); //Set parent Contract (Just created above)

									//Set Latest Approved SO
									newAssetRec.setFieldValue(
										'custrecord_cra_linkedso',
										soId
									);

									//Set Latest Opportunity
									newAssetRec.setFieldValue(
										'custrecord_cra_linkedopp',
										sorec.getFieldValue('opportunity')
									);

									//custrecord_cra_assetpillar
									newAssetRec.setFieldValue(
										'custrecord_cra_assetpillar',
										pillarValue
									);

									newAssetRec.setFieldValue(
										'custrecord_cra_enduser',
										endCompany
									); //Set End Customer

									newAssetRec.setFieldValue(
										'custrecord_cra_billingentity',
										sorec.getFieldValue('entity')
									); //Set Billing Entity

									newAssetRec.setFieldValue(
										'custrecord_cra_assetstatus',
										paramActiveStatusId
									); //Default Asset Status (match contract)

									newAssetRec.setFieldValue(
										'custrecord_cra_item',
										sorec.getLineItemValue('item','item',b)
									); //Set Item

									newAssetRec.setFieldValue(
										'custrecord_cra_itemqty',
										sorec.getLineItemValue('item','quantity',b)
									); //Set Item Qty

									newAssetRec.setFieldValue(
										'custrecord_cra_recurring',
										isRecurring
									); //Set is recurring.

									newAssetRec.setFieldValue(
										'custrecord_cra_itemlistprice',
										itemjson[sorec.getLineItemValue('item','item',b)].baseprice
									); //Set base price

									newAssetRec.setFieldValue(
										'custrecord_cra_actualsalesprice',
										sorec.getLineItemValue('item','amount',b)
									); //Set actual sales price

									//8/3/2016 - we ONLY set item renewed amount
									//	when action is renewal. We do NOT need to do
									//	for Contract Redo
									if (actionToTake == 'renewal')
									{
										//Check as long as it is NOT Add to Install base and IS a recurring item
										if (sorec.getLineItemValue('item','custcoladd_on_installed_base',b) != 'T' &&
											isRecurring == 'T')
										newAssetRec.setFieldValue(
											'custrecord_cra_itemrenewedamt',
											sorec.getLineItemValue('item','amount',b)
										); //Set Renewed amount

									}

									newAssetRec.setFieldValue(
										'custrecord_cra_originalsalesprice',
										sorec.getLineItemValue('item','custcol_axcr_origfullamount',b)
									); //Set original sales price

									newAssetRec.setFieldValue(
										'custrecord_cra_pricingtier',
										(sorec.getLineItemValue('item','price',b)!='-1'?sorec.getLineItemValue('item','price',b):'')
									); //Set price level used

									newAssetRec.setFieldValue(
										'custrecord_cra_parentitemgrp',
										itemGroupId
									); //Set Item Group

									newAssetRec.setFieldValue(
										'custrecord_cra_parentitemgrpqty',
										itemGroupQty
									); //Set Item Group Qty

									newAssetRec.setFieldValue(
										'custrecord_cra_billingschedule',
										sorec.getLineItemValue('item','billingschedule', b)
									); //Set Billing schedule used

									newAssetRec.setFieldValue(
										'custrecord_cra_entstartdate',
										sorec.getLineItemValue('item','custcol_contract_start_date',b)
									); //Set Entitlement Start as Billing Start

									newAssetRec.setFieldValue(
										'custrecord_cra_entenddate',
										sorec.getLineItemValue('item','custcol_contract_end_date',b)
									); //Set Entitlement End as Billing End

									//7/16/2016
									//	Map out Add to Install Base, Is Cancelled and Is Concession as well
									newAssetRec.setFieldValue(
										'custrecord_cra_isaddoninstallbase',
										sorec.getLineItemValue('item','custcoladd_on_installed_base',b)
									); // Set Add to Install Base
									//If for Renewal processing add to install base is checked, also check Added to Contract
									if (sorec.getLineItemValue('item','custcoladd_on_installed_base',b) == 'T')
									{
										//Map out Add on to Install Base AND mark this as added to contract
										newAssetRec.setFieldValue(
											'custrecord_cra_isaddedtocontract',
											'T'
										);
									}

									newAssetRec.setFieldValue(
										'custrecord_cra_isconcession',
										sorec.getLineItemValue('item','custcolconcession',b)
									); // Set Is Concession

									newAssetRec.setFieldValue(
										'custrecord_cra_iscancelled',
										sorec.getLineItemValue('item','custcolcancelled_item',b)
									); // Set Is Cancelled

									//Save New Asset Record
									var newAssetRecId = nlapiSubmitRecord(newAssetRec, true, true);

									log('debug','Asset Created','Line '+b+' // '+newAssetRecId);

								}
							} //End For Loop for creating Assets


						}
						catch (s2err)
						{
							throw nlapiCreateError(
								'CRA_RENEWAL_APPR_STEP_2',
								'Unable to CREATE NEW Assets for '+actionToTake+' Contract ID '+newCtrRef+': '+getErrText(s2err),
								true
							);
						}

						//*** 3. Finalize by Updating Contracts' new Name, ACV amount, latest SO and latest Opp, contract dates as well as Marking Sales Order as Processed
						try
						{
							//For Renewal process, IF Billing END Date is AFTER Current Contract Term End Date,
							//We need to recalculate Contract Term Start and End Date.
							//	New Contract Term Start = Billing Start
							//	New Contract Term End = New Contract Term Start + Terms passed in
							var soBillingStartObj = ctStartDate,
								currentCtrTermEndObj = nlapiStringToDate(ctrRefRec.getFieldValue('custrecord_crc_termenddate')),
								newTermStart = '',
								newTermEnd = '';

							if (soBillingStartObj >= currentCtrTermEndObj)
							{
								newTermStart = ctStartDate;

								//7/15/2016 - Logic Change.
								//	Because this Renewal is passed originally set contract term End Date
								//	We will re-calculate the contract Term from THIS renewing SalesOrder
								//	Earliest Start + Terms In Months - 1 Day
								log('debug','Contract Term',sorec.getFieldValue('custbody_axcr_contractterm'));
								newTermEnd = nlapiAddMonths(
												ctStartDate,
												sorec.getFieldValue('custbody_axcr_contractterm')
											  );

								newTermEnd = nlapiAddDays(newTermEnd, -1);

								log('debug','Renewal Term End Calc', 'new term start/end = '+newTermStart+' to '+newTermEnd);

							}

							//9/19/2016
							//loop through rdCtPillars array and build the new contract name
							for (var rpi=0; rpi < rdCtPillars.length; rpi+=1)
							{
								if (rdCtPillars[rpi] == EM_PILLAR)
								{
									ctNameType += 'EM';

									if ((rpi+1) != rdCtPillars.length)
									{
										ctNameType += '/';
									}
								}

								if (rdCtPillars[rpi] == DM_PILLAR)
								{
									ctNameType += 'DM';

									if ((rpi+1) != rdCtPillars.length)
									{
										ctNameType += '/';
									}
								}

								if (rdCtPillars[rpi] == DN_PILLAR)
								{
									ctNameType += 'DM';

									if ((rpi+1) != rdCtPillars.length)
									{
										ctNameType += '/';
									}
								}
							}

							log('debug','new contract name type', ctNameType);

							var ctNameValue = newCtrRef+'-'+ctNameType+'-'+ctrRefRec.getFieldText('custrecord_crc_dealtype'),
								ctUpdFlds = ['name',
							                 'custrecord_crc_startdate',
							                 'custrecord_crc_acv',
							                 'custrecord_crc_startingacv',
							                 'custrecord_crc_status',
							                 'custrecord_crc_apprso',
							                 'custrecord_crc_renewopp',
							                 'custrecord_crc_ctrpillar',
							                 //10/14/2016
							                 //Part of Enhancement #2
							                 //Set Currency on Contract from Sales order
							                 'custrecord_crc_ctrcurrency'],
								ctUpdVals = [ctNameValue,
								             ctAnvDate,
								             ctAcvValue,
								             ctAcvValue,
								             paramActiveStatusId,
								             soId,
								             sorec.getFieldValue('opportunity'),
								             rdCtPillars,
								             //10/14/2016
							                 //Part of Enhancement #2
							                 //Set Currency on Contract from Sales order
								             sorec.getFieldValue('currency')];

							//ONLY update the contract term information WHEN it's passed the term
							if (newTermStart && newTermEnd)
							{
								ctUpdFlds.push('custrecord_crc_termstartdate');
								ctUpdFlds.push('custrecord_crc_termenddate');
								ctUpdFlds.push('custrecord_crc_contractterm');

								ctUpdVals.push(nlapiDateToString(newTermStart));
								ctUpdVals.push(nlapiDateToString(newTermEnd));
								ctUpdVals.push(sorec.getFieldValue('custbody_axcr_contractterm'));
							}

							nlapiSubmitField('customrecord_axcr_contract', newCtrRef, ctUpdFlds, ctUpdVals, false);

							//4. Update Sales Order with Matching Contract Reference and contract processed flag
							var soUpdFlds = ['custbody_axcr_contractprocessed'],
								soUpdVals = ['T'];

							nlapiSubmitField('salesorder',soId,soUpdFlds,soUpdVals,true);

							log('debug','Sales Order updated',soId+' Updated with contract reference');

							//7/17/2016
							//Automation Rule
							//Check to see if we need to generate automatic renewal opportunity.
								//7/18/2016
								//NOTE:
								//In case of redocontract, we still want the new renewal Opportunity created
								//	if it matches the critiera.
								//	Previously created renewal Opportunity will NO LONG be associated with
								//	This contract and we let netSuite expire them natively.
							var autoRenewJson ={
								'contractid':newCtrRef,
								'billingentity':endCompany,
								'anniversarydate':ctAnvDate
							};
							procAutoRenewal(autoRenewJson);
						}
						catch (s3err)
						{
							throw nlapiCreateError(
								'CRA_RENEWAL_APPR_STEP_3',
								'Unable to update contract and/or sales order with final step '+
								'for '+actionToTake+' Contract ID '+newCtrRef+': '+getErrText(s3err),
								true
							);
						}

						//Log it as success
						logTblBody += '<tr><td>'+soNum+' ('+soId+')</td>'+
									  '<td>'+clientName+' ('+clientId+')</td>'+
									  '<td>Success</td>'+
									  '<td>'+actionToTake+'</td>'+
									  '<td>SO Successfully Processed with Renewal or Redocontract. </td>';
					}

				}//End of Action Type execution

			}
			catch (procerr)
			{
				logTblBody += '<tr><td>'+soNum+' ('+soId+')</td>'+
							  '<td>'+clientName+' ('+clientId+')</td>'+
							  '<td>Failed</td>'+
							  '<td>'+actionToTake+'</td>'+
							  '<td>'+getErrText(procerr)+'</td>';

				log('error','Error Processing', soNum+' // '+soId+' // '+getErrText(procerr));
			}

			//Add In Reschedule Logic
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / sors.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);

			//------------ Reschedule check -------------------
			if ((i+1)==1000 || ((i+1) < sors.length && nlapiGetContext().getRemainingUsage() < 2000))
			{
				//reschedule
				log(
					'audit',
					'Getting Rescheduled at',
					'SO ID '+soId+' // #'+soNum
				);

				var param = {
					'custscript_sb133_lastprocid':paramLastProcId
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
			'CRA_ERROR_SO_PROCESS',
			'Unexpected Error while processing SO to Contract '+getErrText(procerr)
		);

		//Generate Custom Error Email Notification
		nlapiSendEmail(
			-5,
			paramCraErrorNotifier,
			'CRA Sales Order Process Error',
			'Error Processing Sales Order to Contract'+
				'. Unexpected Script Termination due to below error.<br/><br/>'+
				getErrText(procerr),
			paramCraCcNotifier,
			null,
			null,
			null,
			true
		);

	}

	//Generate csvLog. This is being done here just in case something erros during processing that terminates the script
	if (logTblBody)
	{
		nlapiSendEmail(
			-5,
			paramAcctNotifier,
			'SalesOrd Contract Process Log',
			'Sales Order to Contract Process Log<br/><br/>'+
				'<table border="1">'+
				logTblHeader+
				logTblBody+
				'</table>',
			null,
			null,
			null,
			null,
			true
		);
	}
}

/***************** Helper Function *************/
//7/17/2016
//Automation Rule
//Check to see if we need to generate automatic renewal opportunity.
//var autoRenewJson ={
//	'contractid':newCtRecId,
//	'billingentity':endCompany,
//	'anniversarydate':ctAnvDate
//};
function procAutoRenewal(autoRenewJson)
{
	//7/17/2016
	//Validation Rule
	//We need to see if we need to automatically create renewal opportunity
	//	This can happen when End Date is within the Renewal Process Days specified
	//	in Company Preferences. As of now set to 120 days.
	//	Logic:
	//		Billing End Date - [Renewal Process Days (120 Days)] is <= to TODAY
	//	We FYI the User that once SO is processed, it will automatically generate
	//	Next Renewal Opportunity.

		//Grab the first matching line that has renewing item.
		//	If it is renewing it MUST already have end date set.
		//	Previous validation would have already done billing end date being same.
		//	We just need to grab first found.
	var	checkBillEndDate = autoRenewJson.anniversarydate,
		renewProcDate = nlapiAddDays(nlapiStringToDate(checkBillEndDate), (-1 * parseInt(paramRenewalNumFromEndDate)));

	log('debug','procAutoRenewal', checkBillEndDate+' // TODAY: '+nlapiDateToString(new Date()) );

	//We need to queue up renewal processing for this customer
	if (renewProcDate <= new Date() )
	{
		//we simply queue up renewal processing with additional parameters
		//In addition to custom anniversary date and customer to process against,
		//	we are also passing in Use Anniversary date as Renewal date
		//	AND
		//	Contract to process against
		var params = {
			'custscript_sb135_ctanvidate':autoRenewJson.anniversarydate,
			'custscript_sb135_renewcustomer':autoRenewJson.billingentity,
			'custscript_sb135_anviasrenewaldate':'T',
			'custscript_sb135_proccontract':autoRenewJson.contractid
		};
		var renewQueue = nlapiScheduleScript(
							'customscript_axcra_ss_ctrrenewalproc',
							'customdeploy_axcra_ss_ctrrenewaladhoc',
							params
						 );

		log('debug','Queued up auto renewal processing', JSON.stringify(params));

	}
}
