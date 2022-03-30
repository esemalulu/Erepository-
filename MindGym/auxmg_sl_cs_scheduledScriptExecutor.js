/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Feb 2016     WORK-rehanlakhani
 * 1.01		  23 Jan 2017	  apple.villanueva	fixes
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object customsearch3351
 * @returns {Void} Any output is written via response object
 */
function scheduledScriptExecutorSuitelet(request, response)
{
	var script = nlapiGetContext().getSetting('SCRIPT','custscript_scriptids');
	var scriptID = script.split(','); // script paramater
	var rs, id, val, rs1, dID, dName, sublist;
	var sdJson = {};
	var scriptstatus = request.getParameter('scriptStatus');
	var scriptName = request.getParameter('scriptName');
	var lineNum = request.getParameter('linenum');
	var deployId = request.getParameter('deployID');
	var ss = scriptstatus + ',' + scriptName + ',' + lineNum + ',' + deployId;
	
	log('debug','ss',ss);
	
	if(request.getMethod() == "GET")
	{	
		// Building out the Suitelet using NetSuites Standard form objects.
		var form = nlapiCreateForm('Scheduled Script Executor', false);
			form.setScript('customscript492');
		
		var hiddenHtml  = form.addField('custpage_jsonobj', 'inlinehtml', 'test', null, null);
		var hiddenField = form.addField('custpage_status', 'inlinehtml', 'test', null, null);
	    	sublist     = form.addSubList('custpage_sstable', 'list', 'Scheduled Scripts');
	    	
		var checkbox    = sublist.addField('runscript_checkbox', 'checkbox','Run Script').setMandatory(true);
						  checkbox.setMandatory(true);
					      sublist.addField('custpage_scriptname','text','Script Name');
					      sublist.addField('custpage_scriptid','text','Script ID');
						  sublist.addField('custpage_scriptidtext','text','Script ID').setDisplayType('hidden');
	    var select      = sublist.addField('custpage_deployment','select','Deployment Name');
	    				  select.setMandatory(true);
	    				  sublist.addField('custpage_scheduledstatus','text','Scheduled Script Status');
	    				  //Desc. Column Added
	    				  sublist.addField('custpage_desc','textarea','Notes');
					      form.addSubmitButton('Run Script');
					      
					      
		
		// This search will return the scheduled script that have a deployment that is not scheduled ("Free" Script) required for rescheduling the script.
		var sf = [
		          new nlobjSearchFilter('scripttype', 'script', 'anyOf', null, 'SCHEDULED'),
		          new nlobjSearchFilter('internalid', 'script', 'anyOf', null, scriptID),
		          new nlobjSearchFilter('status', null, 'anyOf', null, ['NOTSCHEDULED','TESTING'])
		         ];
		
		var sc = [
		          new nlobjSearchColumn('internalid', 'script', 'GROUP').setSort(true), // script id - number
		          new nlobjSearchColumn('name', 'script', 'GROUP').setSort(true), // script name			  
				  new nlobjSearchColumn('scriptid', 'script', 'GROUP').setSort(true) // script id - text
		         ];
		
		rs = nlapiSearchRecord('scriptdeployment', null, sf, sc);
		// Populating the suitelet fields.
		if(rs != null)
		{
			select.addSelectOption('','',true);
			for(var i = 0; i < rs.length; i+=1)
			{
				sublist.setLineItemValue('custpage_scriptname', i+1, rs[i].getValue(sc[1]));
				sublist.setLineItemValue('custpage_scriptid', i+1, rs[i].getValue(sc[0]));
				sublist.setLineItemValue('custpage_scriptidtext', i+1, rs[i].getValue(sc[2]));
						
				if(lineNum != null && (i == lineNum-1))
				{
					sublist.setLineItemValue('custpage_scheduledstatus', lineNum, scriptstatus);
				}
				
				//May 9 2016
				if (rs[i].getValue('internalid', 'script', 'GROUP') == '424')
				{
					var syncEntitIdDesc = 'This script goes through ALL Face to Face and Virtual Booking Types.<br/>'+
										  'Process may take several hours to run';
					sublist.setLineItemValue('custpage_desc', i+1, syncEntitIdDesc);
				}
				
			}
		}
		
		// This search will extract all the deployment information for the "Free" Scripts
		//	May 9th 2016 - Limit it to ONLY show Unscheduled ones. This can bring out
		//	Testing or Unscheduled
		var sf1 = [
		           new nlobjSearchFilter('scripttype', 'script', 'anyOf', null, 'SCHEDULED'),
		           new nlobjSearchFilter('internalid', 'script', 'anyOf', null, scriptID),
		           new nlobjSearchFilter('status', null,'noneof','SCHEDULED')
		          ];

		 var sc2 = [
		           new nlobjSearchColumn('name', 'script', null), // script name
		           new nlobjSearchColumn('script'), // script id
		           new nlobjSearchColumn('title'), // deployment title
		           new nlobjSearchColumn('internalid') //deployment id
		          ];

		 rs1 = nlapiSearchRecord('scriptdeployment', null, sf1, sc2)
		 if(rs1 != null)
		 {
		 	for(var i = 0; i<rs1.length; i +=1)
		 	{
		 		var scriptIds  = rs1[i].getValue('script'),
		 			scriptName = rs1[i].getValue('name','script'),
		 			deployID   = rs1[i].getValue('internalid'),
		 			deployName = rs1[i].getValue('title');
		 		
		 		// This portion of the script will build a JSON object with all the deployment information which is then passed into a PageInit Function (see below)
		 		if(!sdJson[scriptIds])
		 		{
		 			sdJson[scriptIds] = {};
		 		}
		 		
		 		sdJson[scriptIds]['Script Name'] = scriptName;
		 		
		 			
		 		if(!sdJson[scriptIds][deployID])
		 		{
		 			sdJson[scriptIds][deployID] = {};
		 		}
		 		
		 		sdJson[scriptIds][deployID]['id'] = deployID;
		 		sdJson[scriptIds][deployID]['title'] = deployName;
		 	}
		 	
		 }
		
		// These two hidden fields are used to pass parameters to the pageinit functions. 
		hiddenField.setDefaultValue('<script>'+ss+'</script>');
		hiddenHtml.setDefaultValue('<script>var sdJson = '+JSON.stringify(sdJson)+';</script>');
		
		// Displays the suitelet.
		response.writePage(form);
	} 
	else 
	{
		// This portion of the code gets executed once the user selects the user selects the script and deployment and submits the suitelet.
		if(request.getMethod() == "POST")
		{
			var lineCount = request.getLineItemCount('custpage_sstable');	
			var line;
			var params = {};
			
			log('debug','lineCount',lineCount);
			
			for(var i = 1; i<= lineCount; i+=1)
			{
				line = request.getLineItemValue('custpage_sstable','runscript_checkbox', i);
				
				log('debug','line',line);
				
				if(line == 'T')
				{
					// Gets the script information based on the users selection.
					var scriptID = request.getLineItemValue('custpage_sstable',/*'custpage_scriptid'*/ 'custpage_scriptidtext', i); //use scriptid (text) instead of internalid
					log('debug','scriptID',scriptID);
					var deployID = request.getLineItemValue('custpage_sstable','custpage_deployment', i);
					log('debug','deployID', deployID);
					var status = nlapiScheduleScript(scriptID, null);
					log('debug','status',status);
					var scriptName = request.getLineItemValue('custpage_sstable','custpage_scriptname', i);
					log('debug','scriptName',scriptName);
					
					// building a parameters array to pass back to the suitelet on redirect.
					params['scriptStatus'] = status;
					params['scriptName'] = scriptName;
					params['linenum'] = i;
					params['deployID'] = deployID;
					break;
				} 
			}
			
			log('debug','params',JSON.stringify(params));
			
			// redirects the user back to the suitelet and passes the params object into the get method of the suitelet.
			nlapiSetRedirectURL(
				'SUITELET', 
				'customscript_auxmg_sl_cs_scheduledscript', 
				'customdeploy_auxmg_sl_cs_scheduledscript', 
				'VIEW', 
				params
			);
		}
	}
}

