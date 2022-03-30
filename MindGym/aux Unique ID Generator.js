 /**
 * Generic Script for Bookings, Training Programme and Programme User records that will generate a uniqueID
 * 
 * Version    Date            Author           			Remarks
 * 1.00       05 Apr 2016     elijah@audaxium.com
 *
 * Updating to Do while loop? .....
 */
 

function generateUniqueId(type)
{	

	if (type == 'create'  )
	{
		
		var recType = nlapiGetRecordType();
		var recId = nlapiGetRecordId();	
		var rec = nlapiLoadRecord(recType, recId);		
					
		var text = "";
		var possible = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
			
		for( var i=0; i < 10; i++ )
		{			
		text += possible.charAt(Math.floor(Math.random() * possible.length));	
		//return text; 		
		}
	
									
		try
		{           		 
			if(recType == 'job')
			{			
				var bookingSecureId = 'B'+text;
						
				var filters = new Array();
				filters[0] = new nlobjSearchFilter( 'custentity_aux_secure_id', null, 'is', bookingSecureId );
				var columns = new Array();
				columns[0] = new nlobjSearchColumn('internalid');
				var searchresults = nlapiSearchRecord( 'job', null, filters, columns );
				
				if(!searchresults)
				{
					try
					{
						nlapiSubmitField(recType, recId , 'custentity_aux_secure_id', bookingSecureId );	
					}
					catch(joberr)
					{
						log('ERROR','Error Generating Unique ID ('+recType+':'+recId+')', getErrText(joberr));	
					}				 	
				}
				else
				{	
					var sbj = 'Duplicate ID Created';
					var msg = 'Duplicate ID ('+bookingSecureId+') has been genterated for Booking record w/ Internal ID : '+recId;				  
					nlapiSendEmail(-5, 'elijah@audaxium.com', sbj, msg);							
				}
			}

	
											
			if(recType == 'customrecord_trainingprogramme')
			{	
				var trainingProgId = 'P'+text;		
		
				var filters = new Array();
				filters[0] = new nlobjSearchFilter( 'custrecord_tp_secure_id', null, 'is', trainingProgId);
				var columns = new Array();
				columns[0] = new nlobjSearchColumn('internalid');
				var searchresults = nlapiSearchRecord( 'customrecord_trainingprogramme', null, filters, columns );
				
				if(!searchresults)
				{	
					try
					{
						nlapiSubmitField(recType, recId , 'custrecord_tp_secure_id', trainingProgId); 	
					}
					catch(trainprogerr)
					{
						log('ERROR','Error Generating Unique ID ('+recType+':'+recId+')', getErrText(trainprogerr));		
					}					
				}
				else
				{	
					var sbj = 'Duplicate ID Created';
					var msg = 'Duplicate ID ('+trainingProgId+') has been genterated for Training Programme record w/ Internal ID : '+recId;					  
					nlapiSendEmail(-5, 'elijah@audaxium.com', sbj, msg);							
				}				
			}
						


						
			if(recType == 'customrecord_programme_user')
			{			
				var trainingUserId = 'PU'+text;
		
				var filters = new Array();
				filters[0] = new nlobjSearchFilter( 'custrecord_prguser_secure_id', null, 'is', trainingUserId);
				var columns = new Array();
				columns[0] = new nlobjSearchColumn('internalid');
				var searchresults = nlapiSearchRecord( 'customrecord_programme_user', null, filters, columns );
				
				if(!searchresults )
				{	
					try
					{
						nlapiSubmitField(recType, recId , 'custrecord_prguser_secure_id', trainingUserId ); 	
					}
					catch(proguseerr)
					{
						log('ERROR','Error Generating Unique ID ('+recType+':'+recType+')', getErrText(proguseerr));		
					}
				}
				else
				{	
					var sbj = 'Duplicate ID Created';
					var msg = 'Duplicate ID ('+trainingUserId+') has been genterated for Programme User record w/  Internal ID : '+recId;					  
					nlapiSendEmail(-5, 'elijah@audaxium.com', sbj, msg);							
				}				
											
			}
			
								
		}
		catch (scripterr) 
		{
			log('ERROR','Error Generating Unique ID Script', getErrText(scripterr));							
		}					
	}
		
}