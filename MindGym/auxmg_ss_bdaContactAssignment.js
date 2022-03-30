/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Jul 2016     WORK-rehanlakhani
 * Search ID: 'customsearch4020'
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) 
{
	var paramContactBDAAssignmentSearch  = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_bda_assign');
	var paramMiddleMarketSearch          = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_bda_mmkt_assign');
	var paramUnUSContactAssignmentSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_un_us_bda_assign');
	var paramUnUKContactAssignmentSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_aux_un_uk_bda_assign');
	
	contactBDAAssignment(paramContactBDAAssignmentSearch);
	middleMarketContactAssignment(paramMiddleMarketSearch);
	unUSContactAssignment(paramUnUSContactAssignmentSearch);
	unUKContactAssignment(paramUnUKContactAssignmentSearch);
}


function contactBDAAssignment(search)
{
	/**
	 * This function populates the assigned to field on the contact record with the BDA that is associated to the company in which the contact is connected to.
	 */
	var rIndex = 0;
	var rMax = 1000;
	var resultSet = nlapiSearchRecord(null, search, null, null)
	
	if(resultSet != null)
	{
		top:do
		{
				for(var i = 0; i < resultSet.length; i+=1)
				{
					var cols = resultSet[0].getAllColumns();
					var contactId = resultSet[i].getValue(cols[0]);
					var bda = resultSet[i].getValue(cols[6]);
					var today = new Date();
					var d = nlapiDateToString(today, 'datetimetz');
					var rec = nlapiLoadRecord('contact', contactId);
					var mql = rec.getFieldValue('custentity_con_mql_reject')
					
					if(mql == 'F')
					{						
						//Oct 25 2016 -ELI- Added If Statment that confirms if the Employee has a BDA Sales Role to prevent Errors
                        //Nov 10 2016 -Jon- Removed check for Employee Sales Role as BDA no longer exists and we wish to make sure it's assigning sales people from col 6
						//var salesRole = nlapiLookupField('employee', bda, 'salesrole', false);							
						//if(salesRole == '28')
						//{
							rec.setFieldValue('custentity_assigned_to', bda);	
							rec.setFieldValue('custentity_assigned_to_date', d);
							
							try
							{
								nlapiSubmitRecord(rec, false, true);								
							}
							catch (submiterr1) 
							{
								log('ERROR','Error Aassigning Sales Rep:'+bda+' to Contact'+rec,  getErrText(submiterr1));							
							}
							
						//}						
											
					}
					
					
					if(nlapiGetContext().getRemainingUsage() <= 50)
					{
						var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
						nlapiLogExecution('DEBUG','Rescheduling the script status', status);
						if(status == 'QUEUED')
							break top;
					}
					var pctCompleted = Math.round(((i+1) / resultSet.length) * 100);
					nlapiGetContext().setPercentComplete(pctCompleted);
				}
				rIndex = rIndex + rMax; 
		}
		while (resultSet.length >= 1000);
	}
}

