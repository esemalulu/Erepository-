/**
 * Contract Management & Renewal Automation
 * User Event deployed against Sales Order and Quote.
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

if (paramRecurringItemTypes)
{
	paramRecurringItemTypes = paramRecurringItemTypes.split(',');
}

var EM_PILLAR = '1',
	DM_PILLAR = '2',
	BOTH_PILLAR = '3',
	//9/19/2016
	//Enhancement request to handle DN Pillar
	DN_PILLAR = '5';

/**
 * Before Load Related Function
 * @param type
 * @param form
 * @param request
 */
function soQuoteOppBeforeLoad(type, form, request)
{
	log('debug','Before Load '+nlapiGetRecordType(), type);
	/************* Opportunity related process ***************/
	//ONLY for OPP, add in button
	if (nlapiGetRecordType() == 'opportunity' )
	{
		//10/6/2016
		//In case Record Transformation Fails,
		//User will be redirect to THIS Opportunity. System will send
		//transformerr request parameter with detail.
		//IF This is sent, create new dynamic inlinehtml field
		//and display the message to the user
		if (request && request.getParameter('transformerr'))
		{
			var errMsgVal = strGlobalReplace(request.getParameter('transformerr'),'//', '<br/>');
			
			var errfld = form.addField('custpage_trferr','inlinehtml','Sales Order Err', null, null);
			errfld.setLayoutType('outsideabove');
			errfld.setDefaultValue(
				'<div style="color: red; font-size: 16px; font-weight:bold">'+
				errMsgVal+
				'</div><br/><br/>'
			);
		}
		
		//10/6/2016
		//Process Change:
		//Workflow that originally triggered SO creation will now be handled by script
		//We are going to place a hidden field that captures original status value of the 
		//entity status.
		//On client side, if the status changes to 13 (Closed - Won), 
		//And all validation passes, we will display the message
		//Saving this Opportunity WILL create Sales Order. If you do NOT wish to
		//	to continue, click cancel
		//This message was originally triggered by the workflow but we are changing the verbiage
		var hiddenOrigStatus = form.addField('custpage_origoppstatus', 'text','Original Opp Status', null, null);
		hiddenOrigStatus.setDisplayType('hidden');
		hiddenOrigStatus.setDefaultValue(nlapiGetFieldValue('entitystatus'));
		
		
		//For Opportunity Type, add in custom field to indicate if the line was modified. 
		var itemLineChanged = form.addField('custpage_linechanged','checkbox','Line Item Changed',null,null);
		itemLineChanged.setDisplayType('disabled');
				
		form.insertField(itemLineChanged, 'custbody_axcr_iscratrx');
		
		if (type == 'view' && nlapiGetFieldValue('custbody_axcr_activequoteref'))
		{
			var emailGeneratorUrl = nlapiResolveURL(
										'SUITELET',
										'customscript_axcra_sl_adhocrenewgen',
										'customdeploy_axcra_sl_adhocrenewgen'
									)+
									'&custparam_oppid='+nlapiGetRecordId()+
									'&custparam_quoteid='+nlapiGetFieldValue('custbody_axcr_activequoteref')+
									'&custparam_custid='+nlapiGetFieldValue('entity')+
									'&custparam_ctrenddate='+(nlapiGetFieldValue('custbody_axcr_contractanivdate')?nlapiGetFieldValue('custbody_axcr_contractanivdate'):'');
			
			//Add a custom button to generate Renewal Invoice email OFF of linked Quote. This will allow record merging and sending
			var salesRepName = nlapiGetFieldText('salesrep');
			
			var sendRenewalBtn = form.addButton(
				'custpage_sendemailbtn', 
				'Send Current Proposal', 
				'if (confirm(\'This will send current proposal from '+salesRepName+' to customer. Are you sure?\')) '+
					'{window.open(\''+emailGeneratorUrl+'\', \'\', \'width=550,height=450,resizable=yes,scrollbars=yes\');return true;}'
			);
			
			//if no value is set for custbody_axcr_contractreference, disable the button
			if (!nlapiGetFieldValue('custbody_axcr_contractreference'))
			{
				sendRenewalBtn.setDisabled(true);
			}
		}
	}//Opp specific check
	
	//7/16/2016 
	//Automation Rule:
	//Because the Sales Order is created by Workflow and we can NOT edit them
	//	In order to default the billing schedule to match what was on Opportunity custom col,
	//	We need to do it on the Client Script Side.
	//	User Event will grab the values and Set it as hidden Client JS Object
	//	This is a work around to Script Not Firing when Workflow creates the Sales Order
	if (nlapiGetRecordType() == 'salesorder')
	{
		log('debug','so type',type);
		//Map custcol_axcr_renewbillsch to billingschedule Only when it is missing
		// at the time of creation and those SO generated from opportunity. 
		if (type=='edit' && nlapiGetFieldValue('opportunity'))
		{
			var oppRec = nlapiLoadRecord('opportunity', nlapiGetFieldValue('opportunity')),
				soThisRec = nlapiGetNewRecord(),
				soBillSchJson = {};
			
			log('debug','edit load','sync billing schedule');
			
			//loop through each line and match it with sales order line
			for (var i=1; i <= oppRec.getLineItemCount('item'); i+=1)
			{
				if (oppRec.getLineItemValue('item', 'custcol_axcr_renewbillsch', i) &&
					!soThisRec.getLineItemValue('item','billingschedule', i) &&
					oppRec.getLineItemValue('item','item',i) == soThisRec.getLineItemValue('item','item',i))
				{
					
					log('debug','line '+i, 'defauting billing schedule');
					
					soBillSchJson[i] = oppRec.getLineItemValue('item', 'custcol_axcr_renewbillsch', i);
					
				}
			}
			log('DEBUG', 'soBillSchJson', JSON.stringify(soBillSchJson));
			
			//Add custom page form to store the JSON value
			var hideJsObjFld = form.addField('custpage_bschjson', 'inlinehtml', 'Bill Sch JSON', null, null);
			hideJsObjFld.setDefaultValue(
				'<script language="JavaScript">'+
				'var soBillSchJson = '+
				JSON.stringify(soBillSchJson)+
				';'+
				'</script>'
			);
			
		}
	}//SO specific check
	
}

