function listOptions(request,response){

	var validRequestList = [" "]

	if(request.getMethod()=='GET' || request.getMethod=='POST'){
		
		var validRequest = isValidRequest(request);
		if(validRequest=="valid"){
			
			var listRequested = request.getParam("list");
			
			switch				
			
	
		}else{
			var responseXML = getErrorXML(validRequest);
			response.write(responseXML);
		}
	}
}

function isValidRequest(request){
	if(request.getParam("list")==null || request.getParam("list"=='')){
		return "No list parameter specified.";
	}
	
	var isValidRequest = false;
	for (var i=0;i<validRequestList.length;i++){
		if(request.getParam("list")==validRequestList[i]){
			isValidRequest = true;
			break;
		}
	}
	
	if(isValidRequest){
		return "valid";
	}else{
		return "Unrecognized list value";	
	}
}


function getErrorXML(text){
	var xml ="";
	xml += "<error>";
	xml += text;
	xml += "</error>";
	return xml;
}
