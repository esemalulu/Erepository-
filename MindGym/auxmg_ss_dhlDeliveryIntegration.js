/**
 * 
 */

//TEST for DHL
//Script Level Preference Value
/**
 * var acctPass = 'DLUntOcJma'; 
 * var acctSiteId = 'CIMGBTest';
 * var dhlEndPoint = 'https://xmlpitest-ea.dhl.com/XMLShippingServlet';
 */

//PRODUCTION for DHL
//Script Level Preference Value
/**
 * var acctPass = 'XX'; 
 * var acctSiteId = 'XX';
 * var dhlEndPoint = 'https://xmlpitest-ea.dhl.com/XMLShippingServlet';
 */


var dhlStatusMap={
	'AD':'19', //Scheduled for delivery as agreed
	'AF':'1', //Arrived at DHL facility in
	'AR':'1', //Arrived at DHL facility in
	'BA':'18', //Address Information needed; contact DHL
	'BN':'19', //Broker notified to arrange for clearance
	'BR':'3', //Delivered to broker as requested
	'CA':'18', //Delivery attempted premises closed
	'CC':'19', //Awaiting pickup by recipient as requested
	'CD':'2', //Clearance delay
	'CM':'18', //Recipient moved
	'CR':'19', //Clearance processing complete at
	'CS':'18', //Please contact DHL
	'DD':'3', //Shipment delivered
	'DF':'1', //Departed from DHL facility in
	'DS':'19', //Shipper contacted
	'FD':'19', //On forwarding status update
	'HP':'2', //Available on payment by recipient
	'IC':'19', //Processed for clearance at
	'MC':'1', //Shipment Arrived at wrong facility. Sent to correct destination
	'MD':'19', //Scheduled for delivery
	'MS':'1', //Shipment arrived at wrong facility. Sent to correct destination
	'NH':'18', //Delivery attempted; recipient not home
	'OH':'2', //Shipment on hold
	'OK':'3', //Shipment delivered
	'PD':'19', //Partial delivery
	'PL':'19', //Processed at Location
	'RR':'19', //Cutomer Status Updated
	'PU':'1', //Shipment picked up
	'RD':'18', //Recipient refused delivery
	'RT':'18', //Returned to shipper
	'SA':'19', //Shipment Acknowledged
	'SC':'18', //The requested service for your shipment has been changed; for assistance please contact DHL
	'SS':'18', //Please contact DHL
	'TP':'19', //Delivery arranged, no details expected
	'TR':'1', //Transferred through
	'UD':'2', //Clearance delay
	'WC':'1' //With delivery courier
};

