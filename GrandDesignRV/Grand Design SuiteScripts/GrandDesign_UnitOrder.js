/**
 * Performs Grand Design specific logic for Unit Orders.
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Mar 2014     ibrahima
 *
 */

var DPU_SHIP_METHOD = 6;
var statusComplete = 1;
var statusProdComplete = 5;

/**
 * Page Init
 * 
 * @param type
 * @returns
 */
function GD_UnitOrder_PageInit(type)
{
    //When the page loads in create, check the DPU and Freight charges.
    if(type == 'create')
    {
        if(ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvsordertype')) == ORDERTYPE_UNIT)
        {
            GD_setDefaultShippingMethod();
            GD_checkFreightCharge();
            GD_checkDPUFee();
            GD_addOrRemoveCDLFeeOption(nlapiGetFieldValue('custbodyrvsmodel'));
            GD_checkFrontProtectiveWrapOption(true);
            //Set the Location based on the Series.
            var seriesId = ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvsseries'));
            var modelId = ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvsmodel'));
            var locId = '';
            if (modelId) 
            {
                locId = ConvertNSFieldToString(nlapiLookupField('assemblyitem', modelId, 'preferredlocation'));
            }
            if(!locId && seriesId)
            {
                locId = ConvertNSFieldToString(nlapiLookupField('customrecordrvsseries', seriesId, 'custrecordgd_serieslocation'));
            }
            if(locId) nlapiSetFieldValue('location', locId, false, false);
            
            //GD wants to come in at the top of the page. NS sublist stuff is slow, so timeout...
            setTimeout(function(){window.scrollTo(0, 0);},10); 
        }
    }
}

/**
 * Checks the DPU charge item when the shipping method changes.
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function GD_UnitOrder_PostSourcing(type, name, linenum)
{
    if (name == 'shipmethod')
    {
        GD_checkFreightCharge();
        GD_checkDPUFee();
        GD_addOrRemoveCDLFeeOption(nlapiGetFieldValue('custbodyrvsmodel'));
    }   
    else if (name == 'entity')
    {
        GD_checkDPUFee();
        var modelId = nlapiGetFieldValue('custbodyrvsmodel') || '';
        var modelFPWoptionId = modelId != '' ? LookupSuitelet_LookupField('assemblyitem', modelId, 'custitemgd_frontprotectivewrap') : '';
        nlapiSetFieldValue('custbodygd_modelfrontprotectwrapoptn', modelFPWoptionId);
        GD_checkFrontProtectiveWrapOption(false);
    }
    else if (name == 'custbodyrvsmodel') {
        var dealerId = nlapiGetFieldValue('entity') || '';
        var dealerFPWPreference = dealerId != '' ? LookupSuitelet_LookupField('customer', dealerId, 'custentitygd_fronprotectivewrap') : 'F';
        nlapiSetFieldValue('custbodygd_dealerfrontprotectwrapoptn', dealerFPWPreference);
        GD_checkFrontProtectiveWrapOption(false);
    }
}

/**
 * Checks the DPU charge item when the shipping method changes.
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function GD_UnitOrder_FieldChanged(type, name, linenum)
{
    if (name == 'entity') {
        nlapiSetFieldValue('custbodygd_usehaulandtowfreight', 'F');
        nlapiSetFieldValue('custbodygd_uselowboyfreight', 'F');
    } else if (name == 'custbodygd_usehaulandtowfreight' || name == 'custbodygd_uselowboyfreight') {
        GD_checkFreightCharge();
    }

    if (name == 'shipaddresslist') {
        try{
            var addr = nlapiGetFieldValue('shipaddresslist');
            var phone = '';
            if (addr){
                var filters = new Array();
                filters[0] = new nlobjSearchFilter('formulatext', null, 'is', addr);
                filters[0].setFormula('{address.addressinternalid}');
                var columns = new Array();
                columns[0] = new nlobjSearchColumn('formulatext');
                columns[0].setFormula('{address.addressphone}');
                var searchresults = nlapiSearchRecord('customer', null, filters, columns);
                phone = searchresults[0].getValue(columns[0]) || '';
            }
            nlapiSetFieldValue('custbodygd_shiptophone', phone);
        }
        catch(e){
            nlapiLogExecution('debug','Error', JSON.stringify(e));
        }
    }

    

    // Source the right Department (Series Type) from Series Record on change of the Series Field
    if (name == 'custbodyrvsseries' && nlapiGetContext().getExecutionContext() == 'userinterface') {
        
        // Get the series ID
        var seriesFldId = nlapiGetFieldValue('custbodyrvsseries');

        var departmentResults = nlapiSearchRecord('customrecordrvsseries', null,
													[
															new nlobjSearchFilter('isinactive', null, 'is', 'F'),
                                                            new nlobjSearchFilter('internalid', null, 'is', seriesFldId)
													],
														
														new nlobjSearchColumn('custrecordgdseries_type')
													);


        if(departmentResults != null && departmentResults.length > 0)
        {
            nlapiSetFieldValue('department', departmentResults[0].getValue('custrecordgdseries_type'));
        }
    }
}

/**
 * Validate on save of the record, sets the previous Front Protective Wrap Option to the previous Field.
 * 
 * @appliedtorecord salesorder
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function GD_UnitOrder_SaveRecord() {
    var seriesFrontProtectiveWrapOptionId = nlapiGetFieldValue('custbodygd_modelfrontprotectwrapoptn') || '';
    seriesFrontProtectiveWrapOptionId != '' ? nlapiSetFieldValue('custbodygd_prevfrontprotectwrapoption', seriesFrontProtectiveWrapOptionId, true, true) : '';
    return true;
}

/**
 * Function on the window (client-side) that is called after Options have been added to the order through the Options popup
 */
RVS_AfterUnitOrderOptionSave = function()
{
    //Check the Freight and DPU charges after the Options have been added.
    GD_checkFreightCharge();
    GD_checkDPUFee();
    GD_addOrRemoveCDLFeeOption(nlapiGetFieldValue('custbodyrvsmodel'));
    GD_checkFrontProtectiveWrapOption(false);
};


/**
 * Check the DPU charge to see if we need to add the item or remove it.
 */
function GD_UnitOrder_BeforeSubmit()
{
    // Code added here should likely be duplicated in the AddRemoveOptions plugin.
    // Any code that should fire after an option is added or removed should be
    // both here and in the AddRemoveOptions plugin.
    if (type == 'create') {
        var buyback = nlapiGetFieldValue('custbodyrvs_createdfrombuyback') || '';
        if (buyback != '') {
            // since the dealer changed, we need to wipe out the flooring data for the dealer
            // some fields should source from the dealer but others need to be blanked out
            nlapiSetFieldValue('custbodyrvsflooringapprovalnumber', '');
            nlapiSetFieldValue('custbodyrvsdateposubmitted', '');
            nlapiSetFieldValue('custbodyrvsdatesubmittedtoflooringco', '');
            nlapiSetFieldValue('custbodyrvsdatefloorplanapproved', '');
            nlapiSetFieldValue('custbodyrvspacketcomplete', 'F');
        }
    }
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function GD_UnitOrder_AfterSubmit(type)
{
    // Code added here should likely be duplicated in the AddRemoveOptions plugin.
    // Any code that should fire after an option is added or removed should be
    // both here and in the AddRemoveOptions plugin.
  if(type != 'delete')
  {
      //When Unit Sales Order is submitted, we want to store all options in a text area for production schedule.
      //This is documented in case #3860. IBRA 3/27/2014
      var orderType = ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvsordertype'));
      var orderId = ConvertNSFieldToString(nlapiGetRecordId());
      if(orderId != '' && orderType == ORDERTYPE_UNIT) //check if orderId is set in case we are executing this from other context.
      {
          var order = nlapiLoadRecord('salesorder', orderId);
          var filters = new Array();
          filters[filters.length] = new nlobjSearchFilter('internalid', null, 'anyof', orderId);
          filters[filters.length] = new nlobjSearchFilter('custcolrvsitemcategory', null, 'anyof', ITEM_CATEGORY_OPTIONS);
          
          var cols = new Array();
          cols[cols.length] = new nlobjSearchColumn('internalid', null, null);
          cols[cols.length] = new nlobjSearchColumn('custcolrvsitemcategory', null, null);
          cols[cols.length] = new nlobjSearchColumn('item', null, null);
          cols[cols.length] = new nlobjSearchColumn('displayname', 'item', null);
          
          //get sales order options for the submitted order.
          var orderItemResults = nlapiSearchRecord('salesorder', null, filters, cols);        
          if(orderItemResults != null && orderItemResults.length > 0)
          {
                var options = '';
                for(var i = 0; i < orderItemResults.length; i++)
                {
                    if(i == 0)
                        options = ConvertNSFieldToString(orderItemResults[i].getText('item')) + ' ' + ConvertNSFieldToString(orderItemResults[i].getValue('displayname', 'item'));
                    else
                        options += '\n' + ConvertNSFieldToString(orderItemResults[i].getText('item')) + ' ' + ConvertNSFieldToString(orderItemResults[i].getValue('displayname', 'item'));
                }
                
                order.setFieldValue('custbodygd_salesorderoptionlist', options);
          }
      
          // Case #10190 - If there's a unit with a paint option, update the unit to check "Has Special Paint"
          var unitId = ConvertNSFieldToString(order.getFieldValue('custbodyrvsunit'));
          //nlapiLogExecution('DEBUG', 'unitId?','unitId = ' + unitId);
          var optionOverridingUnitFields = order.getFieldValue('custbodygd_optionoverridingunitfields');

          if(unitId != '')
          {
              var unit = nlapiLoadRecord('customrecordrvsunit', unitId);
              
              // Update the Unit's specification fields if an Option with
              // Update Unit Fields is selected
              var prodStatusField = unit.getFieldValue('custrecordunit_status');
              if (prodStatusField != statusComplete && prodStatusField != statusProdComplete){
                  var weightLeftField = unit.getFieldValue('custrecordunit_leftweight');
                  var weightRightField = unit.getFieldValue('custrecordunit_rightweight');
                  var weightHitchField = unit.getFieldValue('custrecordunit_hitchweight');
                  //nlapiLogExecution('DEBUG','Unit Fields','prodStatusField : ' + prodStatusField + ',weightLeftField : ' + weightLeftField + ',weightRightField : ' + weightRightField + ',weightHitchField : ' + weightHitchField);
                  var optionOverridingUnitFields = order.getFieldValue('custbodygd_optionoverridingunitfields') || 'false';
                  var optionOverridingUnitFieldsExists = optionOverridingUnitFields && order.findLineItemValue('item', 'item', optionOverridingUnitFields) != -1;
                  // Only bother updating Unit fields if the option has been removed or
                  // if no option has updated Unit fields yet
                  //nlapiLogExecution('DEBUG','optionOverridingUnitFields',optionOverridingUnitFields);
                  //nlapiLogExecution('DEBUG','optionOverridingUnitFieldsExists',optionOverridingUnitFieldsExists);
                  if ( (optionOverridingUnitFieldsExists != 'false' || optionOverridingUnitFields != 'false') && (weightLeftField <= 0 || weightRightField <= 0 || weightHitchField <= 0) )
                  {
                      // Unset the optionOverridingUnitFields field. We'll set it if
                      // we find an option that will update Unit Fields
                      order.setFieldValue('custbodygd_optionoverridingunitfields', '');
                      var overrideUnitFieldsSearch = nlapiSearchRecord("salesorder",null,
                          [
                              ["type","anyof","SalesOrd"],
                              "AND",
                              ["mainline","is","F"],
                              "AND",
                              ["item.custitemgd_updateunitfields","is","T"],
                              "AND",
                              ["internalidnumber","equalto",orderId]
                          ],
                          [
                              new nlobjSearchColumn("item",null,null),
                              new nlobjSearchColumn("custitemgd_overridetiresize","item",null),
                              new nlobjSearchColumn("custitemgd_overridetirepsi","item",null),
                              new nlobjSearchColumn("custitemgd_overridetirerimsize","item",null),
                              new nlobjSearchColumn("custitemgd_overridegvwr","item",null),
                              new nlobjSearchColumn("custitemgd_overridegawr","item",null),
                              new nlobjSearchColumn("custitemgd_overridegawrsa","item",null),
                          ]
                      );
                      
                      // Update Unit Fields from Sales Order
                      if (overrideUnitFieldsSearch)
                      {
                          
                          SetUnitSpecsFromModel(unitId, false);
                          unit = nlapiLoadRecord('customrecordrvsunit', unitId); // We have to load the unit again because the 'SetUnitSpecsFromModel' method loads and saves the unit.  This prevents reocrd has been changed error.
                          order.setFieldValue('custbodygd_optionoverridingunitfields', overrideUnitFieldsSearch[0].getValue('item'));
                          unit.setFieldValue('custrecordunit_tire', overrideUnitFieldsSearch[0].getValue('custitemgd_overridetiresize', 'item'));
                          unit.setFieldValue('custrecordunit_psi', overrideUnitFieldsSearch[0].getValue('custitemgd_overridetirepsi', 'item'));
                          unit.setFieldValue('custrecordunit_rim', overrideUnitFieldsSearch[0].getValue('custitemgd_overridetirerimsize', 'item'));
                          unit.setFieldValue('custrecordunit_gvwrlbs', overrideUnitFieldsSearch[0].getValue('custitemgd_overridegvwr', 'item'));
                          unit.setFieldValue('custrecordunit_gawrallaxles', overrideUnitFieldsSearch[0].getValue('custitemgd_overridegawr', 'item'));
                          unit.setFieldValue('custrecordunit_gawrsingleaxle',overrideUnitFieldsSearch[0].getValue('custitemgd_overridegawrsa', 'item'));
                      }
                      else
                      {
                          var modelId = unit.getFieldValue('custrecordunit_model');
                          var model = nlapiLoadRecord('assemblyitem', modelId);
                          
                          //Reset everything.
                          unit.setFieldValue('custrecordunit_gvwrlbs', model.getFieldValue('custitemrvsmodelgvwrlbs'));
                          unit.setFieldValue('custrecordunit_gawrallaxles', model.getFieldValue('custitemrvsmodelgawrallaxles'));
                          unit.setFieldValue('custrecordunit_gawrsingleaxle', model.getFieldValue('custitemrvsmodelgawrsingleaxle'));
                          
                          // The following code was taken from the RVS Common.js function SetUnitSpecsFromModel.  If anything changes with this piece of code
                          // from the original file, it should also be changed here.
                          
                          /************START CODE FROM RVS file*********************/
                          // if the order contains any line items that are associated with the "Tires" item group (id 17)
                          // then use the option tire info from the model
                          // otherwise, use the standard info
                          var containsTireOptions = false;
                          if (order != null)
                          {
                              var lineItemCount = order.getLineItemCount('item');
                              for (var i=1; i<=lineItemCount; i++)
                              {
                                  var custcolitemgroup = order.getLineItemValue('item', 'custcolrvsitemgroup', i);
                                  if (custcolitemgroup == 17)
                                  {
                                      containsTireOptions = true;
                                      break;
                                  }
                              }
                          }
                          
                          if (containsTireOptions)
                          {
                              unit.setFieldValue('custrecordunit_rim', model.getFieldValue('custitemrvsrimsizeoptional'));
                              unit.setFieldValue('custrecordunit_tire', model.getFieldValue('custitemrvstiresoptional'));
                              unit.setFieldValue('custrecordunit_psi', model.getFieldValue('custitemrvstirepsioptional'));
                          }
                          else
                          {
                              unit.setFieldValue('custrecordunit_rim', model.getFieldValue('custitemrvstirerimstd'));
                              unit.setFieldValue('custrecordunit_tire', model.getFieldValue('custitemrvstiresstd'));
                              unit.setFieldValue('custrecordunit_psi', model.getFieldValue('custitemrvstirepsistd'));
                          }
                          
                          /************END CODE FROM RVS file*********************/
                      }
                  }

                  var paintResults = nlapiSearchRecord('salesorder', null,
                      [
                          ["internalid", "is", nlapiGetRecordId()],
                          "AND",
                          ["item.custitemgd_ispaintoption", "is", "T"]
                  ]);
                  var hasPaintOption = paintResults != null ? 'T' : 'F';
                  unit.setFieldValue('custrecordgd_hasspecialpaint', hasPaintOption);

                  // Update the Unit's specification fields if an Option with
                  // Update Unit Fields is selected
                  var optionOverridingUnitFieldsExists = optionOverridingUnitFields && order.findLineItemValue('item', 'item', optionOverridingUnitFields) != -1;
                  // Only bother updating Unit fields if the option has been removed or
                  // if no option has updated Unit fields yet
                  if (!optionOverridingUnitFieldsExists || !optionOverridingUnitFields)
                  {
                      // Unset the optionOverridingUnitFields field. We'll set it if
                      // we find an option that will update Unit Fields
                      order.setFieldValue('custbodygd_optionoverridingunitfields', '');
                      var salesorderSearch = nlapiSearchRecord("salesorder",null,
                          [
                            ["type","anyof","SalesOrd"],
                            "AND",
                            ["mainline","is","F"],
                            "AND",
                            ["item.custitemgd_updateunitfields","is","T"],
                            "AND",
                            ["internalidnumber","equalto",orderId]
                          ], 
                          [
                            new nlobjSearchColumn("item",null,null),
                            new nlobjSearchColumn("custitemgd_overridetiresize","item",null),
                            new nlobjSearchColumn("custitemgd_overridetirepsi","item",null),
                            new nlobjSearchColumn("custitemgd_overridetirerimsize","item",null),
                            new nlobjSearchColumn("custitemgd_overridegvwr","item",null),
                            new nlobjSearchColumn("custitemgd_overridegawr","item",null),
                            new nlobjSearchColumn("custitemgd_overridegawrsa","item",null),
                          ]
                      );

                      if (salesorderSearch != null)
                      {
                        order.setFieldValue('custbodygd_optionoverridingunitfields', salesorderSearch[0].getValue('item'));
                        unit.setFieldValue('custrecordunit_tire', salesorderSearch[0].getValue('custitemgd_overridetiresize', 'item'));
                        unit.setFieldValue('custrecordunit_psi', salesorderSearch[0].getValue('custitemgd_overridetirepsi', 'item'));
                        unit.setFieldValue('custrecordunit_rim', salesorderSearch[0].getValue('custitemgd_overridetirerimsize', 'item'));
                        unit.setFieldValue('custrecordunit_gvwrlbs', salesorderSearch[0].getValue('custitemgd_overridegvwr', 'item'));
                        unit.setFieldValue('custrecordunit_gawrallaxles', salesorderSearch[0].getValue('custitemgd_overridegawr', 'item'));
                        unit.setFieldValue('custrecordunit_gawrsingleaxle',salesorderSearch[0].getValue('custitemgd_overridegawrsa', 'item'));
                      }
                  }

                  nlapiSubmitRecord(unit);
                  // Save the Sales Order second, so that if the Unit
                  // fails to save then we'll retry properly.
                  nlapiSubmitRecord(order);
                }
            }
        }
    }
}

/**
* Sets appropriate freight rate line item for motorized units (with dealers from Candada or US) and towable units.
 */
function GD_checkFreightCharge()
{
    if(ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvsordertype')) == ORDERTYPE_UNIT)
    {
        var dealerId = nlapiGetFieldValue('entity') || '';
        var modelId = nlapiGetFieldValue('custbodyrvsmodel') || '';
        var isMotorized = nlapiLookupField('assemblyitem', modelId, 'custitemgd_chassismfg');

        if(trim(dealerId) != '' && trim(modelId) != '')
        {
            //Find the index of the freight item on the line.
            //DO NOT USE nlapiFindLineItemValue() here, it doesn't work.
            var freightItem = GetFreightItem();
            var freightIndex = -1;
            var freightRate = null;
            var dealerRecord = null;
            for (var i = 1; i <= nlapiGetLineItemCount('item'); i++)
            {
                if (nlapiGetLineItemValue('item', 'item', i) == freightItem)
                {
                    freightIndex = i;
                    break;
                }
            }
            
            if (ConvertNSFieldToString(nlapiGetFieldValue('shipmethod')) == DPU_SHIP_METHOD)
            {
            //Remove freight charge line item from Sales Order if ship method is set to DPU.
            if (freightIndex > 0)
                {
                    nlapiRemoveLineItem('item', freightIndex);
                }
                nlapiSetFieldValue('custbodygd_usehaulandtowfreight', 'F', false, false);
                nlapiSetFieldValue('custbodygd_uselowboyfreight', 'F', false, false);
            }
            // Sets freight line item on Sales Orders under certain conditions (specified below).
            else if (freightIndex < 1)
            { 
                var isMotorized = nlapiLookupField('assemblyitem', modelId, 'custitemgd_chassismfg');

                // Sets freight rate line item for MOTORIZED units 
                //  (using both US and Candadian Dealer rates) under these conditions:
                //      (1) Dealer's default ship method is 'ship.'
                //      (2) Dealer's default ship method is DPU AND 
                //          user changes ship rate on Sales Order to 'ship.'                
                if (isMotorized) 
                { 
                    addFreightChargeMotorizedPostSourcing(dealerId, modelId, freightItem); 
                }

                // Gathers data needed to calculate freight line item for TOWABLE units.    
                else 
                {
                    var freightRate = GD_gatherTowableFreightInformation(modelId, freightItem, dealerId);
                }
                
                // Sets freight rate line for TOWABLE units when Dealer default ship method is 'ship.'
                var isMotorized = nlapiLookupField('assemblyitem', modelId, 'custitemgd_chassismfg');

                if (freightRate != null && !isMotorized)
                {                  
                    GD_setTowableFreightForDealerWithShipDefault(freightRate, freightItem);
                }
            } 
            // Gather's calculation data for Towable units, and sets freight rate line item under this condition:
            //      Dealer's default ship method is DPU AND user changes ship rate on Sales Order to 'ship.'
            else if (freightIndex > 1) {
                
                var freightRate = GD_gatherTowableFreightInformation (modelId, freightItem, dealerId);

                if (freightRate != null && !isMotorized) 
                {
                    GD_setTowableFreightForDealerWithDPUDefault(freightRate, freightItem, freightIndex);
                }
            }
        }
    }
}


/**
 * Checks the current shipping method.
 * If it is DPU and the current dealer is not exempt from DPU charges, then add the DPU fee.
 * If it is not DPU or the dealer is exempt from DPU charges, then remove the DPU fee.
 */
function GD_checkDPUFee()
{
    if(ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvsordertype')) == ORDERTYPE_UNIT)
    {
        //The model, dealer, and company preference all need to be set in order for anything to happen
        var dealerId = ConvertNSFieldToString(nlapiGetFieldValue('entity'));
        var modelId = ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvsmodel'));
        var dpuItem = ConvertNSFieldToString(nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_dpustoragefeeitem'));
        if(dealerId.length > 0 && modelId.length > 0 && dpuItem.length > 0)
        {
            //Find the index of the DPU item.
            var dpuIndex = -1;
            for (var i = 1; i <= nlapiGetLineItemCount('item'); i++)
            {
                if (nlapiGetLineItemValue('item', 'item', i) == dpuItem)
                {
                    dpuIndex = i;
                    break;
                }
            }
            
            //If the shipping method is DPU and the dealer is not exempt from the fee, then add it.
            if (ConvertNSFieldToString(nlapiGetFieldValue('shipmethod')) == DPU_SHIP_METHOD && nlapiLookupField('customer', dealerId, 'custentitygd_exemptfromdpufee') != 'T')
            {
                if (dpuIndex < 1)
                {
                    //Add the charge
                    nlapiSelectNewLineItem('item');
                    nlapiSetCurrentLineItemValue('item', 'quantity', '1');
                    nlapiSetCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', dpuItem, false, true);
                    nlapiSetCurrentLineItemValue('item', 'item', dpuItem, true, true);
                    nlapiCommitLineItem('item');
                }
            }
            else if (dpuIndex > 0)
            {
                //Otherwise remove the dpu fee if it exists
                nlapiRemoveLineItem('item', dpuIndex);
            }
        }
    }
}

/**
 * Check if the Front protect option needs to be added on the line.
 */
function GD_checkFrontProtectiveWrapOption(handleAllowLineEdit) {
    if(ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvsordertype')) == ORDERTYPE_UNIT) {
        // Get the series front protect wrap item id set from the series and the checkbox set from the Dealer.
        var seriesFrontProtectWrapItemId = ConvertNSFieldToString(nlapiGetFieldValue('custbodygd_modelfrontprotectwrapoptn')) || '';
        var isDealerFrontProtectWrap = ConvertNSFieldToString(nlapiGetFieldValue('custbodygd_dealerfrontprotectwrapoptn')) == 'T' ? true : false;
        var frontProtectiveWrapOptionLineIndex = nlapiFindLineItemValue('item', 'item', seriesFrontProtectWrapItemId) || -1;
        var lineIndex = -1;
        var previousSeriesFrontProtectWrapItemId = '';
        if(isDealerFrontProtectWrap && seriesFrontProtectWrapItemId != '' && frontProtectiveWrapOptionLineIndex == -1) {
            var previousSeriesFrontProtectWrapItemId = ConvertNSFieldToString(nlapiGetFieldValue('custbodygd_prevfrontprotectwrapoption')) || '';

            //There might already be a Front Protect Wrap option set on the line, we need to find it and remove it if it is different from the current Front Protective Wrap option.
            if (previousSeriesFrontProtectWrapItemId != '') {
                if (previousSeriesFrontProtectWrapItemId != seriesFrontProtectWrapItemId) {
                    handleAllowLineEdit ? nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'T', false, true) : ''; //allow lines to be added without config popup
                    //replace the old FPW item and add the new FPW item.
                    var lineIndex = nlapiFindLineItemValue('item', 'item', previousSeriesFrontProtectWrapItemId) || -1;
                    if (lineIndex != -1) {
                        nlapiSelectLineItem('item', lineIndex);
                        nlapiSetCurrentLineItemValue('item', 'item', seriesFrontProtectWrapItemId, true, true);
                    } else {
                        nlapiSelectNewLineItem('item');
                        nlapiSetCurrentLineItemValue('item', 'item', seriesFrontProtectWrapItemId, true, true);
                    }
                    nlapiCommitLineItem('item');
                    handleAllowLineEdit ? nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'F', false, true) : ''; //prevent lines to be added without config popup
                } else {
                    var lineIndex = nlapiFindLineItemValue('item', 'item', seriesFrontProtectWrapItemId) || -1;
                    if (lineIndex == -1) {
                        handleAllowLineEdit ? nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'T', false, true) : ''; //allow lines to be added without config popup
                        nlapiSelectLineItem('item', lineIndex);
                        nlapiSetCurrentLineItemValue('item', 'item', seriesFrontProtectWrapItemId, true, true);
                        nlapiCommitLineItem('item');
                        handleAllowLineEdit ? nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'F', false, true) : ''; //prevent lines to be added without config popup
                    }
                }
            } else {  // There are no Front Protective Wrap items present on the line just add the Front Protective Wrap from the series.
                handleAllowLineEdit ? nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'T', false, true) : ''; //allow lines to be added without config popup
                nlapiSelectNewLineItem('item');
                nlapiSetCurrentLineItemValue('item', 'item', seriesFrontProtectWrapItemId, true, true);
                nlapiCommitLineItem('item');
                handleAllowLineEdit ? nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'F', false, true) : ''; //prevent lines to be added without config popup
            }
        } else if (!isDealerFrontProtectWrap) {
            previousSeriesFrontProtectWrapItemId = ConvertNSFieldToString(nlapiGetFieldValue('custbodygd_prevfrontprotectwrapoption')) || '';
            if (previousSeriesFrontProtectWrapItemId != '') {
                lineIndex = nlapiFindLineItemValue('item', 'item', previousSeriesFrontProtectWrapItemId) || -1;
                if (lineIndex != -1) {
                    handleAllowLineEdit ? nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'T', false, true) : ''; //allow lines to be added without config popup
                    nlapiRemoveLineItem('item', lineIndex);
                    handleAllowLineEdit ? nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'F', false, true) : ''; //prevent lines to be added without config popup
                }
            } else if (seriesFrontProtectWrapItemId != '') {
                lineIndex = nlapiFindLineItemValue('item', 'item', seriesFrontProtectWrapItemId) || -1;
                if (lineIndex != -1) {
                    handleAllowLineEdit ? nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'T', false, true) : ''; //allow lines to be added without config popup
                    nlapiRemoveLineItem('item', lineIndex);
                    handleAllowLineEdit ? nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'F', false, true) : ''; //prevent lines to be added without config popup
                }
            }
        }
    }
}

