/**
 * Custom Suitelet that generates reporting view originally built in Excel (Proof Status.xslx)
 * This custom SL will use Google Table to generate tabular data with formatting.
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 May 2016     json
 *
 */

var serviceMap = {
	'2':'Outsourcing', //DMS: XBRL Outsourcing w EDGARization (75% portion)
	'5':'Platinum', //DMS: Discl Mgmt - Platinum Service – recurring
	'6':'Platinum', //DMS: Platinum Service – Quarterly- 10-Q or 10-K - (one time)
	'4':'Premium', //DMS: Premium XBRL Service – Qtrly- 10-Q or 10-K (one time)
	'3':'Premium', //DMS: Discl Mgmt - Premium Service – recurring
	'7':'Self', //DMP: Disclosure Management – License
};

//Cell formatting only use first letter of string
// to determine the range.
// This maps out each status to single letter
var StatusMap = {
	'Outstanding':'O',
	'In Progress':'P',
	'In Queue':'Q',
	'Self':'S',
	'No FW':'F',
	'Completed':'C',
	'New':'N'
};

//Contains table configuration.
var tableColumnDef = {
	'readytofile':{
		'text':'Ready to File?',
		'hide':false,
		'type':'boolean',
		'value':''
	},
	'client':{
		'text':'Client',
		'hide':false,
		'type':'string',
		'value':''
	},
	'da':{
		'text':'DA',
		'hide':true,
		'type':'string',
		'value':''
	},
	'team':{
		'text':'Team',
		'hide':true,
		'type':'string',
		'value':''
	},
	'form':{
		'text':'Form',
		'hide':true,
		'type':'string',
		'value':''
	},
	'service':{
		'text':'Service',
		'hide':true,
		'type':'string',
		'value':''
	},
	'filingwizard':{
		'text':'Filing Wizard',
		'hide':true,
		'type':'string',
		'value':''
	},
	'filing':{
		'text':'Filing',
		'hide':false,
		'type':'date',
		'value':''
	},
	'xbrl':{
		'text':'XBRL Proof',
		'hide':false,
		'type':'string',
		'value':''
	},
	'html':{
		'text':'HTML',
		'hide':false,
		'type':'string',
		'value':''
	},
	'secondary':{
		'text':'Secondary',
		'hide':false,
		'type':'string',
		'value':''
	},
	'proforma':{
		'text':'Pro Forma',
		'hide':true,
		'type':'date',
		'value':''
	},
	'1stdraft':{
		'text':'1st Draft',
		'hide':true,
		'type':'date',
		'value':''
	},
	'finaldraft':{
		'text':'Final Draft',
		'hide':true,
		'type':'date',
		'value':''
	},
	'filingweek':{
		'text':'Filing Week',
		'hide':true,
		'type':'string',
		'value':''
	}
};

var qtrMap = {
	'1st Qtr':{
		'start':1,
		'end':3
	},
	'2nd Qtr':{
		'start':4,
		'end':6
	},
	'3rd Qtr':{
		'start':7,
		'end':9
	},
	'4th Qtr':{
		'start':10,
		'end':12
	}
};

var dayTextMap = {
	0:'Sun',
	1:'Mon',
	2:'Tue',
	3:'Wed',
	4:'Thr',
	5:'Fri',
	6:'Sat'
};

//filingWeek array is an object array where {'startdate':xx, 'weekstring':xx - xx}
//	- Sorted by startdate object
var filingWeek = [],
	uniqueFilingWeeks = [],
	teamList = [],
	xbrlProof = [],
	htmlFilterList = [],
	curDate = new Date(),
	curMonthVal = curDate.getMonth() + 1,
	curQtrValue = '';