function dhlDelStatusChecker()
{
	var paramJson = {
		'acctSiteId':nlapiGetContext().getSetting('SCRIPT', 'custscript_396_dhlid'),
		'acctPass':nlapiGetContext().getSetting('SCRIPT', 'custscript_396_dhlpass'),
		'endPoint':nlapiGetContext().getSetting('SCRIPT', 'custscript_396_dhlendpoint'),
	};
	
	// This is not required so grab it separately
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_396_lastprocid');
	
	// if any of the parameters are missing, return error
	for (var params in paramJson)
	{
		if (!paramJson[params])
		{
			throw nlapiCreateError('DHL-ERR', 'Missing '+params+' as parameter to process DHL Integration', false);
		}
	}
	
	//Process error
	var errorText = '';
	
	try 
	{
		log('debug','param values',JSON.stringify(paramJson));
	
		//9/14/2015
		//Found out that DHL only provides data up to 90 days.
		//Script is looking for Booking record with Booking/Pack Ship Date with 90 days from Today.
		//	 This also means that it will ONLY process booking records WITH Booking/Pack Ship Date filled in
		
		var DayFilter90 = '{today}-{custentity_bo_packshippingdate}';
		var DayFilter90Obj = new nlobjSearchFilter('formulanumeric', null, 'lessthanorequalto', '90');
		DayFilter90Obj.setFormula(DayFilter90);
		
		var dhlbookflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		                  new nlobjSearchFilter('custentity_bo_packtracking_url2', null, 'is','dhl'),
		                  new nlobjSearchFilter('custentity_bo_packtracking', null, 'isnotempty',''),
		                  new nlobjSearchFilter('custentity_bo_packshippingdate', null, 'isnotempty',''),
		                  DayFilter90Obj,
		                  // 3 = Shipping - Delivered
		                  new nlobjSearchFilter('custentity_bo_packstatus', null, 'noneof',['3'])];
		
		if (paramLastProcId)
		{
			dhlbookflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
			log('audit','Rescheduled','starting at '+paramLastProcId);
		}
		
		var dhlbookcol = [new nlobjSearchColumn('internalid').setSort(true),
		                  new nlobjSearchColumn('entityid'),
		                  new nlobjSearchColumn('altname'),
		                  new nlobjSearchColumn('custentity_bo_packtracking')];
		
		var dhlrs = nlapiSearchRecord('job', null, dhlbookflt, dhlbookcol);
		
		for (var i=0; dhlrs && i < dhlrs.length; i+=1)
		{
			
			var pkgJson = {
				'success':true,
				'errormsg':'',
				'bookingid':dhlrs[i].getValue('internalid'),
				'entityid':dhlrs[i].getValue('entityid'),
				'pkgTrackNum':dhlrs[i].getValue('custentity_bo_packtracking'),
				'pkgDhlCode':'',
				'pkgDhlDesc':'',
				'pkgDhlTimestamp':'',
				'pkgNSCode':''
			};
			
			//log('debug','Tracking Number', pkgJson.pkgTrackNum);
			
			try
			{
				
				//Message Date format: ISO standard format works
				//Message Reference: Must be atleast 28 characters long
				//	[Booking Internal ID]-[msgDate MilSec]-[TrackingNumber]
				var msgDate = new Date();
				var msgRef = pkgJson.bookingid+
							 '-'+
							 msgDate.getTime()+
							 '-'+
							 pkgJson.pkgTrackNum;
				var msgDateIso = msgDate.toISOString();
				
				var tracSoap = '<?xml version="1.0" encoding="UTF-8"?>'+
							   '<req:KnownTrackingRequest xmlns:req="http://www.dhl.com" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '+
							   		'xsi:schemaLocation="http://www.dhl.com '+
							   		'TrackingRequestKnown.xsd">'+
							   		'<Request>'+
							   			'<ServiceHeader>'+
							   				'<MessageTime>'+msgDateIso+'</MessageTime>'+
							   				'<MessageReference>'+msgRef+'</MessageReference>'+
							   				'<SiteID>'+paramJson.acctSiteId+'</SiteID>'+
							   				'<Password>'+paramJson.acctPass+'</Password>'+
							   			'</ServiceHeader>'+
							   		'</Request>'+
							   		'<LanguageCode>en</LanguageCode>'+
							   		'<AWBNumber>'+pkgJson.pkgTrackNum+'</AWBNumber>'+
							   		'<LevelOfDetails>LAST_CHECK_POINT_ONLY</LevelOfDetails>'+
							   	'</req:KnownTrackingRequest>';
				
				//LAST_CHECK_POINT_ONLY
				//ALL_CHECK_POINTS
				
				//log('debug','DHL Request XML',tracSoap);
				
				//paramJson.endPoint
				var dhlres = nlapiRequestURL(paramJson.endPoint, tracSoap);
				
				//log('debug','dhlres code',dhlres.getCode()+' // '+dhlres.getBody());
				
				var resxml = nlapiStringToXML(dhlres.getBody());

				//log('debug','TESTING','------- '+pkgJson.pkgTrackNum+' -----------------------')
				
				if (nlapiSelectValue(resxml, '//req:ShipmentTrackingErrorResponse/Response/Status/ActionStatus'))
				{
					//log('error','Error processing DHL Request',nlapiSelectValue(resxml, '//req:ShipmentTrackingErrorResponse/Response/Status/Condition/ConditionData'));
					pkgJson.success = false;
					pkgJson.errormsg = nlapiSelectValue(resxml, '//req:ShipmentTrackingErrorResponse/Response/Status/Condition/ConditionData');
					pkgJson.pkgNSCode = '18';
				}
				else if (nlapiSelectValue(resxml, '//req:TrackingResponse/AWBInfo/Status/ActionStatus') == 'No Shipments Found')
				{
					//log('error','Error Looking up DHL Tracking Number', 'No Shipments Found: '+nlapiSelectValue(resxml, '//req:TrackingResponse/AWBInfo/Status/Condition/ConditionData'));
					pkgJson.success = false;
					pkgJson.errormsg = 'No Shipments Found: '+nlapiSelectValue(resxml, '//req:TrackingResponse/AWBInfo/Status/Condition/ConditionData');
					pkgJson.pkgNSCode = '18';
				} 
				else if (nlapiSelectValue(resxml, '//req:TrackingResponse/AWBInfo/Status/ActionStatus') == 'success')
				{
					var shipmentStatus = nlapiSelectValue(resxml, '//req:TrackingResponse/AWBInfo/ShipmentInfo/ShipmentEvent/ServiceEvent/EventCode');
					var shipmentDesc = nlapiSelectValue(resxml, '//req:TrackingResponse/AWBInfo/ShipmentInfo/ShipmentEvent/ServiceEvent/Description');
					var shipmentTimestamp = nlapiSelectValue(resxml, '//req:TrackingResponse/AWBInfo/ShipmentInfo/ShipmentEvent/Date')+
											' '+
											nlapiSelectValue(resxml, '//req:TrackingResponse/AWBInfo/ShipmentInfo/ShipmentEvent/Time');
					
					pkgJson.success = true;
					pkgJson.pkgDhlCode = shipmentStatus;
					pkgJson.pkgDhlDesc = shipmentDesc;
					pkgJson.pkgDhlTimestamp = shipmentTimestamp;
					pkgJson.pkgNSCode = dhlStatusMap[pkgJson.pkgDhlCode];
					
					//log('debug','Success',shipmentStatus+' // '+shipmentDesc+' // '+shipmentTimestamp+' //NS CODE: '+dhlStatusMap[pkgJson.pkgDhlCode]);
					if (pkgJson.pkgNSCode == '3')
					{
						//Add Signatory if completed
						var signedBy = nlapiSelectValue(resxml, '//req:TrackingResponse/AWBInfo/ShipmentInfo/ShipmentEvent/Signatory');
						if (signedBy)
						{
							pkgJson.pkgDhlDesc = shipmentDesc+' '+signedBy;
						}
						//log('debug','dhlres code','Signed BY: '+signedBy+' // '+dhlres.getCode()+' // '+dhlres.getBody());
					}
					
				} else {
					log('error','Unexpected Response',nlapiSelectValue(resxml, '//req:TrackingResponse/AWBInfo/Status/ActionStatus'));
				}
				
				//log('debug','TESTING','-----------------------------------------------------');
			}
			catch (chkerr)
			{
				pkgJson.success = false;
				pkgJson.errormsg = getErrText(chkerr);
				pkgJson.pkgNSCode = '18';
				log('error','Error','Error processing booking id '+pkgJson.bookingid+' // '+getErrText(chkerr));
				
				errorText += '<li>'+
							 pkgJson.entityid+' ('+
							 pkgJson.bookingid+') Tracking #: '+pkgJson.pkgTrackNum+':<br/>'+
							 pkgJson.errormsg+
							 '</li>';
			}
			
			//Update the 
			var updfld = ['custentity_bo_packstatus',
			              'custentity_bo_packdeliverydate',
			              'custentity_bo_packdeliverydetails'];
			var delDate = '';
			
			
			//For DHL Delivery Timestamp format is YYYY-MM-DD HH24:MM:SS
			//ONLY when status is set as Delivered
			if (pkgJson.pkgDhlTimestamp && pkgJson.pkgDhlTimestamp.indexOf('-') && pkgJson.pkgNSCode == '3')
			{
				delDate = pkgJson.pkgDhlTimestamp.split(' ')[0];
				var delDateElements = delDate.split('-');
				delDate = new Date(delDateElements[1]+'/'+delDateElements[2]+'/'+delDateElements[0]);
				delDate = nlapiDateToString(delDate);
			}
			
			var delDetail = 'DHL Sync Status: '+
						    'Code/Description: '+pkgJson.pkgDhlCode+'/'+pkgJson.pkgDhlDesc+' ||'+
						    'Event Timestamp: '+pkgJson.pkgDhlTimestamp;
			
			if (!pkgJson.success)
			{
				delDetail += '||'+
							 'Sync Error: '+pkgJson.errormsg;
			}
			
			var updval = [pkgJson.pkgNSCode,
			              delDate,
			              delDetail];
			
			nlapiSubmitField('job', pkgJson.bookingid, updfld, updval, false);
			
			log('debug','pkgJson',JSON.stringify(pkgJson));
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / dhlrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
						
			if ((i+1)==1000 || ((i+1) < dhlrs.length && nlapiGetContext().getRemainingUsage() < 100)) 
			{
				//reschedule
				log('audit','Getting Rescheduled at', pkgJson.bookingid);
				var rparam = new Object();
				rparam['custscript_396_lastprocid'] = pkgJson.bookingid;
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}	
			
		}
		
	}
	catch (procerr)
	{
		log('error','DHL Process Error','Process Date: '+nlapiDateToString(new Date())+' // '+getErrText(procerr));
		
		errorText += '<li>Unexpected Error: '+getErrText(procerr)+'</li>';
		
	}
	
	//Generate Email
	if (errorText)
	{
		errorText = '<ul>'+errorText+'</ul>';
		
		nlapiSendEmail(-5,'mindgym@audaxium.com','DHL Status Sync Error',errorText);
	}
}

/******************* Debugger *****************/
//Run Search to revert
var ss = nlapiSearchRecord(null,'customsearch3289');
for (var i=0; ss && i < ss.length; i+=1)
{
	var ojson={
		'Shipping - Transit':'1',
		'Shipping - Delayed':'2',
		'Shipping - In Progress':'19'
	};
	
	var updText = ss[i].getValue('oldvalue','systemNotes');
	alert(ss[i].getValue('internalid')+' // '+updText+' // '+ojson[updText]);
	var upd = ['custentity_bo_packstatus','custentity_bo_packdeliverydetails'];
	var val = [ojson[updText], ''];
	
	//nlapiSubmitField('job', ss[i].getValue('internalid'), upd, val);
}
