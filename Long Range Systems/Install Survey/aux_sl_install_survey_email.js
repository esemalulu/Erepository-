/**
 * Version    Date            Author           		Remarks
 * 1.00       15 Sept 2016     elijah@audaxium.com
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

function requestReourcesEmail(req, res)
{
		
	var paramRecId = req.getParameter('recordid')?req.getParameter('recordid'):'',
		paramRecType = req.getParameter('recordtype')?req.getParameter('recordtype'):'',
		paramCusId = req.getParameter('customerid')?req.getParameter('customerid'):'';

		
	var instanceSelect = req.getParameter('custpage_instance')?req.getParameter('custpage_instance'):'',			
		emailEntry = req.getParameter('custpage_email')?req.getParameter('custpage_email'):'',
	
		recId = req.getParameter('custpage_recid')?req.getParameter('custpage_recid'):'',
		recType = req.getParameter('custpage_rectype')?req.getParameter('custpage_rectype'):'',
		cusId = req.getParameter('custpage_cusid')?req.getParameter('custpage_cusid'):'';		
					
	var nsform = nlapiCreateForm('Send Installation Survey Email', true);    
	    nsform.setScript('customscript_aux_installsurvey_clientscr');
			
		var installinstance = nsform.addField('custpage_instance', 'select', 'Install Portion to Send');
		installinstance.setLayoutType('normal','startcol')
		installinstance.addSelectOption('','---Select Instance---');
		installinstance.addSelectOption('1','PRE-INSTALL');
		installinstance.addSelectOption('2','POST-INSTALL');
		installinstance.addSelectOption('3','POST-QUALITY');
		
		
		if (req.getMethod()=='POST')
		{
			installinstance.setDisplayType('hidden');
		}
			
        // TO email address field
		var emailField = nsform.addField('custpage_email','email', 'Email Address');
		emailField.setLayoutType('normal','startrow')
		emailField.setMandatory( true );
        emailField.setDisplaySize(50);
		if (req.getMethod()=='POST')
		{
			emailField.setDisplayType('hidden');
		}

		// CC email addresses in a list
        var listcc = nsform.addSubList('custpage_cclist', 'inlineeditor', 'CC List');
        listcc.addField('listcc_email', 'email', 'Email Address').setDisplaySize(50);
        if (req.getMethod()=='POST')
		{
			listcc.setDisplayType('hidden');
		}
				
		 //Hidden Record Id
		var hiddenRecIdFld = nsform.addField('custpage_recid', 'text', '', null, null);
		hiddenRecIdFld.setDefaultValue(paramRecId);
		hiddenRecIdFld.setDisplayType('hidden');		
		
		 //Hidden Record Type
		var hiddenTypeIdFld = nsform.addField('custpage_rectype', 'text', '', null, null);
		hiddenTypeIdFld.setDefaultValue(paramRecType);
		hiddenTypeIdFld.setDisplayType('hidden');			
		
		 //Hidden Customer ID
		var hiddenCustIdFld = nsform.addField('custpage_cusid', 'text', '', null, null);
		hiddenCustIdFld.setDefaultValue(paramCusId);
		hiddenCustIdFld.setDisplayType('hidden');			
																	
		var sbmtButton = nsform.addSubmitButton('Send Email');
						
		if (req.getMethod()=='POST')
		{	
			//sbmtButton.setVisible(false);	
			sbmtButton.setDisabled(true);
		}		
		
	    res.writePage(nsform);
	
	if(req.getMethod() == 'POST')
	{
		
		nsform.addField('custpage_finishlabel', 'label', '<p style="font-size: 12pt; color: blue;" >Your email has been succesfully sent</p>' );
		
		if(instanceSelect == '1'){var emailTempId = 35;}
		if(instanceSelect == '2'){var emailTempId = 36;}						
		if(instanceSelect == '3'){var emailTempId = 37;}	
						
		var emailTemp = nlapiLoadRecord('emailtemplate',emailTempId); 
		
		var emailSubj = emailTemp.getFieldValue('subject');
		var emailBody = emailTemp.getFieldValue('content');
			emailBody = emailBody.replace('#RECID#',recId);
			emailBody = emailBody.replace('#INSTNCE#',instanceSelect);			
						
		var records = new Array();
		records['entity'] = cusId ;//  '1475537'
		//records['customrecord'] = recId ;//  '74'
		
		var renderer = nlapiCreateTemplateRenderer();
		
		if(recId){	
			renderer.addRecord('customrecord', nlapiLoadRecord('customrecord_adx_installationsurvey', recId));
		}

		renderer.setTemplate(emailSubj);
		renderSubj = renderer.renderToString();
		renderer.setTemplate(emailBody);
		renderBody = renderer.renderToString();
		//nlapiLogExecution('debug', 'renderBody', renderBody);
        
        // Get CC addresses from list
        var arCC = [];
        for(var i = 1; i <= request.getLineItemCount('custpage_cclist'); i++){
            arCC.push(request.getLineItemValue('custpage_cclist', 'listcc_email', i));
        }
        //log('debug', 'CC list', JSON.stringify(arCC));
        		
		try
		{ 
			nlapiSendEmail( 
				48275,	        // sender: LRS Tech 
				emailEntry,     // recipient
				renderSubj,     // subject
				renderBody,     // body	
				((arCC && arCC.length > 0) ? arCC : null),	// cc: An array of email addresses
				null,           // bcc
				records,        // records	
				null,           // attachments
				true,           // notifySenderOnBounce 
				null,           // internalOnly 
				'installs@lrsus.com'	//reply to
			);
		
		}
		catch(procerr)
		{	
		log('Error', 'Error sending email', getErrText(procerr));
		
		}
							
							  
	} 
		
}
