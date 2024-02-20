/**
 * Used to initialize fields on spiffs created through the dealer portal
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Feb 2018     brians		
 *
 */

var SPIFFSTATUS_OPEN = '1';

/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function GD_Spiff_BeforeLoad(type, form, request)
{
	if(form != null && request != null)
	{
		if (IsDealerLoggedIn())
		{
			if(type == 'create')
			{
				var script = "var url = '/s.nl/' + nlapiGetContext().getCompany() + '/sc.89/.f';window.location.href = url;";
				form.addButton('custpage_backtolist', 'Back to Spiff List', script);
				
				var unitId = request.getParameter('unitId') || '';
				nlapiSetFieldValue('custrecordspiff_unit', unitId);
				
				var programId = request.getParameter('programId') || '';
				nlapiSetFieldValue('custrecordspiff_program', programId);
				
				var salesRepLevel = request.getParameter('salesRepLevel') || '';
				var repLevelFld = form.addField('custpage_salesreplevel', 'integer', 'Sales Rep Level');
				repLevelFld.setDefaultValue(salesRepLevel);
				repLevelFld.setDisplayType('hidden');
				
				var programUnitId = request.getParameter('programUnitId') || '';
				var incentiveAmount = 0;
				var isSplit = false;
				if(programUnitId != '')
				{
					// look up the retail customer name of the current customer for the unit
					var filters = new Array();
					filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'is', unitId));
					filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_currentcust', null, 'is', 'T'));
					
					var cols = new Array();
					cols.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp'));
					cols.push(new nlobjSearchColumn('custrecordunitretailcustomer_dsalesrp2'));
					
					var unitRetailSearch = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, filters, cols);
					
					if (unitRetailSearch != null && unitRetailSearch.length > 0) 
					{
						nlapiSetFieldValue('custrecordspiff_retailcustomer', unitRetailSearch[0].getId(), true, true);
						var rep1 = unitRetailSearch[0].getValue('custrecordunitretailcustomer_dealsalesrp') || '';
						var rep2 = unitRetailSearch[0].getValue('custrecordunitretailcustomer_dsalesrp2') || '';
						if(rep1 != '' && rep2 != '')
							isSplit = true;
					}
					incentiveAmount = nlapiLookupField('customrecordrvsprogramunit', programUnitId, 'custrecordprogramunit_incentiveamount');
				}
				if(isSplit)
					nlapiSetFieldValue('custrecordspiff_amount', CurrencyFormatted(incentiveAmount/2));
				else
					nlapiSetFieldValue('custrecordspiff_amount', incentiveAmount);
				
				var salespersonId = request.getParameter('custparamspid') || '';
				nlapiSetFieldValue('custrecordspiff_dealersalesperson', salespersonId);
				
				var isAlreadySpiffed = doesSpiffExistForContactAndUnit(salespersonId, unitId);
				if(isAlreadySpiffed)
					throw 'You have already submitted a spiff for this unit.  Please email Grand Design with any questions. You can close this tab.';
				
				var vendorId = nlapiLookupField('contact', salespersonId, 'custentityrvsvendor') || '';
				if(vendorId != '')
					nlapiSetFieldValue('custrecordspiff_salespersonaddress', nlapiLookupField('vendor', vendorId, 'address'));
				
				var field = form.addField('custpage_gd_spiff_info', 'inlinehtml', 'x');
				var infoHTML = '<style>#gd-spiff-info{margin: 20px 40px; padding: 15px 30px; border: 1px solid #ffc40d; background-color: #FCF9CF; font-size: 1.2em; font-family: "Open Sans", sans-serif;}</style>' +
								'<div id="gd-spiff-info"><p style="font-size: 125%;">Please confirm that your address is correct before selecting <b>Claim Spiff</b>.</p>' + 
								'<p>If you need to update your mailing address please email a W9 to ' + 
								'<a href="mailto:spiffs@granddesignrv.com">spiffs@granddesignrv.com</a></p></div>';
				field.setDefaultValue(infoHTML);
				
			}
			else if(type == 'edit')
			{
				nlapiLogExecution('debug', 'edit', IsDealerLoggedIn() + ' ' + type);
				throw 'You cannot edit an existing spiff.  Please email Grand Design with any questions.';
			}
			else if(type == 'view')
			{
				var checkNo = request.getParameter('custparamcn') || '';
				form.addFieldGroup('custpagepaymentinfo', 'Payment Info');
				var field = form.addField('custpagespiff_checknumber', 'text', 'Check #', null, 'custpagepaymentinfo');
				field.setDefaultValue(checkNo);
				field.setDisplayType('inline');
				
				var script = "var url = '/s.nl/' + nlapiGetContext().getCompany() + '/sc.89/.f';window.location.href = url;";
				form.addButton('custpage_backtolist', 'Back to Spiff List', script);
			}
		}
	}
}

/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function GD_Spiff_AfterSubmit(type) {
	
}

function doesSpiffExistForContactAndUnit(contact, unit)
{
	var returnValue = false;
	var spiffResults = nlapiSearchRecord('customrecordrvsspiff', null, 
			[new nlobjSearchFilter('custrecordspiff_dealersalesperson', null, 'anyof', contact), new nlobjSearchFilter('custrecordspiff_unit', null, 'anyof', unit)],
			new nlobjSearchColumn('custrecordspiff_unit'));
	if(spiffResults != null && spiffResults.length > 0)
	{
		returnValue = true;
	}
	return returnValue;
}