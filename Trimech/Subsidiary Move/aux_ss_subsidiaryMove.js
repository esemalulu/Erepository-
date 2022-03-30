/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Jan 2016     json
 *
 */

//Saved Search referenced MUST be sorted by internal ID DESC order
//There should only be TWO colums: 0 = Internal ID, 1 = Count of Transaction, 2 = Parent
//- Search is Summary Search
//EmpMap will be Old Employee to New Employee for all 
var	paramMTSubId = '2',
	paramTRISubId = '1',
	EmpMap = {},
	MtTmLocMap = {
		'13':'32',
		'14':'33',
		'15':'34',
		'16':'35',
		'17':'36', //AR-Sherwood (TM)
		'18':'37', //FL-Fort Lauderdale (TM)
		'19':'38', //FL-Orlando (TM)
		'20':'39', //FL-Tampa Bay (TM)
		'21':'5',
		'22':'6',
		'23':'40', //SC-Charleston (TM)
		'24':'30', //SC-Greenville (TM)
		'25':'41', //TN-Knoxville (TM)
		'26':'42', //TN-Nashville (TM)
		'27':'1'
	},
	DefaultOldTrxStatus = '24', //(0%) Closed - Other
	TrxTypeMap={
		'Opprtnty':{
			'id':'opportunity',
			'reffld':'custbody_ax_mtechoppref'
		},
		'Estimate':{
			'id':'estimate',
			'reffld':'custbody_ax_mtechpropref'
		}
	},
	actTypeJson={
		'Phone Call':'phonecall',
		'Task':'task',
		'Event':'calendarevent'
	};

/**
 * ------------------- Activity, Messages & User Note Move for LPC -------------------------------------------
 * Function to go through ALL LPC and attempt to reassign activities, messages and user notes to Trimech LPC 
 * @returns
 */
function actUserNoteSubsidiaryMove()
{
	var paramTrxSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_sbXX_searchid'),
	paramLastProcTrxId = nlapiGetContext().getSetting('SCRIPT','custscript_sbXX_lastproctrxid');

	//MT EmpId:TM EmpId
	EmpMap = buildEmployeeMapping();
	
	//log('debug','EmpMap',JSON.stringify(EmpMap));
	
	var flt = null;
	if (paramLastProcTrxId)
	{
		flt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcTrxId)];
	}
	
	//Execute the saved search
	var movers = nlapiSearchRecord(null, paramTrxSearchId,flt, null);
	if (movers && movers.length > 0)
	{
		//0=Internal ID
		//1=Reference to Trimech LPC
		//2=Count of Activities
		//3=Count of User Notes 
		var allcols = movers[0].getAllColumns();
		
		for (var i=0; movers && i < movers.length; i+=1)
		{
			var lpcId = movers[i].getValue(allcols[0]),
				newLpcId = movers[i].getValue(allcols[1]),
				actCount = movers[i].getValue(allcols[2]),
				unCount = movers[i].getValue(allcols[3]);
			
			//log('debug','Testing Logic',oppId+' // '+trxType+' // New Client: '+newClientId);
			try
			{
			
				try
				{
					if (parseInt(actCount) > 0)
					{
						var actflt = [new nlobjSearchFilter('internalid', null, 'anyof',leadid),
						              new nlobjSearchFilter('internalid','activity','noneof','@NONE@')];
						
						var actcol = [new nlobjSearchColumn('internalid','activity'),
						    	      new nlobjSearchColumn('type','activity')];
						
						var actrs = nlapiSearchRecord('customer',null,actflt, actcol);
						
						for (var a=0; actrs && a < actrs.length; a+=1)
						{
							var actrec = nlapiLoadRecord(
											actTypeJson[actrs[a].getValue('type','activity')], 
											actrs[a].getValue('internalid','activity'),
											{recordmode:'dynamic'}
										 );
							
							//Set Was ModernTech Flag
							actrec.setFieldValue('custevent_ax_wasmoderntech','T');
							
							//Switch out Company first
							actrec.setFieldValue('company', newLpcId);
							
							//Switch out Organizer 
							if (actrec.setFieldValue('assigned') && EmpMap[actrec.setFieldValue('assigned')])
							{
								actrec.setFieldValue('assigned', EmpMap[actrec.setFieldValue('assigned')]);
							}
							
							
							
						}
						
						
						
						
					}
					
					
					if (parseInt(unCount) > 0)
					{
						var noteflt = [new nlobjSearchFilter('internalid', null, 'anyof', leadid),
						               new nlobjSearchFilter('internalid','userNotes','noneof','@NONE@')];
						var notecol = [new nlobjSearchColumn('internalid','userNotes').setSort(true)];
						var noters = nlapiSearchRecord('customer',null,noteflt, notecol);
						
					}
					
					//Messages
					/**
					var msgflt = [new nlobjSearchFilter('internalid', null, 'anyof',leadid),
					              new nlobjSearchFilter('internalid','messages','noneof','@NONE@')];
					var msgcol = [new nlobjSearchColumn('internalid','messages').setSort(true)];
					var msgrs = nlapiSearchRecord('customer', null, msgflt, msgcol);
					*/
					
					
					
				}
				catch(oprocerr)
				{
					{
						log('error','Error Processing Opp ID '+oppId, 'Opportunity Failed to Clone // '+getErrText(oprocerr));
					}
					
				}
				
				//TESTING ONLY
				//if (i==0)
				//{
				//	break;
				//}
				
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / movers.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				//reschedule if gov is running low or legnth is 1000
				if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 2000)) 
				{
					var rparam = {
						'custscript_sbXX_lastproctrxid':lpcId
					};
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					
					log('audit','Opp with Issued Estimate status Process Rescheduled',JSON.stringify(rparam));
					break;
				}
				
			}
			catch(procerr)
			{
				log('error','Error Processing Opp ID '+oppId, getErrText(procerr));
				//trigger script terminating error with Email notification
				throw nlapiCreateError(
					'CLONE-OPP-ERR', 
					'Error Processing Opp ID '+oppId+' // '+getErrText(procerr), 
					false
				);
			}
			
		}
		
	}
}



