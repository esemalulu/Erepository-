/**
 * @param {nlobjreq} req req object
 * @param {nlobjres} res res object
 * @returns {Void} Any output is written via res object
 */

function htmlSuitelet(req, res) 
{

		var recId = request.getParameter('recid'),
			instnce = request.getParameter('instnce');

		var rec = nlapiLoadRecord('customrecord_adx_installationsurvey', recId),
			instalDate = rec.getFieldValue('custrecord_adx_installdateref');
            
        if(!instalDate){
            instalDate = '';
        }

		var contactName = '',
			contactTitle = '',
			isDeliverd = '',
			securedAccess = '',
			indoorTble = '',
			outdoorTble = '',
			confirmDate = '',
			preinstallNotes = '';
						
			
		var contactName2 = '',
			contactTitle2 = '',
			installComplete = '',
			installIssues = '',
			workProperly = '',
			installSatisfied = '',
			chargintTrack = '',
			keys = '',		
			startingUnit = '',
			guidedAccess = '',
			planogram = '',
			postinstallNotes = '';	


		var contactName3 = '',
			contactTitle3 = '',
			currentlyUsing = '',
			cytHours = '',
			envisionUsing = '',
			averageOrders = '',
			customerIssues = '',
			issuesClearing = '',		
			typeClearer = '',
			consistentlyCharged = '',
			tbleTrackeQues = '',
			adequtelyTrained = '',
			overalRate = '',
			postqltyComment = '';	
			

	   if (req.getMethod() == 'POST')
	   {

		if( request.getParameter('instnce') == '1'){
			
			contactName = request.getParameter("contactName");
			contactTitle = request.getParameter("contactTitle");
			isDeliverd = request.getParameter("isDeliverd");	
			securedAccess = request.getParameter("securedAccess");
			indoorTble = request.getParameter("indoorTble");
			outdoorTble = request.getParameter("outdoorTble");
			confirmDate = request.getParameter("confirmDate");
			preinstallNotes = request.getParameter("preinstallNotes");

			rec.setFieldValue('custrecord_installsrv_contact', contactName);
			rec.setFieldValue('custrecord9', contactTitle);
			rec.setFieldValue('custrecord_installsrv_delivery', isDeliverd);
			rec.setFieldValue('custrecord_installsrv_team', securedAccess);
			rec.setFieldValue('custrecord_installsrv_tables', indoorTble);
			rec.setFieldValue('custrecord_installsrv_outdoortbls', outdoorTble);
			rec.setFieldValue('custrecord_installsrv_installdate', confirmDate);
			rec.setFieldValue('custrecord_installsrv_prenotes', preinstallNotes);						
		}
   
   		if( request.getParameter('instnce') == '2'){
			
			contactName2 = request.getParameter("contactName2");
			contactTitle2 = request.getParameter("contactTitle2");
			installComplete = request.getParameter("installComplete");	
			installIssues = request.getParameter("installIssues");
			workProperly = request.getParameter("workProperly");
			installSatisfied = request.getParameter("installSatisfied");			
			chargintTrack = request.getParameter("chargintTrack");
			keys = request.getParameter("keys");			
			startingUnit = request.getParameter("startingUnit");
			guidedAccess = request.getParameter("guidedAccess");
			planogram = request.getParameter("planogram");			
			postinstallNotes = request.getParameter("postinstallNotes");		
							
			rec.setFieldValue('custrecord_installsrv_postcontact', contactName2);
			rec.setFieldValue('custrecord10', contactTitle2);
			rec.setFieldValue('custrecord_installsrv_installcomplete', installComplete);
			rec.setFieldValue('custrecord_installsrv_issues', installIssues);
			rec.setFieldValue('custrecord_installsrv_working', workProperly);
			rec.setFieldValue('custrecord_installsrv_ratesat', installSatisfied);
			rec.setFieldValue('custrecord_installsrv_chrgtrack', chargintTrack);
			rec.setFieldValue('custrecord_installsrv_keys', keys);
			rec.setFieldValue('custrecord_installsrv_strtunit', startingUnit);
			rec.setFieldValue('custrecord_installsrv_guideaccess', guidedAccess);
			rec.setFieldValue('custrecord_installsrv_remindplano', planogram);
			rec.setFieldValue('custrecord_installsrv_comment', postinstallNotes);
			
		}

   		if( request.getParameter('instnce') == '3'){
			
			contactName3 = request.getParameter("contactName3");
			contactTitle3 = request.getParameter("contactTitle3");
			currentlyUsing = request.getParameter("currentlyUsing");	
			cytHours = request.getParameter("cytHours");
			envisionUsing = request.getParameter("envisionUsing");
			averageOrders = request.getParameter("averageOrders");			
			customerIssues = request.getParameter("customerIssues");
			issuesClearing = request.getParameter("issuesClearing");			
			typeClearer = request.getParameter("typeClearer");
			consistentlyCharged = request.getParameter("consistentlyCharged");
			tbleTrackeQues = request.getParameter("tbleTrackeQues");			
			adequtelyTrained = request.getParameter("adequtelyTrained");						
			overalRate = request.getParameter("overalRate");			
			postqltyComment = request.getParameter("postqltyComment");					
			
			rec.setFieldValue('custrecord_installsrv_postqltycontact', contactName3);
			rec.setFieldValue('custrecord11', contactTitle3);
			rec.setFieldValue('custrecord_installsrv_using', currentlyUsing);
			//rec.setFieldValue('custrecord_installsrv_cythours', cytHours);
			//rec.setFieldValue('custrecord12', envisionUsing);
			rec.setFieldValue('custrecord_installsrv_average', averageOrders);
			rec.setFieldValue('custrecord_installsrv_custissues', customerIssues);
			rec.setFieldValue('custrecord_installsrv_clearingissues', issuesClearing);
			rec.setFieldValue('custrecord_installsrv_typeclearer', typeClearer);
			rec.setFieldValue('custrecord_installsrv_chrgreturn', consistentlyCharged);
			rec.setFieldValue('custrecord_installsrv_questions', tbleTrackeQues);
			rec.setFieldValue('custrecord_installsrv_stafftrained', adequtelyTrained);
			rec.setFieldValue('custrecord_installsrv_cutratesat', overalRate);
			rec.setFieldValue('custrecord_installsrv_postqltycomment', postqltyComment);			
			
		}
				
			nlapiSubmitRecord(rec, true, true);
						
			nlapiSendEmail(
			'-5', 																									
			'installs@lrsus.com', 	
			'Install Survey Completed by '+rec.getFieldText('custrecord_installsrv_customer'), 			
			'Customer: '+rec.getFieldText('custrecord_installsrv_customer'), 																							
			//null, 																							'elijah@audaxium.com', 																
			null, 																														
			null, 																									
			null, 																									
			true, 
			null, 
			null
			);	
			
			
            var stTitle = 'Survey';
            if(instnce == '1'){
                stTitle = 'Pre Install Survey';
            } else if(instnce == '2'){
                stTitle = 'Post Install Survey';
            } else if(instnce == '3'){
                stTitle = 'Post Use Survey';
            }
            
			var confirmation = '<html>'			   
				+'<head>'
                +'<title>'+stTitle+'</title>'
				+ '<link rel="stylesheet" type="text/css" '
				+ 'href="https://system.netsuite.com/core/media/media.nl?id=970846&c=405615&h=a0ab49ad93082f3e345c&mv=isorw99s&_xt=.css&whence=">' 				
				+'</head>'	
				+'<body>'
				+'<div id="page-wrapper">'
				+'<header id="header">'
				+'<img style="width: 110px; position: relative; top: -10px; padding-left: 24px; padding-right: 24px;" src="http://shop.lrsus.com/site/images/lrs_logo_white.png" />'
				+'</header>'
				+'<article id="main">'
				+'<section class="wrapper style5">'
				+'<div class="inner">'
				+'<section>'
				+'<div style="height: 530px;" align="center">'				
				+'<p style=""><b>Your feedback has been sent. </b><br>Thank you for taking the time to respond.</p>'		
				+'</div>'
				+'</section>'
				+'</div>'
				+'</section>'
				+'</article>'
				+'</div>'
				+'</body>'
				+'</html>'			
					
				res.write(confirmation);			
			
			
       }


   
	   
if(instnce == '1')
{
var html = '<html>'
	   
+'<head>'
+'<title>Pre Install Survey</title>'
+ '<link rel="stylesheet" type="text/css" '
+ 'href="https://system.netsuite.com/core/media/media.nl?id=970846&c=405615&h=a0ab49ad93082f3e345c&mv=isorw99s&_xt=.css&whence=">' 				
+'</head>'	
+'<body>'
+'<div id="page-wrapper">'
+'<header id="header">'
+'<img style="width: 110px; position: relative; top: -10px; padding-left: 24px; padding-right: 24px;" src="http://shop.lrsus.com/site/images/lrs_logo_white.png" />'
+'</header>'
+'<article id="main">'
+'<section class="wrapper style5">'
+'<div class="inner">'

		+'<section>'
		+'<form method="post" action="#">'
		+'<div class="row uniform">'



				+'<div class="6u 12u$(xsmall)">'
				+'<input type="text" name="contactName" id="contactName" value="" placeholder="Contact Name" />'
				+'</div>'										
				+'<div class="6u$ 12u$(xsmall)">'
				+'<input type="text" name="contactTitle" id="contactTitle" value="" placeholder="Contact Title"/>' 
				+'</div>'

				+'<div class="12u$">'
				+'Could you please confirm that the equipment has been delivered?<br/>'				
				+'<select name="isDeliverd" id="isDeliverd" >'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'
										
				+'<div class="12u$">'
				+'Will the equipment be secured in an easy to access area by our installation team when they arrive?<br/>'				
				+'<select name="securedAccess" id="securedAccess" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'

				+'<div class="12u$">'
				+'Could you please confirm the number of indoor and outdoor tables?<br/>'	
				+'</div>'				
				+'<div class="6u 12u$(xsmall)">'			
				+'<input type="text" name="indoorTble" id="indoorTble"  placeholder="Indoor"/>'
				+'</div>'										
				+'<div class="6u$ 12u$(xsmall)">'
				+'<input type="text" name="outdoorTble" id="outdoorTble" placeholder="Outdoor"/>'	 
				+'</div>'
								
				+'<div class="12u$">'
				+'We would like to confirm LRS coming on-site on '+instalDate+'<br/>'				
				+'<select name="confirmDate" id="confirmDate" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">I need to change this</option>'
				+'</select>'
				+'</div>'				
				
							
				
				+'<div class="12u$">'
				+'Notes<br>'				
				+'<textarea name="preinstallNotes" id="preinstallNotes" rows="6"></textarea>'
				+'</div>'				
				
				
						
				+'<div class="12u$">'
				+'<ul class="actions">'
				+'<li><input type="submit" value="Submit" class="special" /></li>'
				+'<li><input type="reset" value="Reset" /></li>'
				+'</ul>'
				+'</div>'
	
				
		+'</div>'
		+'</form>'
		+'</section>'


+'</div>'
+'</section>'
+'</article>'
+'</div>'
+'</body>'
+'</html>'





		if (req.getMethod()=='POST')
		{
			html = '';
		}
		res.write(html);	
}	   
	   


if(instnce == '2')
{
       var html = '<html>'
	   
+'<head>'
+'<title>Post Install Survey</title>'
+ '<link rel="stylesheet" type="text/css" '
+ 'href="https://system.netsuite.com/core/media/media.nl?id=970846&c=405615&h=a0ab49ad93082f3e345c&mv=isorw99s&_xt=.css&whence=">' 				
+'</head>'	
+'<body>'
+'<div id="page-wrapper">'
+'<header id="header">'
+'<img style="width: 110px; position: relative; top: -10px; padding-left: 24px; padding-right: 24px;" src="http://shop.lrsus.com/site/images/lrs_logo_white.png" />'
+'</header>'
+'<article id="main">'
+'<section class="wrapper style5">'
+'<div class="inner">'

		+'<section>'
		+'<form method="post" action="#">'
		+'<div class="row uniform">'
		
				+'<div class="6u 12u$(xsmall)">'
				+'<input type="text" name="contactName2" id="contactName2" value="" placeholder="Contact Name" />'
				+'</div>'										
				+'<div class="6u$ 12u$(xsmall)">'
				+'<input type="text" name="contactTitle2" id="contactTitle2" value="" placeholder="Contact Title"/>' 
				+'</div>'
														
				+'<div class="12u$">'
				+'On '+instalDate+', LRS was scheduled to install the table location system, Table Tracker, at your store. Is this installation complete?<br/>'				
				+'<select name="installComplete" id="installComplete" >'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'
										
				+'<div class="12u$">'
				+'Were there any issues with the installation?<br/>'				
				+'<select name="installIssues" id="installIssues" />'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'
														
				+'<div class="12u$">'
				+'To your knowledge is the system working properly?<br/>'				
				+'<select name="workProperly" id="workProperly" />'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'										
									
				+'<div class="12u$">'
				+'How satisfied are you with this installation?  1 being disatisfied and 5 being very satisfied.<br/>'				
				+'<select name="installSatisfied" id="installSatisfied" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">1</option>'
				+'<option value="2">2</option>'
				+'<option value="3">3</option>'				
				+'<option value="4">4</option>'				
				+'<option value="5">5</option>'				
				+'</select>'
				+'</div>'				
								
				+'<div class="12u$">'
				+'Reminders:'
				+'</div>'	
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="chargintTrack" id="chargintTrack" value="T">'
				+'<label for="chargintTrack">Charging trackers</label>'
                +'<p style="font-size:15px;line-height:20px;padding-left:50px">Please charge trackers when not in use on the charging bases. '
                +'Stack a maximum of 15 trackers per charging base.</p>'
				+'</div>'				
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="keys" id="keys" value="T">'
				+'<label for="keys">Keys</label>'
                +'<p style="font-size:15px;line-height:20px;padding-left:50px">If your Table Tracker system includes an iPad, '
                +'make sure to keep the keys to the iPad enclosure in safe place. The key may be needed for support.</p>'
				+'</div>'							
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="startingUnit" id="startingUnit" value="T">'
				+'<label for="startingUnit">Starting unit</label>'
                +'<p style="font-size:15px;line-height:20px;padding-left:50px">The Starting unit can be used to start trackers '
                +'or can be used for troubleshooting. Please keep the starting unit in a safe place if not using on a daily basis.</p>'
				+'</div>'
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="guidedAccess" id="guidedAccess" value="T">'
				+'<label for="guidedAccess">Guided Access</label>'
                +'<p style="font-size:15px;line-height:20px;padding-left:50px">If your Table Tracker system includes an iPad, '
                +'make sure the Table Tracker app is open, and a PIN is required to exit the app. Please request support if guided access is not set up.</p>'
				+'</div>'								
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="planogram" id="planogram" value="T">'
				+'<label for="planogram">Planogram</label>'
                +'<p style="font-size:15px;line-height:20px;padding-left:50px">If you haven’t already received your laminated planogram, you will be receiving it in the next few days. '
                +'If edits to the layout were made during the installation, expect an email with an electronic copy of the edited planogram. '
                +'Please review the electronic copy of your Planogram within 3 days of that email so we can make any changes before sending the laminated Planogram. </p>'
				+'</div>'	
															
				+'<div class="12u$">'
				+'Comments<br>'
       			+'<textarea name="postinstallNotes" id="postinstallNotes" rows="6"></textarea>'
				+'</div>'				
																
				+'<div class="12u$">'
				+'<ul class="actions">'
				+'<li><input type="submit" value="Submit" class="special" /></li>'
				+'<li><input type="reset" value="Reset" /></li>'
				+'</ul>'
				+'</div>'
				
		+'</div>'
		+'</form>'
		+'</section>'


+'</div>'
+'</section>'
+'</article>'
+'</div>'
+'</body>'
+'</html>'





		if (req.getMethod()=='POST')
		{
			html = '';
		}
		res.write(html);	
}	   



if(instnce == '3')
{
       var html = '<html>'
	   
+'<head>'
+'<title>Post Use Survey</title>'
+ '<link rel="stylesheet" type="text/css" '
+ 'href="https://system.netsuite.com/core/media/media.nl?id=970846&c=405615&h=a0ab49ad93082f3e345c&mv=isorw99s&_xt=.css&whence=">' 				
+'</head>'	
+'<body>'
+'<div id="page-wrapper">'
+'<header id="header">'
+'<img style="width: 110px; position: relative; top: -10px; padding-left: 24px; padding-right: 24px;" src="http://shop.lrsus.com/site/images/lrs_logo_white.png" />'
+'</header>'
+'<article id="main">'
+'<section class="wrapper style5">'
+'<div class="inner">'

		+'<section>'
		+'<form method="post" action="#">'
		+'<div class="row uniform">'			
				
				+'<div class="6u 12u$(xsmall)">'
				+'<input type="text" name="contactName3" id="contactName3" value="" placeholder="Contact Name" />'
				+'</div>'										
				+'<div class="6u$ 12u$(xsmall)">'
				+'<input type="text" name="contactTitle3" id="contactTitle3" value="" placeholder="Contact Title"/>' 
				+'</div>'
																					
				+'<div class="12u$">'
				+'LRS recently installed the table location system, Table Tracker, at your store.  Are you currently using the system?<br/>'				
				+'<select name="currentlyUsing" id="currentlyUsing" >'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'
/*								
				+'<div class="12u$">'
				+'Using During CYT Hours Only?<br/>'				
				+'<select name="cytHours" id="cytHours" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'				
											
				+'<div class="12u$">'
				+'Envision Using Outside of CYT hours/menu?<br/>'				
				+'<select name="envisionUsing" id="envisionUsing" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'				
*/				
				+'<div class="12u$">'
				+'What is your average number of orders per day using the Table Tracker system? '
                //+'The daily number will be listed at the bottom of the Table Tracker app Orders Screen on the iPad.<br/>'				
				+'<input size="25" type="text" name="averageOrders" id="averageOrders" />'
				+'</div>'	
				
				+'<div class="12u$">'
				+'Have customers experienced any issues with trackers reading the table number?<br/>'				
				+'<select name="customerIssues" id="customerIssues" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'
				
											
				+'<div class="12u$">'
				+'Have you had any issues clearing orders?<br/>'				
				+'<select name="issuesClearing" id="issuesClearing" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'				
												
				+'<div class="12u$">'
				+'Type of Clearer Used? (PCU/Dock/Screen)<br/>'				
				+'<select name="typeClearer" id="typeClearer" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">PCU</option>'
				+'<option value="2">Dock</option>'
				+'<option value="3">Screen</option>'
				+'<option value="4">Multiple</option>'				
				+'</select>'
				+'</div>'				
				
				+'<div class="12u$">'
				+'Are trackers being consistently placed back on charge when not in use?<br/>'				
				+'<select name="consistentlyCharged" id="consistentlyCharged" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'				
						
				+'<div class="12u$">'
				+'Do you have any questions about how the Table Tracker system works?<br/>'				
				+'<select name="tbleTrackeQues" id="tbleTrackeQues" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'				
										
				+'<div class="12u$">'
				+'Is the Staff Adequately Trained on System?<br/>'				
				+'<select name="adequtelyTrained" id="adequtelyTrained" />'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'
					
				+'<div class="12u$">'
				+'How would you rate the overall product from 1 to 5? 1 being poor and 5 being great.<br/>'				
				+'<select name="overalRate" id="overalRate" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">1</option>'
				+'<option value="2">2</option>'
				+'<option value="3">3</option>'
				+'<option value="4">4</option>'				
				+'<option value="5">5</option>'				
				+'</select>'
				+'</div>'
			
								
				+'<div class="12u$">'
				+'Comments<br>'
       			+'<textarea name="postqltyComment" id="postqltyComment" rows="6"></textarea>'
				+'</div>'				
											
						
				+'<div class="12u$">'
				+'<ul class="actions">'
				+'<li><input type="submit" value="Submit" class="special" /></li>'
				+'<li><input type="reset" value="Reset" /></li>'
				+'</ul>'
				+'</div>'
	
				
		+'</div>'
		+'</form>'
		+'</section>'


+'</div>'
+'</section>'
+'</article>'
+'</div>'
+'</body>'
+'</html>'





		if (req.getMethod()=='POST')
		{
			html = '';
		}
	res.write(html);		
}



if(instnce == '4')
{
       var html = '<html>'
	   
+'<head>'
+ '<link rel="stylesheet" type="text/css" '
+ 'href="https://system.netsuite.com/core/media/media.nl?id=970846&c=405615&h=a0ab49ad93082f3e345c&mv=isorw99s&_xt=.css&whence=">' 				
+'</head>'	
+'<body>'
+'<div id="page-wrapper">'
+'<header id="header">'
+'<img style="width: 110px; position: relative; top: -10px; padding-left: 24px; padding-right: 24px;" src="http://shop.lrsus.com/site/images/lrs_logo_white.png" />'
+'</header>'
+'<article id="main">'
+'<section class="wrapper style5">'
+'<div class="inner">'

		+'<section>'
		+'<form method="post" action="#">'
		+'<div class="row uniform">'			
				
				+'<div class="6u 12u$(xsmall)">'
				+'<input type="text" name="contactName4" id="contactName4" value="" placeholder="Contact Name" />'
				+'</div>'										
				+'<div class="6u$ 12u$(xsmall)">'
				+'<input type="text" name="contactTitle4" id="contactTitle4" value="" placeholder="Contact Title"/>' 
				+'</div>'
																					
				+'<div class="12u$">'
				+'Purpose of revisit (why):'
				+'</div>'	
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="Audit" id="Audit" value="T">'
				+'<label for="Audit">Audit</label>'
				+'</div>'
				
				+'<div class="12u$">'				
				+'Installation issue:'				
				+'</div>'								
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="tables" id="tables" value="T">'
				+'<label for="tables">Tables</label>'
				+'</div>'					
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="system" id="system" value="T">'
				+'<label for="system">System</label>'
				+'</div>'
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="other1" id="other1" value="T">'
				+'<label for="other1">Other</label>'
				+'</div>'
				
			
				+'<div class="12u$">'				
				+' Product issue:'				
				+'</div>'				
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="Trackers" id="Trackers" value="T">'
				+'<label for="Trackers">Trackers</label>'
				+'</div>'					
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="Gateway" id="Gateway" value="T">'
				+'<label for="Gateway">Gateway</label>'
				+'</div>'
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="Repeaters" id="Repeaters" value="T">'
				+'<label for="Repeaters">Repeaters</label>'
				+'</div>'	
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="iPad" id="iPad" value="T">'
				+'<label for="iPad">iPad</label>'
				+'</div>'					
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="Router" id="Router" value="T">'
				+'<label for="Router">Router</label>'
				+'</div>'
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="Connectivity" id="Connectivity" value="T">'
				+'<label for="Connectivity">Connectivity</label>'
				+'</div>'
				+'<div class="6u 12u$(small)">'
				+'<input type="checkbox" name="other2" id="other2" value="T">'
				+'<label for="other2">Other</label>'
				+'</div>'

				
				
				
				
				
				
				




	
				+'<div class="12u$">'
				+'Was the LRS Technician&rsquo;s recent visit successful?<br/>'				
				+'<select name="successvisit" id="successvisit" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'
				
											
				+'<div class="12u$">'
				+'Have there been any new issues since the LRS Technician&rsquo;s visit?<br/>'				
				+'<select name="issuessincevisit" id="issuessincevisit" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">Yes</option>'
				+'<option value="2">No</option>'
				+'</select>'
				+'</div>'				

	
				+'<div class="12u$">'
				+'How satisfied are you with the results of this technician&rsquo;s visit?  1 being disatisfied and 5 being very satisfied.<br/>'				
				+'<select name="rateTechVisit" id="rateTechVisit" /><br>'
       			+'<option value="null"></option>'
				+'<option value="1">1</option>'
				+'<option value="2">2</option>'
				+'<option value="3">3</option>'
				+'<option value="4">4</option>'				
				+'<option value="5">5</option>'				
				+'</select>'
				+'</div>'

				+'<div class="12u$">'
				+'Comments<br>'
       			+'<textarea name="postserviceComment" id="postserviceComment" rows="6"></textarea>'
				+'</div>'				
											
						
				+'<div class="12u$">'
				+'<ul class="actions">'
				+'<li><input type="submit" value="Submit" class="special" /></li>'
				+'<li><input type="reset" value="Reset" /></li>'
				+'</ul>'
				+'</div>'
	
				
		+'</div>'
		+'</form>'
		+'</section>'


+'</div>'
+'</section>'
+'</article>'
+'</div>'
+'</body>'
+'</html>'





		if (req.getMethod()=='POST')
		{
			html = '';
		}
	res.write(html);		
}



   		
	
}

