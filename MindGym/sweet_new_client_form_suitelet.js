
/**
 * New Account Form Suitelet
 *
 * @param {Object} request
 * @param {Object} response
 */
//tix 3315 
var fileId = '',
	manual = '';
function clientNewAccountForm(request, response)
{
	
	//tix 3315 - Set the values
	fileId = request.getParameter('fileid') || '';
	manual = request.getParameter('manual') || '';
	
	//Validate fileid
	if (!fileId)
	{
		throw nlapiCreateError('SWEET_FILEID_REQD','File ID based on Subsidiary is required', true);
	}
	
	// Validate prospect id
	var prospectId = request.getParameter('prospect_id');
	if (!prospectId) {
		throw nlapiCreateError('SWEET_PROSPECT_REQD', 'Prospect field is required.', true);
	}
  
	// Validate Contact Id
	var contactId = request.getParameter('contact_id');
	if (!contactId) {
		throw nlapiCreateError('SWEET_CONTACT_REQD', 'Contact field is required.', true);
	}
  
	var prospect = null;
  
	try 
	{
		prospect = nlapiLoadRecord('customer', prospectId);
	}
	catch (err)
	{
		throw nlapiCreateError('NORECERR','Error Customer record with Internal ID: '+prospectId+' Error: '+err.getDetails(), true);
	}
  
	// Get subsidiary
	var subsidiary = prospect.getFieldValue('subsidiary');
  
	// Has prospect already completed form?
	if (hasCompletedForm(prospect, manual)) {
		echoFormIsCompleted();
		return;
	}
 
	// Build form data
	var formData = new Object();
	formData['custentity_clifrm_companyname'] = {
			'name' : 'custentity_clifrm_companyname',
			'type' : 'text',
			'value' : POST('custentity_clifrm_companyname'), 
			'label' : 'Legal company name', 
			'required' : true,
			'missing' : 'Please enter company name.',
			'size' : 40,
			'save' : true
	};
	
	if(subsidiary != 3) {
	    formData['custentity_clifrm_regnum'] = {
	      'name' : 'custentity_clifrm_regnum',
	      'type' : 'text',
	      'value' : POST('custentity_clifrm_regnum'),
	      'label' : 'Company registration no.',
	      'required' : false,
	      'size' : 40,
	      'save' : true
	    };
  
	    formData['custentity_clifrm_vatregnumber'] = {
	      'name' : 'custentity_clifrm_vatregnumber',
	      'type' : 'text',
	      'value' : POST('custentity_clifrm_vatregnumber'),
	      'label' : 'VAT registration no.',
	      'required' : false,
	      'size' : 40,
	      'save' : true
	    };
	  }
	  
	  formData['custentity_clifrm_salutation'] = {
	    'name' : 'custentity_clifrm_salutation',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_salutation'),
	    'label' : 'Mr/Ms',
	    'required' : false,
	    'size' : 5,
	    'save' : true
	  };
	  formData['custentity_clifrm_firstname'] = {
	    'name' : 'custentity_clifrm_firstname',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_firstname'),
	    'label' : 'First name',
	    'required' : true,
	    'missing' : 'Please enter first name.',
	    'size' : 20,
	    'save' : true
	  };
	  formData['custentity_clifrm_lastname'] = {
	    'name' : 'custentity_clifrm_lastname',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_lastname'),
	    'label' : 'Last name',
	    'required' : true,
	    'missing' : 'Please enter last name.',
	    'size' : 20,
	    'save' : true
	  };
	  formData['custentity_clifrm_title'] = {
	    'name' : 'custentity_clifrm_title',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_title'),
	    'label' : 'Job title',
	    'required' : false,
	    'size' : 40,
	    'save' : true
	  };
	  formData['custentity_clifrm_phone'] = {
	    'name' : 'custentity_clifrm_phone',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_phone'),
	    'label' : 'Phone number',
	    'required' : true,
	    'missing' : 'Please enter phone number.',
	    'size' : 40,
	    'save' : true
	  };
	  formData['custentity_clifrm_email'] = {
	    'name' : 'custentity_clifrm_email',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_email'),
	    'label' : 'Email address',
	    'required' : true,
	    'size' : 40,
	    'save' : true
	  };
	  formData['custentity_clifrm_billaddressee'] = {
	    'name' : 'custentity_clifrm_billaddressee',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_billaddressee'),
	    'label' : 'To',
	    'required' : false,
	    'size' : 40,
	    'save' : true
	  };
	  formData['custentity_clifrm_billaddr1'] = {
	    'name' : 'custentity_clifrm_billaddr1',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_billaddr1'),
	    'label' : 'Address',
	    'required' : true,
	    'missing' : 'Please enter billing address.',
	    'size' : 40,
	    'save' : true
	  };
	  formData['custentity_clifrm_billaddr2'] = {
	    'name' : 'custentity_clifrm_billaddr2',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_billaddr2'),
	    'label' : null,
	    'required' : false,
	    'size' : 40,
	    'save' : true
	  };
	  formData['custentity_clifrm_billcity'] = {
	    'name' : 'custentity_clifrm_billcity',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_billcity'),
	    'label' : 'City',
	    'required' : true,
	    'missing' : 'Please enter billing city.',
	    'size' : 20,
	    'save' : true
	  };
	  formData['custentity_clifrm_billstate'] = {
	    'name' : 'custentity_clifrm_billstate',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_billstate'),
	    'label' : 'County/State',
	    'required' : false,
	    'size' : 15,
	    'save' : true
	  };
	  formData['custentity_clifrm_billzip'] = {
	    'name' : 'custentity_clifrm_billzip',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_billzip'),
	    'label' : 'Postcode/Zip',
	    'required' : true,
	    'size' : 10,
	    'save' : true
	  };
	  formData['custentity_clifrm_billcountry'] = {
	    'name' : 'custentity_clifrm_billcountry',
	    'type' : 'country',
	    'value' : POST('custentity_clifrm_billcountry'),
	    'label' : 'Country',
	    'required' : true,
	    'missing' : 'Please select billing country.',
	    'save' : true
	  };
	  formData['custentity_clifrm_billphone'] = {
	    'name' : 'custentity_clifrm_billphone',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_billphone'),
	    'label' : 'Phone number',
	    'required' : false,
	    'size' : 40,
	    'save' : true
	  };
	  formData['custentity_clifrm_billemail'] = {
	    'name' : 'custentity_clifrm_billemail',
	    'type' : 'text',
	    'value' : POST('custentity_clifrm_billemail'),
	    'label' : 'Email address',
	    'required' : false,
	    'missing' : 'Please enter e-mail address.',
	    'size' : 40,
	    'save' : true
	  };
	  formData['custentity_clifrm_paymentmethod'] = {
	    'name' : 'custentity_clifrm_paymentmethod',
	    'type' : 'paymentmethod',
	    'value' : POST('custentity_clifrm_paymentmethod'),
	    'label' : 'Preferred payment method',
	    'required' : true,
	    'missing' : 'Please select payment method.',
	    'save' : true
	  };
	  formData['custentity_clifrm_additionalinstr'] = {
		'name' : 'custentity_clifrm_additionalinstr',
		'type' : 'text',
		'value' : POST('custentity_clifrm_additionalinstr'),
		'label' : 'Additional invoicing instructions',
		'required' : false,
		'missing' : '',
		'size' : 40,
		'save' : true
	  };
	  formData['custentity_clifrm_agreedterms'] = {
	    'name' : 'custentity_clifrm_agreedterms',
	    'type' : 'checkbox',
	    'value' : POST('custentity_clifrm_agreedterms'),
	    'label' : 'I have read and understood the terms and conditions and agree to be bound by their terms',
	    'required' : ( manual=='F'?true:false),
	    'missing' : 'Please check the box to confirm that you agree to the Terms and Conditions.',
	    'save' : ( manual=='F'?true:false)
	  };
	  
	  //Tix 3315 - Add in Billing Info Rec. flag
	  //custentity_clifrm_billinginforec
	  formData['custentity_clifrm_billinginforec'] = {
	     'name' : 'custentity_clifrm_billinginforec',
		 'type' : 'hidden',
		 'value' : 'T',
		 'label' : '',
		 'required' : false,
		 'missing' : '',
		 'save' : true
	  };
			  
	  formData['prospect_id'] = {
	    'name' : 'prospect_id',
	    'type' : 'hidden',
	    'value' : prospectId,
	    'label' : '',
	    'required' : true,
	    'missing' : '',
	    'save' : false
	  };
	  formData['contact_id'] = {
	    'name' : 'contact_id',
	    'type' : 'hidden',
	    'value' : contactId,
	    'label' : '',
	    'required' : true,
	    'missing' : '',
	    'save' : false
	  };
    
	  var form = new sweet_Form();
	  form.setData(formData);
	  form.setRecord(prospect);
  
	  // Has form been submitted?
	  if (request.getMethod() == 'POST') 
	  { 
		  // Validate
		  form.validate();
		  if (form.isValid()) 
		  {
			  form.saveRecord(subsidiary);
			  sendNotificationEmail(prospect, contactId, manual);
			  echoThankYou();
			  return;
		  }
	  }
  
	  // Render page
	  echoHeaderNew();
	  if (!form.isValid()) 
	  { 
		  // Display error flash
		  echo('<div id="flash-error" class="message">');
		  echo('<p>Oops! There were errors while processing this form.<br />The fields have been highlighted*. Please correct them before submitting again.</p>');
		  echo('</div>');
	  }
	  
	  //New Version will render out EVERYTHING ALL At ONCE
	  form.rendernew(subsidiary);
	  echoFooterNew();
}


