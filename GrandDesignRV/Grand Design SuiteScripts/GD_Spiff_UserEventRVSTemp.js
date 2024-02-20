/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Dec 2018     brians
 *
 */

/**
 * 	When the spiff is loaded, create the program unit if there is a program id and unit id in the parameter.
 * 	Used for global spiff programs because they don't have program units that get created by Open Range beforehand.
 *   
 * @appliedtorecord customrecordrvsspiff
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function BeforeLoad(type, form, request)
{	
	if (type == 'create')
	{
		var programId = request.getParameter('programId');
		var unitId = request.getParameter('unitId');
		var salesRepLevel = request.getParameter('salesRepLevel');
		var programUnitId = null;
		
		// first find or create the program unit if the program id and unit id params are set
		if (programId != null && unitId != null)
		{
			// first, check and make sure there isn't already a program unit for this program and this unit
			var programUnitFilters = new Array();
			programUnitFilters.push(new nlobjSearchFilter('custrecordprogramunit_program', null, 'is', programId, null));
			programUnitFilters.push(new nlobjSearchFilter('custrecordprogramunit_unit', null, 'is', unitId, null));
			
			var programUnitResults = nlapiSearchRecord('customrecordrvsprogramunit', null, programUnitFilters, null);
			
			if (programUnitResults != null)
			{
				if (programUnitResults.length > 1)
				{
					throw nlapiCreateError('SPIFF-ERROR', 'Program contains multiple associations with the same unit.', true);
				}
				else
				{
					programUnitId = programUnitResults[0].getId();
				}
			}
			
			// no program unit already exists so create one
			if (programUnitId == null)
			{
				var programUnit = nlapiCreateRecord('customrecordrvsprogramunit', {recordmode: 'dynamic'});
				programUnit.setFieldValue('custrecordprogramunit_program', programId);
				programUnit.setFieldValue('custrecordprogramunit_unit', unitId);
				
				// also look up the global spiff amount from the program so that the incentive amount is set
				var incentiveAmount = nlapiLookupField('customrecordrvsprogram', programId, 'custrecordprogram_globalspiffamount', false);
				programUnit.setFieldValue('custrecordprogramunit_incentiveamount', incentiveAmount);
				
				programUnitId = nlapiSubmitRecord(programUnit, true, false);
			}
		}
		
		// if the program unit id is still null, then see if it is a param
		if (programUnitId == null)
			programUnitId = request.getParameter('programUnitId');
		
		// if it is not null, then set the program unit data on the spiff
		if (programUnitId != null)
		{
			nlapiSetFieldValue('custrecordspiff_programunit', programUnitId, true, false);
			
			var programUnit	= nlapiLoadRecord('customrecordrvsprogramunit', programUnitId);
			
			var programId = programUnit.getFieldValue('custrecordprogramunit_program');	
			var unitId = programUnit.getFieldValue('custrecordprogramunit_unit');
			var amount = programUnit.getFieldValue('custrecordprogramunit_incentiveamount');
			var isSplit = false;
			
			nlapiSetFieldValue('custrecordspiff_program', programId, true, true);
			nlapiSetFieldValue('custrecordspiff_programunit', programUnitId, true, true);
			
			nlapiSetFieldValue('custrecordspiff_unit', unitId);
			
			// look up the retail customer name of the current customer for the unit
			var filters = new Array();
			filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'is', unitId));
			filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_currentcust', null, 'is', 'T'));
			
			var cols = new Array();
			cols.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp'));
			cols.push(new nlobjSearchColumn('custrecordunitretailcustomer_dsalesrp2'));
			
			var unitRetailSearch = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, filters, cols);
			
			var dealerSalesRepIdToUse = null;
			
			if (unitRetailSearch != null && unitRetailSearch.length > 0) 
			{

				nlapiSetFieldValue('custrecordspiff_retailcustomer', unitRetailSearch[0].getId(), true, true);
				var rep1 = unitRetailSearch[0].getValue('custrecordunitretailcustomer_dealsalesrp') || '';
				var rep2 = unitRetailSearch[0].getValue('custrecordunitretailcustomer_dsalesrp2') || '';
				if(rep1 != '' && rep2 != '')
					isSplit = true;

				if(salesRepLevel == '2')
					dealerSalesRepIdToUse = rep2;
				else
					dealerSalesRepIdToUse = rep1;
			}
			
			// if the program type is global or salesman, then auto-set the dealer sales rep based on the retail customer record
			var programTypeId = nlapiLookupField('customrecordrvsprogram', programId, 'custrecordprogram_type', false);
			var programTypeFields = ['custrecordprogramtype_isglobal', 'custrecordprogramtype_sendcheckto'];
			var programTypeResults = nlapiLookupField('customrecordrvsprogramtype', programTypeId, programTypeFields);
			
			//If there are two reps on the registration and it's on a salesperson program
			//then the amount on this particular spiff should just be half of the program unit incentive amount
			if(isSplit && programTypeResults.custrecordprogramtype_sendcheckto == PROGRAM_SENDCHECKTO_SALESPERSON)
				nlapiSetFieldValue('custrecordspiff_amount', CurrencyFormatted(amount/2), true, false);
			else
				nlapiSetFieldValue('custrecordspiff_amount', CurrencyFormatted(amount), true, false);
			
			// set the dealer if it is a global spiff
			// the dealer and Open Range sales rep comes from the unit and not the program (unlike other programs)
			if (programTypeResults.custrecordprogramtype_isglobal == 'T')
			{
				var unitFields = nlapiLookupField('customrecordrvsunit', unitId, ['custrecordunit_dealer', 'custrecordunit_salesrep'], false);					
				nlapiSetFieldValue('custrecordspiff_dealer', unitFields.custrecordunit_dealer, true, false);
				nlapiSetFieldValue('custrecordspiff_salesrep', unitFields.custrecordunit_salesrep, true, false);
			}
			
			if (programTypeResults.custrecordprogramtype_sendcheckto == PROGRAM_SENDCHECKTO_SALESPERSON || programTypeResults.custrecordprogramtype_isglobal == 'T')
			{
				if (dealerSalesRepIdToUse == null || dealerSalesRepIdToUse == '')
				{
					if(salesRepLevel == '2')
					{
						throw nlapiCreateError('SPIFF-ERROR', 'There is no secondary dealer sales rep selected on the unit warranty registration, so this secondary spiff cannot be created.', true);
					}
					else
					{
						throw nlapiCreateError('SPIFF-ERROR', 'There is no dealer sales rep selected on the unit warranty registration, so this spiff cannot be created.', true);
					}

				}
				else
				{
					// there is a sales rep but is the vendor set up?
					// if the vendor is set up, then is it active?
					var vendorId = nlapiLookupField('contact', dealerSalesRepIdToUse, 'custentityrvsvendor');
					if (vendorId == null || vendorId == '')
					{
						throw nlapiCreateError('SPIFF-ERROR', 'There is no vendor record associated with the dealer sales rep selected on the unit warranty registration and so this spiff cannot be created.', true);
					}
					else
					{
						// we found a vendor but make sure it is active
						var inactive = nlapiLookupField('vendor', vendorId, 'isinactive');
						if (inactive == 'T')
						{
							throw nlapiCreateError('SPIFF-ERROR', 'The vendor record associated with the dealer sales rep selected on the unit warranty registration is inactive and so this spiff cannot be created.', true);
						}
						else
						{
							var vendor = nlapiLoadRecord('vendor', vendorId);
							salesmanAddress = vendor.getFieldValue('defaultaddress');
							salesmanSSN = vendor.getFieldValue('custentityrvscontactsocsecnumber');
							
							nlapiSetFieldValue('custrecordspiff_dealersalesperson', dealerSalesRepIdToUse, true, false);
							nlapiSetFieldValue('custrecordspiff_socialsecuritynumber', salesmanSSN);
							nlapiSetFieldValue('custrecordspiff_salespersonaddress', salesmanAddress);
							nlapiSetFieldValue('custrecordspiff_vendor', vendorId);
							
							// also disable the sales person field, amount, and status
							var field = form.getField('custrecordspiff_dealersalesperson');
							field.setDisplayType('disabled');
							
							field = form.getField('custrecordspiff_amount');
							field.setDisplayType('disabled');
							
							field = form.getField('custrecordspiff_status');
							field.setDisplayType('disabled');
						}
					}
				}
			}
		}
	}
	
	// if we are logged in under the dealer portal, disable these buttons
	if (IsDealerLoggedIn())
	{
		DisableButton(form, null, 'submitcopy');
		DisableButton(form, null, 'submitnew');
		DisableButton(form, null, 'resetter');
		DisableButton(form, null, 'new');
		DisableButton(form, null, 'print');
	}	
	
	DisableButton(form, form.getSubList('recmachcustbodyrvscreatedfromspiff'), 'attach');
	DisableButton(form, null, 'makecopy');
}

/**
 * Description: If the spiff is being deleted, the unlink the spiff from the selected program unit.
 * 
 * @appliedtorecord customrecordrvsspiff
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function BeforeSubmit(type)
{
	if (type == 'delete')
	{
		var oldRecord = nlapiGetOldRecord();
		
		var programUnit = oldRecord.getFieldValue('custrecordspiff_programunit') || '';
		if(programUnit != '')
		{
			//Unlink the spiff being deleted from the appropriate spiff field on the program unit
			var spiffId = oldRecord.getId();
			var spiffResults = nlapiLookupField('customrecordrvsprogramunit', programUnit, ['custrecordprogramunit_spiff', 'custrecordprogramunit_spiff2']);
			if(spiffResults.custrecordprogramunit_spiff == spiffId)
				nlapiSubmitField('customrecordrvsprogramunit', programUnit, 'custrecordprogramunit_spiff', null);
			else if(spiffResults.custrecordprogramunit_spiff2 == spiffId)
				nlapiSubmitField('customrecordrvsprogramunit', programUnit, 'custrecordprogramunit_spiff2', null);
		}
	}
	else if (type == 'create')
	{
		// if we are creating the spiff, make sure that the program unit doesn't already have 2 spiffs linked to it
		// if it does, then we shouldn't allow the spiff to be created
		var programUnitId = nlapiGetFieldValue('custrecordspiff_programunit') || '';
		var salesRepLevel = nlapiGetFieldValue('custpage_salesreplevel') || '';
		
		if(programUnitId != '' && salesRepLevel != '')
		{
			var spiffResults = nlapiLookupField('customrecordrvsprogramunit', programUnitId, ['custrecordprogramunit_spiff', 'custrecordprogramunit_spiff2']);
			if(salesRepLevel == '1')
			{
				if(spiffResults.custrecordprogramunit_spiff != '' && spiffResults.custrecordprogramunit_spiff != null)
				{
					throw nlapiCreateError('SPIFF_EXISTS', 'You have already created a Spiff for this unit. Another spiff cannot be created.', true);
				}
			}
			else
			{
				if(spiffResults.custrecordprogramunit_spiff2 != '' && spiffResults.custrecordprogramunit_spiff2 != null)
				{
					throw nlapiCreateError('SPIFF_EXISTS', 'You have already created a Spiff for this unit. Another spiff cannot be created.', true);
				}
			}
		}
		else
		{
			// We only want to update the retail customer on the case that this is a stand-alone spiff
			// where no program is involved.
			var unitId = nlapiGetFieldValue('custrecordspiff_unit') || '';
			var programId = nlapiGetFieldValue('custrecordspiff_program') || '';
			if (unitId != '' && programId == '')
			{
				// look up the retail customer name of the current customer for the unit
				var filters = new Array();
				filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'is', unitId));
				filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_currentcust', null, 'is', 'T'));
				
				var cols = new Array();
				cols.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp'));
				
				var unitRetailSearch = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, filters, cols) || '';
				
				if (unitRetailSearch != null && unitRetailSearch.length > 0)
					nlapiSetFieldValue('custrecordspiff_retailcustomer', unitRetailSearch[0].getId(), true, true);

			}
		}
	}
}

/**
 * Name: AfterSubmit
 * Description: After the spiff has been submitted,
 *				(1) Go out and set the "Spiff" on the program unit on the spiff to match the spiff we are on.
 *				(2) If the program unit was changed, then unlink the spiff from the program unit that was previously on the spiff.
 * 
 * @appliedtorecord customrecordrvsspiff
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function AfterSubmit(type)
{
	if (type != 'delete')
	{
		// get the current program unit
		var programUnit = nlapiGetFieldValue('custrecordspiff_programunit') || '';
		
		if (programUnit != '')
		{
			var oldProgramUnit = null;
			
			// get the old program unit if there is an old record
			var oldRecord = nlapiGetOldRecord();
			if (oldRecord != null)
			{
				oldProgramUnit = oldRecord.getFieldValue('custrecordspiff_programunit');
			}
			
			if (oldProgramUnit == null || (oldProgramUnit != programUnit))
			{
				//Make sure we update the correct spiff field on the program unit record
				var unitId = nlapiGetFieldValue('custrecordspiff_unit') || '';
				var spiffSalesRep = nlapiGetFieldValue('custrecordspiff_dealersalesperson') || '';
				var unitSalesReps = getSalesRepsFromRegistration(unitId);
				if(spiffSalesRep == unitSalesReps.rep1)
				{
					nlapiSubmitField('customrecordrvsprogramunit', programUnit, 'custrecordprogramunit_spiff', nlapiGetRecordId());
					// if there is an old program unit, then unlink the spiff from it
					if (oldProgramUnit != null)
					{
						nlapiSubmitField('customrecordrvsprogramunit', oldProgramUnit, 'custrecordprogramunit_spiff', null);
					}
				}
				else if(spiffSalesRep == unitSalesReps.rep2)
				{
					nlapiSubmitField('customrecordrvsprogramunit', programUnit, 'custrecordprogramunit_spiff2', nlapiGetRecordId());
					// if there is an old program unit, then unlink the spiff from it
					if (oldProgramUnit != null)
					{
						nlapiSubmitField('customrecordrvsprogramunit', oldProgramUnit, 'custrecordprogramunit_spiff2', null);
					}
				}
			}
		}
	}
}

/**
 * Name: getSalesRepsFromRegistration
 * Description: Returns an object with the contact ids of the sales reps selected on a given unit's registration
 * 
 * @param unitId
 * @returns {Object} {rep1: salesRep1, rep2: salesRep2}
 */
function getSalesRepsFromRegistration(unitId)
{
	var returnObj = {};
	returnObj.rep1 = '';
	returnObj.rep2 = '';
	
	var f = [];
	f.push(new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'anyof', unitId));
	f.push(new nlobjSearchFilter('custrecordunitretailcustomer_currentcust', null, 'is', 'T'));
	
	var c = [];
	c.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp'));
	c.push(new nlobjSearchColumn('custrecordunitretailcustomer_dsalesrp2'));
	
	var regResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, f, c);
	if(regResults != null && regResults.length > 0)
	{
		returnObj.rep1 = regResults[0].getValue('custrecordunitretailcustomer_dealsalesrp');
		returnObj.rep2 = regResults[0].getValue('custrecordunitretailcustomer_dsalesrp2');
	}
	return returnObj;
}
