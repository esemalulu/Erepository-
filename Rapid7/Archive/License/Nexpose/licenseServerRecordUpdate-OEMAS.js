/**
 * COPYRIGHT (C) 2008-2009, Rapid7 LLC, Boston, MA, USA.
 * All rights reserved. This material contains unpublished, copyrighted
 * work including confidential and proprietary information of Rapid7.
 *
 * This suite script is responsible for processing new and edited
 * NetSuite records and communicating those changes with the licensing
 * server.
 *
 * To accomplish this, there are a number of set fields (used in the
 * code below) called internal IDs.  These internal IDs *MUST NOT
 * CHANGE* in the NeXpose Licensing record type definition or this
 * script will break.
 *
 * Also, there is a bit of magic dealing with the permittance logic.
 * Basically, if a request comes in, fields such as the order type (in
 * NetSuite this is called the license 'Purpose') are validated such
 * that only specific roles can use them.  For example, we use the
 * role ID 1029 (web services customer, such as secureworks) to limit
 * who can use the 'partner' (OEM partner) order type.
 *
 * @author Derek Abdine
 */

/**
 * This is a generic message we provide to our parnters in the
 * event of an unrecoverable failure during record creation (this
 * script execution).
 */
var defaultFailMsg = 
   'Failed to create license.  Please contact Rapid7 Support';

/** The name of the NeXpose licensing record type */
var licRecName = "customrecordr7nexposelicensing";

/**
 * The function called before a submit action on the licensing form.
 * 
 * @param type The type of action being performed (must be create).
 *
 * @throws nlobjError If an error occurs.
 */
function afterSubmitLicenseToLicensingServer(type)
{
	cv = nlapiGetContext().getExecutionContext();
	nlapiLogExecution('DEBUG','Execution Context & Type',cv + " " + type);
	if(cv!='webservices') return;
	
   nlapiLogExecution('DEBUG','Type',type);		
		
   // Retreive the record that is going to be created.
   var rec = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
	
  			
	
	
   // Get the submitter's role.
   var role = nlapiGetRole();

   // Make sure we were fired for a create event.
   if (type == 'create' || type == 'edit')
   {
   		//Change made on 7.24
		var ctx = nlapiGetContext();
		var context = ctx.getExecutionContext();
		var role = ctx.getRole();
		var name = ctx.getName();
		var company = ctx.getCompany();
	
		nlapiLogExecution('DEBUG',' Context:'+context+' Role:'+role,"Name:"+name+" Company:"+company);
	
      // Determine if there is currently a record for the provided
      // product key
      var pkey = getValidFieldValue(rec, 'custrecordr7nxproductkey');
		
	 if(pkey!=null && pkey!=''){
	 	nlapiLogExecution('DEBUG','Record already has product key','exiting');
		//nlapiSendEmail(2,2,'BeforeSubmitWorked Quitting AfterSubmit','AfterSubmit no longer needed :(','derek_zanga@rapid7.com');
	 	return;
	 }	
	

      // Do NOT allow web services customers to edit records.  We want
      // them to create new records every time.
      if (role == 1029 || role == 1033)
      {
         if (type == 'edit')
         {
            throw nlapiCreateError(
               'REQUEST_FAILED',
               'OEM partner accounts cannot edit records. ' +
               'You must create new records for updates and specify ' + 
               'the product key to identify the record to update.',
               false);
         }

         /*
          * TODO:  Try to retrieve existing record and populate all
          * fields from that record.  For now OEM partners will have
          * to do this in their client code.
          */
      }
		
		if (context == 'webservices') {
			doRecordNew(rec, pkey, role);
		}
   }
   else
   {
      throw nlapiCreateError(
         'FEATURE_UNAVAILABLE',
         'Cannot trigger actions on anything other than create or edit',
         false);
   }
}

/**
 * Establishes a new record.  The product key in the parameter list
 * is used to key the record.  In this sense, a record is functionally
 * updated on the licensing server.
 * 
 * @param rec The new record to be established.
 * @param lc The product key for the record.
 */