/**
 * ------------------- OPP in ISSUED ESTIMATE Status ONLY -------------------------------------------
 * Function to go through ALL Opportunities with status of Issued Estimate ONLY
 * This is Phase 2 Step 1
 * @returns
 */
function oppWithEstimateSubsidiaryMove()
{
	var paramTrxSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_sb281_searchid'),
	paramLastProcTrxId = nlapiGetContext().getSetting('SCRIPT','custscript_sb281_lastproctrxid');

	//MT EmpId:TM EmpId
	EmpMap = buildEmployeeMapping();
	
	//log('debug','EmpMap',JSON.stringify(EmpMap));
	
	var flt = null;
	if (paramLastProcTrxId)
	{
		flt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcTrxId)];
	}
	
	//Execute the saved search
	var movers = nlapiSearchRecord(null, paramTrxSearchId,flt, null);
	if (movers && movers.length > 0)
	{
		//Assume the search is VERY specific to Opportunities WITH status of Issued Estimate.
		//0=Internal ID
		//1=Type
		//6 = Client Internal ID
		//7=TRI Client
		var allcols = movers[0].getAllColumns();
		
		for (var i=0; movers && i < movers.length; i+=1)
		{
			var oppId = movers[i].getValue(allcols[0]),
				newOppId = '',
				trxType = movers[i].getValue(allcols[1]),
				newClientId = movers[i].getValue(allcols[7]);
			
			//log('debug','Testing Logic',oppId+' // '+trxType+' // New Client: '+newClientId);
			try
			{
			
				var clonedProposals = [];
				try
				{
					//1. Look for list of ALL OPEN Estimates created from THIS Opportunity
					var formulaTextObj = new nlobjSearchFilter('formulatext', null, 'is','YES');
					formulaTextObj.setFormula("case when {createdfrom.internalid}="+oppId+" then 'YES' else 'NO' end");
					
					//1/13/2016 - Include Expired Proposals as well
					var estflt = [formulaTextObj,
					              new nlobjSearchFilter('mainline', null, 'is', 'T'),
					              new nlobjSearchFilter('subsidiary', null, 'anyof', ['2']),
					              new nlobjSearchFilter('custbody_ax_mtechpropref', null, 'anyof','@NONE@'),
					              new nlobjSearchFilter('status', null, 'anyof',['Estimate:A','Estimate:X'])], //A=Open, X=Expired
					    estcol = [new nlobjSearchColumn('internalid').setSort(true)],
					    estrs = nlapiSearchRecord('transaction', null, estflt, estcol);
					
					log('debug','Process Audit Opp ID '+oppId,'Estimates to Process: '+(estrs?estrs.length:0));
					
					//2. Clone Opportunity first
					//Clone it anyway 
					newOppId = cloneOppOrProposal(trxType, oppId, newClientId,null);
					
					//FOR NOW ONLY Process converting both Opportunity and linked Proposals IF there are Open Proposals associated with open Opportunty
					if (estrs && estrs.length > 0)
					{
						//3. Loop through and Clone Each Proposal
						for (var p=0; p < estrs.length; p+=1)
						{
							var estId = estrs[p].getValue('internalid');
							var newProposalId = cloneOppOrProposal('Estimate', estId, newClientId, newOppId);
							clonedProposals.push(newProposalId);
							log('debug','-- Proposal Copy Made','Estimate '+estId+' to New record ID '+newProposalId+' FOR Old OppID='+oppId+' New OppID='+newOppId);
						}
						
						//log('debug','Old Updated','------- Old Record Updated with reference to new');
						log('debug','Opportunity Copy Made','Old Record: Opportunity '+oppId+' to New record ID '+newOppId+' // Related Proposals Cloned = '+clonedProposals.toString());
					}
					
				}
				catch(oprocerr)
				{
					if (newOppId)
					{
						log('error','Error Processing Opp ID '+oppId, 'Opportunity Cloned '+newOppId+' but cloning of related proposals (Already Cloned='+clonedProposals.toString()+') failed// '+getErrText(oprocerr));
					}
					else
					{
						log('error','Error Processing Opp ID '+oppId, 'Opportunity Failed to Clone // '+getErrText(oprocerr));
					}
					
				}
				
				//TESTING ONLY
				//if (i==0)
				//{
				//	break;
				//}
				
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / movers.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				//reschedule if gov is running low or legnth is 1000
				if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 1500)) 
				{
					var rparam = {
						'custscript_sb281_lastproctrxid':oppId
					};
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					
					log('audit','Opp with Issued Estimate status Process Rescheduled',JSON.stringify(rparam));
					break;
				}
				
			}
			catch(procerr)
			{
				log('error','Error Processing Opp ID '+oppId, getErrText(procerr));
				//trigger script terminating error with Email notification
				throw nlapiCreateError(
					'CLONE-OPP-ERR', 
					'Error Processing Opp ID '+oppId+' // '+getErrText(procerr), 
					false
				);
			}
			
		}
		
	}
}


/**
 * Helper function to clone transaction (Opportunity and Proposal)
 * @param trxType 
 * @param trxId
 * @param newClientId
 * @returns {___anonymous_newTrxId}
 */
