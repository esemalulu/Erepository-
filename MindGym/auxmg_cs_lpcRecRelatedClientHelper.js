/**
 * THIS Script includes User Event Script as well as Scheduled Script trigger
 */

/********************************* Scheduled Script ***********************/
//Auto generation of Entity ID is being triggered by NETSUITE AFTER record saves and all user event scripts triggered.

function lpcUpdateEntityId(type)
{
		
	var paramLpcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb337_lpcid');
	var paramLpcPostFix = nlapiGetContext().getSetting('SCRIPT','custscript_sb337_postfix');		
	
	if (!paramLpcId || !paramLpcPostFix)
	{
		return;
	}
	
	try 
	{
		//double check to make sure it doesn't already have post fix
		var entityId = nlapiLookupField('customer', paramLpcId, 'entityid', false);
		
		if (entityId.indexOf(paramLpcPostFix) <= -1)
		{
			//update the entityId with post fix
			nlapiSubmitField('customer', paramLpcId, 'entityid', entityId+paramLpcPostFix, false);
		}
	}
	catch (err)
	{
		log('error','Error Updating Post Fix',getErrText(err));
	}
}

/********************************** User Event ****************************/
function lpcAfterSubmit(type)
{
	//ONLY execute for create
	if (type == 'create')
	{
		//3 = Mind Gym Performance USA Inc
		//4 = Mind Gym Performance (Asia) PTE Ltd
		//5 = Mind Gym (Middle East) FZ-LLC
		//6 = Mind Gym (Canada) Inc
		
		var subsidaryTrigger = {'3':'USA','4':'SG', '5':'MENA', '6':'CAN'};
		
		//Done on AFTER Submit since NS needs to generate AUTO Entity ID
		var entityId = nlapiGetFieldValue('entityid');
		var parentRec = nlapiGetFieldValue('parent');
		
		log('debug','Testing result',nlapiGetRecordType()+' // '+entityId);
		
		if (entityId && subsidaryTrigger[nlapiGetFieldValue('subsidiary')])
		{		
			
			
		if (!parentRec)
		{	
				
		
			//Make sure entityID doesn't already include matching -xx at the end
			if (entityId.indexOf('-'+subsidaryTrigger[nlapiGetFieldValue('subsidiary')]) > -1)
			{				
				// ES - Feb 4, 2016 Removed following Scheduled Script call
				//nlapiScheduleScript('customscript_aux_ss_lpc_updsubpostfix', null, {'custscript_sb337_lpcid':nlapiGetRecordId(), 'custscript_sb337_postfix':'-'+subsidaryTrigger[nlapiGetFieldValue('subsidiary')]});
				
				// ES - Feb 4, 2016 Removed following nlapiSubmitField call
				//update the entityId with post fix
				//nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'entityid', entityId+'-'+subsidaryTrigger[nlapiGetFieldValue('subsidiary')], false);
								
				  nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'entityid', entityId, false);
			}
			
		}
			
		}
	}
}

var PAGE_REC_ACTION_TYPE='';

/**
 * Page Init trigger against Lead/Prospect/Client record
 * @param type
 */
function lpcPageInit(type)
{
	PAGE_REC_ACTION_TYPE = type;
}

/**
 * Field changed trigger against Lead/Prospect/Client record.
 * @param type
 * @param name
 * @param linenum
 */
function lpcFieldChanged(type, name, linenum)
{
	if (name=='companyname' || name=='subsidiary')
	{
		//Ticket 3843. On Create and for US Subsidiary, auto generate ENTITY ID when Company Name is provided
		
		//3 = Mind Gym (USA) Inc
		//4 = Mind Gym Performance (Asia) PTE Ltd
		//5 = Mind Gym (Middle East) FZ-LLC
		//6 = Mind Gym (Canada) Inc
		
		var subsidiaryToTrigger= ['3', '4', '5', '6' ];
		var subsidaryTagJson = {'3':'USA', '4':'SG', '5':'MENA','6':'CAN'};
			
		if (PAGE_REC_ACTION_TYPE=='create') 
		{
			
			if (!nlapiGetFieldValue('subsidiary') || !nlapiGetFieldValue('companyname') || subsidiaryToTrigger.indexOf(nlapiGetFieldValue('subsidiary')) <= -1)
			{
				nlapiSetFieldValue('entityid','To Be Generated');
			}
			else
			{
				//At this point, as long as companyname is set we can do the following
				//1. IF Entity ID is already set other than "To Be Generated", ask the user if they wish to regenerate it
				//2. IF Entity ID IS "To Be Generated", auto generate New.
				
				//WE need to see if we can find something that already exists on save.
				var formattedEntityId = nlapiGetFieldValue('companyname').replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\s\{\}\[\]\\\/]/gi, '');
				formattedEntityId = formattedEntityId.toUpperCase();
				if (formattedEntityId.length < 9)
				{
					formattedEntityId = formattedEntityId+'-'+subsidaryTagJson[nlapiGetFieldValue('subsidiary')];
				} 
				else
				{
					formattedEntityId = formattedEntityId.substr(0,9)+'-'+subsidaryTagJson[nlapiGetFieldValue('subsidiary')];
				}
				
				
				if (nlapiGetFieldValue('entityid') == 'To Be Generated' || !nlapiGetFieldValue('entityid'))
				{
					nlapiSetFieldValue('entityid', formattedEntityId);
				}
				else
				{
					var changeVal = confirm('Account ID has already been set or generated to "'+nlapiGetFieldValue('entityid')+'", do you wish to change to "'+formattedEntityId+'"?');
					if (changeVal)
					{
						nlapiSetFieldValue('entityid', formattedEntityId);
					}
				}
			}
		}
	}
}

