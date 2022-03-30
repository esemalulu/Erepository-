
var nsform = null;

/**
 * SL called by create/update wizard to search for uniqueness of username across contract, practice and license
 * NO UI Provided
 * @param req
 * @param res
 */
function searchUniqueUsername(req, res)
{
	var procJson = {
		'username':req.getParameter('custparam_username'),
		'hasmatch':false,
		'haserr':false,
		'message':''
	};
	
	try
	{
		if (!procJson.username)
		{
			throw nlapiCreateError('LMS-ERR', 'Missing required username value', true);
		}
		
		//execute three different saved search
		var ctflt = [new nlobjSearchFilter('custrecord_lmsct_username', null, 'is', procJson.username),
		             new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		var ctcol = [new nlobjSearchColumn('internalid')];
		var ctrs = nlapiSearchRecord('customrecord_lmsc', null, ctflt, ctcol);
		
		if (ctrs && ctrs.length > 0)
		{
			procJson.hasmatch = true;
			procJson.message = procJson.username+' is already being used in Contract. Please try another username.';
		}
		else
		{
			//Check against Practice
			var pcflt = [new nlobjSearchFilter('custrecord_lmsp_username', null, 'is', procJson.username),
			             new nlobjSearchFilter('isinactive', null, 'is', 'F')];
			var pccol = [new nlobjSearchColumn('internalid')];
			var pcrs = nlapiSearchRecord('customrecord_lmsp', null, pcflt, pccol);
			
			if (pcrs && pcrs.length > 0)
			{
				procJson.hasmatch = true;
				procJson.message = procJson.username+' is already being used in Practice. Please try another username.';
			}
			else
			{
				//check against License
				var lcflt = [new nlobjSearchFilter('custrecord_lmslc_username', null, 'is', procJson.username),
				             new nlobjSearchFilter('isinactive', null, 'is', 'F')];
				var lccol = [new nlobjSearchColumn('internalid')];
				var lcrs = nlapiSearchRecord('customrecord_lmslic', null, lcflt, lccol);
				if (lcrs && lcrs.length > 0)
				{
					procJson.hasmatch = true;
					procJson.message = procJson.username+' is already being used in User License. Please try another username.';
				}
				else
				{
					//THIS Username is GOOD. 
					procJson.hasmatch = false;
					procJson.message = procJson.username+' can be used.';
				}
			}
		}
	}
	catch (procerr)
	{
		log('error','Lookup Error', 'Error looking up uniqueness of username '+procJson.username+' // '+getErrText(procerr));
		procJson.haserr = true;
		procJson.message = getErrText(procerr);
	}
	
	res.write('('+JSON.stringify(procJson)+')');
}

/**
 * SL for searching all or select records types using name value. 
 * This SL has UI
 * @param req
 * @param res
 */
function searchLmsRecordsUi(req, res) {
	//1. create UI form.
	nsform = nlapiCreateForm('Search LMS Records', false);
	nsform.setScript('customscript_axlms_cs_lmssearchrecs');
	
	//Add in submit button
	nsform.addSubmitButton('Search LMS Records');
	
	var procmsg = nsform.addField('custpage_procmsg', 'inlinehtml', '', null, null);
	procmsg.setLayoutType('outsideabove');
	//Display what's been passed back after processing
	var slProcMsg = '';
	if (req.getParameter('custparam_procmsg')) {
		if (req.getParameter('custparam_procmsg').indexOf('ERROR') > -1) {
			slProcMsg = '<div style="color:red; font-size: 14px; font-weight:bold">'+req.getParameter('custparam_procmsg')+'</div>';
		} else {
			slProcMsg = '<div style="color:green; font-size: 14px; font-weight:bold">'+req.getParameter('custparam_procmsg')+'</div>';
		}
	}
	procmsg.setDefaultValue(slProcMsg);
	
	try {

		var lmsjson = null;
		var totalMatch = 0;
		if (req.getMethod() == 'POST') {
			
			var procStatus = '';
			
			var searchTerm = req.getParameter('custpage_searchname');
			
			/**
			 * lmsjson = {
				'[Contract, Location, Practice , License]':{
					[id]:{
						'type':[record type],
						'name':[name value],
						'externalid':[exernal id value],
						'username':[username],
						'region':[region]
					}
				}
			};
			 */
			lmsjson = {};
			
			try {
				//based on check boxes, conduct search of each selected types
				//Contract
				if (req.getParameter('custpage_searchct')=='T') 
				{
					//10/29/2015 - Modify to usearch againse name or username
					var ctflt = [
					             	['isinactive','is','F'],
					             	'AND',
					             	[
					             	 	['name','haskeywords',strTrim(searchTerm)],
					             	 	'OR',
					             	 	['custrecord_lmsct_username','haskeywords',strTrim(searchTerm)]
					             	]
					            ];
					
					var ctcol = [new nlobjSearchColumn('internalid'),
					             new nlobjSearchColumn('name'),
					             new nlobjSearchColumn('custrecord_lmsct_externalid'),
					             new nlobjSearchColumn('custrecord_lmsct_username'),
					             new nlobjSearchColumn('custrecord_lmsct_accessregion')];
					var ctrs = nlapiSearchRecord('customrecord_lmsc', null, ctflt, ctcol);
					//search for Contracts
					for (var ct=0; ctrs && ct < ctrs.length; ct++) 
					{
						if (ct==0)
						{
							totalMatch += ctrs.length;
						}
						
						if (!lmsjson['Contract']) 
						{
							lmsjson['Contract'] = {};
						}
					
						//build out JSON object for all matching Contract
						if (!lmsjson['Contract'][ctrs[ct].getValue('internalid')]) 
						{
							lmsjson['Contract'][ctrs[ct].getValue('internalid')] = {
								'type':'customrecord_lmsc',
								'name':ctrs[ct].getValue('name'),
								'externalid':ctrs[ct].getValue('custrecord_lmsct_externalid'),
								'username':ctrs[ct].getValue('custrecord_lmsct_username'),
								'region':ctrs[ct].getText('custrecord_lmsct_accessregion')
							};
						}
					}
				}
				
				//Practice
				if (req.getParameter('custpage_searchprac')=='T') 
				{
					//10/29/2015 - Modify to usearch againse name or username
					var pcflt = [
					             	['isinactive','is','F'],
					             	'AND',
					             	[
					             	 	['name','haskeywords',strTrim(searchTerm)],
					             	 	'OR',
					             	 	['custrecord_lmsp_username','haskeywords',strTrim(searchTerm)]
					             	]
					            ];
					
					var pccol = [new nlobjSearchColumn('internalid'),
					             new nlobjSearchColumn('name'),
					             new nlobjSearchColumn('custrecord_lmsp_externalid'),
					             new nlobjSearchColumn('custrecord_lmsp_username'),
					             new nlobjSearchColumn('custrecord_lmsp_accessregion')];
					var pcrs = nlapiSearchRecord('customrecord_lmsp', null, pcflt, pccol);
					//search for Contracts
					for (var pc=0; pcrs && pc < pcrs.length; pc++) 
					{
						if (pc==0)
						{
							totalMatch += pcrs.length;
						}
						
						if (!lmsjson['Practice']) 
						{
							lmsjson['Practice'] = {};
						}
					
						//build out JSON object for all matching Practice
						if (!lmsjson['Practice'][pcrs[pc].getValue('internalid')]) 
						{
							lmsjson['Practice'][pcrs[pc].getValue('internalid')] = {
								'type':'customrecord_lmsp',
								'name':pcrs[pc].getValue('name'),
								'externalid':pcrs[pc].getValue('custrecord_lmsp_externalid'),
								'username':pcrs[pc].getValue('custrecord_lmsp_username'),
								'region':pcrs[pc].getText('custrecord_lmsp_accessregion')
							};
						}
					}
				}
				
				//Location
				if (req.getParameter('custpage_searchloc')=='T') 
				{
					var lcflt = [new nlobjSearchFilter('name', null, 'haskeywords', strTrim(searchTerm)),
					             new nlobjSearchFilter('isinactive', null, 'is','F')];
					
					var lccol = [new nlobjSearchColumn('internalid'),
					             new nlobjSearchColumn('name'),
					             new nlobjSearchColumn('custrecord_lmsl_externalid'),
					             new nlobjSearchColumn('custrecord_lmsl_accessregion')];
					var lcrs = nlapiSearchRecord('customrecord_lmsl', null, lcflt, lccol);
					//search for Location
					for (var lc=0; lcrs && lc < lcrs.length; lc++) 
					{
						if (lc==0)
						{
							totalMatch += lcrs.length;
						}
						
						if (!lmsjson['Location']) 
						{
							lmsjson['Location'] = {};
						}
					
						//build out JSON object for all matching Practice
						if (!lmsjson['Location'][lcrs[lc].getValue('internalid')]) 
						{
							lmsjson['Location'][lcrs[lc].getValue('internalid')] = {
								'type':'customrecord_lmsl',
								'name':lcrs[lc].getValue('name'),
								'externalid':lcrs[lc].getValue('custrecord_lmsl_externalid'),
								'username':'',
								'region':lcrs[lc].getText('custrecord_lmsl_accessregion')
							};
						}
					}
				}
				
				//License
				if (req.getParameter('custpage_searchlic')=='T') 
				{
					
					//10/29/2015 - Modify to usearch againse name or username
					var liflt = [
					             	['isinactive','is','F'],
					             	'AND',
					             	[
					             	 	['name','haskeywords',strTrim(searchTerm)],
					             	 	'OR',
					             	 	['custrecord_lmslc_username','haskeywords',strTrim(searchTerm)]
					             	]
					            ];
					
					var licol = [new nlobjSearchColumn('internalid'),
					             new nlobjSearchColumn('name'),
					             new nlobjSearchColumn('custrecord_lmslc_externalid'),
					             new nlobjSearchColumn('custrecord_lmslc_username'),
					             new nlobjSearchColumn('custrecord_lmslc_accessregion')];
					var lirs = nlapiSearchRecord('customrecord_lmslic', null, liflt, licol);
					//search for Location
					for (var li=0; lirs && li < lirs.length; li++) 
					{
						if (li==0)
						{
							totalMatch += lirs.length;
						}
						
						if (!lmsjson['License']) 
						{
							lmsjson['License'] = {};
						}
					
						//build out JSON object for all matching Practice
						if (!lmsjson['License'][lirs[li].getValue('internalid')]) 
						{
							lmsjson['License'][lirs[li].getValue('internalid')] = {
								'type':'customrecord_lmslic',
								'name':lirs[li].getValue('name'),
								'externalid':lirs[li].getValue('custrecord_lmslc_externalid'),
								'username':lirs[li].getValue('custrecord_lmslc_username'),
								'region':lirs[li].getText('custrecord_lmslc_accessregion')
							};
						}
					}
				}
			} catch (procerr) {
				procStatus += 'ERROR: '+getErrText(procerr);
			}
		}
				
		//Configuration 
		nsform.addFieldGroup('custpage_a', 'Search Filters', null);
		//--- Contract Config
		var searchNameFld = nsform.addField('custpage_searchname', 'text', 'Name: ', null, 'custpage_a');
		searchNameFld.setBreakType('startcol');
		searchNameFld.setMandatory(true);
		searchNameFld.setDefaultValue(strTrim(req.getParameter('custpage_searchname')));
		
		var searchHelpFld = nsform.addField('custpage_searchnamehelp','inlinehtml','',null,'custpage_a');
		searchHelpFld.setDefaultValue(
			'<br/><b>Provide keyword or phrase and '+
			'choose list of LMS records to search against<br/>'+
			'Search will look at both <i>name</i> and <i>username</i> for match</b>');
		
		//List of Search in Records
		var searchCtFld = nsform.addField('custpage_searchct','checkbox','Contract (Organization)', null, 'custpage_a');
		searchCtFld.setBreakType('startcol');
		searchCtFld.setDefaultValue(req.getParameter('custpage_searchct'));
		
		var searchPracFld = nsform.addField('custpage_searchprac','checkbox','Practice', null, 'custpage_a');
		searchPracFld.setDefaultValue(req.getParameter('custpage_searchprac'));
		
		var searchLocFld = nsform.addField('custpage_searchloc','checkbox','Location', null, 'custpage_a');
		searchLocFld.setBreakType('startcol');
		searchLocFld.setDefaultValue(req.getParameter('custpage_searchloc'));
		
		var searchLicFld = nsform.addField('custpage_searchlic','checkbox','License (User)', null, 'custpage_a');
		searchLicFld.setDefaultValue(req.getParameter('custpage_searchlic'));
		
		//Add in Result if lmsrs is NOT empty
		/**
		 * lmsjson = {
			'[Contract, Location, Practice , License]':{
				[id]:{
					'type':[type],
					'name':[name value],
					'externalid':[exernal id value],
					'username':[username],
					'region':[region]
				}
			}
		};
		 */
		var rslist = nsform.addSubList('custpage_rslist', 'list', 'Search Results', null);
		rslist.addField('list_rectype','text','Record Type',null).setDisplayType('hidden');
		rslist.addField('list_action','textarea','Action',null).setDisplayType('inline');
		rslist.addField('list_typedisplay','text','Match Type',null);
		rslist.addField('list_name','text','Name',null);
		rslist.addField('list_extid','text','Rcopia ID', null);
		rslist.addField('list_username','text','Username',null);
		rslist.addField('list_region','text','Region',null);
		
		var line = 1;
		
		if (req.getMethod() == 'POST')
		{
			rslist.setLabel('Search Results: '+totalMatch+' found');
		}
		
		for (var r in lmsjson) 
		{
			//per each type , loop through and add it to the line
			for (var t in lmsjson[r]) 
			{
				var action = '<a href="'+nlapiResolveURL('RECORD', lmsjson[r][t].type, t, 'VIEW')+'" target="_blank">View Record</a>';
				rslist.setLineItemValue('list_id', line, t);
				rslist.setLineItemValue('list_rectype', line, lmsjson[r][t].type);
				rslist.setLineItemValue('list_action', line, action);
				rslist.setLineItemValue('list_typedisplay', line, r);
				rslist.setLineItemValue('list_name', line, lmsjson[r][t].name);
				rslist.setLineItemValue('list_extid', line, lmsjson[r][t].externalid);
				rslist.setLineItemValue('list_username', line, lmsjson[r][t].username);
				rslist.setLineItemValue('list_region', line, lmsjson[r][t].region);
				line += 1;
			}
		}
	} 
	catch (unexpe) 
	{	
		procmsg.setDefaultValue('<div style="color:red; font-weight: bold">'+getErrText(unexpe)+'</div>');
	}
	
	//write out the form
	res.writePage(nsform);
}

/************************ Client Script ****************************/

function searchSaveRecord() 
{
	
	//Need to make sure atleast one record checkbox is checked.
	if (nlapiGetFieldValue('custpage_searchct') != 'T' && 
		nlapiGetFieldValue('custpage_searchprac') != 'T' && 
		nlapiGetFieldValue('custpage_searchloc') != 'T' && 
		nlapiGetFieldValue('custpage_searchlic') != 'T') 
	{
		alert('Please choose atleast one LMS related Record');
		return false;
	}
	
	//MUST check tomake sure keyword is atleast 3 characters long'
	if (strTrim(nlapiGetFieldValue('custpage_searchname')) &&
		strTrim(nlapiGetFieldValue('custpage_searchname')).length < 3)
	{
		alert('Search term must be longer than 3 characters');
		return false;
	}
	
	return true;
}