/**
 * Add or remove model CDL Fee option based on whether or not 
 * the model uses CDL Freight and whether or not order shipping method is/is not DPU.
 * @param modelId
 */
function GD_addOrRemoveCDLFeeOption(modelId)
{
    var shippingMethodId = nlapiGetFieldValue('shipmethod');
    
    //If model is not specified, return
    if(modelId == undefined || modelId == null || modelId == '')
    { 
        return; 
    }
    
    //We need to find option that is flagged as "IS CDL FEE" on a given model if the model is marked as "USE CDL Freight"
    var filters = [
                    new nlobjSearchFilter('internalid', 'custrecordmodeloption_model', 'anyof', modelId),
                    new nlobjSearchFilter('custitemrvs_usecdlfreight', 'custrecordmodeloption_model', 'is', 'T'),
                    new nlobjSearchFilter('isinactive', 'custrecordmodeloption_option', 'is', 'F'), 
                    new nlobjSearchFilter('custitemgd_iscdlfeeoption', 'custrecordmodeloption_option', 'is', 'T')                   
                  ];
    var cols = [
                new nlobjSearchColumn('internalid', 'custrecordmodeloption_option', null)
               ];
               
    var modelCDLOptionResults = nlapiSearchRecord('customrecordrvsmodeloption', null, filters, cols);
    if(modelCDLOptionResults != null && modelCDLOptionResults.length > 0)
    {
        var modelCDLOptionId = modelCDLOptionResults[0].getValue('internalid', 'custrecordmodeloption_option');
        var optionLineNum = nlapiFindLineItemValue('item', 'item', modelCDLOptionId); //If option is not on the order, this will be -1
        
        //Option is on the order but order shipping method is DPU, remove CDL Fee option on the order.
        if(optionLineNum > 0 && shippingMethodId == DPU_SHIP_METHOD) 
        {
            nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'T', false, true); //allow lines to be added without config popup
            nlapiSelectLineItem('item', optionLineNum);
            nlapiRemoveLineItem('item', optionLineNum); 
            nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'F', false, true); //prevent lines to be added without config popup
        }
        else if(optionLineNum < 0 && shippingMethodId != DPU_SHIP_METHOD) //CDL option is not on the order and shipping method is not DPU, add it.
        {
            nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'T', false, true); //allow lines to be added without config popup
            nlapiSelectNewLineItem('item');     
            nlapiSetCurrentLineItemValue('item', 'quantity', 1);
            nlapiSetCurrentLineItemValue('item', 'item', modelCDLOptionId, true, true);
            nlapiCommitLineItem('item');    
            nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'F', false, true); //prevent lines to be added without config popup
        }   
    }
}