function proofStatusRptView(req, res)
{
	//Find out what Quarter THIS Date is
	for (var q in qtrMap)
	{
		if (qtrMap[q].start <= curMonthVal && qtrMap[q].end >= curMonthVal)
		{
			curQtrValue = q+' '+curDate.getFullYear();
		}
	}
	
	var nsform = nlapiCreateForm(curQtrValue+' Proof Status Report', false);
	nsform.setScript('customscript_ax_cs_proofstatusrptview');
	
	//TESTING
	nsform.addSubmitButton('Save Your Filters');
	
	//Add Refresh Button and Download CSV Button
	nsform.addButton('custpage_refbtn', 'Refresh Data', 'refreshData()');
	nsform.addButton('custpage_export','Export ALL Data to CSV','exportData()');
	
	//Error notification window.
	var msgdisplay = nsform.addField('custpage_msg', 'inlinehtml', '', null, null);
	msgdisplay.setLayoutType('outsideabove', null);
	
	//5/25/2016 - Add in hidden JSON to default filters
	var userFilterFld = nsform.addField('custpage_defflt','inlinehtml','',null,null);
	userFilterFld.setDefaultValue(
		'<script language="JavaScript">'+
		'var userflt={};'+
		'</script>'
	);
	
	try
	{
		//************************************* Search and build JSON objects for each Saved Searches**********************************************
		//List of Saved Search IDs from Script Parameters.
		//	IMPORTANT
		//	Saved Search COLUMNS MUST Stay as is.
		//	- If column reference changes on the saved search, 
		//	  This Report may behave differently or results maybe wrong
			//1752 - DM - DA Dash - Filers by Date
		var paramClientSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_295_clientsearchid'),
			//1843 - DM - FS Dash - XBRL Proofs This Quarter
			paramDmXbrlSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_295_xbrlsearchid'),
			//1835 - DM - FS Dash - HTML Reviews this quarter
			paramDmHtmlSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_295_htmlsearchid'),
			//1887 - DM - FS Dash - Secondary Reviews this quarter
			paramDmSecrSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_295_secrsearchid'),
			//2095 - DM - FS Dash - HTML Reviews Other Forms this quarter
			paramDmOthrSearchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_295_othrsearchid');
		
		//If any of the search values are not provided throw an error
		if (!paramClientSearchId || !paramDmXbrlSearchId || !paramDmHtmlSearchId || !paramDmSecrSearchId || !paramDmOthrSearchId)
		{
			throw nlapiCreateError('PROOF_RPT_ERR', 'Missing Required Saved Search Reference', true);
		}
		
		//Object record that holds User Preferences
		var uPrefRec = null;
		//1. Do a search to see if there is an existing user preference
		var uflt = [new nlobjSearchFilter('isinactive', null,'is','F'),
		            new nlobjSearchFilter('custrecord_psuf_user', null, 'anyof', nlapiGetUser())],
			ucol = [new nlobjSearchColumn('internalid')],
			urs = nlapiSearchRecord('customrecord_ax_proofstatususerfilters', null, uflt, ucol);
		
		if (urs && urs.length > 0)
		{
			//grab first one found. There should ONLY be one
			uPrefRec = nlapiLoadRecord('customrecord_ax_proofstatususerfilters', urs[0].getValue('internalid'));
		}
		
		//5/25/2016 - Add in Submitted request to SAVE user defined filters
		if (req.getMethod() == 'POST')
		{
			//Check to see if we need to grab any user filters
			var reqShowHideFlt = req.getParameterValues('custpage_showhide'),
				showHideFlt = [],
				reqWeekFlt = req.getParameterValues('cuatpage_filterweek'),
				weekFlt = [],
				reqXbrlFlt = req.getParameterValues('custpage_filterxbrl'),
				xbrlFlt = [],
				reqHtmlFlt = req.getParameterValues('custpage_filterhtml'),
				htmlFlt = [],
				reqTeamFlt = req.getParameterValues('custpage_filterteam'),
				teamFlt = [];
			
			//Need to convert the array into JavaScript native Array
			if (reqShowHideFlt && reqShowHideFlt.length > 0)
			{
				for (var s=0; s < reqShowHideFlt.length; s+=1)
				{
					showHideFlt.push(reqShowHideFlt[s]);
				}
			}
			
			if (reqWeekFlt && reqWeekFlt.length > 0)
			{
				for (var w=0; w < reqWeekFlt.length; w+=1)
				{
					weekFlt.push(reqWeekFlt[w]);
				}
			}
			
			if (reqXbrlFlt && reqXbrlFlt.length > 0)
			{
				for (var x=0; x < reqXbrlFlt.length; x+=1)
				{
					xbrlFlt.push(reqXbrlFlt[x]);
				}
			}
			
			if (reqHtmlFlt && reqHtmlFlt.length > 0)
			{
				for (var h=0; h < reqHtmlFlt.length; h+=1)
				{
					htmlFlt.push(reqHtmlFlt[h]);
				}
			}
			
			if (reqTeamFlt && reqTeamFlt.length > 0)
			{
				for (var t=0; t < reqTeamFlt.length; t+=1)
				{
					teamFlt.push(reqTeamFlt[t]);
				}
			}
			
			log(
				'debug',
				'req string',
				showHideFlt.toString()+' // '+
				weekFlt.toString()+' // '+
				xbrlFlt.toString()+' // '+
				htmlFlt.toString()+' // '+
				teamFlt.toString()
			);
			
			//1. If uPrefRec is empty
			if (!uPrefRec)
			{
				//create new one
				uPrefRec = nlapiCreateRecord('customrecord_ax_proofstatususerfilters');
			}
				
			//Go through and set the record values for each filter columns
			uPrefRec.setFieldValue('custrecord_psuf_user', nlapiGetUser());
			uPrefRec.setFieldValue('custrecord_psuf_hidecols', showHideFlt.toString());
			uPrefRec.setFieldValue('custrecord_psuf_filingweek', weekFlt.toString());
			uPrefRec.setFieldValue('custrecord_psuf_xbrlproof', xbrlFlt.toString());
			uPrefRec.setFieldValue('custrecord_psuf_html', htmlFlt.toString());
			uPrefRec.setFieldValue('custrecord_psuf_team', teamFlt.toString());
			
			nlapiSubmitRecord(uPrefRec, true, true);
			
			
			//Redirect to THIS SL
			nlapiSetRedirectURL('SUITELET', nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), 'VIEW', null);
		}
		else
		{
			//If user pref. exists, load it 
			if (uPrefRec)
			{
				var userfltJson = {};
				//Build out each filter option by field ID
				if (uPrefRec.getFieldValue('custrecord_psuf_hidecols'))
				{
					userfltJson['custpage_showhide'] = uPrefRec.getFieldValue('custrecord_psuf_hidecols').split(',');
				}
				
				if (uPrefRec.getFieldValue('custrecord_psuf_filingweek'))
				{
					userfltJson['cuatpage_filterweek'] = uPrefRec.getFieldValue('custrecord_psuf_filingweek').split(',');
				}
				
				if (uPrefRec.getFieldValue('custrecord_psuf_xbrlproof'))
				{
					userfltJson['custpage_filterxbrl'] = uPrefRec.getFieldValue('custrecord_psuf_xbrlproof').split(',');
				}
				
				if (uPrefRec.getFieldValue('custrecord_psuf_html'))
				{
					userfltJson['custpage_filterhtml'] = uPrefRec.getFieldValue('custrecord_psuf_html').split(',');
				}
				
				if (uPrefRec.getFieldValue('custrecord_psuf_team'))
				{
					userfltJson['custpage_filterteam'] = uPrefRec.getFieldValue('custrecord_psuf_team').split(',');
				}
				
				userFilterFld.setDefaultValue(
						'<script language="JavaScript">'+
						'var userflt='+JSON.stringify(userfltJson)+';'+
						'</script>'
				);
			}
		}
		
		//1. Need to grab Results from Each Saved Search and Build JSON Object out of it
		//	 Build out Array of unique list of Filter Option Values
		//	 ALL JSON Object, Client Internal ID is the Linking Key
		
		//Build XBRL Search/Json object
		var xbrlRs = nlapiSearchRecord(null, paramDmXbrlSearchId, null, null),
			xbrlJson = {};
		for (var x=0; xbrlRs && x < xbrlRs.length; x+=1)
		{
			xbrlJson[xbrlRs[x].getValue('custrecord_dmcompliance_client')] = {
				'entityid':xbrlRs[x].getText('custrecord_dmcompliance_client'),
				'statusid':xbrlRs[x].getValue('custrecord_dmcompliance_status'),
				'statustext':xbrlRs[x].getText('custrecord_dmcompliance_status')
			}; 
		}
		
		//Build HTML Search/Json object
		var htmlRs = nlapiSearchRecord(null, paramDmHtmlSearchId, null, null),
		htmlJson = {};
		for (var h=0; htmlRs && h < htmlRs.length; h+=1)
		{
			htmlJson[htmlRs[h].getValue('custrecord_dmcompliance_client')] = {
				'entityid':htmlRs[h].getText('custrecord_dmcompliance_client'),
				'statusid':htmlRs[h].getValue('custrecord_dmcompliance_status'),
				'statustext':htmlRs[h].getText('custrecord_dmcompliance_status')
			}; 
		}
		
		//Build Second Search/Json object
		var secrRs = nlapiSearchRecord(null, paramDmSecrSearchId, null, null),
		secrJson = {};
		for (var s=0; secrRs && s < secrRs.length; s+=1)
		{
			secrJson[secrRs[s].getValue('custrecord_dmcompliance_client')] = {
				'entityid':secrRs[s].getText('custrecord_dmcompliance_client'),
				'statusid':secrRs[s].getValue('custrecord_dmcompliance_status'),
				'statustext':secrRs[s].getText('custrecord_dmcompliance_status')
			}; 
		}
		
		//Main search/logic to build dmClientJson
		var dmClients = nlapiSearchRecord(null, paramClientSearchId,null,null),
			dmClientJson = {};
		for (var dmc=0; dmClients && dmc < dmClients.length; dmc+=1)
		{
			var serviceDefault = 'Other';
			if (serviceMap[dmClients[dmc].getValue('custentity_dm_service_lvl_filing')])
			{
				serviceDefault = serviceMap[dmClients[dmc].getValue('custentity_dm_service_lvl_filing')];
			}
			
			//Find out the work week string based on filing Date
			var filingDate = (
								dmClients[dmc].getValue('custentity_rivet_current_filing_date')?
								dmClients[dmc].getValue('custentity_rivet_current_filing_date'):
								''
							 ),
				weekObj = null;
			if (filingDate)
			{
				weekObj = getFilingWeek(filingDate);
			}
			
			//--- Get XBRL Status Value
			//	- Default value is Outstanding
			var xbrlStatusValue = 'Outstanding';
			
			//If filing date is empty, set the status to N/A
			if (!filingDate)
			{
				xbrlStatusValue = 'N/A';
			}
			else
			{
				//Check to see if there is a match in xbrlJson using client Internal ID. 
				//	- If match is found, use the value of Status Text
				if (xbrlJson[dmClients[dmc].getId()])
				{
					xbrlStatusValue = xbrlJson[dmClients[dmc].getId()].statustext;
				}
				else
				{
					//If no match is found, check to see if Service value is "Self".
					//	- If it is self, set the value to Self.
					if (serviceDefault == 'Self')
					{
						xbrlStatusValue = 'Self';
					}
				}
			}
			
			//Add to unique list of xbrlProof status values
			if (!xbrlProof.contains(xbrlStatusValue))
			{
				xbrlProof.push(xbrlStatusValue);
			}
			//-------------------------------------------
			
			//--- Get Html Status Value
			var htmlStatusValue = 'Outstanding',
				wizardValue = (
								dmClients[dmc].getText('custentity_rivet_filing_wizard')?
								dmClients[dmc].getText('custentity_rivet_filing_wizard'):
								'N/A'
							  );
			
			//if Filing Wizard is N/A set to N/A
			if (wizardValue == 'N/A')
			{
				htmlStatusValue = 'N/A';
			}
			
			//if Filing Wizard is No set to No FW
			else if (wizardValue == 'No')
			{
				htmlStatusValue = 'No FW';
			}
			else
			{
				if (htmlJson[dmClients[dmc].getId()])
				{
					htmlStatusValue = htmlJson[dmClients[dmc].getId()].statustext;
				}
			}
			
			//Add to unique list of htmlFilterList status values
			if (!htmlFilterList.contains(htmlStatusValue))
			{
				htmlFilterList.push(htmlStatusValue);
			}
			
			//--- Get Secondary Status Value
			var secondaryStatusValue = 'Outstanding';
			//If filing date is empty, set the status to N/A
			if (!filingDate)
			{
				secondaryStatusValue = 'N/A';
			}
			else
			{
				//Check to see if there is a match in secrJson using client Internal ID. 
				//	- If match is found, use the value of Status Text
				if (secrJson[dmClients[dmc].getId()])
				{
					secondaryStatusValue = secrJson[dmClients[dmc].getId()].statustext;
				}
				else
				{
					//If no match is found, check to see if Service value is "Self".
					//	- If it is self, set the value to Self.
					if (serviceDefault == 'Self')
					{
						secondaryStatusValue = 'Self';
					}
				}
			}
			
			//--- Get Pro Forma Value
			var proFormaValue = '';
			if (xbrlStatusValue=='Outstanding')
			{
				//If Milestone 1 Proforma date field is missing, Mark it as Missing
				proFormaValue = (
					dmClients[dmc].getValue('custentity_dm_milestone1_proforma')?
					dmClients[dmc].getValue('custentity_dm_milestone1_proforma'):
					'Missing'
				);
			}
			else
			{
				//All other value for xbrlStatusValue will either be N/A or value from proforma
				proFormaValue = (
					dmClients[dmc].getValue('custentity_dm_milestone1_proforma')?
					dmClients[dmc].getValue('custentity_dm_milestone1_proforma'):
					'N/A'
				);
			}
			
			//--- Get 1st Draft Value
			var firstDraftValue = '';
			if (xbrlStatusValue=='Outstanding')
			{
				//If Milestone 2 1st Draft date field is missing, Mark it as Missing
				firstDraftValue = (
					dmClients[dmc].getValue('custentity_dm_milestone2_first_draft')?
					dmClients[dmc].getValue('custentity_dm_milestone2_first_draft'):
					'Missing'
				);
			}
			else
			{
				//All other value for xbrlStatusValue will either be N/A or value from 1st Draft
				firstDraftValue = (
					dmClients[dmc].getValue('custentity_dm_milestone2_first_draft')?
					dmClients[dmc].getValue('custentity_dm_milestone2_first_draft'):
					'N/A'
				);
			}
			
			//--- Get Final Draft Value
			//
			var finalDraftValue = '';
			if (xbrlStatusValue=='Outstanding')
			{
				//If Milestone 3 Final Draft date field is missing, Mark it as Missing
				finalDraftValue = (
					dmClients[dmc].getValue('custentity_dm_milestone3_final_draft')?
					dmClients[dmc].getValue('custentity_dm_milestone3_final_draft'):
					'Missing'
				);
			}
			else
			{
				//All other value for xbrlStatusValue will either be N/A or value from Final Draft
				finalDraftValue = (
					dmClients[dmc].getValue('custentity_dm_milestone3_final_draft')?
					dmClients[dmc].getValue('custentity_dm_milestone3_final_draft'):
					'N/A'
				);
			}
			
			//--- Get readyToFileValue 
			var readyToFileValue = false;
			if ( (htmlStatusValue=='No FW' || htmlStatusValue == 'Completed') &&
				 (xbrlStatusValue=='Completed' || xbrlStatusValue=='Self') && 
			     (secondaryStatusValue=='Completed' || secondaryStatusValue=='Self')) 
			{
				readyToFileValue = true;
			}
			
			//Add to unique list of teamList values
			var teamValue = (
								dmClients[dmc].getText('custentity_dm_da_mgr_filing')?
								dmClients[dmc].getText('custentity_dm_da_mgr_filing'):
								'N/A'
							);
			if (!teamList.contains(teamValue))
			{
				teamList.push(teamValue);
			}
			
			//log('debug','second // filing date // client',secondaryStatusValue+' // '+filingDate+' // '+dmClients[dmc].getValue('entityid'));
			
			//Build Main dmClientJson object
			dmClientJson[dmClients[dmc].getId()]= {
				//CS Data A
				'entityid':dmClients[dmc].getValue('entityid'), 
				
				//CS Data H (Dedicated Accountant - Filing (Custom))
				'da':(
						dmClients[dmc].getText('custentity5')?
						dmClients[dmc].getText('custentity5'):
						'N/A'
					 ), 
				
				//CS Data J (Dedicated Accountant Mgr - Filing (Custom))
				'team':teamValue,
				
				//CS Data C (Current Filing Form)
				'form':(dmClients[dmc].getValue('custentity_rivet_current_filing_form')?dmClients[dmc].getValue('custentity_rivet_current_filing_form'):'N/A'),
				
				//CS Data I (Service Level - Filing)
				'service':serviceDefault, 
				
				//CS Data D (Filing Wizard - 10K and 10Q)
				'wizard':wizardValue,
				
				//CS Data B (Current Filing Date)
				'filing':filingDate,
				
				//XBRL Proof
				'xbrl':xbrlStatusValue,
				
				//HTML
				'html':htmlStatusValue,
				
				//Secondary
				'secondary':secondaryStatusValue,
				
				//Based on xbrl proof
				'proforma':proFormaValue,
				
				'firstdraft':firstDraftValue,
				
				'finaldraft':finalDraftValue,
				
				//Calculated Workweek value
				'filingweek':(weekObj?weekObj.weekstring:'N/A'),
				
				'readytofile':readyToFileValue
				
			};
			
		}
		
		//Sort the filing week array by start date
		if (filingWeek.length > 0)
		{
			filingWeek.sort(function (a, b){
				return a.startdate - b.startdate;
			});
		}
		
		//Sort teamList array 
		if (teamList.length > 0)
		{
			teamList.sort(function (a, b){
				return a - b;
			});
		}
		
		//log('debug','filingWeek',JSON.stringify(filingWeek));
		
		//---------- Export Data ------------------
		if (req.getParameter('exportcsv') == 'y')
		{
			//Write it out text/csv
	    	var csvHeader = '"Ready To File","Client","DA","Team","Form","Service","Filing Wizard",'+
	    					'"Filing Date","Filing Day","XBRL Proof","HTML","Secondary","Pro Forma",'+
	    					'"1st Draft","Final Draft","Filing Week"\n',
	    		csvBody = '';
			
	    	for (var cd in dmClientJson)
	    	{
	    		var filingDayValue = '';
	    		if (dmClientJson[cd].filing)
	    		{
	    			filingDayValue = dayTextMap[nlapiStringToDate(dmClientJson[cd].filing).getDay()];
	    		}
	    		
	    		csvBody += '"'+dmClientJson[cd].readytofile+'",'+
				    		'"'+dmClientJson[cd].entityid+'",'+
				    		'"'+dmClientJson[cd].da+'",'+
				    		'"'+dmClientJson[cd].team+'",'+
				    		'"'+dmClientJson[cd].form+'",'+
				    		'"'+dmClientJson[cd].service+'",'+
				    		'"'+dmClientJson[cd].wizard+'",'+
				    		'"'+dmClientJson[cd].filing+'",'+
				    		'"'+filingDayValue+'",'+
				    		'"'+dmClientJson[cd].xbrl+'",'+
				    		'"'+dmClientJson[cd].html+'",'+
				    		'"'+dmClientJson[cd].secondary+'",'+
				    		'"'+dmClientJson[cd].proforma+'",'+
				    		'"'+dmClientJson[cd].firstdraft+'",'+
				    		'"'+dmClientJson[cd].finaldraft+'",'+
				    		'"'+dmClientJson[cd].filingweek+'"\n';
	    	}
			
	    	res.setContentType('CSV','All_Proof_Status.csv', 'inline');
	    	res.write(csvHeader+csvBody);
	    	return;
		}
		
		//***********************************************************************************
		
		//Add in javascript reference to Google Charts along with JSON object Values
		var jsRef = nsform.addField('custpage_jsref','inlinehtml','',null,null);
		jsRef.setDefaultValue(
			'<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>'+
			'<script language="javascript">'+
			'var dmClientJson = '+JSON.stringify(dmClientJson)+';'+
			'var filingWeek = '+JSON.stringify(filingWeek)+';'+
			'var xbrlJson = '+JSON.stringify(xbrlJson)+';'+
			'var htmlJson = '+JSON.stringify(htmlJson)+';'+
			'var secrJson = '+JSON.stringify(secrJson)+';'+
			'</script>'
		);
		
		//------------------------------ Filter Options --------------------------------
		//Filter options 
		nsform.addFieldGroup('grpa', 'Filter Options', null).setCollapsible(true, true);
		
		//Show/Hide Less Important Columns
		var shHiFld = nsform.addField('custpage_showhide','multiselect','Hide Columns',null,'grpa');
		shHiFld.setBreakType('startcol');
		//loop through tableColumnDef and add in columns that can be hidden
		for(var hc in tableColumnDef)
		{
			if (tableColumnDef[hc].hide)
			{
				shHiFld.addSelectOption(hc, tableColumnDef[hc].text, false);
			}
		}
		shHiFld.setDisplaySize(150, 3);
		//Clear filter link
		var shHiClearFld = nsform.addField('custpage_cshowhide','inlinehtml','',null,'grpa');
		shHiClearFld.setDefaultValue(
			'<a href="#" onclick="clearFilter(\'custpage_showhide\')">Clear Filter</a>'
		);
		
		//Unique Weeks 
		var filingWeekFld = nsform.addField('cuatpage_filterweek', 'multiselect', 'Filing Week', null,'grpa');
		for (var f=0; f < filingWeek.length; f+=1)
		{
			filingWeekFld.addSelectOption(
				filingWeek[f].weekstring, 
				filingWeek[f].weekstring, 
				false
			);
		}
		filingWeekFld.addSelectOption('N/A', 'N/A', false);
		filingWeekFld.setDisplaySize(170, 3);
		filingWeekFld.setBreakType('startcol');
		//Clear filter link
		var fwClearFld = nsform.addField('custpage_cfilterweek','inlinehtml','',null,'grpa');
		fwClearFld.setDefaultValue(
			'<a href="#" onclick="clearFilter(\'cuatpage_filterweek\')">Clear Filter</a>'
		);
		
		
		//Unique XBRL Proof
		var xbrlProofFld = nsform.addField('custpage_filterxbrl', 'multiselect', 'XBRL Proof', null, 'grpa');
		for (var xp=0; xp < xbrlProof.length; xp+=1)
		{
			xbrlProofFld.addSelectOption(
				xbrlProof[xp], 
				xbrlProof[xp], 
				false
			);
		}
		xbrlProofFld.setBreakType('startcol');
		xbrlProofFld.setDisplaySize(150, 3);
		//Clear filter link
		var xbrlClearFld = nsform.addField('custpage_cfilterxbrl','inlinehtml','',null,'grpa');
		xbrlClearFld.setDefaultValue(
			'<a href="#" onclick="clearFilter(\'custpage_filterxbrl\')">Clear Filter</a>'
		);
		
		//Unique HTML Status Values
		//htmlFilterList
		var htmlStatusFld = nsform.addField('custpage_filterhtml', 'multiselect', 'HTML', null, 'grpa');
		for (var ht=0; ht < htmlFilterList.length; ht+=1)
		{
			htmlStatusFld.addSelectOption(
				htmlFilterList[ht], 
				htmlFilterList[ht], 
				false
			);
		}
		htmlStatusFld.setBreakType('startcol');
		htmlStatusFld.setDisplaySize(150, 3);
		//Clear filter link
		var htmlClearFld = nsform.addField('custpage_cfilterhtml','inlinehtml','',null,'grpa');
		htmlClearFld.setDefaultValue(
			'<a href="#" onclick="clearFilter(\'custpage_filterhtml\')">Clear Filter</a>'
		);
		
		//Unique Team
		var teamFld = nsform.addField('custpage_filterteam', 'multiselect', 'Team', null, 'grpa');
		for (var t=0; t < teamList.length; t+=1)
		{
			teamFld.addSelectOption(
				teamList[t], 
				teamList[t], 
				false
			);
		}
		teamFld.setBreakType('startcol');
		teamFld.setDisplaySize(150, 3);
		//Clear filter link
		var teamClearFld = nsform.addField('custpage_cfilterteam','inlinehtml','',null,'grpa');
		teamClearFld.setDefaultValue(
			'<a href="#" onclick="clearFilter(\'custpage_filterteam\')">Clear Filter</a>'
		);
		
		//--------------------------- Add Display Subtab ----------------------------------
		nsform.addSubTab('custpage_rpttab', 'Report', null);
		//Add in inline html Field
		var rptView = nsform.addField('custpage_rpthtml', 'inlinehtml', '', null, 'custpage_rpttab');
		rptView.setDefaultValue(
			'<div id="table_div" style="width: 100%; border:1px black solid"></div>'
		);
	}
	catch (rpterr)
	{
		log(
			'error',
			'Error Generating Report',
			getErrText(rpterr)
		);
		
		msgdisplay.setDefaultValue(getErrText(rpterr));
		
	}
	
	res.writePage(nsform);
}

