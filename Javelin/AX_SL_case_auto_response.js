/**
* Version    Date            Author           		Remarks
* 1.00       13 Apr 2016     elijah@audaxium.com
*
* Script is designed to allow the Customer to Open and Close thier case via an email they recieve
* Script file house two Functions for the following two Suitlets:
* "AUX-SL-CLOSE Cases via Email Link" & "AUX-SL-OPEN Cases via Email Link"
* 
* (Sept 2016 Reviewing to merge the above mentioned Suitelets in one file)
*/	


function closeCasesViaLink(request, response) 
{
		var paramRecordId = request.getParameter('caseid');
		var rec = nlapiLoadRecord('supportcase', paramRecordId );
		var csStatus = rec.getFieldText('status');
			
	if(rec.getFieldValue('status') == '5') // 5 = Resolved
	{		
		var html = ' <html><body ><div align="center"; width="100%" style="margin-top: -8px; background-color: #D5EAEF;"  > '
			html = html + ' <img src="http://www.javelin-tech.com/solution/images/logo/javelin_sml.gif" alt="Javelin" border="0"> ';
			html = html + ' <p style="font-size: 115%;  font-family: Helvetica,Arial,sans-serif; color:#244884;">CALL TOLL FREE <strong>1-877-219-6757</strong></p> <p><a href="http://www.javelin-tech.com/" style="text-shadow: none; text-transform: uppercase; font-family:sans-serif; margin-left: 10px;">Visit Our Website</a></p></div>';	
							
			html = html + ' <div align="center"; width="100%"><br/><h1 style="font-family: Helvetica,Arial,sans-serif; color:#244884;">Your case is alread CLOSED-RESOLVED status</h1><br/>';
			html = html + ' <p align="center"; style="font-family: Helvetica,Arial,sans-serif; font-size: 150%; color:grey;">If this was made in error, you may re-open the case by using the link in the reminder email you received </p>';		
			html = html + ' </div></body></html>' ; 
			response.write(html);		
	}
	else
	{
			nlapiSubmitField('supportcase', paramRecordId , 'status', '5' ); //Resolved					
			response.write('<script type="text/javascript">setTimeout(function(){window.location="http://www.javelin-tech.com/solution/success/service/case-closed.htm", 5;}); </script>');																		
	}
					 	

}

function openCasesViaLink(request, response) 
{
	var paramRecordId = request.getParameter('caseid');
	var rec = nlapiLoadRecord('supportcase', paramRecordId );
	var csStatus = rec.getFieldText('status');
		
	if(rec.getFieldValue('status') == '5') //5=Resolved
	{		
			nlapiSubmitField('supportcase', paramRecordId , 'status', '2' ); //2=Work in Progress						
			response.write('<script type="text/javascript">setTimeout(function(){window.location="http://www.javelin-tech.com/main/support/report_problem_success.htm?whence=", 5;}); </script>');				
	}
	else 
	{
		var html = ' <html><body ><div align="center"; width="100%" style="margin-top: -8px; background-color: #D5EAEF;"  > '
			html = html + ' <img src="http://www.javelin-tech.com/solution/images/logo/javelin_sml.gif" alt="Javelin" border="0"> ';
			html = html + ' <p style="font-size: 115%;  font-family: Helvetica,Arial,sans-serif; color:#244884;">CALL TOLL FREE <strong>1-877-219-6757</strong></p> <p><a href="http://www.javelin-tech.com/" style="text-shadow: none; text-transform: uppercase; font-family:sans-serif; margin-left: 10px;">Visit Our Website</a></p></div>';	
							
			html = html + '<div align="center"; width="100%" ><br/><h1 style="font-family: Helvetica,Arial,sans-serif; color:#244884;">Your case is currently in an a "'+csStatus+'" status</h1><br/>';
			html = html + ' <p align="center"; style="font-family: Helvetica,Arial,sans-serif; font-size: 150%; color:grey;">If this was made in error, you may close the case by using the link in the reminder email you received </p>';			
			html = html + ' </div><</table></body></html>' ; 
			response.write(html);		
		
	}	
}