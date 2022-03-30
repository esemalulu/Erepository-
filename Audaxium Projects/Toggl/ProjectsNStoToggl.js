/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 May 2016     WORK-rehanlakhani
 *
 */

function pushProjects()
{
	var workspaceID = getWorkspace(workspaceID);
	var clients = [];
		clients = getClients(clients);

	var sf = [
		          //new nlobjSearchFilter('datecreated', null, 'onorafter', 'today', null),
		          new nlobjSearchFilter('status', null, 'anyof', '2', null),
		          new nlobjSearchFilter('custentity_aux_toggl_synced', null, 'is', 'F', null )
	          ];
	
	var sc = [
	          	  new nlobjSearchColumn('internalid'),
	          	  new nlobjSearchColumn('entityid'),
		          new nlobjSearchColumn('customer'),
		          new nlobjSearchColumn('companyname'),
		          new nlobjSearchColumn('custentity_plannedprojtime'),
		          new nlobjSearchColumn('custentity_isbillable')
	         ];
	
	var rs = nlapiSearchRecord('job', null, sf, sc);
	if(rs != null)
	{
		nlapiLogExecution('DEBUG','Number of Records Returned from Search', rs.length);
		for(var i = 0; i<rs.length; i+=1)
		{
			var recID		= rs[i].getValue('internalid');
			var pID			= rs[i].getValue('entityid');
			var client      = rs[i].getText('customer');
			var projectName = rs[i].getValue('companyname');
			var time        = rs[i].getValue('custentity_plannedprojtime');
			var isBillable  = rs[i].getText('custentity_isbillable');
			var clientIndex = isExists(clients, client);
			if (clientIndex == -1.0)
			{
				var URL = apiPath("Clients");
				var auth = headers();
				var data = createClient(client, workspaceID);
				var createClientResponse = processPostRequest(URL, data, auth);
				if(createClientResponse.code == 200)
				{
					var body = JSON.parse(createClientResponse.body);
					clients.push(body.data.id + '-' + body.data.name);
					clientIndex = isExists(clients, client);
					
					if (clientIndex != -1.0)
					{
						var res = createProject(workspaceID, clients, clientIndex, pID, projectName, time, isBillable);
						if(res.code == 200)
						{
							var body = JSON.parse(res.body);
							nlapiSubmitField('job', recID, 'custentity_aux_toggl_synced','T');
							nlapiLogExecution('DEBUG','Synced with Toggl', 'Yes');
							nlapiLogExecution('DEBUG','Successful Request', JSON.stringify(body.data));
							nlapiLogExecution('DEBUG','Script Execution Date/Time:', nlapiDateToString(new Date(), 'datetime'));
						}
						else if(res.code == 400)
						{
							nlapiSubmitField('job', recID, 'custentity_aux_toggl_synced','T');
							nlapiLogExecution('DEBUG','Project already exists in Toggl','Please check Toggl.')
							nlapiLogExecution('DEBUG','Script Execution Date/Time:', nlapiDateToString(new Date(), 'datetime'));
						}
					}
				}
				else
				{
					nlapiLogExecution('DEBUG', 'FAILED', 'Client wasnt created successfully');
					nlapiLogExecution('DEBUG', 'FAILED', createClientResponse.body);
				}
				
			}
			else
			{
				var res = createProject(workspaceID, clients, clientIndex, pID, projectName, time, isBillable);
				if(res.code == 200)
				{
					var body = JSON.parse(res.body);
					nlapiSubmitField('job', recID, 'custentity_aux_toggl_synced','T');
					nlapiLogExecution('DEBUG','Synced with Toggl', 'Yes');
					nlapiLogExecution('DEBUG','Successful Request', JSON.stringify(body.data));
					nlapiLogExecution('DEBUG','Script Execution Date/Time:', nlapiDateToString(new Date(), 'datetime'));
				}
				else if(res.code == 400)
				{
					
					nlapiLogExecution('DEBUG','Project already exists in Toggl','Please check Toggl.')
					nlapiLogExecution('DEBUG','Script Execution Date/Time:', nlapiDateToString(new Date(), 'datetime'));
				}
			}
		}
	}
	else
	{
		nlapiLogExecution('DEBUG','Number of New Projects:', '0');
		nlapiLogExecution('DEBUG','Script Execution Date/Time:', nlapiDateToString(new Date(), 'datetime'));
		
	}
}