function cloneOppOrProposal(trxType, trxId, newClientId, newTrxId)
{
	//1. Update Original with mapping values
	var oldTrxRec = nlapiLoadRecord(TrxTypeMap[trxType].id, trxId);
	
	//2. Copy Transaction into New Record
	var trxcopy = nlapiCopyRecord(TrxTypeMap[trxType].id, trxId, {recordmode:'dynamic'});
	trxcopy.setFieldValue('subsidiary',paramTRISubId);
	trxcopy.setFieldValue('entity', newClientId);
	trxcopy.setFieldValue(TrxTypeMap[trxType].reffld, trxId);
	
	//If newTrxId is passed in
	//	Set opportunity and createdfrom fields to newTrxId
	if (newTrxId)
	{
		trxcopy.setFieldValue('opportunity',newTrxId);
		trxcopy.setFieldValue('createdfrom',newTrxId);
	}
	
	//Force Sync Taxrate
	trxcopy.setFieldValue('taxrate', oldTrxRec.getFieldValue('taxrate'));
	
	//Force sync Shipping related fields. 
	trxcopy.setFieldValue('shipcarrier', oldTrxRec.getFieldValue('shipcarrier'));
	
	trxcopy.setFieldValue('shipmethod', oldTrxRec.getFieldValue('shipmethod'));
	
	trxcopy.setFieldValue('shippingcost', oldTrxRec.getFieldValue('shippingcost'));
	
	trxcopy.setFieldValue('handlingcost', oldTrxRec.getFieldValue('handlingcost'));
	
	trxcopy.setFieldValue('custbody_avashippingcode', oldTrxRec.getFieldValue('custbody_avashippingcode'));
	
	//Force sync trandate
	trxcopy.setFieldValue('trandate', oldTrxRec.getFieldValue('trandate'));
	
	//Force sync expectedclosedate
	trxcopy.setFieldValue('expectedclosedate', oldTrxRec.getFieldValue('expectedclosedate'));
	
	//Force sync duedate
	trxcopy.setFieldValue('duedate', oldTrxRec.getFieldValue('duedate'));
	
	//Force set custbody_contact (Contact)
	//1/12/2016 - Found a defect where There are Contacts associated to custbody_contact field where primary 
	//	client doesn't match the Client on the Transaction.
	//	NetSuite default sourcing do NOT allow sourcing of secondary attachment either.
	//	For now, we will need to SKIP those that do not match 
	if (oldTrxRec.getFieldValue('custbody_contact'))
	{
		var ctcomp=nlapiLookupField('contact', oldTrxRec.getFieldValue('custbody_contact'), 'company', false);
		
		//ONLY Set when the primary company matches up
		if (ctcomp == newClientId)
		{
			trxcopy.setFieldValue('custbody_contact', oldTrxRec.getFieldValue('custbody_contact'));
		}
		else
		{
			log('error','[AUDIT LEVEL] New Client and Contact Primary Client no Match', 'New Clinet: '+newClientId+' and Contact Primary Clinet: '+ctcomp+' does not match. IT WILL BE LEFT BLNAK but Still CLONED');
		}
	}
	
	//Force set custbody_contact_phone (Contact Phone)
	trxcopy.setFieldValue('custbody_contact_phone', oldTrxRec.getFieldValue('custbody_contact_phone'));
	
	//Force set Department, Class and Locations setting
	//Department
	if (oldTrxRec.getFieldValue('department'))
	{
		trxcopy.setFieldValue('department', oldTrxRec.getFieldValue('department'));
	}
	
	//Class
	if (oldTrxRec.getFieldValue('class'))
	{
		trxcopy.setFieldValue('class', oldTrxRec.getFieldValue('class'));
	}
	
	//Location
	if (oldTrxRec.getFieldValue('location') && MtTmLocMap[oldTrxRec.getFieldValue('location')])
	{
		trxcopy.setFieldValue('location', MtTmLocMap[oldTrxRec.getFieldValue('location')]);
	}
	
	//Swap Opp Qualifier (custbody_opp_qualifier)
	if (oldTrxRec.getFieldValue('custbody_opp_qualifier') && EmpMap[oldTrxRec.getFieldValue('custbody_opp_qualifier')])
	{
		trxcopy.setFieldValue('custbody_opp_qualifier', EmpMap[oldTrxRec.getFieldValue('custbody_opp_qualifier')]);
	}
	
	//Swap out sales rep (salesrep)
	if (oldTrxRec.getFieldValue('salesrep') && EmpMap[oldTrxRec.getFieldValue('salesrep')])
	{
		trxcopy.setFieldValue('salesrep', EmpMap[oldTrxRec.getFieldValue('salesrep')]);
	}
	
	//Swap out Inside Rep (custbody_inside_rep)
	if (oldTrxRec.getFieldValue('custbody_inside_rep') && EmpMap[oldTrxRec.getFieldValue('custbody_inside_rep')])
	{
		trxcopy.setFieldValue('custbody_inside_rep', EmpMap[oldTrxRec.getFieldValue('custbody_inside_rep')]);
	}
	
	//Swap out INSIDE REP - FOR REPORTING ONLY (custbody_insiderep)
	if (oldTrxRec.getFieldValue('custbody_insiderep') && EmpMap[oldTrxRec.getFieldValue('custbody_insiderep')])
	{
		trxcopy.setFieldValue('custbody_insiderep', EmpMap[oldTrxRec.getFieldValue('custbody_insiderep')]);
	}
	
	//Swap out Lead Qualifier (custbody7)
	if (oldTrxRec.getFieldValue('custbody7') && EmpMap[oldTrxRec.getFieldValue('custbody7')])
	{
		trxcopy.setFieldValue('custbody7', EmpMap[oldTrxRec.getFieldValue('custbody7')]);
	}
	
	//Swap out Technical Rep (custbody2)
	if (oldTrxRec.getFieldValue('custbody2') && EmpMap[oldTrxRec.getFieldValue('custbody2')])
	{
		trxcopy.setFieldValue('custbody2', EmpMap[oldTrxRec.getFieldValue('custbody2')]);
	}
	
	//3. Submit the copy of the record
	newTrxId = nlapiSubmitRecord(trxcopy, true, true);
	
	//4. Update Old Trx Records and save 
	oldTrxRec.setFieldValue(TrxTypeMap[trxType].reffld, newTrxId);
	oldTrxRec.setFieldValue('custbody_ax_clonedalready','T');
	oldTrxRec.setFieldValue('entitystatus',DefaultOldTrxStatus);
	nlapiSubmitRecord(oldTrxRec, true, true);
	
	
	return newTrxId;
}






/**
 * ------------------ OPP IN PROGRESS and standalone PROPOSALS ONLY ----------------------------------
 * Function to go through and move Opportunity and Proposals
 * Phase 1: Opportunities in Progress OR Stand alone Proposals (Not created from another transactions)
 */