/**
 * Sets default shipping method based on the dealer.
 */
function GD_setDefaultShippingMethod()
{
    var dealer = nlapiGetFieldValue('entity') || '';
    if(dealer != '')
    {
        var unitShipMethod = nlapiLookupField('customer', dealer, 'custentityrvs_dealer_unitshippingmethod', false);
        if(unitShipMethod != '' && unitShipMethod != null)
        {
            nlapiSetFieldValue('shipmethod', unitShipMethod, true, true);
        }
    }
}

/**
 * Sets Sales Order Option List Hidden Text Area for Production Schedule to be used on the search.
 * @param rec_type
 * @param rec_id
 */
function SetOrderOptionsMassUpdate(rec_type, rec_id)
{
    var order = nlapiLoadRecord(rec_type, rec_id);
    
    //The logic for setting order options will be executed on the after submit event since we have added it.
    nlapiSubmitRecord(order, false, true);
}


// //Adds freight rate line item to MOTORIZED unit sales orders.
function addFreightChargeMotorizedPostSourcing(dealerId, modelId, freightItem) 
{
    dealerRecord = nlapiLoadRecord('customer', dealerId);
    var fuelItem = GetFuelSurchargeItem();
    var freightDiscountItem = GetFreightDiscountItem();
    var usFreightRate = nlapiLookupField('assemblyitem', modelId, 'custitemgd_usfreightrate');
    var canadianFreightRate = nlapiLookupField('assemblyitem', modelId, 'custitemgd_canadafreightrate');
    var mileage = parseFloat(nlapiLookupField('customer', dealerId, 'custentityrvsmiles'));
    var tollsAndPermits = parseFloat(nlapiLookupField('customer', dealerId, 'custentityrvstollsandpermits'));
    var wash = parseFloat(nlapiLookupField('customer', dealerId, 'custentityrvswash'));
    var country = dealerRecord.getFieldValue('custentitygd_partsshipcountry');

    // Set base freight rate to US or Canadian based on country of dealer.
    var freightRate = 0;
    if (country === GD_CANADA) 
    {
        freightRate = canadianFreightRate;
    }
    else 
    {
        freightRate = usFreightRate;
    }

    // Calculates final freight rate (for motorized units).
    freightRate = (freightRate * mileage) + tollsAndPermits + wash;
                
    var freightArr = [];
    var useCDL = nlapiLookupField('assemblyitem', modelId, 'custitemrvs_usecdlfreight') == 'T';
	var itemPriceSublist = 'itempricing';

	for (var i = 1; i <= dealerRecord.getLineItemCount(itemPriceSublist); i++)
	{
		var itemId = dealerRecord.getLineItemValue(itemPriceSublist, 'item', i);

		// Only gets values for price line items (freight, fuel, freight discount, if any)
		if((itemId == GetFreightItem() && !useCDL) || itemId == fuelItem || itemId == freightDiscountItem)
		{
			if (itemId == fuelItem || itemId == freightDiscountItem) 
			{
                freightArr.push({
                    item: itemId, 
                    rate: parseFloat(dealerRecord.getLineItemValue(itemPriceSublist, 'price', i))
                });
			}
			else if (itemId == GetFreightItem() && !useCDL) 
			{
                freightArr.push({
                    item: itemId, 
                    rate: freightRate
                });
			}
		}
	}

	//(Strigifying then parsing because for() loop produces an object (that looks like an array).
	freightArr = JSON.stringify(freightArr);
	freightArr = JSON.parse(freightArr);

	// Setting any price item lines gathered in previous section
		// (Could be any combination of one or more freight, fuel, or freight discount lines);

	if (freightArr.length > 0)
	{
		for(var i = 0; i < freightArr.length; i++)
		{
			//Only sets a price item line if a rate of more than
				// 0 has been found for that item type.
			if (freightArr[i].rate > 0)
			{
				nlapiSelectNewLineItem('item');

				nlapiSetCurrentLineItemValue('item', 'quantity', '1');
				nlapiSetCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', freightItem, false, true);
				nlapiSetCurrentLineItemValue('item', 'item', freightItem, true, true);
				nlapiSetCurrentLineItemValue('item', 'rate', freightRate);
				nlapiSetCurrentLineItemValue('item', 'amount', freightRate);

				nlapiCommitLineItem('item');
			}
		}
	}
	else
	{
		alert('The selected dealer has no Freight Surcharge Items');
	}
}


