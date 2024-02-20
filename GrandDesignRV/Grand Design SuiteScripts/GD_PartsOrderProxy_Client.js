/* 
 * GD Client Scripts for the Parts Order Proxy Record - runs after RVS Scripts (RVS_PartsOrderProxy_Client.js)
 * 
 * This is a pass-through record that is never saved. It creates estimates from the dealer portal
 * 
 * This is in 1.0 because Client 2.0 Scripts don't run in the portal
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 July 2019    Lydia Miller
 *
 */
var GD_WEBORDER_REQUESTER = 'custbodygd_dealerportalrequester';

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function GD_PartsOrderProxy_PageInit(type)
{
 	var dealer = nlapiGetUser();
 	
	//The RVS code sets the bill and ship address from the dealer in page init.
	//This page init runs after the RVS version, so we're re-setting the ship address
	//To the custom GD Parts Shipping Address fields here.
	SetPartsShipAddressFromDealer(dealer);
	
	//Set the GD Unit field from the RVS Unit field first thing.
		//Grand Design uses a GD specific, filtered Unit field where Current Shipping Date must be set, Shipping Status must be 
		//"Shipped," and Inactive must be false. It might be a concern then, to set the value of the RVS field, which is unfiltered,
		//into a filtered field, but there's no way the RVS field could be an illegal value since the only way the RVS field can
		//be set is from the GD field on field changed, or if this parts order was created from a parts inquiry, but the parts 
		//inquiry unit field is filtered the same way, so this should always be safe. 
	nlapiSetFieldValue('custrecordpartsorderproxy_gd_vin', nlapiGetFieldValue('custrecordpartsorderproxy_vin'), true, true);
}