function doRecordNew(rec, lc, role)
{
   var fv;
   var formParams = new Array();

   // First, set the license model.  This is either node limited
   // (GENLIC) or fixed (GENFIXEDIPLIC).  The two aforementioned
   // constants are actually defined in the license generation
   // server.
   fv = getValidFieldValue(rec, 'custrecordr7nxlicensemodel');
   if (fv == '1') // Node limited.
      formParams['licenseModel'] = 'GENLIC';
   else if (fv == '2') // Fixed IP.
   {
      if (role == 1029 || role == 1033)
         throw nlapiCreateError(
            'REQUEST_FAILED',
            'Not authorized to create fixed IP licenses',
            true);

      formParams['licenseModel'] = 'GENFIXEDIPLIC';
   }
   else
      throw nlapiCreateError(
         'REQUEST_FAILED',
         'Could not determine license model.',
         false);
 
   // If the product key is not null, set it, so we can update the
   // record on the licensing server.
   if (lc != null)
      formParams['productKey'] = lc;

   // Determine how the customer and contact name fields are populated
   // in the actual license by the role id.
   if (role == 1029 || role == 1033) 
   {
      // R7 Web Services Customer (and their test account).  Their
      // customer ID and contact names are the OEM reference
      // parameter as they do not have access to the customer records
      // list OR the contacts list (those are internal to us).
      var customer = getValidFieldValue(rec,
         'custrecordr7nxoemreference');
      if (customer == null || customer == '')
         customer = getCustomerCompanyName(
            getValidFieldValue(rec, 
               'custrecordr7nxlicensecustomer'));

      formParams['customerID'] = formParams['contactName'] = customer;
   }
   else
   {
      // Regular Rapid7 user role.  Any Rapid7 user creating licenses
      // should have access to both the customer and contact records.
      // If not, NetSuite will throw an error back when it attempts to
      // execute this portion of the code.
      formParams['customerID'] = 
         getCustomerCompanyName(
            getValidFieldValue(rec,
               'custrecordr7nxlicensecustomer'));

      var contact = getCustomerContactName(
         getValidFieldValue(rec,
            'custrecordr7nxlicensecontact'));
      if (contact == null || contact == '')
         contact = formParams['customerID'];
      
      formParams['contactName'] = contact;
   }

   // Get the license purpose (i.e., internal, purchased, test, etc.)
   fv = getValidFieldValue(rec, 'custrecordr7nxordertype');
   var ifv;
   try
   {
      ifv = parseInt(fv);
   }
   catch (e)
   {
      throw nlapiCreateError(
         'REQUEST_FAILED',
         'Could not parse order type',
         true);
   }

   // Depending on the order type we'll chose the corresponding value
   // the licensing server wants...
   switch (ifv)
   {
      case 1:
      case 2: // evaluation
      case 6: // evaluation - vm
      case 3:
         // Only Rapid7 can create licenses of these types.
         if (role == 1033 || role == 1029)
            throw nlapiCreateError(
               'REQUEST_FAILED',
               'Invalid license purpose for your role.',
               true);
         switch (ifv)
         {
            case 1:
               formParams['orderType'] = 'paid';
               break;
            case 2:
            case 6:
               formParams['orderType'] = 'evaluation';
               formParams['EVALUATION'] = '1';
               break;
            case 3:
               formParams['orderType'] = 'internal';
               break;
            default: 
               // Should never happen...
               throw nlapiCreateError(
                  'REQUEST_FAILED',
                  'Fatal error determining license purpose',
                  false);
         }
         break;
      case 4:
         // Web services customers are the only entities that can
         // create partner license types.
         if (role != 1029) // Web services partner account.
            throw nlapiCreateError(
               'REQUEST_FAILED',
               'Invalid license purpose for your role.',
               true);
         formParams['orderType'] = 'partner';
         break;
      case 5:
         // Web services customers are the only entities that can
         // create test license types (for now).
         if (role != 1033) // Web services partner test account.
            throw nlapiCreateError(
               'REQUEST_FAILED',
               'Invalid license purpose for your role.',
               true);
         formParams['orderType'] = 'test';
         break;
      default:
         throw nlapiCreateError(
            'REQUEST_FAILED',
            'Could not determine order type',
            true);
   }

   // Set the number of nodes (node limited license only)
   formParams['numberOfNodes'] = 
      getValidFieldValue(rec,
         'custrecordr7nxlicensenumberips');

   // Set the number of nodes for the hosted engine (node limited
   // license only).
   formParams['numberOfHostedNodes'] = 
      getValidFieldValue(rec,
         'custrecordr7nxlicensenumberhostedips');

   // Set the fixed IP ranges for internal scanning.
   formParams['addresses'] = 
      getValidFieldValue(rec,
         'custrecordr7nxinternalfixedips');

   // Set the fixed IP ranges for hosted scanning.
   formParams['hostedAddresses'] = 
      getValidFieldValue(rec,
         'custrecordr7nxhostedfixedips');

   // Set the expiration date.  Netsuite gives this to us in
   // MM/DD/YY format, but we need to send it as
   // YYYYMMDD'T'hhmmssSSS
   var dt = getValidFieldValue(rec, 
      'custrecordr7nxlicenseexpirationdate');

   if (dt != null)
   { 
      try
      {
         formParams['validTo'] = formatISO8601(new Date(dt));
      }
      catch (e)
      {
         nlapiLogExecution(
            'DEBUG',
            'An error occured while attempting to parse a date',
            e);

         throw nlapiCreateError(
            'REQUEST_FAILED',
            'Could not parse date.',
            true);
      }
   }

   // Set the scan engine count.
   formParams['scanEngineCount'] = 
      getValidFieldValue(rec,
         'custrecordr7nxnumberengines');

   // Enable the web scan license option.
   fv = rec.getFieldValue('custrecordr7nxwebscan');
   if (fv != null && (fv == 1 || fv == 'T'))
      formParams['WEBSCAN'] = '1';

   // Enable the config policy scanning licensed option.
   fv = rec.getFieldValue('custrecordr7nxpolicy');
   if (fv != null && (fv == 1 || fv == 'T'))
      formParams['POLICYSCAN'] = '1';

   // Enable the PCI option if necessary.
   fv = rec.getFieldValue('custrecordr7nxlicensepcitemplate');
   if (fv != null && (fv == 1 || fv == 'T'))
   {
      if (role == 1029 || role == 1033)
         throw nlapiCreateError(
            'REQUEST_FAILED',
            'Not authorized to use the PCI option',
            true);

      formParams['PCI'] = '1';
      if (formParams['WEBSCAN'] != '1')
         throw nlapiCreateError(
            'REQUEST_FAILED',
            'The PCI template requires the Web Scanning option',
            true);
   }

   // Enable the Exploits option
   fv = rec.getFieldValue('custrecordr7nxmetasploit');
   if (fv != null && (fv == 1 || fv == 'T'))
   {
      if (role == 1029 || role == 1033)
         throw nlapiCreateError(
            'REQUEST_FAILED',
            'Not authorized to use the EXPLOITS option',
            true);
      formParams['EXPLOITS'] = '1';
   }

   // Enable the mssp discovery option if necessary.
   fv = rec.getFieldValue('custrecordr7nxlicensediscoverylicense');
   if (fv != null && (fv == 1 || fv == 'T'))
   {
      if (role == 1029 || role == 1033)
         throw nlapiCreateError(
            'REQUEST_FAILED',
            'Not authorized to use the DISCOVERY option',
            true);

      formParams['Discovery'] = '1';
   }

   // Enable the mssp discovery option if necessary.
   fv = rec.getFieldValue('custrecordr7nxmsspdiscovery');
   if (fv != null && (fv == 1 || fv == 'T'))
   {
      if (role != 1029 && role != 1033)
         throw nlapiCreateError(
            'REQUEST_FAILED',
            'Not authorized to use the MSSPDISCOVERY option',
            true);

      formParams['MSSPDISCOVERY'] = '1';
   }

   // Enable the scada option if necessary.
   fv = rec.getFieldValue('custrecordr7nxscada');
   if (fv != null && (fv == 1 || fv == 'T'))
   {
      if (role == 1029 || role == 1033)
         throw nlapiCreateError(
            'REQUEST_FAILED',
            'Not authorized to use the SCADA option',
            true);

      formParams['SCADA'] = '1';
   }

   // Enable the express license option.
   fv = rec.getFieldValue('custrecordr7nxexpress');
   if (fv != null && (fv == 1 || fv == 'T'))
   {
      if (role == 1029 || role == 1033)
         throw nlapiCreateError(
            'REQUEST_FAILED',
            'Not authorized to use the EXPRESS option',
            true);

      formParams['EXPRESS'] = '1';
      var nodenum = formParams['numberOfNodes'];
      if (nodenum != undefined && nodenum > 2000)
         throw nlapiCreateError(
            'REQUEST_FAILED',
            'Express licenses cannot have more than 2000 IPs',
            true);
   }
   else if (role == 1029 || role == 1033) // OEM customers
   {
      formParams['OEM'] = '1';

      // Also force-add the policyscan/webscan options for them.
      formParams['POLICYSCAN'] = '1';
      formParams['WEBSCAN'] = '1';

      // NOTE:  enterprise isn't explicitly added because it is
      // assumed if EXPRESS does not exist.
      if (formParams['MSSPDISCOVERY'] == 1)
      {
         var numNodes = formParams['numberOfNodes'];
         rec.setFieldValue('custrecordr7nxlicensetemplicensecount',
            numNodes);
         formParams['numberOfNodes'] = '65536';
         rec.setFieldValue('custrecordr7nxlicensenumberips', 
            formParams['numberOfNodes']);
      }
   }
   else // (!express && !oem) == enterprise
      formParams['ENTERPRISE'] = '1';
     
   var response = null;
   try
   {
	  
	  var headers = new Array();
      // Authorize... crude, I know, but necessary.  The traffic is
      // over SSL so we don't have to worry about the creds being
      // discovered.
	  //license.rapid7.com replaced by 67.110.152.71
	  
	  var endPoint = nlapiGetContext().getSetting('SCRIPT','custscriptnxendpoint');
	  nlapiLogExecution('DEBUG','End Point',endPoint);
	 
	  
      headers['Authorization'] = 'Basic cjdsaWNlbnNlOnAxM1xDRTBmI20xTmQk';
      response = nlapiRequestURL(
         endPoint,
         formParams,
         headers);
	
	
	//Only change made on 7/24/2010
	//nlapiSendEmail(2,'derek_abdine@rapid7.com','XML from licensing server',response.getBody(),'derek_zanga@rapid7.com');	 
		 
   }
   catch (e)
   {
      // You'll see a lot of this because we need to log this error
      // in NetSuite, but give the user some vague message that
      // just tells them that something is wrong.  This way, we
      // won't divulge any sensitive info (like the server
      // address).
      nlapiLogExecution(
         'EMERGENCY',
         'A request to license has failed',
         e);

      throw nlapiCreateError(
         'REQUEST_FAILED', defaultFailMsg, true);
   }

   // Make sure the license server didn't throw an error back to
   // us.  If it did, yell at the user.
   if (response == null || response.getCode() != 200)
   {
      var msg;
      if (response == null)
         msg = "The response is null";
      else
         msg = response.getBody();

      nlapiLogExecution(
         'DEBUG',
         'The license server is responding with non-200',
         msg);

      throw nlapiCreateError(
         'REQUEST_FAILED', nlapiEscapeXML(msg), false);
   }

   var error = response.getError();
   if (error != null)
   {
      nlapiLogExecution(
         'EMERGENCY',
         'An error occurred while attempting to submit a license',
         error);

      throw nlapiCreateError(
         'REQUEST_FAILED', defaultFailMsg, true);
   }

   // All should be OK, so parse the XML doc the server should have
   // supplied us.
   var doc = null;
   try
   {
      doc = nlapiStringToXML(response.getBody());
   }
   catch (e)
   {
      nlapiLogExecution(
         'EMERGENCY',
         'An error occurred while attempting to parse the response doc',
         e);

      throw nlapiCreateError(
         'REQUEST_FAILED', defaultFailMsg, true);
   }

   // A null doc can't possibly be good...
   if (doc == null)
      throw nlapiCreateError(
         'REQUEST_FAILED', 
         'Could not understand license response',
         false);

   // Detect any errors...
   var errorMsg = nlapiSelectValue(doc, '//message');
   if (errorMsg != null)
   {
      nlapiLogExecution(
         'DEBUG',
         'An error occurred while attempting to generate a license',
         nlapiSelectValue(doc, '//stacktrace'));

      throw nlapiCreateError(
         'REQUEST_FAILED',
         errorMsg,
         true);
   }

   // Retrieve the product key, license serial number and product
   // serial number...
   var pkey = nlapiSelectValue(doc, '//productKey');
   var productSN = nlapiSelectValue(doc, '//productSN');
   var licenseID = nlapiSelectValue(doc, '//licenseID');
   var obsLicenseID = nlapiSelectValue(doc, '//obsoletedLicenseID');
	
   // Verify the product key.
   if (pkey == null || pkey.length < 1)
      throw nlapiCreateError(
         'REQUEST_FAILED', 
         'Product key generated is invalid.',
         false);

   // Verify the product serial number.
   if (productSN == null || productSN.length < 1)
      throw nlapiCreateError(
         'REQUEST_FAILED',
         'Product serial number is invalid.',
         false);

   // Verify the license serial number.
   if (licenseID == null || licenseID.length < 1)
      throw nlapiCreateError(
         'REQUEST_FAILED',
         'License serial number is invalid.',
         false);

	nlapiLogExecution('DEBUG','Serial No',licenseID);
	nlapiLogExecution('DEBUG','Product Serial No',productSN);
	nlapiLogExecution('DEBUG','Product Key',pkey);


   // They seem OK, so let's set them on the record...
   rec.setFieldValue('custrecordr7nxlicenseserialnumber',
      licenseID);
   rec.setFieldValue('custrecordr7nxproductserialnumber',
      productSN);
   rec.setFieldValue('custrecordr7nxproductkey', pkey);
   
   
   try{
		nlapiSubmitRecord(rec,null,false);
		nlapiSendEmail(2,2,'AfterSubmit Got License Details','After Submit saved the Day!','derek_zanga@rapid7.com');
	}catch(err){
		throw nlapiCreateError(
         err.name,
         err.message + " " + err,
         false);
	}

   // And we're done!
}