function trxSubsidiaryMove()
{
	var paramTrxSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_sb280_searchid'),
		paramLastProcTrxId = nlapiGetContext().getSetting('SCRIPT','custscript_sb280_lastproctrxid');
	
	//MT EmpId:TM EmpId
	EmpMap = buildEmployeeMapping();
	
	//log('debug','EmpMap',JSON.stringify(EmpMap));
	
	var flt = null;
	if (paramLastProcTrxId)
	{
		flt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcTrxId)];
	}
	
	//Execute the saved search
	var movers = nlapiSearchRecord(null, paramTrxSearchId,flt, null);
	if (movers && movers.length > 0)
	{
		//Grab all columns
		//0 = Internal ID
		//1 = type
		//2 = status
		//3 = created from
		//4 = subsidiary
		//5 = Main Line Name (Client)
		//6 = Client Internal ID
		//7 = Client Reference to New Trimech Record
		//8 = Client Was ModernTech
		//9 = Client Has been Cloned
		var allcols = movers[0].getAllColumns();
		
		for (var i=0; movers && i < movers.length; i+=1)
		{
			var trxId = movers[i].getValue(allcols[0]),
				newTrxId = '',
				trxType = movers[i].getValue(allcols[1]),
				trxCreatedFrom = movers[i].getValue(allcols[3]),
				clientId = movers[i].getValue(allcols[6]),
				newClientId = movers[i].getValue(allcols[7]);
			
			//log('debug','Testing Logic',trxId+' // '+trxType+' // Old Client: '+clientId+' // New Client: '+newClientId);
			
			try
			{
				try
				{
				
					if (trxCreatedFrom)
					{
						//Phase 1: Skip Those created from for now
						log('audit','Skipping Those Created From',trxType+' '+trxId+' created from '+trxCreatedFrom);
					}
					else
					{
						//1. Update Original with mapping values
						var oldTrxRec = nlapiLoadRecord(TrxTypeMap[trxType].id, trxId);
						
						//2. Copy Transaction into New Record
						var trxcopy = nlapiCopyRecord(TrxTypeMap[trxType].id, trxId, {recordmode:'dynamic'});
						trxcopy.setFieldValue('subsidiary',paramTRISubId);
						trxcopy.setFieldValue('entity', newClientId);
						trxcopy.setFieldValue(TrxTypeMap[trxType].reffld, trxId);
						
						//Force sync trandate
						trxcopy.setFieldValue('trandate', oldTrxRec.getFieldValue('trandate'));
						
						//Force sync expectedclosedate
						trxcopy.setFieldValue('expectedclosedate', oldTrxRec.getFieldValue('expectedclosedate'));
						
						//Force sync duedate
						trxcopy.setFieldValue('duedate', oldTrxRec.getFieldValue('duedate'));
						
						//Force set custbody_contact (Contact)
						//1/12/2016 - Found a defect where There are Contacts associated to custbody_contact field where primary 
						//	client doesn't match the Client on the Transaction.
						//	NetSuite default sourcing do NOT allow sourcing of secondary attachment either.
						//	For now, we will need to SKIP those that do not match 
						if (oldTrxRec.getFieldValue('custbody_contact'))
						{
							var ctcomp=nlapiLookupField('contact', oldTrxRec.getFieldValue('custbody_contact'), 'company', false);
							
							//ONLY Set when the primary company matches up
							if (ctcomp == newClientId)
							{
								trxcopy.setFieldValue('custbody_contact', oldTrxRec.getFieldValue('custbody_contact'));
							}
							else
							{
								log('audit','New Client and Contact Primary Client no Match', 'New Clinet: '+newClientId+' and Contact Primary Clinet: '+ctcomp+' does not match. ');
							}
						}
						
						//Force set custbody_contact_phone (Contact Phone)
						trxcopy.setFieldValue('custbody_contact_phone', oldTrxRec.getFieldValue('custbody_contact_phone'));
						
						//Force set Department, Class and Locations setting
						//Department
						if (oldTrxRec.getFieldValue('department'))
						{
							trxcopy.setFieldValue('department', oldTrxRec.getFieldValue('department'));
						}
						
						//Class
						if (oldTrxRec.getFieldValue('class'))
						{
							trxcopy.setFieldValue('class', oldTrxRec.getFieldValue('class'));
						}
						
						//Location
						if (oldTrxRec.getFieldValue('location') && MtTmLocMap[oldTrxRec.getFieldValue('location')])
						{
							trxcopy.setFieldValue('location', MtTmLocMap[oldTrxRec.getFieldValue('location')]);
						}
						
						//Swap Opp Qualifier (custbody_opp_qualifier)
						if (oldTrxRec.getFieldValue('custbody_opp_qualifier') && EmpMap[oldTrxRec.getFieldValue('custbody_opp_qualifier')])
						{
							trxcopy.setFieldValue('custbody_opp_qualifier', EmpMap[oldTrxRec.getFieldValue('custbody_opp_qualifier')]);
						}
						
						//Swap out sales rep (salesrep)
						if (oldTrxRec.getFieldValue('salesrep') && EmpMap[oldTrxRec.getFieldValue('salesrep')])
						{
							trxcopy.setFieldValue('salesrep', EmpMap[oldTrxRec.getFieldValue('salesrep')]);
						}
						
						//Swap out Inside Rep (custbody_inside_rep)
						if (oldTrxRec.getFieldValue('custbody_inside_rep') && EmpMap[oldTrxRec.getFieldValue('custbody_inside_rep')])
						{
							trxcopy.setFieldValue('custbody_inside_rep', EmpMap[oldTrxRec.getFieldValue('custbody_inside_rep')]);
						}
						
						//Swap out INSIDE REP - FOR REPORTING ONLY (custbody_insiderep)
						if (oldTrxRec.getFieldValue('custbody_insiderep') && EmpMap[oldTrxRec.getFieldValue('custbody_insiderep')])
						{
							trxcopy.setFieldValue('custbody_insiderep', EmpMap[oldTrxRec.getFieldValue('custbody_insiderep')]);
						}
						
						//Swap out Lead Qualifier (custbody7)
						if (oldTrxRec.getFieldValue('custbody7') && EmpMap[oldTrxRec.getFieldValue('custbody7')])
						{
							trxcopy.setFieldValue('custbody7', EmpMap[oldTrxRec.getFieldValue('custbody7')]);
						}
						
						//Swap out Technical Rep (custbody2)
						if (oldTrxRec.getFieldValue('custbody2') && EmpMap[oldTrxRec.getFieldValue('custbody2')])
						{
							trxcopy.setFieldValue('custbody2', EmpMap[oldTrxRec.getFieldValue('custbody2')]);
						}
						
						//3. Submit the copy of the record
						newTrxId = nlapiSubmitRecord(trxcopy, true, true);
						
						//4. Update Old Trx Records and save 
						oldTrxRec.setFieldValue(TrxTypeMap[trxType].reffld, newTrxId);
						oldTrxRec.setFieldValue('custbody_ax_clonedalready','T');
						oldTrxRec.setFieldValue('entitystatus',DefaultOldTrxStatus);
						nlapiSubmitRecord(oldTrxRec, true, true);
						
						//log('debug','Old Updated','------- Old Record Updated with reference to new');
						log('debug','Copy Made','Old Record: '+TrxTypeMap[trxType].id+' '+trxId+' to New record ID '+newTrxId);
					}
					
				}
				catch(procerr)
				{
					log('error','Error Processing Trx ID '+trxId+' ('+trxType+')', 'Record Failed to FULLY Convert // '+getErrText(procerr));
				}
				//TESTING ONLY
				//if (i==10)
				//{
				//	break;
				//}
				
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / movers.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				//reschedule if gov is running low or legnth is 1000
				if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 1500)) 
				{
					var rparam = {
						'custscript_sb280_lastproctrxid':trxId
					};
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					
					log('audit','Rescheduled',JSON.stringify(rparam));
					break;
				}
			}
			catch (procerr)
			{
				log('error','Error Processing Trx ID '+trxId+' ('+trxType+')', getErrText(procerr));
				//trigger script terminating error with Email notification
				throw nlapiCreateError(
					'CLONE-TRX-ERR', 
					'Error Processing Trx ID '+trxId+' ('+trxType+') // '+getErrText(procerr), 
					false
				);
			}
		}//Close For Loop
	}
}