function echoHeaderNew()
{
	echo('<!DOCTYPE html>');
	echo('<html lang="en">');
	echo('<head>');    
		echo('<title>Welcome to Open account</title>');
		echo('<meta charset="utf-8">');
		echo('<meta name="viewport" content="width=1000 , initial-scale=1">');
		echo('<meta name="format-detection" content="telephone=no">');
		echo('<!--css styles starts-->');
		echo('<link rel="shortcut icon" type="image/x-icon" href="https://system.sandbox.netsuite.com/core/media/media.nl?id=980994&c=720154&h=a1bc2a4ea7d064cc6739&_xt=.ico">'); //favicon.ico
		echo('<link rel="stylesheet" href="https://system.sandbox.netsuite.com/core/media/media.nl?id=980979&c=720154&h=c38f1209fd1227a04d33&_xt=.css" type="text/css">'); //jquery.selectbox.css
	    echo('<link rel="stylesheet" type="text/css" href="https://system.sandbox.netsuite.com/core/media/media.nl?id=980978&c=720154&h=775ff12c8d1dbe4db48e&_xt=.css">'); //style.css
	    echo('<!--css styles ends-->');
	    echo('<!--script  starts-->');
	    	echo('<!--[if lt IE 9]>');
	    		echo('<script src="https://system.sandbox.netsuite.com/core/media/media.nl?id=980991&c=720154&h=6c019d5227c396a35137&_xt=.js"></script>'); //js/html5shiv.js
	    		echo('<script src="https://system.sandbox.netsuite.com/app/common/media/mediaitem.nl?id=980993&e=T"></script>'); //respond.min.js
	    		echo('<link rel="stylesheet" type="text/css" href="https://system.sandbox.netsuite.com/core/media/media.nl?id=980980&c=720154&h=d9fbf2f41d1c2120ecc6&_xt=.css">'); //ie.css
	    	echo('<![endif]-->');
	    echo('<!--script  ends-->');
	echo('</head>');
    echo('<body>');
    	echo('<!--header section starts-->');
    	echo('<header>');
    		echo('<!-- header section coding starts here-->');	
    		echo('<div class="main">');
    			echo('<div class="logo">');
    				echo('<a href="#" title="mindgym">');
    					echo('<img src="https://system.sandbox.netsuite.com/core/media/media.nl?id=980985&c=720154&h=92d0774d16da825f3e71" alt="logo" title="mindgym"/>'); //logo.png
    				echo('</a>');
    			echo('</div>');   
    			echo('<h1>Open new account</h1>');
    		echo('</div>');
    		echo('<!-- header section coding ends here-->');
    	echo('</header>');
    	echo('<!--header section ends-->');
    	echo('<!-- midd section starts here-->');
    	echo('<section>');
}