function middleMarketContactAssignment(search)
{
	/**
	 * This function gets all the contact who are associated with a company that has '- Middle Market -' in the territory. It will then take the sales rep of that company and assign it to the Assigned to Field on the contact record.
	 */
	var contactSearch = nlapiSearchRecord(null, search, null, null);
	if(contactSearch != null)
	{
		for(var i = 0; i < contactSearch.length; i+=1)
		{
			var cols = contactSearch[0].getAllColumns();
			var contactId = contactSearch[i].getValue(cols[0]);
			var salesRep  = contactSearch[i].getValue(cols[2]);
			var today = new Date();
			var d = nlapiDateToString(today, 'datetimetz');
			var rec = nlapiLoadRecord('contact', contactId)
			rec.setFieldValue('custentity_assigned_to', salesRep);
			rec.setFieldValue('custentity_assigned_to_date', d);
		
			try
			{
				nlapiSubmitRecord(rec, false, true);								
			}
			catch (submiterr2) 
			{
				log('ERROR','Error Aassigning Sales Rep:'+bda+' to Contact'+rec,  getErrText(submiterr2));							
			}

			
			if(nlapiGetContext().getRemainingUsage() <= 50)
			{
				var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
				nlapiLogExecution('DEBUG','Rescheduling the script status', status);
				if(status == 'QUEUED')
					break;
			}
			var pctCompleted = Math.round(((i+1) / contactSearch.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
		}
		
	}
	
}

function unUSContactAssignment(search)
{
	var usBDA = USBDAEmployess();
	var rIndex = 0;
	var rMax = 1000;
	var resultSet;
	var usStartIndex = 0;
	var usLastIndex = usBDA.length;
	
	var resultSet = nlapiSearchRecord(null, search, null, null);
	if(resultSet != null)
	{
		top:do
		{
				for(var i = 0; i < resultSet.length; i+=1)
				{
					var cols = resultSet[0].getAllColumns();
		
					var prevCompany;
					var contactId = resultSet[i].getValue(cols[0]);
					if(prevCompany != company) 
					{
						usStartIndex+=1;
					}
					if(usStartIndex == usLastIndex)
					{
						usStartIndex = 0;	
					}
					var bda = usBDA[ Math.floor (Math.random() * usBDA.length) ];

					
					var company = resultSet[i].getValue(cols[1]);
					var val = existingCompanyContactAssignment(company);
					


							if(typeof val== "boolean")
							{
								bda = bda;
							}
							else
							{
								bda = val;
							}
							var today = new Date();
							var d = nlapiDateToString(today, 'datetimetz');
							
							//Oct 25 2016 -ELI- Added If Statment that confirms if BDA has values to prevent Errors
							if(bda)
							{	
								var rec = nlapiLoadRecord('contact', contactId);
								rec.setFieldValue('custentity_assigned_to', bda);	
								rec.setFieldValue('custentity_assigned_to_date', d);
								
								try
								{
								nlapiSubmitRecord(rec, false, true);	
								prevCompany = company;										
								}
								catch (submiterr3) 
								{
									log('ERROR','Error Aassigning Sales Rep:'+bda+' to Contact'+rec,  getErrText(submiterr3));							
								}

								
							}	
								
		
					if(nlapiGetContext().getRemainingUsage() <= 50)
					{
						var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
						nlapiLogExecution('DEBUG','Rescheduling the script status', status);
						if(status == 'QUEUED')
							break top;
					}
					var pctCompleted = Math.round(((i+1) / resultSet.length) * 100);
					nlapiGetContext().setPercentComplete(pctCompleted);
				}
				rIndex = rIndex + rMax;	
		}
		while (resultSet.length >= 1000);
	}
}



function USBDAEmployess()
{
	var usBDAEmp = [];
	var values = ["-5", "25"];
		
		var sf = [
		          	new nlobjSearchFilter('releasedate', null, 'isempty', null),
		          	new nlobjSearchFilter('custentity_emp_bdaterritory', null, 'noneof', values, '@NONE@'),
		          	new nlobjSearchFilter('subsidiary', null, 'anyof', '3'),
		          	new nlobjSearchFilter('department', null, 'noneof', '11')
		         ];
		
		var sc = [
		          	new nlobjSearchColumn('internalid')
		         ]; 
		
		var empSearch = nlapiSearchRecord('employee', null, sf, sc);
		
		
		if(empSearch)
		{
			for(var i = 0; i < empSearch.length; i+=1)
			{
				usBDAEmp.push(empSearch[i].getValue('internalid'));
			}
		}
	
	return usBDAEmp;
	
}



function UKBDAEmployees()
{
	var ukBDAEmp = [];
	var values = ["-5", "25"];
	
	var sf = [
	          	new nlobjSearchFilter('releasedate', null, 'isempty', null),
	          	new nlobjSearchFilter('custentity_emp_bdaterritory', null, 'noneof', values, '@NONE@'),
	          	new nlobjSearchFilter('subsidiary', null, 'anyof', '2'),
	          	new nlobjSearchFilter('department', null, 'noneof', '11')
	         ];
	
	var sc = [
	          	new nlobjSearchColumn('internalid')
	         ]; 
	
	var empSearch = nlapiSearchRecord('employee', null, sf, sc);
	if(empSearch != null)
	{
		for(var i = 0; i < empSearch.length; i+=1)
		{
			ukBDAEmp.push(empSearch[i].getValue('internalid'));
		}
	}
	
	return ukBDAEmp;
}

function unUKContactAssignment(search)
{
	var ukBDA = UKBDAEmployees();
	var rIndex = 0;
	var rMax = 1000;
	var ukStartIndex = 0;
	var ukLastIndex = ukBDA.length;
	var resultSet = nlapiSearchRecord(null, search, null, null);
	if(resultSet != null)
	{
		top:do
		{
				for(var i = 0; i < resultSet.length; i+=1)
				{
					var cols = resultSet[0].getAllColumns();
					
					var prevCompany;
					var contactId = resultSet[i].getValue(cols[0]);
					if(prevCompany != company) {
						ukStartIndex+=1;
					}
					if(ukStartIndex == ukLastIndex)
					{
						ukStartIndex = 0;	
					}
					var bda = ukBDA[ Math.floor (Math.random() * ukBDA.length) ];
					
					var company = resultSet[i].getValue(cols[1]);
					var val = existingCompanyContactAssignment(company);
									
						if(typeof val== "boolean")
						{
							bda = bda;
						}
						else
						{
							bda = val;
						}
						var today = new Date();
						var d = nlapiDateToString(today, 'datetimetz');

						

						if(bda)
						{	
							var rec = nlapiLoadRecord('contact', contactId);	
							rec.setFieldValue('custentity_assigned_to', bda);	
							rec.setFieldValue('custentity_assigned_to_date', d);
							
							try
							{
								nlapiSubmitRecord(rec, false, true);
								prevCompany = company;								
							}
							catch (submiterr4) 
							{
								log('ERROR','Error Aassigning Sales Rep:'+bda+' to Contact'+rec,  getErrText(submiterr4));							
							}
															
						}							
								
					if(nlapiGetContext().getRemainingUsage() <= 50)
					{
						var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
						nlapiLogExecution('DEBUG','Rescheduling the script status', status);
						if(status == 'QUEUED')
							break top;
					}
					var pctCompleted = Math.round(((i+1) / resultSet.length) * 100);
					nlapiGetContext().setPercentComplete(pctCompleted);
				}
				rIndex = rIndex + rMax;	
			}
		while (resultSet.length >= 1000);	
	}
}

function existingCompanyContactAssignment(companyid)
{
	var newCompany = false;
	var bda;
	var sf = [
	          	new nlobjSearchFilter('company', null, 'anyof', companyid)
	         ];
	
	var sc = [
	          	new nlobjSearchColumn('internalid'),
	          	new nlobjSearchColumn('custentity_assigned_to')
	         ];
	
	var searchResults = nlapiSearchRecord('contact', null, sf, sc)
	if(searchResults != null)
	{
		for(var i = 0; i < searchResults.length; i+=1)
		{
			bda = searchResults[i].getValue('custentity_assigned_to');
			if(bda != '')
				break;
		}
		if(bda == '')
		{
			newCompany = true;
			return newCompany;
		}
		else
		{
			return bda;
		}
	}

	
}