/**
 * @param {String}  Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 * 
 * As of 1/9/2016 - This Script will handle BOTH NOTRX and YESTRX use cases where for NOTRX, clients will be flipped instead of cloned
 */
function subsidiaryMove() 
{
	asdf
	var paramSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_sb277_searchid'),
		//NEED TO make sure to set ONLY when error
		//IF Error, set it ONLY when taxable is checked
		//paramDefaultTaxCode = nlapiGetContext().getSetting('SCRIPT','custscript_sb277_deftaxcode'),
		paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sb277_lastprocid');
	
	//MT EmpId:TM EmpId
	EmpMap = buildEmployeeMapping();
	
	//log('debug','EmpMap',JSON.stringify(EmpMap));
	
	var flt = null;
	if (paramLastProcId)
	{
		flt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)];
	}
	
	//Execute the saved search
	var movers = nlapiSearchRecord(null, paramSearchId,flt, null);
	if (movers && movers.length > 0)
	{
		//Grab all columns
		//0 = Internal ID
		//1 = Count of Trx
		//2 = Parent
		var allcols = movers[0].getAllColumns();
		
		for (var i=0; movers && i < movers.length; i+=1)
		{
			var clientId = movers[i].getValue(allcols[0]),
				newClientId = '',
				parentId = movers[i].getValue(allcols[2]),
				newParentId = '',
				trxCnt = parseInt(movers[i].getValue(allcols[1]));
			
			//log('debug','Testing Logic',clientId+' // Parent '+parentId+' // trxCnt '+trxCnt);
			
			try
			{
				try
				{
					//****************************** Process as WITH Trx. This means you need to CLONE the LPC *******************************
					var actionTaken = 'switched';
					if (trxCnt > 0)
					{
						actionTaken = 'cloned';
					}
					
					//Check to see if we need to convert parent first.
					if (parentId)
					{
						if (trxCnt > 0)
						{
							//Execute Cloning Process for Parent Record
							newParentId = cloneLpcRec(parentId, null);
						}
						else
						{
							newParentId = switchLpcRecSub(parentId, null);
						}
						
						//log('debug','New Parent '+actionTaken,'New Parent ID '+newParentId+' from Old Parent ID '+parentId);
						
						//ONLY do this IF Old Rec is of Type Company
						var isPerson = nlapiLookupField('customer',parentId, 'isperson');
						//log('debug','Is Parent Person?',isPerson);
						if (isPerson!='T')
						{
							cloneOrFlipAllContacts(parentId, newParentId,actionTaken);
						}
					}
						
					if (trxCnt > 0)
					{
						//Once Parent is Done do the child
						newClientId = cloneLpcRec(clientId, newParentId);
					}
					else
					{
						//Once Parent is Done do the child
						newClientId = switchLpcRecSub(clientId, newParentId);
					}
						
					log('debug','New Client '+actionTaken, 'New Client ID '+newClientId+' from Old Client ID '+clientId);
						
					//ONLY do this IF Old Rec is of Type Company
					var isClientPerson = nlapiLookupField('customer',clientId, 'isperson');
					//log('debug','Is Client Person?',isClientPerson);
					if (isClientPerson!='T')
					{
						cloneOrFlipAllContacts(clientId, newClientId,actionTaken);
					}
					
					//log('audit','Remainig Usage Report Per run',nlapiGetContext().getRemainingUsage());
				}
				catch(procerr)
				{
					log('error','Error Processing Client ID '+clientId, 'Record Failed to FULLY Convert // '+getErrText(procerr));
				}
				//TESTING ONLY
				//if (i==4)
				//{
				//	break;
				//}
				
				//Set % completed of script processing
				var pctCompleted = Math.round(((i+1) / movers.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
				
				//reschedule if gov is running low or legnth is 1000
				if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 1500)) 
				{
					var rparam = {
						'custscript_sb277_lastprocid':clientId
					};
					
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					
					log('audit','Rescheduled',JSON.stringify(rparam));
					break;
				}
			}
			catch (procerr)
			{
				log('error','Error Switching Client '+clientId, getErrText(procerr));
				//If it's unexpected, requeue it up
				if (getErrText(procerr).indexOf('UNEXPECTED_ERROR') > -1)
				{
					var erparam = {
						'custscript_sb277_lastprocid':clientId
					};
						
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), erparam);
						
					log('audit','Rescheduled due to Unexpected Error',JSON.stringify(erparam));
				}
				else
				{
					//trigger script terminating error with Email notification
					throw nlapiCreateError(
						'CLONE-CLIENT-ERR', 
						'Error while converting client '+clientId+' // '+getErrText(procerr), 
						false
					);
				}
			}
		}
	}
}

