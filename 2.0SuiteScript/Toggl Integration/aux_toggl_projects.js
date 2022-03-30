/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['/SuiteScripts/Toggl_Utlility', 'N/search', 'N/record', 'N/format'],

function(togglLibrary, search, record, format) {

    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
    	var workspaceID = togglLibrary.getWorkspace(workspaceID);
    	var clients = [];
    		clients = togglLibrary.getClients(clients);
    	var today = new Date();
    	
    	var formattedDateString = format.format({
    		value: today,
    		type: format.Type.DATETIME
    	});

    	var searchFilter = [
    	                    	['status', 'anyof', '2'],
    	                    	"AND",
    	                    	['custentity_aux_toggl_synced', 'is', 'F']
    	                   ];
    	
    	var searchColumns = [
    	                     	search.createColumn({
    	                     		name: 'internalid'
    	                     	}),
    	                     	search.createColumn({
    	                     		name: 'entityid'
    	                     	}), 
    	                     	search.createColumn({
    	                     		name: 'customer'
    	                     	}),
    	                     	search.createColumn({
    	                     		name: 'companyname'
    	                     	}),
    	                     	search.createColumn({
    	                     		name: 'custentity_plannedprojtime'
    	                     	}),
    	                     	search.createColumn({
    	                     		name: 'custentity_isbillable'
    	                     	})
    	                     	
    	                    ];
    	
    	var projectSearch = search.create({
    		type: search.Type.JOB,
    		filters: searchFilter,
    		columns: searchColumns
    	})
    	
    	var projectResultSet = projectSearch.run().getRange({
    		start: 0,
    		end: 1000
    	});
    	
    	if(projectResultSet != null)
		{
	    	for(var i = 0; i < projectResultSet.length; i+=1)
	    	{
	    		var recID       = projectResultSet[i].getValue({name: 'internalid'});
	    		var pID         = projectResultSet[i].getValue({name: 'entityid'});
	    		var client      = projectResultSet[i].getText({name: 'customer'});
	    		var projectName = projectResultSet[i].getValue({name: 'companyname'});
	    		var time        = projectResultSet[i].getValue({name: 'custentity_plannedprojtime'});
	    		var isBillable  = projectResultSet[i].getValue({name: 'custentity_isbillable'});
				var clientIndex = togglLibrary.isExists(clients, client);
				if (clientIndex == -1.0)
				{
					var URL = togglLibrary.apiPath("Clients");
					var auth = togglLibrary.headers();
					var data = togglLibrary.createClient(client, workspaceID);
					var createClientResponse = togglLibrary.processPostRequest(URL, data, auth);
					if(createClientResponse.code == 200)
					{
						var body = JSON.parse(createClientResponse.body);
						clients.push(body.data.id + '-' + body.data.name);
						clientIndex = togglLibrary.isExists(clients, client);
						
						if (clientIndex != -1.0)
						{
							var res = togglLibrary.createProject(workspaceID, clients, clientIndex, pID, projectName, time, isBillable);
							if(res.code == 200)
							{
								var body = JSON.parse(res.body);
								record.submitFields({
									type: record.Type.JOB,
									id: recID,
									values: {
										'custentity_aux_toggl_synced' : 'T'
									}
								});
								log.debug('Synced with Toggl', 'Yes');
								log.debug('Successful Request', JSON.stringify(body.data));
								log.debug('Script Execution Date/Time:', formattedDateString);
							}
							else if(res.code == 400)
							{
								record.submitFields({
									type: record.Type.JOB,
									id: recID,
									values: {
										'custentity_aux_toggl_synced' : 'T'
									}
								});
								log.debug('Project already exists in Toggl','Please check Toggl.')
								log.debug('Script Execution Date/Time:', formattedDateString);
							}
						}
					}
					else
					{
						log.debug('FAILED', 'Client wasnt created successfully');
						log.debug('FAILED', createClientResponse.body);
					}
					
				}
				else
				{
					var res = togglLibrary.createProject(workspaceID, clients, clientIndex, pID, projectName, time, isBillable);
					if(res.code == 200)
					{
						var body = JSON.parse(res.body);
						
						record.submitFields({
							type: record.Type.JOB,
							id: recID,
							values: {
								'custentity_aux_toggl_synced' : 'T'
							}
						});
						log.debug('Synced with Toggl', 'Yes');
						log.debug('Successful Request', JSON.stringify(body.data));
						log.debug('Script Execution Date/Time:', formattedDateString);
					}
					else if(res.code == 400)
					{
						
						log.debug('Project already exists in Toggl','Please check Toggl.')
						log.debug('Script Execution Date/Time:', formattedDateString);
					}
				}
			}
		}
		else
		{
			log.debug('Number of New Projects:', '0');
			log.debug('Script Execution Date/Time:', formattedDateString);
			
		}
    }

    return {
        execute: execute
    };
});
