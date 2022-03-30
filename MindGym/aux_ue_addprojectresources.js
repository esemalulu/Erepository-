/**

 * Version    Date            Author           Remarks
 * 1.00       30 Dec 2015     ELI
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */

function createResources_AfterSubmit() 
{
	
	if (type=='create'|| type=='edit' ) 
	{	
		//Load existing Job (Booking) record
		var projRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId() );
		var projectId = projRec.getId();	
		var date = projRec.getFieldValue('enddate');
	
		var bo_owner = projRec.getFieldValue('custentity_bo_owner'); 	//CO-ORDINATOR 
		var bo_exec = projRec.getFieldValue('custentity_bo_exec');		//PROJECT MANAGER 
		var bo_coach = projRec.getFieldValue('custentity_bo_coach');	//COACH
	
		var resourceArray = [bo_owner, bo_exec, bo_coach];
	}
	
	
	if (type=='create' ) 
	{				
		for (var i = 0; i < resourceArray.length; i++) 
		{	
			if(resourceArray[i])
			{		
				var newRec = nlapiCreateRecord('resourceallocation');
				newRec.setFieldValue('allocationresource', resourceArray[i]);
				newRec.setFieldValue('project', projectId);
				newRec.setFieldValue('startdate', date);
				newRec.setFieldValue('enddate', date);
				newRec.setFieldValue('allocationtype', '1');	
				newRec.setFieldValue('allocationamount', '8');	

				try
				{
					nlapiSubmitRecord(newRec, true);					
				}
				catch (submiterr) 
				{
					log('ERROR','Error Creating Resources to Project: ' +projectId,  getErrText(submiterr));							
				}
		
			}		
		}	
	}

	
	if (type=='edit' ) 	
	{
			
		var oldRec = nlapiGetOldRecord();	//Use API to grab old values from the record inorder to compare with new values
		var oldvalue1 = oldRec.getFieldValue('custentity_bo_owner'); 	//OLD CO-ORDINATOR 
		var oldvalue2 = oldRec.getFieldValue('custentity_bo_exec');		//OLD PROJECT MANAGER	
		var oldvalue3 = oldRec.getFieldValue('custentity_bo_coach');	//OLD COACH

			
		var newvalue1 = projRec.getFieldValue('custentity_bo_owner');	//NEW CO-ORDINATOR 
		var newvalue2 = projRec.getFieldValue('custentity_bo_exec');	//NEW PROJECT MANAGER	
		var newvalue3 = projRec.getFieldValue('custentity_bo_coach');	//NEW COACH
		

		//-----------------------------------------------------------------		
		if((!oldvalue1 && newvalue1) || (oldvalue1 != newvalue1) || newvalue1)  
		{	
			if(oldvalue1){deleteResource(oldvalue1, projectId);}	
			if(newvalue1){addResource(newvalue1, projectId, date);}								
		}
		
		//----------------------------------------------------------------- 
		if((!oldvalue2 && newvalue2) || (oldvalue2 != newvalue2) || newvalue2) 
		{	
			if(oldvalue2){deleteResource(oldvalue2, projectId);}			
			if(newvalue2){addResource(newvalue2, projectId, date);}			
		}
				
		//-----------------------------------------------------------------
		if((!oldvalue3 && newvalue3) || (oldvalue3 != newvalue3) || newvalue3) 
		{	
			if(oldvalue3){deleteResource(oldvalue3, projectId);}
			if(newvalue3){addResource(newvalue3, projectId, date);}			
		}
	}
	
}
	


//Create Project Resource
function addResource(value, projectId, date) 
{
	var newRec = nlapiCreateRecord('resourceallocation');
	newRec.setFieldValue('allocationresource', value);
	newRec.setFieldValue('project', projectId);
	newRec.setFieldValue('startdate', date);
	newRec.setFieldValue('enddate', date);
	newRec.setFieldValue('allocationtype', '1');	
	newRec.setFieldValue('allocationamount', '8');	
	try
	{
		nlapiSubmitRecord(newRec, true);		
	}
	catch (submiterr) 
	{
		log('ERROR','Error Adding Resource '+value+' to Project: ' +projectId,  getErrText(submiterr));							
	}	
}


//Search against the Project Resource record to see if resource already exist and then delete it
//Prevents Duplicates from being created as Project Resources
function deleteResource(value, projectId) 
{
	var arrSearchFilters = [new nlobjSearchFilter('resource', null, 'is', value),
							new nlobjSearchFilter('project', null, 'is', projectId)];
	var arrSearchResults = nlapiSearchRecord ('resourceallocation', null, arrSearchFilters, null);

	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) 
	{
		
		try
		{
			nlapiDeleteRecord(arrSearchResults[i].getRecordType(), arrSearchResults[i].getId());	
		}
		catch (delerr) 
		{
			log('ERROR','Error Deleting Resource '+value+' from Project ' +projectId,  getErrText(delerr));							
		}
		
	}	
}