/**
 * Helper function to go through and attempt to clone or flip attached contacts
 * 1. Search for ALL contacts who matches OLD LPC 
 * 	- Subsidiary is MT
 * 	- Contact has NOT be Cloned
 * 	- Contact Company Matches Old LPC (This ensures we are ONLY fliping/cloning contact that belongs to THIS Old LPC
 * 2. Load Old Contact
 * 3. Old Contact set Subsidiary to TM
 * 4. Old Contact set company to NEW LPC
 * 5. Old Contact set Custom Sales Rep (custentity_sales_rep) to Subsidiary employee
 * 6. Old Contact set Lead Qualifier (custentity_leadqualifier) to Subsidiary employee
 * 7. Submit The Record.
 * 9. IF No Error is thrown, Continue to Next Contact. 
 * 		- This means We were able to FLIP the Subsidiary on Old Contact.
 * 		- No Need to Clone
 * 10. IF Other than CANT_MODIFY_SUB ERROR is thrown, 
 * 		- Completely Fail.
 * 		- This means SOMETHING VERY Bad happened and Requires User Attention. 
 * 		- This will Terminate the script.
 * 11. IF CANT_MODIFY_SUB ERRROR IS THROWN, Clone the Old Contact
 * 12. Re-Load Old Contact  
 * 13. Old Contact set entity ID to be ZZ-[Entity Id]-MT.
 * 14. Old Contact custentity_ax_clonedalready to Checked
 * 15. Copy Old Contact as New Contact
 * 16. New Contact set entityid to be [Entity Id]-TEMP
 * 17. New Contact set subsidiary to TM
 * 18. New Contact set Company to New Client ID
 * 19. New Contact set custentity_ax_wasmoderntech to checked
 * 20. New Contact set custentity_ax_moderntechlpcref to Old Contact
 * 21. New Contact set Custom Sales Rep (custentity_sales_rep) to Subsidiary employee
 * 22. New Contact set Lead Qualifier (custentity_leadqualifier) to Subsidiary employee
 * 23. Save New Contact
 * 24. Old Contact set custentity_ax_moderntechlpcref to Newly created New Contact
 * 25. Save Old Contact
 * 26. Update New Contact and remove "-TEMP" from entityid
 * 
 * @param recId
 * @param newRecId
 * @param actionTaken cloned or switched
 * @returns {String}
 * 
 */
