/**
 * Billable days suitelet is a UI tool that allows user to search 
 * for and identify billable days for engagements
 * UI will allow ability to search for specific engagements with 
 * Date Range (Engaement End Dates), Customer, specific engagement (List based on customer selection)
 * or status of engagement
 * Version    Date            Author           Remarks
 * 1.00       26 Sep 2015     json
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function billableDaysUiTool(req, res)
{
	var nsform = nlapiCreateForm('Billable Day Tool', false);
	nsform.setScript('customscript_aux_cs_billtoolhelper');
	
	var msgfld = nsform.addField('custpage_msgfld', 'inlinehtml', '', null, null);
	msgfld.setLayoutType('outsideabove', null);
	
	var paramFromDate = req.getParameter('custpage_egfromdt');
	var paramToDate = req.getParameter('custpage_egtodt');
	var paramCustomer = req.getParameter('custpage_customer') || '';
	var paramEngagement = req.getParameter('custpage_engagement') || '';
	var paramEngStatus = req.getParameter('custpage_engstatus') || '';
	var paramBdeOnly = 'T';
	if (!req.getParameter('custpage_bdengonly') || req.getParameter('custpage_bdengonly')=='F')
	{
		paramBdeOnly = 'F';
	}
	
	var paramNzptOnly = 'T';
	if (!req.getParameter('custpage_nzptonly') || req.getParameter('custpage_nzptonly') == 'F')
	{
		paramNzptOnly = 'F';
	}
	
	//if both from and to dates are empty, set it as current month
	if (!paramFromDate && !paramToDate)
	{
		var currDate = new Date();
		currDate.setDate(1);
		//set from date to be 1st date of this month
		paramFromDate = nlapiDateToString(currDate);
		log('debug','from date',paramFromDate);
		//set to date to be NEXT month same date
		paramToDate = nlapiAddMonths(nlapiStringToDate(paramFromDate), 1);
		//subtrack 1 DAY from to date in order to get last day of the month for THIS month
		paramToDate = nlapiDateToString(nlapiAddDays(paramToDate, -1));
	}
	
	try
	{
		//Add in field group for filters
		nsform.addFieldGroup('custpage_grpa', 'Engagement Search Filter Options', null);
		//---- COL A
		//Engagement End Date FROM 
		var engEndDateFrom = nsform.addField('custpage_egfromdt', 'date', 'Engagement End Date From', null, 'custpage_grpa');
		engEndDateFrom.setBreakType('startcol');
		engEndDateFrom.setDefaultValue(paramFromDate);
		engEndDateFrom.setMandatory(true);
		
		//Engagement End Date TO
		var engEndDateTo = nsform.addField('custpage_egtodt', 'date', 'Engagement End Date To', null, 'custpage_grpa');
		engEndDateTo.setDefaultValue(paramToDate);
		engEndDateTo.setMandatory(true);
		
		//---- COL B
		//Add in Customer Filter
		var customerFld = nsform.addField('custpage_customer', 'select','Customer','customer','custpage_grpa');
		customerFld.setDefaultValue(paramCustomer);
		customerFld.setBreakType('startcol');
		
		//Add in list of engagements for selected customer
		//Disabled first
		var engFld = nsform.addField('custpage_engagement', 'select', 'Engagements', null, 'custpage_grpa');
		engFld.addSelectOption('', '', true);
		if (!paramCustomer)
		{
			engFld.setDisplayType('disabled');
		}
		else
		{
			//search for and populate 
			var jflt = [new nlobjSearchFilter('customer', null, 'anyof', paramCustomer),
			            new nlobjSearchFilter('isinactive', null, 'is', 'F')];
			var jcol = [new nlobjSearchColumn('internalid'),
			            new nlobjSearchColumn('entityid'),
			            new nlobjSearchColumn('entitystatus'),
			            new nlobjSearchColumn('enddate').setSort(true)];
			var jrs = nlapiSearchRecord('job', null, jflt, jcol);
			
			for (var e=0; jrs && e < jrs.length; e+=1)
			{
				
				engFld.addSelectOption(
					jrs[e].getValue('internalid'), 
					jrs[e].getValue('entityid') + ' ('+jrs[e].getText('entitystatus') +' - '+jrs[e].getValue('enddate')+')', 
					false
				);
			}
		}
		engFld.setDefaultValue(paramEngagement);
		
		//----- COL C
		//Add in list of available Engagement Statuses.
		//Add in 1 "Closed", 2 "In Progress", 4 "In Progress/Pending PO", 3 "Delivered"
		var engStatusFld = nsform.addField('custpage_engstatus','select','Engagement Status', null,'custpage_grpa');
		engStatusFld.setBreakType('startcol');
		engStatusFld.addSelectOption('', '', true);
		engStatusFld.addSelectOption('1', 'Closed', false);
		engStatusFld.addSelectOption('2', 'In Progress', false);
		engStatusFld.addSelectOption('4', 'In Progress/Pending PO', false);
		engStatusFld.addSelectOption('3', 'Delivered', false);
		engStatusFld.setDefaultValue(paramEngStatus);
		
		//Add filter to ONLY include Billable Days Engagements
		var bdEngOnlyFld = nsform.addField('custpage_bdengonly','checkbox','Billable Days Only?',null,'custpage_grpa');
		bdEngOnlyFld.setDefaultValue(paramBdeOnly);
		
		//Add filter to ONLY show none-zero planned time
		var nzptOnlyFld = nsform.addField('custpage_nzptonly','checkbox','None-Zero Planned Time Only?',null,'custpage_grpa');
		nzptOnlyFld.setDefaultValue(paramNzptOnly);
		
		//------- POST ------------------
		if (req.getMethod() == 'POST')
		{
			// Add in the sublist to display
			var engsl = nsform.addSubList('custpage_engsl', 'list', 'Matching Engagements', null);
			engsl.addField('esl_jobid', 'text', 'Engagement Internal ID', null).setDisplayType('hidden');
			engsl.addField('esl_clientid', 'text', 'Client Internal ID', null).setDisplayType('hidden');
			engsl.addField('esl_clientname','textarea', 'Client', null).setDisplayType('inline');
			engsl.addField('esl_jobname','textarea','Engagement', null).setDisplayType('inline');
			engsl.addField('esl_jobenddate','date','Engagement End Date', null);
			engsl.addField('esl_ponum','text','P/O Ref', null);
			engsl.addField('esl_planned','integer','Total Planned Days', null);
			engsl.addField('esl_billable','integer','Total Billable Days', null);
			
			var jobids = [],
				poNumOnJsonByJob = {};
			
			var jobflt = [new nlobjSearchFilter('enddate', null, 'within', paramFromDate, paramToDate)];
			
			//IF user checked only show none-zero planned time only box, pass it in as filter
			//	otherwise let it display ALL
			if (paramNzptOnly == 'T')
			{
				jobflt.push(new nlobjSearchFilter('custentity_axrpt_plannedtime_days', null, 'isnotempty',''));
				jobflt.push(new nlobjSearchFilter('custentity_axrpt_plannedtime_days', null, 'greaterthan','0'));
			}
			
			//IF user checked only show billable days only box, pass it in as filter
			//	otherwise let it display ALL
			if (paramBdeOnly == 'T')
			{
				jobflt.push(new nlobjSearchFilter('custentity_adx_billabledays', null, 'is', 'T'));
			}
			
			//If user selected customer filter
			if (paramCustomer)
			{
				jobflt.push(new nlobjSearchFilter('customer', null, 'anyof', paramCustomer));
			}
			
			//If specific engagement is passed in
			if (paramEngagement)
			{
				jobflt.push(new nlobjSearchFilter('internalid', null, 'anyof', paramEngagement));
			}
			
			//If specific status is passed in
			if (paramEngStatus)
			{
				jobflt.push(new nlobjSearchFilter('status', null, 'anyof', paramEngStatus));
			}
			
			var jobcol = [new nlobjSearchColumn('internalid'),
			              new nlobjSearchColumn('enddate'),
			              new nlobjSearchColumn('entityid'),
			              new nlobjSearchColumn('customer'),
			              new nlobjSearchColumn('enddate'),
			              new nlobjSearchColumn('custentity_axrpt_plannedtime_days'),
			              new nlobjSearchColumn('custentity_axrpt_billabledays')];
			
			//Execute the search
			var mjobrs = nlapiSearchRecord('job',null, jobflt, jobcol);
			
			if (mjobrs && mjobrs.length > 0)
			{
				//1st loop collect and grab unique list of Jobs IDs to search against Sales order
				for (var j=0; j < mjobrs.length; j+=1)
				{
					if (!jobids.contains(mjobrs[j].getValue('internalid')))
					{
						jobids.push(mjobrs[j].getValue('internalid'));
					}
				}
				
				//search against Transaction to grab P/N Number from Sales Order IF associated with engagements
				var soflt = [new nlobjSearchFilter('internalid', 'jobmain', 'anyof', jobids),
				             new nlobjSearchFilter('mainline', null, 'is', 'T')];
				var socol = [new nlobjSearchColumn('internalid','jobMain'),
				             new nlobjSearchColumn('internalid'),
				             new nlobjSearchColumn('otherrefnum')];
				var sors = nlapiSearchRecord('salesorder', null, soflt, socol);
				for (var s=0; sors && s < sors.length; s+=1)
				{
					poNumOnJsonByJob[sors[s].getValue('internalid','jobMain')] = (sors[s].getValue('otherrefnum')?sors[s].getValue('otherrefnum'):'');
				}
				
				//2nd loop - go through and ADD to sublist
				var linenum = 1;
				for (var j=0; j < mjobrs.length; j+=1)
				{
					var poNumRef = '',
						plannedTimeInDays = '0',
						billableDays = '0';
					
					if (poNumOnJsonByJob[mjobrs[j].getValue('internalid')])
					{
						poNumRef = poNumOnJsonByJob[mjobrs[j].getValue('internalid')];
					}

					if (mjobrs[j].getValue('custentity_axrpt_plannedtime_days'))
					{
						plannedTimeInDays = parseInt(mjobrs[j].getValue('custentity_axrpt_plannedtime_days')).toFixed(0);
					}
					
					if (mjobrs[j].getValue('custentity_axrpt_billabledays'))
					{
						billableDays = parseInt(mjobrs[j].getValue('custentity_axrpt_billabledays')).toFixed(0);
					}
					
					engsl.setLineItemValue('esl_clientid', linenum, mjobrs[j].getValue('customer'));
					engsl.setLineItemValue('esl_jobid', linenum, mjobrs[j].getValue('internalid'));
					
					var jobLinkText = mjobrs[j].getValue('entityid')+
									  '&nbsp; '+
									  '<a href="'+
									  nlapiResolveURL('RECORD', 'job', mjobrs[j].getValue('internalid'), 'VIEW')+
									  '" target="_blank">View Record</a>';
					
					var clientLinkText = mjobrs[j].getText('customer')+
										 '&nbsp; '+
										 '<a href="'+
										 nlapiResolveURL('RECORD', 'customer', mjobrs[j].getValue('customer'), 'VIEW')+
										 '" target="_blank">View Record</a>';
					
					engsl.setLineItemValue('esl_clientname', linenum, clientLinkText);
					engsl.setLineItemValue('esl_jobname', linenum, jobLinkText);
					engsl.setLineItemValue('esl_jobenddate', linenum, mjobrs[j].getValue('enddate'));
					engsl.setLineItemValue('esl_ponum', linenum, poNumRef);
					engsl.setLineItemValue('esl_planned', linenum, plannedTimeInDays);
					engsl.setLineItemValue('esl_billable', linenum, billableDays);
					
					
					linenum+=1;
				}
				
			}
			
			
		}
		
		//Add submit button
		nsform.addSubmitButton('Search for Engagements');
		
	}
	catch (procerr)
	{
		msgfld.setDefaultValue(
			'<div style="color: red; font-weight">'+
			getErrText(procerr)+
			'</div>'
		);
	}
	
	res.writePage(nsform);
}

/********* Main Billing Took UI Client Script **********************************/
function billingUiFldChanged(type, name, linenum)
{
	if (name == 'custpage_customer' && nlapiGetFieldValue(name))
	{
		//Call out Helper SUitelet and grab related engagements
		//customscript_ax_sl_getjobbycustomerid
		//customdeploy_ax_sl_getjobbycustomerid
		//customerid
		var slUrl = nlapiResolveURL(
						'SUITELET', 
						'customscript_ax_sl_getjobbycustomerid', 
						'customdeploy_ax_sl_getjobbycustomerid', 
						'view'
					)+
					'&customerid='+
					nlapiGetFieldValue(name);
				
		var resobj = nlapiRequestURL(slUrl);
		var resJson = eval('('+resobj.getBody()+')');
		
		if (!resJson.success)
		{
			alert(
				'Error getting related Engagements: '+
				resJson.message
			);
		}
		else
		{
			nlapiDisableField('custpage_engagement', false);
			nlapiRemoveSelectOption('custpage_engagement', null);
			nlapiInsertSelectOption('custpage_engagement', '', ' - Related Engagements - ', true);
			for(var j in resJson.jobs)
			{
				nlapiInsertSelectOption('custpage_engagement', j, resJson.jobs[j], false);
			}
		}
		
	}
}