/**
 * Added by JS@Audaxium to redner entire HTML in single function.
 * @param subsidiary
 */
sweet_Form.prototype.rendernew = function(subsidiary)
{
	
    //Start FORM Section--------------------------------------------------------------
    echo('<form class="open-account" id="open-account-form" method="post" action="">');
    	
    	//Add in hidden form field to indicate if it's manual or not.
    	//THIS is necessary due to hiding of T&C agreement checkbox
    	echo('<input type="hidden" name="ismanual" id="ismanual" value="'+manual+'"/>');
    
    	echo('<div class="row company">');
    		echo('<div class="main">');
    			echo('<h2>Company</h2>');
    			echo('<div class="cols">');
    				renderField(this._data['custentity_clifrm_companyname'], true);
    				
    				if(subsidiary == 2) {
    				    renderField(this._data['custentity_clifrm_regnum'], true);
    				    echo('<span class="hint">The number is usually found on official company letterhead.</span>');
    				    renderField(this._data['custentity_clifrm_vatregnumber'], true);
    				    echo('<span class="hint">Example: GB-756425612</span>');
    				    
    				  }
    			echo('</div>');
    		echo('</div>');
    	echo('</div>');
    
    	echo('<div class="row detail">');
    		echo('<div class="main">'); 
    			echo('<h2>Your details</h2>');
    			echo('<div class="cover your-detail cf">');
    				echo('<div class="cols respects-name">');
    					renderField(this._data['custentity_clifrm_salutation'], true);
					echo('</div>');
	         
					echo('<div class="cols firstname">');
						renderField(this._data['custentity_clifrm_firstname'], true);
					echo('</div>');                        
	         
					echo('<div class="cols lastname">');
						renderField(this._data['custentity_clifrm_lastname'], true);
					echo('</div>');
				echo('</div>');
	        
				echo('<div class="full">');
					echo('<div class="cover cf">');
						echo('<div class="cols">');
							renderField(this._data['custentity_clifrm_title'], true);
						echo('</div>');
						echo('<div class="cols">');
							renderField(this._data['custentity_clifrm_phone'], true);
						echo('</div>');
		         
						echo('<div class="cols">');
							renderField(this._data['custentity_clifrm_email'], true);
						echo('</div>');
					echo('</div>');
				echo('</div>');
			echo('</div>');
		echo('</div>');
    
		echo('<div class="row billing-info">');
			echo('<div class="main">');
				echo('<h2>Billing information</h2>');
				echo('<div class="cols">');
					renderField(this._data['custentity_clifrm_billaddressee'], true);
	            echo('</div>');
	            echo('<div class="cols">');
	            	renderField(this._data['custentity_clifrm_billaddr1'], true);
	                echo('<br/>');
	                echo('<br/>');
	                renderField(this._data['custentity_clifrm_billaddr2'], true);
	            echo('</div>');                    
	            echo('<div class="cover cf">');
	            	echo('<div class="cols">');
	            		renderField(this._data['custentity_clifrm_billcity'], true);
	                echo('</div>');
	                echo('<div class="cols">');
	                	renderField(this._data['custentity_clifrm_billstate'], true);
	                echo('</div>');
	                echo('<div class="cols">');
	                	renderField(this._data['custentity_clifrm_billzip'], true);
	                echo('</div>');
	            echo('</div>');                        
	            echo('<div class="cols">');
	            	renderField(this._data['custentity_clifrm_billcountry'], true);
				echo('</div>');
				
				echo('<div class="cover cf">');
					echo('<div class="cols">');
						renderField(this._data['custentity_clifrm_billphone'], true);
					echo('</div>');
					echo('<div class="cols">');
						renderField(this._data['custentity_clifrm_billemail'], true);
					echo('</div>');
				echo('</div>');
				echo('<div class="cols">');
					renderField(this._data['custentity_clifrm_paymentmethod'], true, subsidiary);
				echo('</div>');
				//custentity_clifrm_additionalinstr Additional Invoicing Instruction
				echo('<div class="cols">');
					renderField(this._data['custentity_clifrm_additionalinstr'], true, subsidiary);
				echo('</div>');
			echo('</div>');
		echo('</div>');
    
		
		if (manual == 'F')
		{
			echo('<div class="row desctiption">');
			echo('<div class="main">');
				echo('<h2>Terms and conditions</h2>');
				echo('<p>These terms and conditions govern the supply of services provided by Mind Gym to you as a client. '+
					 'Please click on the link below to read the document. To confirm that you agree to the terms and '+ 
					 'conditions tick the check box next to "I have read and understood the terms and conditions and agree to '+ 
					 'be bound by their terms" and submit the form.</p>');
	            
				echo('<div class="pdf">');
				
					//var termsFile = nlapiLoadFile(this._record.getFieldValue('custentity_cli_termsdoc'));
					var termsFile = nlapiLoadFile(fileId);
					echo('<a target="_blank" href="' + termsFile.getURL() + '" class="pdf-download" tabindex="18">');
						echo('<img src="https://system.sandbox.netsuite.com/core/media/media.nl?id=980984&c=720154&h=58bc1b30139c278af564" alt="pdf" title="Download Terms and Conditions">'); // pdf.png
						echo('<span>Download Terms and Conditions</span>');
					echo('</a>');
				echo('</div>');
	            
				renderField(this._data['custentity_clifrm_agreedterms'], true);
				
			echo('</div>');
		echo('</div>');
		}
		
    
		renderField(this._data['prospect_id'], true);
		renderField(this._data['contact_id'], true);
		//tix 3315 - Render Billing Info Rec. field.
		renderField(this._data['custentity_clifrm_billinginforec'], true);
		
		echo('<div class="main">');
			echo('<br/>');
			echo('<input type="submit" value="Submit form" title="Submit form" class="submit-button" tabindex="20"/>');
			echo('<div class="successmsg">Thank you for interest</div>');
		echo('</div>');
		
    echo('</form>');
    //End FORM Section--------------------------------------------------------------
    	
};