/**
 * Gathers freight rate data for towable units.
 */
function GD_gatherTowableFreightInformation (modelId, freightItem, dealerId) 
{
    dealerRecord = nlapiLoadRecord('customer', dealerId);
    freightRate = null;
    if (nlapiLookupField('assemblyitem', modelId, 'custitemrvs_usecdlfreight') == 'T') 
    {
        freightRate = parseFloat(dealerRecord.getFieldValue('custentityrvs_cdlfreightcharge'));
    } 
    else if (nlapiGetFieldValue('custbodygd_usehaulandtowfreight') == 'T') 
    {
        freightRate = parseFloat(dealerRecord.getFieldValue('custentitygd_haulandtowfreightcharge') || 0) / 2;
    } 
    else if (nlapiGetFieldValue('custbodygd_uselowboyfreight') == 'T') 
    {
        freightRate = parseFloat(dealerRecord.getFieldValue('custentitygd_lowboyfreightcharge') || 0) / 3;
    } 
    else {
        for (var i = 1; i <= dealerRecord.getLineItemCount('itempricing'); i++)
        {
            if (dealerRecord.getLineItemValue('itempricing', 'item', i) == freightItem)
            {
                freightRate = parseFloat(dealerRecord.getLineItemValue('itempricing', 'price', i));
            }
        }
    }
    return freightRate;
}