/********* Suitelet Helper to Grab list of Engagements for selected customer ***/
function getRelatedEngagements(req, res)
{
	var robj = {
		'success':false,
		'message':'',
		'jobs':{}
	};
	
	if (!req.getParameter('customerid'))
	{
		robj.success = false;
		robj.message = 'Missing Customer';
	}
	else
	{
		try 
		{
			var jflt = [new nlobjSearchFilter('customer', null, 'anyof', req.getParameter('customerid')),
			            new nlobjSearchFilter('isinactive', null, 'is', 'F')];
			var jcol = [new nlobjSearchColumn('internalid'),
			            new nlobjSearchColumn('entityid'),
			            new nlobjSearchColumn('entitystatus'),
			            new nlobjSearchColumn('enddate').setSort(true)];
			var jrs = nlapiSearchRecord('job', null, jflt, jcol);
			
			if (!jrs || (jrs && jrs.length == 0))
			{
				throw nlapiCreateError('BILLABLEDAY-ERR', 'No active engagements available for customer ID '+req.getParameter('customerid'), true);
			}
			
			for (var e=0; e < jrs.length; e+=1)
			{
				robj.jobs[jrs[e].getValue('internalid')] = jrs[e].getValue('entityid') + ' ('+jrs[e].getText('entitystatus') +' - '+jrs[e].getValue('enddate')+')';
			}
			
			robj.success = true;
		}
		catch (joberr)
		{
			log(
				'error',
				'Error searching for Engagements for Customer',
				'Customer ID '+req.getParameter('customerid')+' // '+getErrText(joberr)
			);
			robj.message = getErrText(joberr);
		}
	}
	
	log('debug','rjob',JSON.stringify(robj));
	
	res.write(JSON.stringify(robj));
}