/**
 * Output html footer
 *
 */
function echoFooterNew()
{
	echo('</section>');
	echo('<!-- midd section ends here-->');
	echo('<!-- image preloads starts here-->');
	echo('<div class="preloader"> </div>');
	echo('<!-- image preloads ends here-->');
	echo('<!--footer ends here-->');
	echo('<!--scripts starts here-->'); 
		echo('<script src="https://system.sandbox.netsuite.com/core/media/media.nl?id=980990&c=720154&h=1c04e87750728ee52fba&_xt=.js"></script>'); //jquery.min.js
		echo('<script src="https://system.sandbox.netsuite.com/core/media/media.nl?id=980992&c=720154&h=1f6a3fc0ee24ea35d809&_xt=.js"></script>'); //modernizer-2.7.1.min.js
		echo('<script src="https://system.sandbox.netsuite.com/core/media/media.nl?id=980988&c=720154&h=4323cb61c1740e9d778f&_xt=.js"></script>'); // jquery.selectbox-0.2.js
		echo('<script src="https://system.sandbox.netsuite.com/core/media/media.nl?id=980989&c=720154&h=b22279fc193d3d979c19&_xt=.js"></script>'); //jquery.validate.js
		echo('<script src="https://system.sandbox.netsuite.com/core/media/media.nl?id=980986&c=720154&h=e02c565ed6f95278c6f5&_xt=.js"></script>'); //general.js
		echo('<script src="https://system.sandbox.netsuite.com/core/media/media.nl?id=980987&c=720154&h=dc28d5c5289b524df422&_xt=.js"></script>'); //validation.js
		echo('<script src="https://use.typekit.net/jnk5ovd.js"></script>'); //jnk5ovd.js online reference
		echo('<script>try{Typekit.load();}catch(e){}</script>');
	echo('<!--scripts ends here-->'); 
	echo('</body>');
	echo('</html>');
}


