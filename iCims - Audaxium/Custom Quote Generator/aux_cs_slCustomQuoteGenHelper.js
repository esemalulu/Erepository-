function slPageInit(type){
   
}

function slSaveRecord(){

    return true;
}

function slFieldChanged(type, name, linenum){

	//custpage_effdate
	//custpage_daysfromlist
	//custpage_subsstartdate
	/**
	 * Mod Request: 1/3/2013 - Client wishes to simply display 30, 60, 90 days text. NO Calculation
	if (name == 'custpage_effdate' || name == 'custpage_daysfromlist') {
		//when effective date and daysFrom is set AND subs date is empty
		if (nlapiGetFieldValue('custpage_effdate') && 
			nlapiGetFieldValue('custpage_daysfromlist') && 
			!nlapiGetFieldValue('custpage_subsstartdate')) {
			
			var effDateObj = new Date(nlapiGetFieldValue('custpage_effdate'));
			var newEffDate = nlapiAddDays(effDateObj, nlapiGetFieldValue('custpage_daysfromlist'));
			var strNewEffDate = (newEffDate.getMonth()+1)+'/'+newEffDate.getDate()+'/'+newEffDate.getFullYear();
			nlapiSetFieldValue('custpage_subsstartdate', strNewEffDate);
			
		}
	}
	 */
	
	if (name == 'custpage_daysfromlist') {
		//when effective date and daysFrom is set AND subs date is empty
		if (nlapiGetFieldValue('custpage_daysfromlist') && !nlapiGetFieldValue('custpage_subsstartdate')) {
			/**
			var effDateObj = new Date(nlapiGetFieldValue('custpage_effdate'));
			var newEffDate = nlapiAddDays(effDateObj, nlapiGetFieldValue('custpage_daysfromlist'));
			var strNewEffDate = (newEffDate.getMonth()+1)+'/'+newEffDate.getDate()+'/'+newEffDate.getFullYear();
			nlapiSetFieldValue('custpage_subsstartdate', strNewEffDate);
			*/
			//custpage_subsstartdate
			var subStartDateText = nlapiGetFieldValue('custpage_daysfromlist')+' days from Effective Date';
			nlapiSetFieldValue('custpage_subsstartdate', subStartDateText);
		}
	}
	
	//custpage_termexpdatetext
	// value: 'Prices are good through '+strContractExpDate
	//custpage_termexpdatemod
	if (name == 'custpage_termexpdatemod') {
		//rebuild value of term expiration date text
		var expDateObj = new Date(nlapiGetFieldValue(name));
		var newExpDate = nlapiAddDays(expDateObj, 30);
		var strExpDate = (newExpDate.getMonth()+1)+'/'+newExpDate.getDate()+'/'+newExpDate.getFullYear();
		nlapiSetFieldValue('custpage_termexpdatetext', 'Prices are good through '+strExpDate);
	}
	 
}

function closeWindow() {
	//alert(window.opener.location);
	window.opener.location.reload();
	
	window.close();
}