/**
 * Sets freight rate line item on Sales Orders where Dealer default shipping method is set to 'ship.'
 */
function  GD_setTowableFreightForDealerWithShipDefault(freightRate, freightItem) 
{
    nlapiSelectNewLineItem('item');
    nlapiSetCurrentLineItemValue('item', 'quantity', '1');
    nlapiSetCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', freightItem, false, true);
    nlapiSetCurrentLineItemValue('item', 'item', freightItem, true, true);
    nlapiSetCurrentLineItemValue('item', 'rate', freightRate);
    nlapiSetCurrentLineItemValue('item', 'amount', freightRate);
    nlapiCommitLineItem('item');
}

/**
 * Sets freight rate line item on Sales Orders where Dealer default shipping method is set to 'DPU', 
 *      but user changes shipping method on Sales Order to 'ship.'
 */
function  GD_setTowableFreightForDealerWithDPUDefault(freightRate, freightItem, freightIndex)
{
    freightRate = Math.ceil(freightRate); //round the frieght charge to whole number Case 10002
    nlapiSelectLineItem('item', freightIndex);
    nlapiSetCurrentLineItemValue('item', 'quantity', '1');
    nlapiSetCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', freightItem, false, true);
    nlapiSetCurrentLineItemValue('item', 'item', freightItem, true, true);
    nlapiSetCurrentLineItemValue('item', 'rate', freightRate);
    nlapiSetCurrentLineItemValue('item', 'amount', freightRate);
    nlapiCommitLineItem('item');
}
