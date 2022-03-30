/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 May 2016     WORK-rehanlakhani
 *
 */

	var URL;

	function headers()
	{
		var token = "4ec4d7ce56a5f966bc82c2dec55af333:api_token";
		var base64Token = nlapiEncrypt(token, "base64");
	
		var params = {}
			params['Authorization'] = 'Basic ' + base64Token;
			params["contentType"] = "application/json";
					
		return params
	}
	
	function createProject(workspaceID, clients, clientIndex, pID, projectName, time, isBillable)
	{
		var URL = apiPath("Projects");
		var auth = headers();
		var wid = workspaceID;
		var client = clients[clientIndex].split('-');
		var cid = client[0];
		
		var projectData = {};
			projectData["name"] = pID + " " + projectName.toString();
			projectData["wid"] = workspaceID;
			projectData["cid"] = cid;
			projectData["active"] = true;
			projectData["is_private"] = false;
			if(isBillable == "Yes")
			{
				projectData["billable"] = true;
			}
			else
			{
				projectData["billable"] = false;
			}
			
			projectData["estimated_hours"] = time;
			
		var projects = {};
			projects["project"] = projectData;
		
		var response = processPostRequest(URL, projects, auth);
		
		return response;
	}
	
	function getWorkspace(workspaceID)
	{
		var URL = apiPath("Workspace");
		var auth = headers();
		var response = processGetRequest(URL, auth);
		if(response.code == 200)
		{
			var body = JSON.parse(response.body);
			for(var i = 0; i<body.length; i+=1)
			{
				workspaceID = body[i].id;
			}
			
		}
		
		return workspaceID;
	}

	function getClients(clients)
	{	
		var URL = apiPath("Clients");
		var resp = processGetRequest(URL, headers());
		
		if(resp.code == 200)
		{
			var body = JSON.parse(resp.body);
			for (var i = 0; i<body.length; i+=1)
			{
				clients.push(body[i].id + '-' + body[i].name);
			}
		}

		return clients;
	}

	function createClient(companyName, wid)
	{
		 var companyData = {};
		 companyData["name"] = companyName;
		 companyData["wid"] = wid;
		 
		 var data = {};
		 data["client"] = companyData;
		 
		 return data;
	}
	
	function processPostRequest(URL, postdata, headers)
	{
		var response = nlapiRequestURL(URL, JSON.stringify(postdata), headers, null, "POST");
		return response;
	}
	
	function processPutRequest(URL, postdata, headers)
	{
		var response = nlapiRequestURL(URL, postdata, headers, null, "PUT");
		return response;
	}
	
	function processGetRequest(URL, headers)
	{
		var response = nlapiRequestURL(URL, null, headers, null, "GET");
		return response;
	}
	
	function processDeleteRequest(URL, headers)
	{
		var response = nlapiRequestURL(URL, null, headers, null, "DELETE");
		return response;
	}
	
	function apiPath(sequence)
	{
		switch(sequence)
		{
			case "Projects":
				URL = "https://www.toggl.com/api/v8/projects";
				break;
			case "WorkspaceUsers":
				URL = "https://www.toggl.com/api/v8/workspaces/";
				break;
			case "Clients":
				URL = "https://www.toggl.com/api/v8/clients";
				break;
			case "ProjectUsers":
				URL = "https://www.toggl.com/api/v8/project_users";
				break;
			case "NewUser":
				URL = "https://www.toggl.com/api/v8/signups";
				break;
			case "Workspace":
				URL = "https://www.toggl.com/api/v8/workspaces";
				break;
			default:
				break;
		}
		return URL;
	}
	
	function isExists(arr, str)
	{
		var index;
		for(var i = 0; i<arr.length; i+=1)
		{
			var val = arr[i].toString();
			if(val.indexOf(str) > -1)
			{
				index = i;
				break;
			}
			else
			{
				index = -1;
			}
		}
		return index;
	}