/*********************** Helper Function *****************************/
/**
 * Function to get Filing Week based on date passed in.
 * Builds up filingWeek array with following object
 * {
 * 	'startdate':date object,
 *  'weekstring':from - to 
 * }
 */
function getFilingWeek(_date)
{
	var dateObj = nlapiStringToDate(_date),
		//day of week is 0 to 6
		firstDate = dateObj,
		lastDate = dateObj,
		filingWeekString = '';
	
	//Based on the day of week run loop to back wards to get first date
	while(firstDate.getDay() > 0)
	{
		firstDate = nlapiAddDays(firstDate, -1);
	}
	
	//Based on the day of week run loop to forwards to get Last date
	while(lastDate.getDay() < 6)
	{
		lastDate = nlapiAddDays(lastDate, 1);
	}
	
	filingWeekString = nlapiDateToString(firstDate)+
					   ' - '+
					   nlapiDateToString(lastDate);
		
	weekRangeObj = {
				   		'startdate':firstDate,
				   		'enddate':lastDate,
						'weekstring':filingWeekString
				   };
	
	if (!uniqueFilingWeeks.contains(filingWeekString))
	{
		filingWeek.push(weekRangeObj);
		uniqueFilingWeeks.push(filingWeekString);
	}
	
	return weekRangeObj;
}