/**
 * Before Submit function.
 * @param type
 */
function soQuoteOppBeforeSubmit(type)
{
	
	log('debug','before submit '+nlapiGetRecordType(), type);
	/************* Opportunity related process ***************/
	//9/15/2016
	// Add Deletion in the Before Submit processing of Opportunity.
	if (nlapiGetRecordType() == 'opportunity')
	{
		//If record has been changed via custpage_linechanged
		//		AND
		//	Opportunity is CRA eligible transaction
		if (type == 'delete')
		{
			//1. Grab current reference. If Quote exist, we need to expire it
			var currentQuoteRef = nlapiGetFieldValue('custbody_axcr_activequoteref');
			if (currentQuoteRef)
			{
				//Delete the Estimate
				nlapiDeleteRecord('estimate', currentQuoteRef);
			}
		}
	}
	
	/************* Sales Order related process ***************/
	if (nlapiGetRecordType() == 'salesorder')
	{
		//Need to Prevent users from deleting IF it is already associated with Contract
		if (nlapiGetFieldValue('custbody_axcr_contractreference') && type=='delete')
		{
			throw nlapiCreateError(
				'CRA_ERROR_SO_PROCESS', 
				'Sales Order ID '+nlapiGetRecordId()+
					' CAN NOT be deleted because it is associated with a Contract '+
					nlapiGetFieldValue('custbody_axcr_contractreference')+'. '+
					'It is recommended that you go through Contract Termination process.', 
				false
			);
		}
		
	}
	
	/************* Return Authorization related process ***************/
	//3/11/2016 - For Return Authorizations on Create,make sure to check OFF custbody_axcr_contractprocessed
	if (nlapiGetRecordType()=='returnauthorization')
	{
		if (type == 'create' || type == 'copy')
		{
			nlapiSetFieldValue('custbody_axcr_contractprocessed','F');
		}
	}
	
	//Check to see if this Transaction is CRA eligible
	//Loop through all Items on the Sales Order and see if it's eligible
	for (var l=1; l <= nlapiGetLineItemCount('item'); l+=1)
	{
		if (itemjson[nlapiGetLineItemValue('item', 'item', l)])
		{
			nlapiSetFieldValue('custbody_axcr_iscratrx','T');
			break;
		}
	}	
}

/**
 * After Submit function.
 * @param type
 */