/************************* One time legacy Record Update Script **********************/
function lpcUpdateLegacyEntityId()
{

	var paramSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_395_ssid');
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_395_lastid');
	
	var legflt = null;
	if (paramLastProcId)
	{
		legflt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)];
	}
	
	var legrs = nlapiSearchRecord(null, paramSearchId, legflt, null);
	
	var legcols = null;	
	
	var csvDuplicateHeader = '"Internal ID","Name (Entity ID)","Company Name","Stage","Attempted Name Change","Error Message"\n';
	var csvDuplicateBody = '';
	
	for (var i=0; legrs && i < legrs.length; i+=1)
	{
		
		if (!legcols)
		{
			legcols = legrs[i].getAllColumns();
		}
		
		log('debug','Processing ID // Record Type', legrs[i].getId()+' // '+legrs[i].getRecordType()+' // Rename to '+legrs[i].getValue(legcols[1]));
		
		var subsidaryTrigger = {
			'3':'USA', //Mind Gym USA
			'4':'SG', //Mind Gym Performance (Asia) PTE Ltd
			'5':'MENA' //Mind Gym (Middle East) FZ-LLC
		};
		
		var subsId = legrs[i].getValue(legcols[3]); 
		var origEntityId = legrs[i].getValue(legcols[4]);
		var formattedEntityId = '';
		
		if (subsId == '3')
		{
			formattedEntityId = legrs[i].getValue('companyname').replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\s\{\}\[\]\\\/]/gi, '');
			formattedEntityId = formattedEntityId.toUpperCase();
			if (formattedEntityId.length < 9)
			{
				formattedEntityId = formattedEntityId+'-USA';
			} 
			else
			{
				formattedEntityId = formattedEntityId.substr(0,9)+'-USA';
			}
		}
		else if (subsId == '4' || subsId == '5')
		{
			//Done on AFTER Submit since NS needs to generate AUTO Entity ID
			var entityId = legrs[i].getValue('entityid');
			if (entityId)
			{
				//Make sure entityID doesn't already include matching -xx at the end
				if (entityId.indexOf('-SG') <= -1 || entityId.indexOf('-MENA') <= -1)
				{
					if (subsId== '4')
					{
						formattedEntityId = formattedEntityId+'-SG';
					}
					else
					{
						formattedEntityId = formattedEntityId+'-MENA';
					}					
				}
			}
		}
		
		try
		{
			nlapiSubmitField(legrs[i].getRecordType(), legrs[i].getId(), 'entityid', formattedEntityId, false);
		}
		catch(upderr)
		{
			log('error','------> Original // Updated', origEntityId+' // '+formattedEntityId+' :: '+getErrText(upderr));
			//'"Internal ID","Name (Entity ID)","Company Name","Stage","Attempted Name Change"\n';
			csvDuplicateBody += '"'+legrs[i].getId()+'",'+
								'"'+legrs[i].getValue(legcols[4])+'",'+ //Entity ID
								'"'+legrs[i].getValue(legcols[5])+'",'+ //Company Name
								'"'+legrs[i].getValue(legcols[6])+'",'+ //Stage
								'"'+formattedEntityId+'",'+ //Formatted Value
								'"'+getErrText(upderr)+'"\n';
		}
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / legrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		if ((i+1)==1 || ((i+1) < legrs.length && nlapiGetContext().getRemainingUsage() < 1000)) {
			//reschedule
			//nlapiLogExecution('audit','Getting Rescheduled at', legrs[i].getId());
			//var rparam = new Object();
			//rparam['custscript_395_lastid'] = legrs[i].getId();
			//nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
	}
	
	if (csvDuplicateBody)
	{
		var dupFile = nlapiCreateFile('LegacyL_P_C_NameUpdate-PotentialDuplicate.csv','CSV',csvDuplicateHeader+csvDuplicateBody);
		nlapiSendEmail(
			-5, 
			'elijah@audaxium.com', 
			'Legacy L/P/C Update Potential Duplicates', 
			'Attached is CSV containing potential duplicates', 
			null, 
			null, 
			null, 
			dupFile, 
			null, 
			null, 
			null);
	}
}