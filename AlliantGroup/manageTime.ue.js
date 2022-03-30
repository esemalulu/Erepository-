function timeBeforeLoad(type, form, request){
	if('T' == request.getParameter('weekly')){
		if(type == 'create') nlapiSetRedirectURL('TASKLINK', 'TRAN_TIMEBILL');
		else nlapiSetRedirectURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(), true);
		return;
	}

	if(type == 'create' || type == 'edit'){
		// get projects for which this user is a resource
		var empId = nlapiGetContext().getUser();

		//2/1/2016 Update
		//It was discovered that due to massive number of projects active users belongs to,
		//	Below search was causing extreme slowness in loading.
		//	Two new company level script preferences are introduced to improve the speed.
		//	- custscript_14_jobstatusidfilter 
		//		This parameter is comma separated list of Project Status IDs to filter the projects.
		//	- custscript_14_departmentoverride
		//		This parameter is comma separated list of department IDs to IGNORE above filter.
		var empDeptId = nlapiLookupField('employee', empId, 'department', false),
			jobStatusList = nlapiGetContext().getSetting('SCRIPT', 'custscript_14_jobstatusidfilter'),
			deptIdList = nlapiGetContext().getSetting('SCRIPT', 'custscript_14_departmentoverride');
		
		//Script parameters are required but just in case, do value check
		if (jobStatusList)
		{
			jobStatusList = jobStatusList.split(',');
		}
		
		if (deptIdList)
		{
			deptIdList = deptIdList.split(',');
		}
		
		nlapiLogExecution('debug','job status // deptIdList // employee department', jobStatusList+' // '+deptIdList+' // '+empDeptId);
		
		var jobs = (function(){
				var accum = [];
				var lastId = 0;
				do{
					//2/1/2016 - Taken out to apply logic
					var jobFilter = [
										new nlobjSearchFilter('jobresource', null, 'is', empId),
										new nlobjSearchFilter('internalidnumber', null, 'greaterthan', lastId)
									];
					
					if (!empDeptId || (empDeptId && deptIdList.indexOf(empDeptId) <= -1))
					{
						jobFilter.push(new nlobjSearchFilter('status',null,'anyof', jobStatusList));
						nlapiLogExecution('debug','Include Status Filter','Including status filter '+jobStatusList);
					}
					
					var tempItems = nlapiSearchRecord('job', null,
					jobFilter
					,[
						new nlobjSearchColumn('entityid'),
						new nlobjSearchColumn('companyname'),
						new nlobjSearchColumn('altname', 'customer'),
						new nlobjSearchColumn('entityid', 'customer'),
						new nlobjSearchColumn('formulanumeric').setFormula('{internalid}').setSort(false)]);
					if(tempItems){
						lastId = tempItems[tempItems.length -1].getId();
						accum = accum.concat(tempItems);
					}
				}while(tempItems && tempItems.length == 1000);
			return accum.length ? accum : null;
		})();

		nlapiLogExecution('DEBUG', 'found: '+ (jobs ? jobs.length : 'no') +' job(s) for '+ empId);
		if(jobs){

			jobs.sort(function(a, b){
				var customerNameA = a.getValue('altname', 'customer');
				var customerNameB = b.getValue('altname', 'customer');
				var abridgedCompanyNameA = a.getValue('companyname').replace(customerNameA + ' : ', '');
				var abridgedCompanyNameB = b.getValue('companyname').replace(customerNameB + ' : ', '');

				var aVal = a.getValue('altname', 'customer') + ' : ' + abridgedCompanyNameA;
				var bVal = b.getValue('altname', 'customer') + ' : ' + abridgedCompanyNameB;
				return aVal < bVal ? -1 : aVal == bVal ? 0 : 1;
			});

			var assignedProject = nlapiGetFieldValue('customer');
			var projectList = form.addField('custpage_project_list', 'select', 'Project');
			projectList.addSelectOption(null, '...');
			for(var i = 0; i<jobs.length; i++){
				var customerName = jobs[i].getValue('altname', 'customer');
				var abridgedCompanyName = jobs[i].getValue('companyname').replace(customerName + ' : ', '');

				var projLabel = jobs[i].getValue('altname', 'customer') + ' : ' + abridgedCompanyName;
				projectList.addSelectOption(jobs[i].getId(), projLabel, jobs[i].getId() == assignedProject);
			}
			form.insertField(projectList, 'trandate');
			//projectList.setLayoutType('outsideabove', 'startrow');
		}
	}
}


function getProjectType(request, response){
	// function used to get around client side lookup permissions

	function _sendJSResponse(respObject){
		var json = JSON.stringify(respObject);
		response.setContentType('JAVASCRIPT');
		var callbackFcn = request.getParameter("jsoncallback");
		if(callbackFcn){
			json = callbackFcn + "(" + json + ");";
		}
		response.write( json );
	}

	var jobId = request.getParameter('custpage_jobid');
	try{
		var jobInfo = nlapiLookupField('job', jobId, ['jobtype', 'custentity_location', 'custentity_department'], false);
		nlapiLogExecution('DEBUG','found job type: '+ jobInfo.jobtype);

		// get class for job type
		if(jobInfo.jobtype){
			var classes = nlapiSearchRecord('classification', null, new nlobjSearchFilter('custrecord_project_class_type', null, 'is', jobInfo.jobtype));
		}

		_sendJSResponse({success:true, jobType:classes ? classes[0].getId() : null, jobLocn:jobInfo.custentity_location , jobDept:jobInfo.custentity_department});
	}catch(e){
		nlapiLogExecution("ERROR", e.message || e.toString());
		_sendJSResponse({success:false, message:(e.message || e.toString())});
	}
}