/*********************** Client Scripts ******************************/
/**
 * dmClientJson
 */

//Main Table Data nested array
var arTableData = [],
	triggeredFromPageInit = false;

function clearFilter(_fld)
{
	nlapiSetFieldValue(_fld, '', true, true);
}

function refreshData()
{
	window.ischanged = false;
	window.location.reload(); 
}

function exportData()
{
	
	var reportSl = nlapiResolveURL('SUITELET',
			  		'customscript_ax_sl_proofstatusrptview',
			  		'customdeploy_ax_sl_proofstatusrptview'
			  	   )+
			  	   '&exportcsv=y';
	
	window.open(reportSl, 'ALL_DATA_EXPORT', 'width=450,height=300,resizable=yes,scrollbars=no');
	return true;
}

function slsPageInit(type)
{
	//set the flag to let drawTable function know that it was triggered
	//	from PageInit Function.
	triggeredFromPageInit = true;
	google.charts.load('current', {'packages':['table']});
    google.charts.setOnLoadCallback(drawTable);
    
}

function drawTable()
{
	
	var data = new google.visualization.DataTable();
	
	//If this is called from PageInit, 
	//	And user previously had filter to hide columnes,
	//	Build the table in such way here
	if (triggeredFromPageInit && userflt['custpage_showhide'])
	{
		nlapiSetFieldValues('custpage_showhide', userflt['custpage_showhide'], false, true);
		
	}
	
	//Loop through tableColumnDf and build columns
	var hideCols = nlapiGetFieldValues('custpage_showhide'),
		xbrlColIndex = -1,
		htmlColIndex = -1,
		secdColIndex = -1,
		filingColIndex = -1,
		colIndex = 0;
	
	for (var cols in tableColumnDef)
	{
		//Check to see if user selected to hide this column
		if (!hideCols.contains(cols))
		{
			data.addColumn(tableColumnDef[cols].type, '<b>'+tableColumnDef[cols].text+'</b>');
			
			if (cols == 'xbrl')
			{
				xbrlColIndex = colIndex;
			}
			
			if (cols == 'html')
			{
				htmlColIndex = colIndex;
			}
			
			if (cols == 'secondary')
			{
				secdColIndex = colIndex;
			}
			
			if (cols == 'filing')
			{
				filingColIndex = colIndex;
			}
			
			colIndex+=1;
		}
		
	}
	
    //Function call to build arTableData to display
    buildArTableData(); 
    
    data.addRows(arTableData);
    
    var table = new google.visualization.Table(document.getElementById('table_div')),
    	formatter = new google.visualization.ColorFormat();
    
    formatter.addRange('B', 'D', '#229954', '#A9DFBF'); //Complete
    formatter.addRange('E', 'G', '#909497', '#E5E7E9'); //No FW
    formatter.addRange('M', 'O', '#D4AC0D', '#F9E79F'); //New
    formatter.addRange('N', 'P', '#A93226', '#E6B0AA'); //Outstanding
    formatter.addRange('O', 'Q', '#D4AC0D', '#F9E79F'); //In Progress
    formatter.addRange('P', 'R', '#D4AC0D', '#F9E79F'); //In Queue
    formatter.addRange('R', 'T', '#909497', '#E5E7E9'); //Self (Grey)
    
    formatter.format(data, xbrlColIndex); //format XBRL Proof
    formatter.format(data, htmlColIndex); //format HTML
    formatter.format(data, secdColIndex); //format Secondary
    
    table.draw(
    	data, 
    	{
    		showRowNumber: false, 
    		width: '100%', 
    		height: '500px',
    		allowHtml: true,
    		sort:'enable',
    		sortAscending:true,
    		sortColumn:filingColIndex
    	}
    );
}

