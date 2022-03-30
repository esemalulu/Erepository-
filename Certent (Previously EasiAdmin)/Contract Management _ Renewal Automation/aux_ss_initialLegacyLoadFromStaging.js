/**
 *  One time or As needed scheduled scrip to import legacy data into contract and asset records.
 *  This script is designed to create necessary contract/asset information so that new contract
 *  renewal process will pick up and process them.
*/

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
	paramDefaultAnnualUplift = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_defupliftperct'); //Default Annual uplift
	

if (paramCraCcNotifier)
{
	paramCraCcNotifier = paramCraCcNotifier.split(',');
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
	BOTH_PILLAR = '3',
	//9/19/2016
	//Enhancement request to handle DN Pillar
	DN_PILLAR = '5';

/**
 * Main Entry function for Sales order to Contract/Asset Processor
 * Script will run against Saved Search passed in as parameter.
 * 
 */
function procInitialLoadFromStaging(type) 
{
	//1. Need to create main search that groups it by Contract Import ID
	var mflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	            new nlobjSearchFilter('custrecord_axcr_stg_isproc', null, 'is', 'F')],
	    //Group the results by Contract Import ID
		mcol = [new nlobjSearchColumn('custrecord_axcr_stg_extid', null, 'group')],
		mrs = nlapiSearchRecord('customrecord_axcr_staging', null, mflt, mcol);
	
	//2. Loop through each import ID and process them
	for (var m=0; mrs && m < mrs.length; m+=1)
	{
		var importId = mrs[m].getValue('custrecord_axcr_stg_extid', null,'group');
		
		log('debug','processing Import ID', importId);
		
		//3. For each importID, we need to grab ALL related data
		//	 We assume that every group will NOT contain more than 1000 records.
		var iflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		            new nlobjSearchFilter('custrecord_axcr_stg_extid', null, 'is', importId),
		            //make sure we only bring out unprocessed one.
		            new nlobjSearchFilter('custrecord_axcr_stg_isproc', null, 'is', 'F')],
			icol = [
			        new nlobjSearchColumn('internalid'), //0 - stage record internal id
			        //Contract Related Fields
			        new nlobjSearchColumn('custrecord_axcr_stg_status'), //1 - Contract Status
			        new nlobjSearchColumn('custrecord_axcr_stg_pillar'), //2 - Contract Pillar
			        new nlobjSearchColumn('custrecord_axcr_stg_dealtype'), //3 - Deal Type
			        new nlobjSearchColumn('custrecord_axcr_stg_termmths'), //4 - Terms in months
			        new nlobjSearchColumn('custrecord_axcr_stg_anniverdt'), //5 - Anniversary Date
			        new nlobjSearchColumn('custrecord_axcr_stg_constartdt'), //6 - Term Start Date
			        new nlobjSearchColumn('custrecord_axcr_stg_conenddt'), //7 - Term End Date
			        new nlobjSearchColumn('custrecord_axcr_stg_billcustomer'), //8 - Bill Entity
			        new nlobjSearchColumn('custrecord_axcr_stg_endcust'), //9 - End Entity
			        new nlobjSearchColumn('custrecord_axcr_stg_uplift'), //10 - Uplift %
			        //Asset Related Fields
			        //	- MUST Find out Is recurring based on Item Type
			        new nlobjSearchColumn('custrecord_axcr_stg_entitlementstartdt'), //11 - Entitlement Start
			        new nlobjSearchColumn('custrecord_axcr_stg_entitlementenddate'), //12 - Entitlement End
			        new nlobjSearchColumn('custrecord_axcr_stg_addon'), //13 - Is Add On To Install Base
			        new nlobjSearchColumn('custrecord_axcr_stg_cancelled'), //14 - Is cancelled
			        new nlobjSearchColumn('custrecord_axcr_stg_concession'), //15 - Is Concession
			        new nlobjSearchColumn('custrecord_axcr_stg_item'), //16 - Item
			        new nlobjSearchColumn('custitemitem_type','custrecord_axcr_stg_item'), //17 - Item Type (Determines if the item is recurring)
			        new nlobjSearchColumn('custrecord_axcr_stg_qty'), //18 - Item Qty
			        new nlobjSearchColumn('custrecord_axcr_stg_itemactprice'), //19 - Item Actual Price
			        new nlobjSearchColumn('custrecord_axcr_stg_itemrenewval'), //20 - Annual Renewal Value
			        new nlobjSearchColumn('custrecord_axcr_stg_itemlistprice'), //21 - Item List Price
			        new nlobjSearchColumn('custrecord_axcr_stg_pricingtier'), //22 - Pricing Tier
			        new nlobjSearchColumn('custrecord_axcr_stg_billingschedule'), //23 - Billing Schedule
			        new nlobjSearchColumn('custrecord_axcr_stg_assetstatus'), //24 - Asset Status
			        new nlobjSearchColumn('custrecord_axcr_stg_parentitemgrp'), //25 - Parent Item Group
			        new nlobjSearchColumn('custrecord_axcr_stg_parentitemqty'), //26 - Parent Item Group Qty
			        new nlobjSearchColumn('custrecord_axcr_stg_acvcuryear'), //27 - Starting ACV of the Current Year
			        new nlobjSearchColumn('custrecord_axcr_stg_targetacv') // 28 - Target ACV
			       ],
			irs = nlapiSearchRecord('customrecord_axcr_staging', null, iflt, icol),
			//array of internal IDs to mark completed
			iIds = [],
			//array of generated asset Ids
			aIds = [],
			//Contract ID
			newContractId = '',
			//sum up total actual sales price 
			//	for ACV Value for THIS Contract
			newCtAcvValue = 0.0;
		
		//4. Loop through each group content and create contract and related assets
		for (var i=0; irs && i < irs.length; i+=1)
		{
			//Add to iIds array
			iIds.push(irs[i].getValue('internalid'));
			
			//JSON Object to Hold result for easy access
			ijson = {
				'id':irs[i].getValue('internalid'),
				'contractstatus':irs[i].getValue('custrecord_axcr_stg_status'),
				'pillar':irs[i].getValue('custrecord_axcr_stg_pillar'),
				'dealtype':irs[i].getValue('custrecord_axcr_stg_dealtype'),
				'termsinmonths':irs[i].getValue('custrecord_axcr_stg_termmths'),
				'anvidate':irs[i].getValue('custrecord_axcr_stg_anniverdt'),
				'cstartdate':irs[i].getValue('custrecord_axcr_stg_constartdt'),
				'cenddate':irs[i].getValue('custrecord_axcr_stg_conenddt'),
				'billcustomer':irs[i].getValue('custrecord_axcr_stg_billcustomer'),
				'endcustomer':irs[i].getValue('custrecord_axcr_stg_endcust'),
				'uplift':irs[i].getValue('custrecord_axcr_stg_uplift'),
				'estartdate':irs[i].getValue('custrecord_axcr_stg_entitlementstartdt'),
				'eenddate':irs[i].getValue('custrecord_axcr_stg_entitlementenddate'),
				'isaddontoctr':( (irs[i].getValue('custrecord_axcr_stg_addon')=='T')?'T':'F'),
				'isrecurring':'',
				'iscancelled':( (irs[i].getValue('custrecord_axcr_stg_cancelled')=='T')?'T':'F'),
				'isconcession':( (irs[i].getValue('custrecord_axcr_stg_concession')=='T')?'T':'F'),
				'item':irs[i].getValue('custrecord_axcr_stg_item'),
				'qty':irs[i].getValue('custrecord_axcr_stg_qty'),
				'itemtype':irs[i].getValue('custitemitem_type','custrecord_axcr_stg_item'),
				'actualprice':irs[i].getValue('custrecord_axcr_stg_itemactprice'),
				'renewalamount':irs[i].getValue('custrecord_axcr_stg_itemrenewval'),
				'listprice':irs[i].getValue('custrecord_axcr_stg_itemlistprice'),
				'pricetier':irs[i].getValue('custrecord_axcr_stg_pricingtier'),
				'billsch':irs[i].getValue('custrecord_axcr_stg_billingschedule'),
				'assetstatus':irs[i].getValue('custrecord_axcr_stg_assetstatus'),
				'parentitemgrp':irs[i].getValue('custrecord_axcr_stg_parentitemgrp'),
				'parentitemgrpqty':irs[i].getValue('custrecord_axcr_stg_parentitemqty'),
				'startingacv':irs[i].getValue('custrecord_axcr_stg_acvcuryear'),
				'targetacv':irs[i].getValue('custrecord_axcr_stg_targetacv')
			};
			
			//Identify if the item is recurring based on item Type
			if (ijson.itemtype && paramRecurringItemTypes.contains(ijson.itemtype))
			{
				ijson.isrecurring = 'T';
			}
			else
			{
				ijson.isrecurring = 'F';
			}
			
			//If end customer isn't set, set it as billcustomer
			if (!ijson.endcustomer)
			{
				ijson.endcustomer = ijson.billcustomer;
			}
			
			//Sum up newCtAcvValue
			newCtAcvValue += parseFloat(ijson.actualprice);
			
			//************ Begin Core Process **********************
			//	We start by creating a contract if it has NOT been created yet
			if (!newContractId)
			{
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
				
				//Set is legacy load to checked
				newCtRec.setFieldValue(
					'custrecord_crc_islegacyload',
					'T'
				);
				
				//8/31/2016
				//	Request to set Contract Import ID on contract being created for reporting
				newCtRec.setFieldValue(
					'custrecord_crc_legacydataimportid',
					importId
				);
				
				//Set Pillar
				newCtRec.setFieldValue(
					'custrecord_crc_ctrpillar',
					ijson.pillar
				);
				
				//Set Term Start date
				newCtRec.setFieldValue(
					'custrecord_crc_termstartdate',
					ijson.cstartdate
				);
				
				//Set Term End date
				newCtRec.setFieldValue(
					'custrecord_crc_termenddate',
					ijson.cenddate
				);
				
				//Set Deal Type
				newCtRec.setFieldValue(
					'custrecord_crc_dealtype', 
					ijson.dealtype
				); 
				
				//Set the Terms in Months
				newCtRec.setFieldValue(
					'custrecord_crc_contractterm', 
					ijson.termsinmonths
				);
				
				//Set Billing Entity
				newCtRec.setFieldValue(
					'custrecord_crc_billingentity', 
					ijson.billcustomer
				);
				
				//Set Contract Anniversary Date
				newCtRec.setFieldValue(
					'custrecord_crc_startdate',
					ijson.anvidate
				);
				
				//Set End User
				newCtRec.setFieldValue(
					'custrecord_crc_enduser', 
					ijson.endcustomer
				);
				
				//Set Annual Uplift
				newCtRec.setFieldValue(
					'custrecord_crc_upliftpct',
					ijson.uplift
				);
				
				//Contract Status to be defaulted to Active
				newCtRec.setFieldValue(
					'custrecord_crc_status',
					ijson.contractstatus
				);
				
				//Set Starting ACV Value
				newCtRec.setFieldValue(
					'custrecord_crc_startingacv',
					ijson.startingacv
				);
				
				//Set Target ACV Value
				newCtRec.setFieldValue(
					'custrecord_crc_targetacv',
					ijson.targetacv
				);
				
				//Submit contract record
				var pillarText = '',
					dealTypeText = newCtRec.getFieldText('custrecord_crc_dealtype');
				
				newContractId = nlapiSubmitRecord(newCtRec, true, true);
				
				if (ijson.pillar == EM_PILLAR)
				{
					pillarText = 'EM';
				}
				else if (ijson.pillar == DM_PILLAR)
				{
					pillarText = 'DM';
				}
				//use DN Pillar
				else if (ijson.pillar == DN_PILLAR)
				{
					pillarText = 'DN';
				}
				
				nlapiSubmitField(
					'customrecord_axcr_contract', 
					newContractId, 
					'name', 
					newContractId+'-'+pillarText+'-'+dealTypeText, 
					false
				);
				
			}
			
			//******* Let's creat Assets *****
			var newAssetRec = nlapiCreateRecord(
					'customrecord_axcr_assets', 
					{recordmode:'dynamic'}
				  );
			//Start filling in the fields
			newAssetRec.setFieldValue(
				'custrecord_cra_contract', 
				newContractId
			); //Set parent Contract (Just created above)
			
			//custrecord_cra_assetpillar
			newAssetRec.setFieldValue(
				'custrecord_cra_assetpillar',
				ijson.pillar
			);
			
			newAssetRec.setFieldValue(
				'custrecord_cra_enduser', 
				ijson.endcustomer
			); //Set End Customer
			
			newAssetRec.setFieldValue(
				'custrecord_cra_billingentity', 
				ijson.billcustomer
			); //Set Billing Entity 
			
			newAssetRec.setFieldValue(
				'custrecord_cra_assetstatus', 
				ijson.assetstatus
			); //Default Asset Status (match contract)
			
			newAssetRec.setFieldValue(
				'custrecord_cra_item', 
				ijson.item
			); //Set Item
			
			newAssetRec.setFieldValue(
				'custrecord_cra_itemqty', 
				ijson.qty
			); //Set Item Qty
			
			newAssetRec.setFieldValue(
				'custrecord_cra_recurring', 
				ijson.isrecurring
			); //Set is recurring.
			
			newAssetRec.setFieldValue(
				'custrecord_cra_itemlistprice', 
				ijson.listprice
			); //Set base price
			
			newAssetRec.setFieldValue(
				'custrecord_cra_actualsalesprice', 
				ijson.actualprice
			); //Set actual sales price
			
			newAssetRec.setFieldValue(
				'custrecord_cra_originalsalesprice', 
				ijson.renewalamount
			); //Set original sales price
			
			newAssetRec.setFieldValue(
				'custrecord_cra_pricingtier', 
				ijson.pricetier
			); //Set price level used
			
			newAssetRec.setFieldValue(
				'custrecord_cra_parentitemgrp', 
				ijson.parentitemgrp
			); //Set Item Group
				
			newAssetRec.setFieldValue(
				'custrecord_cra_parentitemgrpqty', 
				ijson.parentitemgrpqty
			); //Set Item Group Qty
				
			newAssetRec.setFieldValue(
				'custrecord_cra_billingschedule', 
				ijson.billsch
			); //Set Billing schedule used
			
			newAssetRec.setFieldValue(
				'custrecord_cra_entstartdate', 
				ijson.estartdate
			); //Set Entitlement Start as Billing Start
			
			newAssetRec.setFieldValue(
				'custrecord_cra_entenddate', 
				ijson.eenddate
			); //Set Entitlement End as Billing End
			
			newAssetRec.setFieldValue(
				'custrecord_cra_isaddoninstallbase',
				ijson.isaddontoctr
			); // Set Add to Install Base
			
			//If isaddontoctr is T, set custrecord_cra_isaddedtocontract to T as well
			if (ijson.isaddontoctr == 'T')
			{
				newAssetRec.setFieldValue(
					'custrecord_cra_isaddedtocontract',
					'T'
				);
			}
			
			newAssetRec.setFieldValue(
				'custrecord_cra_isconcession',
				ijson.isconcession
			); // Set Is Concession
			
			newAssetRec.setFieldValue(
				'custrecord_cra_iscancelled',
				ijson.iscancelled
			); // Set Is Cancelled
			
			//Save New Asset Record
			aIds.push(nlapiSubmitRecord(newAssetRec, true, true));
			
		}//End Import Group element loop
		
		//Once all is done, we need to update contract with correct ACV
		var acvFlds = ['custrecord_crc_acv'],
			acvVals = [newCtAcvValue];
		
		nlapiSubmitField(
			'customrecord_axcr_contract', 
			newContractId, 
			acvFlds, 
			acvVals, 
			false
		);
		
		//Once ALL THIS IS DONE, we update all group to completed
		for (var c=0; c < iIds.length; c+=1)
		{
			var stageUpdFlds = ['custrecord_axcr_stg_isproc',
			                    'custrecord_axcr_stg_proclog',
			                    'custrecord_axcr_stg_gencontract'],
				stageUpdVals = ['T',
				                'Successfully Created Contract and following Asset IDs '+aIds,
				                newContractId];
			
			nlapiSubmitField(
				'customrecord_axcr_staging', 
				iIds[c], 
				stageUpdFlds, 
				stageUpdVals, 
				false
			);
		}
		
		//Add In Reschedule Logic
		//Set % completed of script processing
		var pctCompleted = Math.round(((m+1) / mrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//break;
		
		//------------ Reschedule check -------------------
		if ((m+1)==1000 || ((m+1) < mrs.length && nlapiGetContext().getRemainingUsage() < 2000)) 
		{
			//reschedule
			log(
				'audit',
				'Getting Rescheduled at', 
				'Contract Import ID '+importId
			);
			
			//execute reschedule
			nlapiScheduleScript(
				nlapiGetContext().getScriptId(), 
				nlapiGetContext().getDeploymentId(), 
				null
			);
			break;
		}
	}
}