/*
 * The function below is created so the user cannot select multiple scheduled scripts at one time and try to schedule them.
 */
function clientFieldChanged(type, name, linenum)
{
	var numOfRows = nlapiGetLineItemCount('custpage_sstable');
	for (var i = 0; i <= numOfRows; i+=1)
	{
		var line = nlapiGetLineItemValue('custpage_sstable', 'runscript_checkbox', i)
		if (linenum != i && line == 'T')
		{
			nlapiSetLineItemValue('custpage_sstable','runscript_checkbox', i, 'F');
		}

	}
}

/*
 * This function loads in the deployment information based on the second search and alerts the user when the schedule script has been place into queue
 */
function pageInit() 
{
	var count = nlapiGetLineItemCount('custpage_sstable');
	for(var i = 1; i <= count; i+=1)
	{
		// THIS PORTION IS NOT DOCUMENTED AND COULD BREAK AT ANY POINT.
		var fldDom = nlapiGetLineItemField('custpage_sstable','custpage_deployment', i).uifield.parentElement;
		var scriptID = nlapiGetLineItemValue('custpage_sstable','custpage_scriptid', i); 

		var val = sdJson[scriptID];
		var ddObject = getDropdown(fldDom);
			ddObject.deleteAllOptions();
			ddObject.addOption('- Select Deployment -','');
		for (var key in val)
		{
			var deployment = val[key];
			if(deployment.id != null && deployment.title != null)
			{
				ddObject.addOption(deployment.title, deployment.id); 
			}
				
		}

	}
	
	// Displays to the user that the scheduled script has been place into queue.
	var val = nlapiGetFieldValue('custpage_status');
	var values = val.split(',');
	
	if(values[0] != "null" && values[1] != "null")
	{
		alert("The scheduled script called " + values[1] + " has been place into queue.");
	}
	
	if(values[0] != "null")
	{
		nlapiSetLineItemDisabled('custpage_sstable', 'custpage_deployment', true, values[2]);
	}
		
}

function clientSaveRecord()
{
	var checkbox, dropdown;
	var count = nlapiGetLineItemCount('custpage_sstable');
	var val = nlapiGetFieldValue('custpage_status');
	var values = val.split(',');

	for(var i = 1; i <= count; i+=1)
	{
		checkbox = nlapiGetLineItemValue('custpage_sstable', 'runscript_checkbox', i);
		if (i == values[2] && checkbox == 'F')
		{
			alert("Please be sure to check the run script checkbox before submitting the page.");
			
		}
	}
	return true;

}


	