/**
 * Retrieves a valid filed value whose name is {@code fieldName} from
 * the record {@code record}.
 *
 * @param record The record which contains the value.
 * @param fieldName The name of the field containing the value.
 *
 * @return The value of the field, never {@code null}.
 */
function getValidFieldValue(record, fieldName)
{
   var tmp = record.getFieldValue(fieldName);
   if (tmp == null)
      tmp = "";
   return tmp;
}

/**
 * Retrieves the company name value from a customer record ID.
 *
 * @param recID The customer record ID.
 *
 * @return The value of the field, never {@code null}.
 */
function getCustomerCompanyName(recID)
{
   var rec = nlapiLoadRecord('customer', recID);
   return getValidFieldValue(rec, 'companyname');
}

/**
 * Retrieves the company name value from a customer record ID.
 *
 * @param recID The customer record ID.
 *
 * @return The value of the field, never {@code null}.
 */
function getCustomerContactName(recID)
{
   if (recID == null || recID == '') 
      return '';

   var rec = nlapiLoadRecord('contact', recID);
   return getValidFieldValue(rec, 'entityid');
}

/**
 * Formats the provided number to the specified precision.
 * 
 * @param n The number to format.
 * @param precision The precision.
 * 
 * @return The formatted number string.
 */
function formatNumber(n, precision)
{
   var s = '' + n;
   for (var i = s.length; i < precision; i++)
   {
      s = '0' + s;
   }
   return s;
}

/**
 * Returns an ISO 8601 format date string for a provided date object.
 *
 * @param date The date.
 */
function formatISO8601(dt)
{
   var yr = formatNumber(dt.getUTCFullYear(), 4);
   var mo = formatNumber(dt.getUTCMonth() + 1, 2);
   var dt = formatNumber(dt.getUTCDate(), 2);

   return yr + mo + dt + 'T000000000';
}