function sweet_Form()
{
  this._data = new Object();
  this._errors = new Object();
  this._numErrors = 0;
  this._record = null;
}

/**
 * Is form valid
 *
 * @return bool
 */
sweet_Form.prototype.isValid = function()
{
  return this._numErrors < 1;
}

/**
 * Get data
 *
 * @return Array
 */
sweet_Form.prototype.getData = function()
{
  return this._data;
}

/**
 * Set data
 *
 * @param Array
 */
sweet_Form.prototype.setData = function(data)
{
  this._data = data;
}

/**
 * Get model
 *
 * @return Object
 */
sweet_Form.prototype.getRecord = function()
{
  return this._record;
}

/**
 * Set model
 *
 * @param Object
 */
sweet_Form.prototype.setRecord = function(model)
{
  this._record = model;
}

/**
 * Render form
 *
 */
sweet_Form.prototype.render = function(subsidiary)
{
  echo('<form method="post" action="">');

  // Company
  echo('<h2>Company</h2>');
  echo('<p>');
  renderField(this._data['custentity_clifrm_companyname'], true);
  echo('</p>');
  echo('<p>');
  if(subsidiary != 3) {
    renderField(this._data['custentity_clifrm_regnum'], true);
    echo('<span class="hint">The number is usually found on official company letterhead.</span>')
    echo('</p>')
    echo('<p>');  
    renderField(this._data['custentity_clifrm_vatregnumber'], true);
    echo('<span class="hint">Example: GB-756425612</span>')
    echo('</p>')
  }

  // Contact
  echo('<h2>Your details</h2>');
  echo('<div class="group">');
    echo('<div class="set">');
    echo('<p>');
    renderField(this._data['custentity_clifrm_salutation'], true);
    echo('</p>')
    echo('<p>');
    renderField(this._data['custentity_clifrm_firstname'], true);
    echo('</p>')
    echo('<p>');
    renderField(this._data['custentity_clifrm_lastname'], true);
    echo('</p>');
    echo('</div>');
  echo('</div>')
  echo('<p>');
  renderField(this._data['custentity_clifrm_title'], true);
  echo('</p>')
  echo('<p>');
  renderField(this._data['custentity_clifrm_phone'], true);
  echo('</p>')
  echo('<p>');
  renderField(this._data['custentity_clifrm_email'], true);
  echo('</p>')

  // Billing
  echo('<h2>Billing information</h2>');
  echo('<div class="group">');
    echo('<p>');
    renderField(this._data['custentity_clifrm_billaddressee'], true);
    echo('</p>');
    echo('<p>');
    renderField(this._data['custentity_clifrm_billaddr1'], true);
    echo('<br />');
    renderField(this._data['custentity_clifrm_billaddr2'], true);
    echo('</p>');
      echo('<div class="set">');
      echo('<p>');
      renderField(this._data['custentity_clifrm_billcity'], true);
      echo('</p>');
      echo('<p>');
      renderField(this._data['custentity_clifrm_billstate'], true);
      echo('</p>');
      echo('<p>');
      renderField(this._data['custentity_clifrm_billzip'], true);
      echo('</p>');
      echo('</div>');
    echo('<p>');
    renderField(this._data['custentity_clifrm_billcountry'], true);
    echo('</p>');
  echo('</div>');
  echo('<p>');
  renderField(this._data['custentity_clifrm_billphone'], true);
  echo('</p>');
  echo('<p>');
  renderField(this._data['custentity_clifrm_billemail'], true);
  echo('<p>');
  renderField(this._data['custentity_clifrm_paymentmethod'], true, subsidiary);
  echo('</p>');

  // Terms and conditions
  echo('<h2>Terms and conditions</h2>');
  echo('<p>These terms and conditions govern the supply of services provided by Mind Gym to you as a client. Please click on the link below to read the document. To confirm that you agree to the terms and conditions tick the check box next to \'I have read and understood the terms and conditions and agree to be bound by their terms\' and submit the form.</p>');
  
  // Terms document
  var termsFile = nlapiLoadFile(this._record.getFieldValue('custentity_cli_termsdoc'));
  echo('<p>');
  echo('<a class="icon" href="' + termsFile.getURL() + '" target="_blank">');
  echo('<img src="https://system.netsuite.com/core/media/media.nl?id=715&c=720154&h=9bb92e7ad6e1327c1ab4" alt="Terms and Conditions" align="absmiddle" />');
  echo('<span class="desc">Download Terms and Conditions</span>');
  echo('</a>');
  echo('</p>');

  echo('<p class="terms">');
  renderField(this._data['custentity_clifrm_agreedterms'], true);
  echo('</p>');

  renderField(this._data['prospect_id'], true);
  renderField(this._data['contact_id'], true);
  echo('<div class="buttons">');
  echo('<p><input type="submit" class="submit" value="Submit form"></p>');
  echo('</div>');
  echo('</form>');
}