function soQuoteOppEventAfterSubmit(type)
{
	//************************************ Function specific to Opportunity (estimate) **************************************
	if (nlapiGetRecordType() == 'opportunity')
	{
		//If record has been changed via custpage_linechanged
		//		AND
		//	Opportunity is CRA eligible transaction
		if ((type == 'create' && nlapiGetFieldValue('custbody_axcr_iscratrx')=='T') ||
			(nlapiGetFieldValue('custpage_linechanged') == 'T' && 
			nlapiGetFieldValue('custbody_axcr_iscratrx')=='T') )
		{
			//9/15/2016
			//Moved Delete related action out to before submit.
			//If Opportunity is being deleted, we must delete the estimate before submit
			
			//9/13/2016
			//Defect was discovered after go live where Opportunity status kept changing on the user.
			//	Issue is that by default, NS will change the status of Opportunity based on 
			//	Estimate status.  This happens when ever new estimate is issued based on changes on the Opp  
			//	We need to keep track of the original status of the Opportunity 
			//	piror to deletion and creation of new estimate
			var origOppStatus = nlapiGetFieldValue('entitystatus');
			
			//log('debug','Orig Opp Before Estimate', origOppStatus);
			
			try
			{
				//1. Grab current reference. If Quote exist, we need to expire it
				var currentQuoteRef = nlapiGetFieldValue('custbody_axcr_activequoteref');
				if (currentQuoteRef)
				{
					//Delete the Estimate
					nlapiDeleteRecord('estimate', currentQuoteRef);
				}
				
				//2. Create New Quote off of THIS Opportunity
				var newQuoteRefRec = nlapiTransformRecord('opportunity', nlapiGetRecordId(), 'estimate', {customform:paramDefaultQuoteForm}),
					newQuoteRefId = nlapiSubmitRecord(newQuoteRefRec, true, true);
				
				//3. Update THIS Opportunity with New Quote Reference
				nlapiSubmitField('opportunity', nlapiGetRecordId(), 'custbody_axcr_activequoteref', newQuoteRefId, true);
				
				//9/13/2016
				//Make sure to Update the Opportunity to ensure the Opportunity status stays as is
				var updOppRec = nlapiLoadRecord('opportunity', nlapiGetRecordId());
				
				//log('debug','Orig Opp After Estimate', updOppRec.getFieldValue('entitystatus'));
				
				//Change it ONLY if different 
				if (updOppRec.getFieldValue('entitystatus') != origOppStatus)
				{
					updOppRec.setFieldValue('entitystatus', origOppStatus);
					
					nlapiSubmitRecord(updOppRec, true, true);
				}
			}
			catch (quoteerr)
			{
				log(
					'error',
					'CRA_ERROR_OPP_PROCESS',
					'Opportunity ID '+nlapiGetRecordId()+' User Event Unable to create/recreate Quote // '+getErrText(quoteerr)
				);
					
				//Generate Custom Error Email Notification
				nlapiSendEmail(
					-5, 
					paramCraErrorNotifier, 
					'CRA Opportunity User Event Error', 
					'Error Creating/Recreating Quote for this Opportunity '+
					nlapiGetRecordId()+'. Unexpected Script error.<br/><br/>'+
						getErrText(quoteerr),
					paramCraCcNotifier
				);
			}
		}
		
		//10/6/2016
		//PROCESS Change
		//Below process replicates what original Workflow used to do.
		//It will attempt to transform Opportunity into Sales Order
		//IF Successful:
		//	1. Update the Opportunity with custbody_sales_order_created = T
		//	2. Redirect the user to to Entity Record in EDIT Mode
		//IF Failed:
		//	1. Redirect the user to Opportunity in EDIT Mode with Error Message
		
		//Record Transformation should trigger as long as 
		//Opportunity is:
		//1. Opp Status is 13 (Closed - Won)
		//2. Sales Order Created flag is NOT Checke
		if (nlapiGetFieldValue('entitystatus') == '13' &&
			nlapiGetFieldValue('custbody_sales_order_created') != 'T')
		{
			try
			{
				//Transform the record
				var soRec = nlapiTransformRecord(
								nlapiGetRecordType(), 
								nlapiGetRecordId(), 
								'salesorder'
							);
				
				//We submit the record
				var soRecId = nlapiSubmitRecord(soRec, true, true);
				log('debug','soRecId', soRecId+' successfully transformed from Opportunity ID '+nlapiGetRecordId());
				
				try
				{
					//now we update the opp record with custbody_sales_order_created
					var oppRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId()),
						entityValue = oppRec.getFieldValue('entity');
					
					oppRec.setFieldValue('custbody_sales_order_created', 'T');
					nlapiSubmitRecord(oppRec, true, true);
					
					//Lets Redirect the user to Opportunity records' entity
					nlapiSetRedirectURL('RECORD', 'customer', entityValue, 'EDIT', null);
				}
				catch(oppupderr)
				{
					throw nlapiCreateError(
						'OPP_UPD_ERR', 
						'Sales Order Internal ID '+soRecId+' was Successfully created but operation '+
						'failed to update THIS Opportunity with Sales Order Created Flag due to error ['+getErrText(oppupderr)+']', 
						false
					);
				}
			}
			catch(trferr)
			{
				var rparam = {
					'transformerr':'Error Occurred while creating Sales Order from this Opportunity.  '+
								   'Most likely errors are due to missing required fields on the Sales Order//Error Detail://'+getErrText(trferr)
				};
				
				//Change the overall message if code is OPP_UPD_ERR
				if (getErrText(trferr).indexOf('OPP_UPD_ERR') > -1)
				{
					rparam.transformerr = 'Error Occurred while Updating Opportunity after SUCCESSFUL Sales Order Creation//Error Detail://'+getErrText(trferr)
				}
				
				nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(), 'EDIT', rparam);
			}
		}
	}
}
