// noinspection JSVoidFunctionReturnValueUsed

/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Jun 2014     rohitjalisatgi
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	//var filters = new Array();
	//filters[0] = new nlobjSearchFilter( 'isbasecurrency', null, 'anyof', 'T' );
	
	// Define search columns
	//var columns = new Array();
	//columns[0] = new nlobjSearchColumn( 'symbol' );
	//columns[1] = new nlobjSearchColumn( 'total' );
	
	var allCurr = new Array();
	var baseCurr = new Array();
	var baseCurrCounter = 0;
	var currCount = 0;
	var baseCurrCount = 0;
	var rateDate;
	//var rate = 0;

	var now = new Date;
    var todayutc = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate() , 
      now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
    var today = new Date(todayutc);


	//get today's date in the format yyyy-mm-dd
	var yyyy = today.getFullYear().toString();                                    
    var mm = (today.getMonth()+1).toString(); // getMonth() is zero-based         
    var dd  = today.getDate().toString();  
    var hr = today.getHours().toString();
    var mn = today.getMinutes().toString();
    var ss = today.getSeconds().toString();
    var offset = 7;

    if (nlapiGetContext().getSetting('SCRIPT' , 'custscript_fxrates_utcoffset'))
    	offset = nlapiGetContext().getSetting('SCRIPT' , 'custscript_fxrates_utcoffset');
    offset = offset.toString();
    
    rateDate = yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]) + "T" + 
               (hr[1]?hr:"0"+hr[0]) + ":" + (mn[1]?mn:"0"+mn[0]) + ":" + (ss[1]?ss:"0"+ss[0]) + "-" + (offset[1]?offset:"0"+offset[0]) + ":00";
    
	
	nlapiLogExecution('DEBUG', 'Timestamp = ', rateDate);

	var envType = nlapiGetContext().getEnvironment() === 'PRODUCTION' ? 'prod' : 'sb';
	nlapiLogExecution('DEBUG', 'envType = ', envType);

	var coupaURL = nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_oidc_client_url_' + envType);

	// set up headers
	var headers = getAPIHeader('text/xml');

	// set up URL
	var url = coupaURL + "/api/exchange_rates";
	
	var searchresults = nlapiSearchRecord( 'currency', null, null);
	
	if (searchresults)
		{
		currCount = searchresults.length;
		for (var i = 0; i < currCount ; i++)
			{
			//nlapiLogExecution('DEBUG', 'Search results','Record Type = ' + searchresults[i].getRecordType() + ' Id = ' + searchresults[i].getId());
			
			
			var curr = nlapiLoadRecord('currency',searchresults[i].getId() );
            
			//nlapiLogExecution('DEBUG', 'Currency Info','Currency Code = ' + curr.getFieldValue('symbol') + ' IsBaseCurrency ' + curr.getFieldValue('isbasecurrency'));
			if (curr.getFieldValue('isbasecurrency') == 'T')
				{
				baseCurr[baseCurrCounter] = curr.getFieldValue('symbol');
				baseCurrCounter = baseCurrCounter + 1;
				}
			allCurr[i] = curr.getFieldValue('symbol');
			}
		
		baseCurrCount = baseCurrCounter;
		
		//nlapiLogExecution('DEBUG', 'Currency Counters','Base Currency Counter = ' + baseCurrCount
				                                    //  + ' Currency Counter = ' + currCount);
		
		for (var i = 0; i < baseCurrCount ; i++)
			{
			
			for (var j = 0; j < currCount ; j++)
				{
				//nlapiLogExecution('DEBUG', 'Currency FX Conversion','Converting from Base = ' + baseCurr[i]  + ' Currency To = ' + allCurr[j]);
					try 
					{

					if (baseCurr[i] != allCurr[j])
						{
						//var rate = nlapiExchangeRate(baseCurr[i],allCurr[j]);
						var rate = nlapiExchangeRate(allCurr[j],baseCurr[i]);
						nlapiLogExecution('DEBUG', 'Currency FX Conversion','Converting from Base = ' + baseCurr[i]  
												+ ' Currency To = ' + allCurr[j]
					                            + ' FxRate = ' + rate
					                            + ' Ratedate = ' + rateDate);

						var postData = "<?xml version='1.0' encoding='UTF-8'?>" +
						"<exchange-rate><from-currency>" +"<code>" + allCurr[j] + "</code>" +"</from-currency><to-currency>" +
						 "<code>" + baseCurr[i]+ "</code>" +"</to-currency>" +"<rate type='decimal'>" + rate + "</rate>" +
						 "<rate-date type='datetime'>" + rateDate  + "</rate-date>" +"</exchange-rate>";

						 
                   		var response = nlapiRequestURL(url, postData, headers);
                   		if (response.getCode() == '201' || response.getCode() == '200' )
                   			{
                   				nlapiLogExecution('AUDIT', 'Successfully loaded FX Rate','Converting from Base = ' + baseCurr[i]  
												+ ' Currency To = ' + allCurr[j]
					                            + ' FxRate = ' + rate
					                            + ' Ratedate = ' + rateDate);	
                   			}
                   		
                   		else
                   			{
                                nlapiLogExecution('ERROR', 'Error loading FX Rate','Converting from Base = ' + baseCurr[i]  
												+ ' Currency To = ' + allCurr[j]
					                            + ' FxRate = ' + rate
					                            + ' Ratedate = ' + rateDate);	
                                nlapiSendEmail(106223954,nlapiGetContext().getSetting('SCRIPT' , 'custscript_fxrates_erroremailnotify'), 
                                                                     nlapiGetContext().getSetting('SCRIPT' , 'custscript_fxrates_accountname') + ' - Error loading FxRate in Coupa',
                                                                     ' Converting from Base = ' + baseCurr[i]  +
                                                                     ' Currency To = ' + allCurr[j] +
                                                                     ' FxRate = ' + rate +
                                                                     ' Ratedate = ' + rateDate +
                                                                     ' Response Error Code:' + response.getCode());
                   			}
					
						} // end of if (baseCurr[i] != allCurr[j])
					} // end of try block
					catch (e)
					{
                     nlapiLogExecution('ERROR', 'Error loading FX Rate','Converting from Base = ' + baseCurr[i]  
												+ ' Currency To = ' + allCurr[j]
					                            + ' FxRate = ' + rate
					                            + ' Ratedate = ' + rateDate);	
                                nlapiSendEmail(106223954,nlapiGetContext().getSetting('SCRIPT' , 'custscript_fxrates_erroremailnotify'), 
                                                                     nlapiGetContext().getSetting('SCRIPT' , 'custscript_fxrates_accountname') + ' - Error loading FxRate in Coupa',
                                                                     ' Converting from Base = ' + baseCurr[i]  +
                                                                     ' Currency To = ' + allCurr[j] +
                                                                     ' FxRate = ' + rate +
                                                                     ' Ratedate = ' + rateDate +
                                                                     ' Error Message' + e.message);
					} // end of catch block
				} // end of for (var j = 0; j < currCount ; j++)
			}
		}

}