function slsFldChanged(type, name, linenum)
{
	//set the flag to let drawTable function know that it was triggered
	//	from FldChanged Function.
	triggeredFromPageInit = false;
	
	if (name=='cuatpage_filterweek' || name=='custpage_filterxbrl' || 
		name=='custpage_filterhtml' || name=='custpage_filterteam' ||
		name=='custpage_showhide')
	{
		//alert(name);
		drawTable();
	}
}

//Core client function to Builds out arTableData
//dmClientJson
function buildArTableData()
{
	//If this is called from PageInit, set the field values here before going through
	if (triggeredFromPageInit)
	{
		for (var pref in userflt)
		{
			nlapiSetFieldValues(pref, userflt[pref], false, true);
		}
	}
	
	//Add in additional logic here based on users filtering options
	//Filter Options
	var fweekUfVals = nlapiGetFieldValues('cuatpage_filterweek'),
		xbrlVals = nlapiGetFieldValues('custpage_filterxbrl'),
		htmlVals = nlapiGetFieldValues('custpage_filterhtml'),
		teamVals = nlapiGetFieldValues('custpage_filterteam'),
		showAll = false;
	
	//if ALL filters have 0 values Show ALL.
	if (fweekUfVals.length == 0 && xbrlVals.length==0 &&
		htmlVals.length ==0 && teamVals.length==0)
	{
		showAll = true;
	}
	
	//Loop through and rebuild table based on selected filter

	//alert(showAll);
	//alert(fweekUfVals.length);
	
	arTableData = [];
	
	for (var c in dmClientJson)
	{
		
		//When showAll is not true, run logic to figure out WHAT to show
		if (!showAll)
		{
			if (fweekUfVals.length > 0 && !fweekUfVals.contains(dmClientJson[c].filingweek))
			{
				continue;
			}
			
			if (xbrlVals.length > 0 && !xbrlVals.contains(dmClientJson[c].xbrl))
			{
				continue;
			}
			
			if (htmlVals.length > 0 && !htmlVals.contains(dmClientJson[c].html))
			{
				continue;
			}
			
			if (teamVals.length > 0 && !teamVals.contains(dmClientJson[c].team))
			{
				continue;
			}
		}
		
		var filingDateElment = {
			v:null,
			f:'N/A'
		};
		
		if (dmClientJson[c].filing)
		{
			var fileDateObj = nlapiStringToDate(dmClientJson[c].filing),
				dayIndex = fileDateObj.getDay(),
				formatDateStringValue = nlapiDateToString(fileDateObj)+'<br/>('+dayTextMap[dayIndex]+')';
			
			//Request to Flag as Bold/Red if this date is on weekend
			if (dayIndex==0 || dayIndex==6)
			{
				formatDateStringValue = '<span style="color:red; font-weight:bold">'+
										nlapiDateToString(fileDateObj)+'<br/>('+dayTextMap[dayIndex]+')'+
										'</span>';
			}
			
			filingDateElment = {
				v:fileDateObj,
				//f:(fileDateObj.getMonth()+1)+'/'+fileDateObj.getDate()
				f:formatDateStringValue
			};
		}
		
		//Add in value as Letter Status representation
		//XBRL
		var xbrlStatusElement = {
			v:null,
			f:'N/A'
		};
		if (StatusMap[dmClientJson[c].xbrl])
		{
			xbrlStatusElement = {
				v:StatusMap[dmClientJson[c].xbrl],
				f:'<b>'+dmClientJson[c].xbrl+'</b>'
			};
		}
		
		//HTML
		var htmlStatusElement = {
			v:null,
			f:'N/A'
		};
		if (StatusMap[dmClientJson[c].html])
		{
			htmlStatusElement = {
				v:StatusMap[dmClientJson[c].html],
				f:'<b>'+dmClientJson[c].html+'</b>'
			};
		}
		
		//Secondary
		var secrStatusElement = {
			v:null,
			f:'N/A'
		};
		if (StatusMap[dmClientJson[c].secondary])
		{
			secrStatusElement = {
				v:StatusMap[dmClientJson[c].secondary],
				f:'<b>'+dmClientJson[c].secondary+'</b>'
			};
		}
		
		//ProForma
		var pfDateElment = {
			v:null,
			f:'N/A'
		};
		
		if (dmClientJson[c].proforma)
		{
			if (dmClientJson[c].proforma=='Missing')
			{
				pfDateElment = {
					v:null,
					f:'Missing'
				};
			}
			else if (dmClientJson[c].proforma!='N/A')
			{
				var pfDateObj = nlapiStringToDate(dmClientJson[c].proforma);
				pfDateElment = {
					v:pfDateObj,
					f:nlapiDateToString(pfDateObj)
				};
			}
		}
		
		//First Draft
		var frstdDateElment = {
			v:null,
			f:'N/A'
		};
		
		if (dmClientJson[c].firstdraft)
		{
			if (dmClientJson[c].firstdraft=='Missing')
			{
				frstdDateElment = {
					v:null,
					f:'Missing'
				};
			}
			else if (dmClientJson[c].firstdraft!='N/A')
			{
				var frstDateObj = nlapiStringToDate(dmClientJson[c].firstdraft);
				frstdDateElment = {
					v:frstDateObj,
					f:nlapiDateToString(frstDateObj)
				};
			}
		}
		
		//Final Draft
		var finDateElment = {
			v:null,
			f:'N/A'
		};
		
		if (dmClientJson[c].finaldraft)
		{
			if (dmClientJson[c].finaldraft=='Missing')
			{
				finDateElment = {
					v:null,
					f:'Missing'
				};
			}
			else if (dmClientJson[c].finaldraft!='N/A')
			{
				var finDateObj = nlapiStringToDate(dmClientJson[c].finaldraft);
				finDateElment = {
					v:finDateObj,
					f:nlapiDateToString(finDateObj)
				};
			}
		}
		
		//go through and update tableColumnDef value element
		tableColumnDef['readytofile'].value = dmClientJson[c].readytofile;
		tableColumnDef['client'].value = dmClientJson[c].entityid;
		tableColumnDef['da'].value = dmClientJson[c].da;
		tableColumnDef['team'].value = dmClientJson[c].team;
		tableColumnDef['form'].value = dmClientJson[c].form;
		tableColumnDef['service'].value = dmClientJson[c].service;
		tableColumnDef['filingwizard'].value = dmClientJson[c].wizard;
		tableColumnDef['filing'].value = filingDateElment;
		tableColumnDef['xbrl'].value = xbrlStatusElement;
		tableColumnDef['html'].value = htmlStatusElement;
		tableColumnDef['secondary'].value = secrStatusElement;
		tableColumnDef['proforma'].value = pfDateElment;
		tableColumnDef['1stdraft'].value = frstdDateElment;
		tableColumnDef['finaldraft'].value = finDateElment;
		tableColumnDef['filingweek'].value = dmClientJson[c].filingweek;
		
		//Loop through tableColumnDf and build columns
		var fchideCols = nlapiGetFieldValues('custpage_showhide'),
			arRowData = [];
		
		for (var cols in tableColumnDef)
		{
			//Check to see if user selected to hide this column
			if (!fchideCols.contains(cols))
			{
				arRowData.push(tableColumnDef[cols].value);
			}
			
		}
		
		arTableData.push(arRowData);
	}
	
}