function cloneOrFlipAllContacts(recId, newRecId,actionTaken) 
{
	//Go through ALL Contacts and ONLY flip those matching OLD Parent Record ID as company
	//	- Try flip switch ONLY first. If that fails, clone it
	
	//search for ALL contacts for this parent client with
	//	- MT Sub and it has NOT be cloned before
	//	- AND contact company is THIS parent client.
	var subsFilter = new nlobjSearchFilter('subsidiary', null, 'anyof', paramMTSubId);
	if (actionTaken == 'switched')
	{
		subsFilter = new nlobjSearchFilter('subsidiary', 'contact', 'anyof', paramMTSubId);
	}
	
	var cflt = [new nlobjSearchFilter('internalid', null, 'anyof', recId),
	            subsFilter,
	            new nlobjSearchFilter('custentity_ax_clonedalready', 'contact', 'is','F'),
	            new nlobjSearchFilter('company','contact','anyof',recId)],
	    ccol = [new nlobjSearchColumn('internalid', 'contact',null).setSort(),
	            new nlobjSearchColumn('company', 'contact',null)],
		crs = nlapiSearchRecord('customer', null, cflt, ccol);
	
	//log('debug','Contact flip/clone','Client ID '+recId+' that was '+actionTaken);
	
	//Loop through results and flip or clone contact
	for (var c=0; crs && c < crs.length; c+=1)
	{
		var ctId = crs[c].getValue('internalid','contact',null);
		//log('debug','Running Contact update for Old parent '+recId,'Contact '+ctId);
		
		//Load outside try for initial attempt to flip
		var oldCtRec = nlapiLoadRecord('contact',ctId);
		try
		{
			//Update the subsidiary
			oldCtRec.setFieldValue('subsidiary',paramTRISubId);
			//Update the parent company
			oldCtRec.setFieldValue('company', newRecId);
			//Swap out Custom Sales Rep field on Contact
			if (oldCtRec.getFieldValue('custentity_sales_rep') && EmpMap[oldCtRec.getFieldValue('custentity_sales_rep')])
			{
				oldCtRec.setFieldValue('custentity_sales_rep', EmpMap[oldCtRec.getFieldValue('custentity_sales_rep')]);
			}
			//Swap out Lead Qualifier field on Contact
			if (oldCtRec.getFieldValue('custentity_leadqualifier') && EmpMap[oldCtRec.getFieldValue('custentity_leadqualifier')])
			{
				oldCtRec.setFieldValue('custentity_leadqualifier', EmpMap[oldCtRec.getFieldValue('custentity_leadqualifier')]);
			}
			
			//Submit the record and see if it saves
			nlapiSubmitRecord(oldCtRec, true, true);
			
			//log('debug','Flipped Old Contact','Old Contact ID '+ctId);
	
		}
		catch(cterr)
		{
			if (getErrText(cterr).indexOf('CANT_MODIFY_SUB') > -1)
			{
				log('error','CANT Modify Error. Attepting to CLONE instead',ctId+' -'+getErrText(cterr));
				
				//This means you can just change the subsidiary. You need to CLONE IT
				oldCtRec = nlapiLoadRecord('contact',ctId);
				var oldCtRecEntityId = oldCtRec.getFieldValue('entityid');
				//Change the Contact ID to OLD format
				oldCtRec.setFieldValue('entityid','ZZ-'+oldCtRecEntityId+'-MT');
				oldCtRec.setFieldValue('custentity_ax_clonedalready','T');
				
				var newCtRec = nlapiCopyRecord('contact',ctId);
				//Set the entityid with -TEMP for uniqueness
				newCtRec.setFieldValue('entityid',oldCtRecEntityId+'-TEMP');
				newCtRec.setFieldValue('subsidiary',paramTRISubId);
				newCtRec.setFieldValue('company', newRecId);
				newCtRec.setFieldValue('custentity_ax_wasmoderntech','T');
				newCtRec.setFieldValue('custentity_ax_moderntechlpcref', ctId);
				
				//Swap out Custom Sales Rep field on Contact
				if (oldCtRec.getFieldValue('custentity_sales_rep') && EmpMap[oldCtRec.getFieldValue('custentity_sales_rep')])
				{
					newCtRec.setFieldValue('custentity_sales_rep', EmpMap[oldCtRec.getFieldValue('custentity_sales_rep')]);
				}
				//Swap out Lead Qualifier field on Contact
				if (oldCtRec.getFieldValue('custentity_leadqualifier') && EmpMap[oldCtRec.getFieldValue('custentity_leadqualifier')])
				{
					newCtRec.setFieldValue('custentity_leadqualifier', EmpMap[oldCtRec.getFieldValue('custentity_leadqualifier')]);
				}
				
				//Save the new one first
				var newCtRecId = nlapiSubmitRecord(newCtRec, true, true);
				
				//Reference newly created contact and Save the Old CT REcord
				oldCtRec.setFieldValue('custentity_ax_moderntechlpcref', newCtRecId);
				nlapiSubmitRecord(oldCtRec, true, true);
				
				//Update the Newly Created Contact records' entityid
				nlapiSubmitField('contact',newCtRecId,'entityid',oldCtRecEntityId);
				
				//log('debug','Cloned New Contact','New Contact ID '+newCtRecId);
				
			}
			else
			{
				//Throw error and stop the process
				throw nlapiCreateError(
					'LPC-CONTACT-ERROR',
					'Unable flip subsidiary on contact ID '+ctId+' - '+getErrText(cterr),
					false
				);
			}
		}
	}
	
}

/**
 * Helper function to SWITCH the LPC records' subsidiary
 * 1. Load Old LPC
 * 2. Old LPC Set custentity_ax_clonedalready to Checked
 * 3. Old LPC Set subsidiary to TM
 * 4. Old LPC IF New Parent ID is passed in, set parent as newParentId
 * 5. Old LPC If Sales Rep (salesrep) is set, swap it out to Subsidiary Employee
 * 6. Old LPC If Lead Qualifier (custentity_leadqualifier) is set, swap it out to Subsidiary Employee
 * 7. Old LPC If Inside Rep (custentity_inside_rep) is set, swap it out to Subsidiary Employee
 * 8. Old LPC If Technical Rep (custentity3) is set, swap it out to Subsidiary Employee
 * 9. Old LPC If Printer Rep (custentity12) is set, swap it out to Subsidiary Employee
 * 10. Save Old LPC 
 * @param clientId
 */
function switchLpcRecSub(clientId, newParentId)
{
	var clientRec = nlapiLoadRecord('customer', clientId);
	clientRec.setFieldValue('subsidiary', paramTRISubId);
	clientRec.setFieldValue('custentity_ax_wasmoderntech','T');
	
	//If newParentId is passed in, set it on the new record
	if (newParentId)
	{
		clientRec.setFieldValue('parent', newParentId);
	}
	
	
	//Swap out Sales Rep to Subsidiary appropriate Employee
	if (clientRec.getFieldValue('salesrep') && EmpMap[clientRec.getFieldValue('salesrep')])
	{
		clientRec.setFieldValue('salesrep',EmpMap[clientRec.getFieldValue('salesrep')]);
	}
	
	//Swap out Lead Qualifier to Subsidiary appropriate Employee
	if (clientRec.getFieldValue('custentity_leadqualifier') && EmpMap[clientRec.getFieldValue('custentity_leadqualifier')])
	{
		clientRec.setFieldValue('custentity_leadqualifier',EmpMap[clientRec.getFieldValue('custentity_leadqualifier')]);
	}
	
	//Swap out Inside Rep to Subsidiary appropriate Employee
	if (clientRec.getFieldValue('custentity_inside_rep') && EmpMap[clientRec.getFieldValue('custentity_inside_rep')])
	{
		clientRec.setFieldValue('custentity_inside_rep',EmpMap[clientRec.getFieldValue('custentity_inside_rep')]);
	}
	
	//Swap out Technical Rep to Subsidiary appropriate Employee
	if (clientRec.getFieldValue('custentity3') && EmpMap[clientRec.getFieldValue('custentity3')])
	{
		clientRec.setFieldValue('custentity3',EmpMap[clientRec.getFieldValue('custentity3')]);
	}
	
	//Swap out Printer Rep to Subsidiary appropriate Employee
	if (clientRec.getFieldValue('custentity12') && EmpMap[clientRec.getFieldValue('custentity12')])
	{
		clientRec.setFieldValue('custentity12',EmpMap[clientRec.getFieldValue('custentity12')]);
	}
	
	return nlapiSubmitRecord(clientRec, true, true);
}