/**
 * Validate form
 *
 * @return void
 */
sweet_Form.prototype.validate = function()
{
  for (i in this._data) {
    if (this._data[i].required) {
      if (isEmpty(this._data[i].value)) {
        this._data[i].error = true;
        this._numErrors++;
      }
    }
  }
}

/**
 * Save record
 *
 * @return void
 */
sweet_Form.prototype.saveRecord = function(subsidiary)
{
	try 
	{
		// Set fields
		  for (i in this._data) {
		    if (!this._data[i].save) {
		      continue;
		    }
		    var value = null;
		    switch (this._data[i].type) {
		      case 'checkbox':
		        value = isEmpty(this._data[i].value) ? 'F' : 'T';
		        break;
		      case 'paymentmethod':
		        switch (this._data[i].value) {
		          case '1':
		            value = 'Invoice';
		            break;
		          case '2':
		            value = 'Invoice + Purchase no.';
		            break;          
		          case '3':
		            if(subsidiary != 3) {
		              value = 'Credit/debit card';
		              break;
		            }
		        break;
		      }
		    }
		    
		    if (value == null) {
		      value = isEmpty(this._data[i].value) ? '' : String(this._data[i].value).substring(0, 299);
		    }
		    this._record.setFieldValue(this._data[i].name, value);
		  }
		  
		  //passing in 3rd parameter to ignore mandatory field
		  nlapiSubmitRecord(this._record, true, true);
	}
	catch (recsaveerr)
	{
		var errMsg = '';
		if (recsaveerr instanceof nlobjError) {
			nlapiLogExecution('error', 'Exception', recsaveerr.getCode() + ' :: ' + recsaveerr.getDetails());
			errMsg = recsaveerr.getCode() + ' :: ' + recsaveerr.getDetails();
		} else {
			nlapiLogExecution('error', 'Exception', recsaveerr.toString());
			errMsg = recsaveerr.toString();
		}
		throw nlapiCreateError('TCSAVEERR', 'Error saving record. '+errMsg, false);
	}
  
};

/**
 * A simple alias to response.writeLine
 *
 * @param {String} string
 */
function echo(string)
{
  response.writeLine(string);
}



/**
 * Output html header
 *
 */
function echoHeader()
{
  echo('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">');
  echo('<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">');
  echo('<head>');
  echo('<title>Mind Gym - Open new account</title>');
  echo('<link rel="stylesheet" type="text/css" media="screen" href="https://system.netsuite.com/core/media/media.nl?id=709&c=720154&h=6d678479a3cf85f6647e&_xt=.css" />'); // reset.css
  echo('<link rel="stylesheet" type="text/css" media="screen" href="https://system.netsuite.com/core/media/media.nl?id=704&c=720154&h=a7bc2f252a8852604aa2&_xt=.css" />'); // themindgym.css
  echo('<link rel="stylesheet" type="text/css" media="screen" href="https://system.netsuite.com/core/media/media.nl?id=707&c=720154&h=6e629836c682ca0dd377&_xt=.css" />'); // forms.css
  echo('<link rel="shortcut icon" href="https://system.netsuite.com/core/media/media.nl?id=714&c=720154&h=6a03f54d4fbe5e75c005&_xt=.ico" />'); // favicon.ico
  echo('</head>');
  echo('<body><div id="container">');
  echo('<div id="header"><div id="logo"><a title="Mind Gym" href="/">Mind Gym</a></div></div>');
  echo('<div id="frame-top"></div>');
  echo('<div id="content"><div id="without-promo-panel"><div id="main">');
  echo('<br />');
  echo('<h1><span>Open new account</span></h1>');
}