/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function GD_PartsOrderProxy_FieldChanged(type, name, linenum)
{	

	//Whenever the GD Unit field is changed, change the RVS one too. 
	if (name == 'custrecordpartsorderproxy_gd_vin')
	{
		nlapiSetFieldValue('custrecordpartsorderproxy_vin', nlapiGetFieldValue('custrecordpartsorderproxy_gd_vin'), true, true);
	}
	
	//If they change the on-the-fly filtered dealer field, set the actual proxy record dealer field too. 
	if(name == 'custpagegd_weborder_dealer')
	{		
		var newDealer = nlapiGetFieldValue('custpagegd_weborder_dealer');

		//Set the RVS proxy dealer field. Dealer phone, fax, email and terms source from this field. 
		nlapiSetFieldValue('custrecordpartsorderproxy_dealer',newDealer);

		//Set bill and ship address from dealer
		SetBillAddressFromDealer(newDealer);
		SetPartsShipAddressFromDealer(newDealer);
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Boolean} True to continue changing field value, false to abort value change
 */
function GD_PartsOrderProxy_ValidateField(type, name, linenum){
    if (name == 'custrecordpartsorderproxy_gd_vin')
    {
        var unitId = nlapiGetFieldValue(name);
        if (unitId != null && unitId != '')
        {
	        var lookupField = nlapiLookupField(UNIT_RECORD_TYPE, unitId, ['custrecordgd_legalcasepending']);
	        if (lookupField.custrecordgd_legalcasepending == 'T')
	        {
	            var center = nlapiGetContext().getRoleCenter();
	            if (center.toLowerCase() == 'customer')
	            {
	                alert('This unit file is locked, please contact Grand Design Warranty Department.');
	                nlapiSetFieldValue(name, null);
	                return false;
	            }
	            else
	            {
	                var userId = nlapiGetUser();
	                var userLookupField = nlapiLookupField('employee', userId, ['custentitygd_haslegalpermission']);
	                if (userLookupField.custentitygd_haslegalpermission != 'T')
	                {
	                    alert('This unit file is locked, please consult with the Consumer Affairs department.');
	                    nlapiSetFieldValue(name, null);
	                    return false;
	                }
	            }
	        }
	    }
    }
    return true;
}

//********************************** BEGIN HELPER METHODS *************************************//

/**
 * Sets custom billing address fields on the form from the dealer's default billing address.
 * 
 *
 * @param dealer
 */
function SetBillAddressFromDealer(dealer)
{
	var filters = [];
	filters.push(new nlobjSearchFilter('internalid', null, 'anyof', dealer));
	filters.push(new nlobjSearchFilter('isdefaultbilling', null, 'is', 'T'));

	var columns = new Array();
	columns.push(new nlobjSearchColumn('address','billingAddress'));
	columns.push(new nlobjSearchColumn('addressee','billingAddress'));
	columns.push(new nlobjSearchColumn('address1','billingAddress'));
	columns.push(new nlobjSearchColumn('address2','billingAddress'));
	columns.push(new nlobjSearchColumn('city','billingAddress'));
	columns.push(new nlobjSearchColumn('state','billingAddress'));
	columns.push(new nlobjSearchColumn('zipcode','billingAddress'));
	columns.push(new nlobjSearchColumn('country','billingAddress'));
	columns.push(new nlobjSearchColumn('addressphone','billingAddress'));			

	var billResults = SearchRecord_Suitelet('customer', null, filters, columns);	
	var ba = billResults[0].columns;
	
	var billCountry = '';
	if(ba.hasOwnProperty('country'))
		billCountry = ConvertNSCountryToRVSCountry(ba.country.internalid);

	var billState = '';
	if(ba.hasOwnProperty('state'))
		billState = ConvertNSStateToRVSState(ba.state.name, ba.country.internalid);

	nlapiSetFieldValue('custrecordpartsorderproxy_billaddressee', ba.addressee);
	nlapiSetFieldValue('custrecordpartsorderproxy_billaddr1', ba.address1);
	nlapiSetFieldValue('custrecordpartsorderproxy_billaddr2', ba.address2);
	nlapiSetFieldValue('custrecordpartsorderproxy_billcity', ba.city);
	nlapiSetFieldValue('custrecordpartsorderproxy_billstate', billState);
	nlapiSetFieldValue('custrecordpartsorderproxy_billzip', ba.zipcode);
	nlapiSetFieldValue('custrecordpartsorderproxy_billcountry', billCountry);
	nlapiSetFieldValue('custrecordpartsorderproxy_billphone', ba.addressphone);
}

/**
 * Sets custom shipping address fields on the form from the grand design specific dealer parts shipping address fields.
 *
 * @param dealer
 */
function SetPartsShipAddressFromDealer(dealer)
{
	filters = [new nlobjSearchFilter('internalid', null, 'anyof', dealer)];
	
	columns = new Array();
	columns.push(new nlobjSearchColumn('custentitygd_partsshipaddressee'));
	columns.push(new nlobjSearchColumn('custentitygd_partsshipaddress1'));
	columns.push(new nlobjSearchColumn('custentitygd_partsshipaddress2'));
	columns.push(new nlobjSearchColumn('custentitygd_partsshipcity'));
	columns.push(new nlobjSearchColumn('custentitygd_partsshipstate'));
	columns.push(new nlobjSearchColumn('custentitygd_partsshipzip'));
	columns.push(new nlobjSearchColumn('custentitygd_partsshipcountry'));
	columns.push(new nlobjSearchColumn('custentitygd_partsshipphone'));

	var shipResults = SearchRecord_Suitelet('customer', null, filters, columns);
	var sa = shipResults[0].columns;

	var shipCountry = '';
	if(sa.hasOwnProperty('custentitygd_partsshipcountry'))
		shipCountry = ConvertNSCountryToRVSCountry(ConvertRVSCountryToNSCountry(sa.custentitygd_partsshipcountry.name));

	var shipState = '';
	if(sa.hasOwnProperty('custentitygd_partsshipstate'))
		var shipState = ConvertNSStateToRVSState(ConvertStateLongNameToShort(sa.custentitygd_partsshipstate.name),ConvertRVSCountryToNSCountry(sa.custentitygd_partsshipcountry.internalid));
	
	nlapiSetFieldValue('custrecordpartsorderproxy_shipaddressee',sa.custentitygd_partsshipaddressee);
	nlapiSetFieldValue('custrecordpartsorderproxy_shipaddr1',sa.custentitygd_partsshipaddress1);
	nlapiSetFieldValue('custrecordpartsorderproxy_shipaddr2',sa.custentitygd_partsshipaddress2);
	nlapiSetFieldValue('custrecordpartsorderproxy_shipcity',sa.custentitygd_partsshipcity);
	nlapiSetFieldValue('custrecordpartsorderproxy_shipcountry',shipCountry);
	nlapiSetFieldValue('custrecordpartsorderproxy_shipstate',shipState);
	nlapiSetFieldValue('custrecordpartsorderproxy_shipzip',sa.custentitygd_partsshipzip);
	nlapiSetFieldValue('custrecordpartsorderproxy_shipphone',sa.custentitygd_partsshipphone);
}