/**
 * Helper function to clone the LPC record
 * 1. Load Old LPC Record
 * 2. Old LPC Set custentity_ax_clonedalready to Checked
 * 3. Old LPC set entityid to be ZZ-[Entity ID]-MT
 * 4. Copy Old LPC To NEW LPC
 * 5. New LPC set entity ID to be [Entity ID]-TEMP
 * 6. New LPC set Subsidiary to TriMech
 * 7. New LPC set custentity_ax_wasmoderntech to Checked
 * 8. New LPC set custentity_ax_moderntechlpcref to Old LPC
 * 9. IF New Parent ID is passed in, set parent as newParentId
 * 10. If Sales Rep (salesrep) is set, swap it out to Subsidiary Employee
 * 11. If Lead Qualifier (custentity_leadqualifier) is set, swap it out to Subsidiary Employee
 * 12. If Inside Rep (custentity_inside_rep) is set, swap it out to Subsidiary Employee
 * 13. If Technical Rep (custentity3) is set, swap it out to Subsidiary Employee
 * 14. If Printer Rep (custentity12) is set, swap it out to Subsidiary Employee
 * 15. Save New LPC record
 * 16. Old LPC set MT Reference (custentity_ax_moderntechlpcref) field with value of NEW LPC
 * 		- So that bi-directional relationship can be built 
 * 		- Easy access to new LPC incase user opens Old LPC 
 * 17. Save Old LPC
 * 18. Update NEW LPC and remove "-TEMP" from Entity ID
 * @param recId
 * @param newParentId
 * @returns {String}
 */
function cloneLpcRec(recId, newParentId)
{
	//Load the Old Record for reference purposes
	var oldRec = nlapiLoadRecord('customer', recId),
		oldEntityId = oldRec.getFieldValue('entityid'),
		newRecId='';
	
	//Preset some value son the old record.
	//Old Record Entity ID will default to ZZ-[Entity ID]-MT
	oldRec.setFieldValue('custentity_ax_clonedalready','T');
	oldRec.setFieldValue('entityid','ZZ-'+oldEntityId+'-MT');
	
	//log('debug','Loaded Old Rec','Old ID '+recId);
	
	//Create copy of the record as New
	var newRec = nlapiCopyRecord('customer', recId);
	//Initially create it with -TEMP at the end to make it unique
	newRec.setFieldValue('entityid',oldEntityId+'-TEMP');
	newRec.setFieldValue('subsidiary', paramTRISubId);
	newRec.setFieldValue('custentity_ax_wasmoderntech','T');
	newRec.setFieldValue('custentity_ax_moderntechlpcref', recId);
	
	//If newParentId is passed in, set it on the new record
	if (newParentId)
	{
		newRec.setFieldValue('parent', newParentId);
	}
	
	//Swap out Sales Rep to Subsidiary appropriate Employee
	if (oldRec.getFieldValue('salesrep') && EmpMap[oldRec.getFieldValue('salesrep')])
	{
		newRec.setFieldValue('salesrep',EmpMap[oldRec.getFieldValue('salesrep')]);
	}
	
	//Swap out Lead Qualifier to Subsidiary appropriate Employee
	if (oldRec.getFieldValue('custentity_leadqualifier') && EmpMap[oldRec.getFieldValue('custentity_leadqualifier')])
	{
		newRec.setFieldValue('custentity_leadqualifier',EmpMap[oldRec.getFieldValue('custentity_leadqualifier')]);
	}
	
	//Swap out Inside Rep to Subsidiary appropriate Employee
	if (oldRec.getFieldValue('custentity_inside_rep') && EmpMap[oldRec.getFieldValue('custentity_inside_rep')])
	{
		newRec.setFieldValue('custentity_inside_rep',EmpMap[oldRec.getFieldValue('custentity_inside_rep')]);
	}
	
	//Swap out Technical Rep to Subsidiary appropriate Employee
	if (oldRec.getFieldValue('custentity3') && EmpMap[oldRec.getFieldValue('custentity3')])
	{
		newRec.setFieldValue('custentity3',EmpMap[oldRec.getFieldValue('custentity3')]);
	}
	
	//Swap out Printer Rep to Subsidiary appropriate Employee
	if (oldRec.getFieldValue('custentity12') && EmpMap[oldRec.getFieldValue('custentity12')])
	{
		newRec.setFieldValue('custentity12',EmpMap[oldRec.getFieldValue('custentity12')]);
	}
	
	//Save and create new parent Record LPC
	newRecId = nlapiSubmitRecord(newRec, true, true);
	
	//Set the reference to newly created LPC Clone on OLD record and Save the Old Rec
	oldRec.setFieldValue('custentity_ax_moderntechlpcref', newRecId);
	nlapiSubmitRecord(oldRec, true, true);
	
	//Update the Newly Created Parent records' entityid
	nlapiSubmitField('customer',newRecId,'entityid',oldEntityId);
	
	return newRecId;
}

/**
 * Grab list of all Trimech employees with ModernTech Employees.
 * If ModernTech Reference is empty, use same ID for both
 */
function buildEmployeeMapping()
{
	var eflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
	            new nlobjSearchFilter('subsidiary', null, 'anyof', '1')],
		ecol = [new nlobjSearchColumn('internalid').setSort(true),
	            new nlobjSearchColumn('custentity_ax_moderntechempref')],
	    ers = nlapiSearchRecord('employee', null, eflt, ecol),
	    ejson = {};
	
	//Assume there are results
	//Loop through, build and return JSON object.
	for (var i=0; i < ers.length; i+=1)
	{
		var oldEmpId = ers[i].getValue('custentity_ax_moderntechempref'),
			newEmpId = ers[i].getValue('internalid');
		
		//If ModernTech Emplyee Reference is empty, 
		//Assume this was created as Trimech. Use NEW id as old
		if (!oldEmpId)
		{
			oldEmpId = newEmpId;
		}
		
		ejson[oldEmpId] = newEmpId;
	}
	
	return ejson;
	
}