/**
 * Output html footer
 *
 */
function echoFooter()
{
  echo('</div></div></div>');
  echo('<div id="frame-bottom"></div></div>');
  echo('</body></html>');
}

/**
 * Render field
 *
 * @param {Object} field
 * @param {Boolean} print
 * @return {String}
 */
function renderField(field, print, subsidiary)
{
  var out = '';
  switch (field.type) {
    case 'text':
      out = renderTextField(field);
      break;
    case 'checkbox':
      out = renderCheckboxField(field);
      break;
    case 'country':
      out = renderCountryField(field);
      break;
    case 'paymentmethod':
      out = renderPaymentMethodField(field, subsidiary);
      break;
    case 'hidden':
      out = renderHiddenField(field);
      break;
  }
  if (!print) {
    return out;
  }
  echo(out);
}

/**
 * Render text field
 *
 * @param {Object} field
 * @return {String}
 */
function renderTextField(field)
{
  var value = isEmpty(field.value) ? '' : field.value;
  var input = '';
  
  if (field.label) {
    var label = '<label class="' + (field.required ? 'required ' : '');
    label += (field.error ? 'error' : '') + '" ';
    label += 'for="' + field.name + '">' + field.label;
    label += (field.error ? '*' : '') + '</label>';
    input += label;
  }
  
  input += '<input type="text" ';
  input += 'class="large textbox' + (field.error ? ' error' : '') + '"';
  input += 'id="' + field.name + '" ';
  input += 'name="' + field.name + '" ';
  input += 'value="' + value + '" ';
  input += 'size="' + field.size + '" />';
  return input;
}

/**
 * Render check box field
 *
 * @param {Object} field
 * @return {String}
 */
function renderCheckboxField(field)
{
  var input = '';
  var checked = isEmpty(field.value) ? false : true;
  input += '<input type="checkbox" ';
  input += 'id="' + field.name + '" name="' + field.name + '"';
  input += (checked ? ' checked' : '') + '/> ';
  
  input += '<label class="checkbox' + (field.required ? ' required' : '');
  input += (field.error ? ' error' : '') + '" for="' + field.name + '">';
  input += field.label + (field.error ? '*' : '') + '</label>';
  return input;
}

/**
 * Render hidden field
 *
 * @param {Object} field
 * @return {String}
 */
function renderHiddenField(field)
{
  var input = '';
  var value = isEmpty(field.value) ? '' : field.value;
  input += '<input type="hidden" id="' + field.name + '" name="';
  input += field.name + '" value="' + value + '" />';
  return input;
}
/**
 * Render country field
 *
 * @param {Object} field
 * @return {String}
 */
function renderCountryField(field)
{
  var select = '';
  var value = isEmpty(field.value) ? '' : field.value;
  countries = nlapiSearchRecord('customrecord_country', 'customsearch_country_list', null, null);
  var labelClass = (field.required ? 'required ' : '') + (field.error ? 'error' : '');
  var selectClass = (field.error ? ' error' : '');
  
  select += '<label class="' + labelClass + '" for="' + field.name + '">';
  select += field.label + (field.error ? '*' : '') + '</label>';
  select += '<select id="' + field.name + '" name="' + field.name + '" class="custom-select felment">';
  select += '<option value="">Select&nbsp;&gt;</option>';

  for (var i = 0; (countries != null) && (i < countries.length); i++) {
    var countryId = countries[i].getId();
    var countryName = countries[i].getValue('name');
    var selected = (countryId == value) ? 'selected="selected"' : '';
    select += '<option value="' + countryId + '" ' + selected + '>' + countryName + '</option>';
  }
  
  select += '</select>';
  return select;
}

/**
 * Render payment method field
 *
 * @param {Object} field
 * @return {String}
 */
function renderPaymentMethodField(field, subsidiary)
{
  var select = '';
  var value = isEmpty(field.value) ? '' : field.value;
  var labelClass = (field.required ? 'required ' : '') + (field.error ? 'error' : '');
  var selectClass = (field.error ? ' error' : '');
  select += '<label class="' + labelClass + '" for="' + field.name + '">';
  select += field.label + (field.error ? '*' : '') + '</label>';
  select += '<select class="custom-select" id="' + field.name + '" name="' + field.name + '"><option value="">Select&nbsp;&gt;</option>';
  select += '<option value="1"' + (value == '1' ? ' selected="selected"' : '') + '>Invoice</option>';
  select += '<option value="2"' + (value == '2' ? ' selected="selected"' : '') + '>Invoice + Purchase order no.</option>';
  if(subsidiary != 3) {
    select += '<option value="3"' + (value == '3' ? ' selected="selected"' : '') + '>Credit/debit card</option>';
  }
  select += '</select>';
  return select;
}

