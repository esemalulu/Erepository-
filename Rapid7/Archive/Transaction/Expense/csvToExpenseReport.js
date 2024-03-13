function doTheMagic(){
	
	
	file = nlapiLoadFile(25200);
	contents = file.getValue();
	nlapiLogExecution('DEBUG','Some contents', contents);
	var lines=contents.split("\n");
	if(lines!=null){
		nlapiLogExecution('DEBUG', 'Length of Array',lines.length);
		
		for(var i=0;i<lines.length;i++){
			
			var entries = lines[i].split(",");
			if(entries!=null){
				nlapiLogExecution('DEBUG','Length of entries',entries.length);
				var debug ='';
				for(var j=0;j<entries.length;j++){
					debug += entries[j] + " ";
				}
				nlapiLogExecution('DEBUG', 'Entry', debug);
			}
		}
	}
	response.sendRedirect('TASKLINK','LIST_TRAN_EXPREPT');
}