/**
 * Output input error
 *
 * @params {String} name
 * @params {Object} errors
 * @return void
 */
function echoInputError(name, errors)
{
  if (errors.items[name] != undefined) {
    echo('<span class="error">*' + errors.items[name] + '</span>');
  }
}

/**
 * Check if a prospect has completed the form
 *
 * @param {Object} prospect
 * @return bool
 */
function hasCompletedForm(prospect, manual)
{
	//Tix 3315. We need to check both 
	var completedForm = false;
	
	if (manual == 'F')
	{
		//This is in Manual mode. check for custentity_clifrm_billinginforec
		if (prospect.getFieldValue('custentity_clifrm_agreedterms') == 'T')
		{
			//User has accepted T
			completedForm = true;
		} 
	}
	else
	{
		//This is in T&C mode. check for custentity_clifrm_agreedterms
		if (prospect.getFieldValue('custentity_clifrm_billinginforec') == 'T')
		{
			//User has accepted T
			completedForm = true;
		}
	}
	
	//Return out only after both fields are reviewed based on manual flag
	return completedForm;
}

/**
 * Output form is completed message
 *
 * @return void
 */
function echoFormIsCompleted()
{
  echoHeaderNew();
  echo('<div class="main">');
  echo('<h2>We already have your details</h2>');
  echo('<p>According to our records your organisation has already filled in this form.</p>');
  echo('<p>If you have any questions about the process please <a href="http://www.themindgym.com/contact">contact us</a>.</p>');
  echo('<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>');
  echo('<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>');
  echo('<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>');
  echo('</div>');
  echoFooterNew();
}

/**
 * Output thank you message
 *
 * @return void
 */
function echoThankYou()
{
  echoHeaderNew();
  echo('<div class="main">');
  echo('<h2>Thank you</h2>');
  echo('<p>We have received your details and will be in contact soon.</p>');
  echo('<p>If you have any questions about the process don\'t hesitate to <a href="http://www.themindgym.com/contact">contact us</a>.</p>');
  echo('<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>');
  echo('<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>');
  echo('<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>');
  echo('</div>');
  echoFooterNew();
}

function POST(name)
{
  if (request.getMethod() == 'POST') {
    return request.getParameter(name);
  }
}

/**
 * Check if variable is empty
 *
 * @param {Mixed} variable
 * @return bool
 */
function isEmpty(x)
{
  return (x == undefined || x == null || x == '');
}

/**
 * Send notification email (receipt)
 *
 * @param {Object} prospect
 * @param {String} contactId
 * Sept 22 2015 - Tix 3315
 * Add in manual flag which indicates if it was Billing Information Request ONLY.
 * Based on this, make sure the email notification includes proper info
 * @return {void}
 */
function sendNotificationEmail(prospect, contactId, manual)
{
  try {
    // Receipt To fields
    var recipientId = prospect.getFieldValue('custentity_cli_receipttoemployee');
    var recipientFields = nlapiLookupField('employee', recipientId, ['firstname', 'lastname']);
    
    // Contact fields
    var contactFields = nlapiLookupField('contact', contactId, ['firstname', 'lastname']);
    var contactName = contactFields.firstname + ' ' + contactFields.lastname;
    
    // Create subject and body
    var subject = contactName + ' has accepted T&C';
    
    var body = 'Hi ' + recipientFields.firstname + ', ' + "\r\n\r\n";
    body += contactName + ' has accepted the terms and conditions on behalf of ';
    body += prospect.getFieldValue('companyname') + ' (' + prospect.getFieldValue('entityid') + '). ';
    body += "\r\n\r\n";
    body += '/NetSweet';
    body += "\r\n\r\n" + 'CODE: NETSUITE_NOTIFICATION_TC_ACCEPTANCE';
    
    //tix 3315
    //If manual is set to T, change subject to has submitted Billing INfo
    if (manual == 'T')
    {
    	subject = contactName + ' has completed Billing Information';
    	
    	body = 'Hi ' + recipientFields.firstname + ', ' + "\r\n\r\n";
        body += contactName + ' has completed billing information on behalf of ';
        body += prospect.getFieldValue('companyname') + ' (' + prospect.getFieldValue('entityid') + '). ';
        body += "\r\n\r\n";
        body += '/NetSweet';
        body += "\r\n\r\n" + 'CODE: NETSUITE_NOTIFICATION_BILLINGINFO';
    }
    
    // Associate email with prospect
    var records = new Array();
    records['entity'] = prospect.getId();
    
    // Send
    nlapiSendEmail(recipientId, recipientId, subject, body, null, null, records);
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
    // Don't stop
  }
}