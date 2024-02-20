/**
 * The KO object model for the RVS Unit Order 2.0 modal dialog.
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Mar 2017	  Jacob Shetler
 *
 */

var RVS_DIALOGTYPE_ORDER = 1; //Dialog is being displayed client-side on a Unit Order
var RVS_DIALOGTYPE_SUITELET = 2; //Dialog is being displayed on the "Create New Unit Order" suitelet
var RVS_DIALOGTYPE_CHANGEORDER = 3; //Dialog is being displayed on create/edit mode of a Change Order

/**
 * Root view model for the entire unit order.
 * 
 * @param {String} dialogType Determines display settings for the popup.
 */
function RVS_UnitOrderViewModel(dialogType) {
	/** STATICS AND OBSERVABLES */
    var self = this;
    //Statics
    self.isInitialized = false;
    self.DIALOG_TYPE = dialogType;
    self.allDealers = [];
    self.allSeries = [];
    self.allDecors = [];
    self.allModels = [];
    self.modelOptions = ko.observableArray();
    self.showButtons = self.DIALOG_TYPE == RVS_DIALOGTYPE_ORDER;
    self.showDealers = self.DIALOG_TYPE == RVS_DIALOGTYPE_SUITELET;
    self.showSeries = self.DIALOG_TYPE != RVS_DIALOGTYPE_CHANGEORDER;
    self.showDecors = self.DIALOG_TYPE != RVS_DIALOGTYPE_CHANGEORDER;
    self.showModels = self.DIALOG_TYPE != RVS_DIALOGTYPE_CHANGEORDER;
    self.showRate = self.DIALOG_TYPE != RVS_DIALOGTYPE_CHANGEORDER;
    self.modelFieldId = self.DIALOG_TYPE == RVS_DIALOGTYPE_CHANGEORDER ? 'custrecordchangeorder_model' : 'custbodyrvsmodel';
    //Observables
    self.isDisabled = ko.observable(false);
	self.selectedSeries = ko.observable();
	self.selectedDecor = ko.observable();
	self.selectedModel = ko.observable();
	self.selectedDealer = ko.observable();
	
	/** TEMPLATES */
    //Determines which template will be used for each Option line.
    self.optionTemplateToUse = function (item) {
    	if (item.itemType == 'Group')
    		return 'rvsOptionGroupTemplate';
    	else
    		return 'rvsOptionTemplate';
    };
	
	/** SUBSCRIBERS */
	self.selectedDecor.subscribeChanged(function(newVal, oldVal) {self.validateDecor(newVal, oldVal);});
	self.selectedModel.subscribeChanged(function(newVal, oldVal) {self.validateModel(newVal, oldVal);});
	//Update the Model Options when the Model changes.
	self.selectedModel.subscribe(function () {
		self.modelOptions([]); //First clear the list.
		self.updateModelOptions(); //Then update it.
	});
	//Update the prices of all Model Options when the dealer changes if the model is already selected.
	self.selectedDealer.subscribe(function () {
		if(self.selectedDealer() && self.selectedModel()) {
			self.recalcModelOptions();
		}
	});
	
	/** FILTERED LISTS */
    //Filters the Decors by the Series.
    self.filteredDecors = ko.computed(function(){
    	if(self.selectedSeries()) {
			return self.allDecors.filter(function(val) { 
				return val.series.indexOf(self.selectedSeries().id) > -1;
			});
		}
		return [];
    });

    //Filters the Models by the Series and Discontinued Modle, while still letting the change order access discontinued models >> Added >> Alliance HOTFIX for Issue 1339
    self.filteredModels = ko.computed(function(){
        if(self.selectedSeries() && self.DIALOG_TYPE != RVS_DIALOGTYPE_SUITELET) {
            return self.allModels.filter(function(val) {
                return val.series == self.selectedSeries().id ;
            });
        }
        if(self.selectedSeries() && self.DIALOG_TYPE == RVS_DIALOGTYPE_SUITELET) {
            return self.allModels.filter(function(val) { 
                return (val.series == self.selectedSeries().id && val.isDiscontinued == 'F');
            });
        }
        return [];
    });
    
    /** INITIALIZE */
    //When the view model is initialized, create the static lists from the NetSuite account. Then initialize the KO lists with what's in the NS sublists.
    self.initialize = function () {
    	//Initialize the static lists.
    	//These are loaded before load and set on a field on the form. Load them into the arrays.
    	self.allSeries = JSON.parse(nlapiGetFieldValue('custpagervs_allseries'));
    	self.allDecors = JSON.parse(nlapiGetFieldValue('custpagervs_alldecors'));
    	self.allModels = JSON.parse(nlapiGetFieldValue('custpagervs_allmodels'));
    	if(self.DIALOG_TYPE != RVS_DIALOGTYPE_ORDER) self.allDealers = JSON.parse(nlapiGetFieldValue('custpagervs_alldealers'));
    	
    	//Call the context-specific initializer too.
    	if(self.DIALOG_TYPE == RVS_DIALOGTYPE_SUITELET) {
    		self.openForSuitelet();
    	}
    	else if(self.DIALOG_TYPE == RVS_DIALOGTYPE_CHANGEORDER) {
    		self.openForChangeOrder();
    	}
    	
    	//Mark the VM as initialized so we don't do it again.
    	self.isInitialized = true;
    };
    
    //Opens the popup as it should display on a Sales Order form.
    self.openPopup = function () {
    	//Make sure a dealer is selected. If no dealer, no open popup.
    	if(ConvertNSFieldToString(nlapiGetFieldValue('entity')).length == 0) {
    		alert('Please select a Dealer first.');
    		return false;
    	}
    	
    	//Determine whether or not the popup is diabled
    	self.isDisabled(nlapiGetFieldValue('custbodyrvs_lockunitorderpopup') == 'T');
    	
    	//Set the Series, Model, and Decor from the page.
    	self.isInitialized = false;
    	var seriesId = nlapiGetFieldValue('custbodyrvsseries');
    	self.selectedSeries(seriesId ? ko.utils.arrayFirst(self.allSeries, function(item) {return item.id == seriesId; }) : null);
    	var decorId = nlapiGetFieldValue('custbodyrvsdecor');
    	self.selectedDecor(decorId ? ko.utils.arrayFirst(self.allDecors, function(item) {return item.id == decorId; }) : null);
    	var modelId = nlapiGetFieldValue(self.modelFieldId);
    	self.selectedModel(modelId ? ko.utils.arrayFirst(self.allModels, function(item) {return item.id == modelId; }) : null);
    	self.isInitialized = true;

        if(ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvsunit')).length != 0 && modelId.length == 0) {
            var unitFields = ['custrecordunit_series', 'custrecordunit_decor', 'custrecordunit_model'];
            var unitResults = nlapiLookupField('customrecordrvsunit', nlapiGetFieldValue('custbodyrvsunit'), unitFields);
        
            self.isInitialized = false;
            var unitSeriesId = unitResults.custrecordunit_series;
            self.selectedSeries(unitSeriesId ? ko.utils.arrayFirst(self.allSeries, function(item) {return item.id == unitSeriesId; }) : null);
            var unitDecorId = unitResults.custrecordunit_decor || '';
            self.selectedDecor(unitDecorId ? ko.utils.arrayFirst(self.allDecors, function(item) {return item.id == unitDecorId; }) : null);
            var unitModelId = unitResults.custrecordunit_model;
            self.selectedModel(unitModelId ? ko.utils.arrayFirst(self.allModels, function(item) {return item.id == unitModelId; }) : null);
            self.isInitialized = true;
        }
    	
    	//Keep track of the preventDefault code on the window.
    	//Having a window.preventDefault function causes the modal dialog to always be displayed in the top-left 
    	// of the window (assuming "of" in the position object is set to "window").
    	//So make it null then re-set it after popping up the modal
    	var preventDefault = window.preventDefault;
		window.preventDefault = null;
    	//Open the popup with the currently selected item.
    	var popupWidth = parseInt(window.innerWidth * .7);
		var popupHeight = parseInt(window.innerHeight * .7);
    	ss$("#modal-configunitorder").dialog({
    		position: {my: 'center', at: 'center', of: window},
    		draggable: true,
    		resizeable: true,
    		width: popupWidth,
    		height: popupHeight,
    		minWidth: popupWidth * .5,
    		minHeight: popupHeight * .5,
    		modal: true,
    		open: function( event, ui ) {
    			//Add the close icon
    			ss$(".ui-dialog-titlebar-close").css('display', 'none');
    		}
    	});
    	//Re-set the function.
    	window.preventDefault = preventDefault;
    };
    
    //Opens the popup as it should display on the New Order suitelet.
    self.openForSuitelet = function () {
    	//Keep track of the preventDefault code on the window.
    	//Having a window.preventDefault function causes the modal dialog to always be displayed in the top-left 
    	// of the window (assuming "of" in the position object is set to "window").
    	//So make it null then re-set it after popping up the modal
    	var preventDefault = window.preventDefault;
		window.preventDefault = null;
    	ss$("#modal-configunitorder").dialog({
    		position: {my: 'left top', at: 'left bottom', of: '#custpagervs_createsalesorder'},
    		draggable: false,
    		resizable: false,
    		width: parseInt(window.innerWidth * .9),
    		height: parseInt(window.innerHeight * .6),
    		modal: false,
    		open: function( event, ui ) {
    			//Hide the close icon
    			ss$(".ui-dialog-titlebar-close").css('display', 'none');

    			//Set the modal wrapper to appear on the entire page.
    			var modalWrapper = ss$('div.ui-dialog.ui-corner-all.ui-widget.ui-widget-content.ui-front');
    			modalWrapper.css('width', '').css('left', '').css('bottom', '').css('margin', '10px');
    			//Set the modal inside wrapper to appear on the entire modal wrapper
    			ss$('#modal-configunitorder').css('height', '').css('min-height', '500px');
    			
    			//Set the list of dealers to always appear on top
    			var dealerList = ss$("ul.ui-menu.ui-widget.ui-widget-content.ui-autocomplete.ui-front");
    			dealerList.prependTo('#modal-configunitorder');
    			dealerList.css('max-height', '400px').css('overflow-y', 'scroll');
    		}
    	});
    	//Re-set the function.
    	window.preventDefault = preventDefault;
    };
    
    //Opens the popup as it should display in Change Orders
    self.openForChangeOrder = function () {
    	self.isInitialized = false;
    	
    	//Determine whether or not the popup is diabled. This is a custom field we create on beforeload.
    	self.isDisabled(nlapiGetFieldValue('custpagervs_lockchangeorderconfigureunit') == 'T');
    	
    	//Set the Dealer to the New field if it exists, otherwise set it to the Old field.
    	var dealerId = nlapiGetFieldValue('custrecordchangeorder_newdealer');
    	if(dealerId == null || dealerId == '') dealerId = nlapiGetFieldValue('custrecordchangeorder_olddealer');
    	self.selectedDealer(dealerId ? ko.utils.arrayFirst(self.allDealers, function(item) {return item.id == dealerId; }) : null);
    	
    	//Set the Series to the series from the unit.
    	var unitId = nlapiGetFieldValue('custrecordchangeorder_unit');
    	if(unitId != null && unitId != '') {
    		var seriesId = nlapiLookupField('customrecordrvsunit', unitId, 'custrecordunit_series');
    		self.selectedSeries(seriesId ? ko.utils.arrayFirst(self.allSeries, function(item) {return item.id == seriesId; }) : null);
    	}
    	
    	//Set the Decor to the New field if it exists, otherwise set it to the Old field.
    	var decorId = nlapiGetFieldValue('custrecordchangeorder_newdecor');
    	if(decorId == null || decorId == '') decorId = nlapiGetFieldValue('custrecordchangeorder_olddecor');
    	self.selectedDecor(decorId ? ko.utils.arrayFirst(self.allDecors, function(item) {return item.id == decorId; }) : null);
    	
    	//Set the Model
    	var modelId = nlapiGetFieldValue(self.modelFieldId);
    	self.selectedModel(modelId ? ko.utils.arrayFirst(self.allModels, function(item) {return item.id == modelId; }) : null);

    	//Show the table. We don't need to do a Modal init b/c we want the table to only display in the add/remove options tab, not in the entire window.
    	ss$('#modal-configunitorder').css('display', 'block');
    	self.isInitialized = true;
    };
    
    /** POPUP FUNCTIONS (CLOSE/SAVE) */
    //Closes the popup. Doesn't update anything.
    self.cancelPopup = function() {
        ss$('.ui-dialog-titlebar-close').click();
    };
    
    //Closes the popup and sets the data on the lines and in the body.
    self.savePopup = function() {
    	//Make sure we can submit the popup first.
    	//This also ensures that the Series, Model, and Decor are all set. If they are not set, they cannot save the popup.
    	//Which means that none of the logic to process the Series/Model/Decor/Options runs. So we can assume that those fields are set.
    	if (!self.canSubmitPopup()) return false;
    	
    	//Show the spinner and call the saveAndClose function in 50 ms.
    	//JLS - When I tested this in Chrome on Mar 24, 2017, 50ms was the minimum, round amount of time that you had to delay in order
    	// for the spinner to reliably show on the popup. If you just call the function too soon, the spinner won't show at all.
    	// We also need to scroll to the top of the popup in order for the spinner to show. It's difficult to get the spinner to appear fixed and also on top of the popup.
    	document.getElementById('modal-configunitorder').scrollTop = 0;
    	self.toggleSpinner(true);
    	setTimeout(function(){self.saveAndClose();}, 50);
    };
    
    /** VALIDATOR FUNCTIONS */
    //Before we let the user submit the popup, make sure the Series, Decor, and Model are set.
    self.canSubmitPopup = function() {
    	if (!self.selectedSeries()) {
    		alert('Please select a value for Series.');	return false;
    	}
    	if (!self.selectedDecor()) {
    		alert('Please select a value for Decor.');	return false;
    	}
    	if (!self.selectedModel()) {
    		alert('Please select a value for Model.');	return false;
    	}
    	var curModelOpts = self.modelOptions();
    	for(var i = 0; i < curModelOpts.length; i++) {
    		if(curModelOpts[i].itemType == 'Group' && curModelOpts[i].isMandatory && !curModelOpts[i].selectedComponent()) {
    			alert('Please select a value for ' + curModelOpts[i].itemOptionHeaderDisplay.replace(/\*$/g, '') + '.');
    			return false;
    		}
    	}
    	return true;
    };
    
    //Validate the model
    self.validateModel = function(newVal, oldVal) {
    	if (self.isInitialized && newVal && newVal.isDiscontinued == 'T' && !ROLE_RVS20_USERISSALESMANAGER)
		{
    		//If the model is discontinued, don't let a sales rep select it.
    		self.selectedModel(oldVal);
			alert('This model has been discontinued and cannot be selected by users that do not have the "RVS Sales Manager" function.');
		}
    };
    
    //Validate the decor
    self.validateDecor = function(newVal, oldVal) {
		if (self.isInitialized &&
			newVal &&
			newVal.isDiscontinued &&
			parseInt(nlapiGetContext().getRole()) == parseInt(ROLE_RVS20_SALESPERSON))
		{
    		//If the decor is discontinued, don't let a sales rep select it.
    		self.selectedDecor(oldVal);
			alert('This decor has been discontinued and cannot be selected by sales reps.');
		}
    };
    
    /** UTILITIES */
    //Retrieves the list of Options based on the Model.
    self.updateModelOptions = function() {
    	if(self.selectedModel()) {
    		self.toggleSpinner(true);
    		
    		//Determine the price level that should be used as "Base Price"
    		var priceLevel = 'baseprice';
    		if(self.selectedDealer())
    		{
    			priceLevel = self.selectedDealer().priceLevel;
    		}
    		else
    		{
    			var dealerPriceLevel = ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvsdealerpricelevel')); 
    			if (dealerPriceLevel.length > 0 && dealerPriceLevel != '1')
    			{
    				priceLevel = 'price' + dealerPriceLevel;
    			}
    		}
    		
    		ss$.ajax( {
    			url: "/app/site/hosting/restlet.nl?script=customscriptrvs_unitsalesorder_rest&deploy=customdeployrvs_unitsalesorder_rest",
                type: "get",
                dataType: "json",
                data: {
                	modelId: self.selectedModel().id,
                	priceLevel: priceLevel,
                	msrpLevel: 'price' + self.selectedModel().msrpLevel
                },
                success: function( data, i ) {
                	//We got items back from the GET, so build the list of Model Options for the popup.
                	//Get some defaults that will be used by the options so we don't have to do the loopup every time.
                	var tempArr = [];
                	var isUserDealer = IsDealerLoggedIn();
                	for(var i = 0; i < data.length; i++) {
                		tempArr.push(new RVSModelOption(data[i], self, isUserDealer));
                	}
                	self.modelOptions(tempArr);
                	self.toggleSpinner(false);
                },
                error: function (textStatus, errorThrown) {
                	console.log('Error Loading Items\r\n' + JSON.stringify(textStatus) + '\r\n' + errorThrown);
                	alert('Items could not be loaded for this Model. Verify that the data is correct and then refresh the page.');
                	self.toggleSpinner(false);
              }
            });
    	}
    	else{
    		return [];
    	}
    };
    
    //Regenerates the Model Options list and re-checks the Model Options that are checked when the function is called.
    self.recalcModelOptions = function() {
    	if(self.selectedDealer() && self.selectedModel()) {
			self.toggleSpinner(true);
			
			//Determine the price level that should be used as "Base Price"
			var priceLevel = self.selectedDealer().priceLevel;
			
			ss$.ajax( {
				url: "/app/site/hosting/restlet.nl?script=customscriptrvs_unitsalesorder_rest&deploy=customdeployrvs_unitsalesorder_rest",
	            type: "get",
	            dataType: "json",
	            data: {
	            	modelId: self.selectedModel().id,
	            	priceLevel: priceLevel,
	            	msrpLevel: 'price' + self.selectedModel().msrpLevel
	            },
	            success: function( data, i ) {
	            	//We got items back from the GET, so build the list of Model Options for the popup.
	            	//Get some defaults that will be used by the options so we don't have to do the loopup every time.
	            	var tempArr = [];
	            	var isUserDealer = IsDealerLoggedIn();
	            	var currentModelOptions = self.modelOptions();
	            	for(var i = 0; i < data.length; i++) {
	            		//Init the Model Option and determine whether or not this Model Option was previously selected.
	            		var modelOpt = new RVSModelOption(data[i], self, isUserDealer);
	            		for(var j = 0; j < currentModelOptions.length; j++) {
	            			if(currentModelOptions[j].id == modelOpt.id) {
	            				modelOpt.isSelected(currentModelOptions[j].isSelected());
	            				break;
	            			}
	            		}
	            		tempArr.push(modelOpt);
	            	}
	            	self.modelOptions(tempArr);
	            	self.toggleSpinner(false);
	            },
	            error: function (textStatus, errorThrown) {
	            	console.log('Error Loading Items\r\n' + JSON.stringify(textStatus) + '\r\n' + errorThrown);
	            	alert('Items could not be loaded for this Model. Verify that the data is correct and then refresh the page.');
	            	self.toggleSpinner(false);
	          }
	        });
    	}
    };
    
    //Shows/hides the saving... and spinner overlay div based on the parameter.
    self.toggleSpinner = function(show) {
    	ss$('#rvs-spinner').css('display', show ? 'block' : 'none');
    };

    //Converts the Model Options of this change order to something that can be used by the Before Submit of Change Orders.
    self.getModelOptionsForChangeOrder = function() {
    	var selfJS = ko.toJS(self);
    	for (var i = 0; i < selfJS.modelOptions.length; i++) {
    		//delete attributes from the options
    		delete selfJS.modelOptions[i].itemDisplayName;
    		delete selfJS.modelOptions[i].itemDescription;
    		delete selfJS.modelOptions[i].standardComponent;
    		delete selfJS.modelOptions[i].basePrice;
    		delete selfJS.modelOptions[i].itemOptionHeaderDisplay;
    		delete selfJS.modelOptions[i].basePriceCurrencyFormat;
    		//delete stuff from the components
    		if(selfJS.modelOptions[i].components) {
    			for(var j = 0; j < selfJS.modelOptions[i].components.length; j++) {
    				delete selfJS.modelOptions[i].components.itemDescription;
    				delete selfJS.modelOptions[i].components.itemDisplayName;
    				delete selfJS.modelOptions[i].components.basePrice;
    				delete selfJS.modelOptions[i].components.basePriceCurrencyFormat;
    			}
    		}
    	}
    	return selfJS.modelOptions;
    };
    
    /** SAVE */
    //Sets data on the body fields and line items, closes the dialog.
    self.saveAndClose = function() {
    	//Allow ourselves to delete/modify lines and cancel the current line just in case
    	nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'T', false, true);
    	nlapiCancelLineItem('item');
    	
    	//Set the data on the body if it changed.
    	var modelChanged = false;
    	if(nlapiGetFieldValue('custbodyrvsseries') != self.selectedSeries().id) {
    		//Set the series on the form and also set the discount for the entire order.
    		nlapiSetFieldValue('custbodyrvsseries', self.selectedSeries().id, true, true);
    		nlapiSetFieldValue('discountitem', self.selectedSeries().discountId, true, true);
			nlapiSetFieldValue('discountrate', self.selectedSeries().discountRate, true, true);
    	}
    	if(nlapiGetFieldValue(self.modelFieldId) != self.selectedModel().id) {
    		//Set body fields about the model.
    		nlapiSetFieldValue(self.modelFieldId, self.selectedModel().id, true, true);
    		nlapiSetFieldValue('custbodyrvsmsrppricelevel', self.selectedModel().msrpLevel, true, true);
    		modelChanged = true;
    		
    		//Remove all of the line items.
    		//We do this so that we re-calc the MSRP, sort order, etc. on Options that might be the same between different models.
    		if (nlapiGetLineItemCount('item') > 0) nlapiSelectLineItem('item', 1);
    		for(var i = nlapiGetLineItemCount('item'); i > 0; i--) {
    			nlapiRemoveLineItem('item');
    		}
    		
    		//If the model updated, we also need to update the first line item.
    		if(nlapiGetLineItemCount('item') > 0) {
    			nlapiSelectLineItem('item', 1);
    		}
    		else {
    			nlapiSelectNewLineItem('item');
    		}
    		//Set model values
    		nlapiSetCurrentLineItemValue('item', 'quantity', 1, false, true);
    		nlapiSetCurrentLineItemValue('item', 'item', self.selectedModel().id, true, true);
    		nlapiSetCurrentLineItemValue('item', 'custcolrvsmsrpamount', self.selectedModel().msrpAmount, false, true);
    		nlapiCommitLineItem('item');
    	}
    	if(nlapiGetFieldValue('custbodyrvsdecor') != self.selectedDecor().id || modelChanged) {
    		//Set body fields
    		nlapiSetFieldValue('custbodyrvsdecor', self.selectedDecor().id, true, true);
    		nlapiSetFieldValue('custbodyrvspreviousdecorid', self.selectedDecor().id);
    		
    		//If the decor updated or the decor doesn't exist anymore, then we need to update the second line.
    		if(nlapiGetLineItemCount('item') > 1) {
    			nlapiSelectLineItem('item', 0); //This is a workaround for duplicate decors issue Case #9501 and Issue #830 - JRB
    			nlapiSelectLineItem('item', 2);
    		}
    		else {
    			nlapiSelectNewLineItem('item');
    		}
    		//Set decor values
    		nlapiSetCurrentLineItemValue('item', 'quantity', 1, false, true);
    		nlapiSetCurrentLineItemValue('item', 'item', self.selectedDecor().id, true, true);
    		nlapiSetCurrentLineItemValue('item', 'custcolrvsmsrpamount', self.selectedDecor().msrps['price' + self.selectedModel().msrpLevel], false, true);
    		nlapiCommitLineItem('item');
    	}
    	
    	//Add/Remove the lines.
    	var curModelOptions = self.modelOptions();
    	for(var i = 0; i < curModelOptions.length; i++) {
    		var curModelOption = curModelOptions[i];
    		if (curModelOption.isSelected()) {
    			//A normal checkbox Option was selected, so add it to the line items.
    			self.addOptionLineItem(curModelOption.itemId, curModelOption.quantity, curModelOption.optionSortOrder, curModelOption.isMandatory, curModelOption.msrpAmount);
    		}
    		else if (curModelOption.selectedComponent()) {
    			//An Item Group Option was selected, so try to remove the previous Option that was selected in the group, if any.
    			var optGroupExistingIdx = nlapiFindLineItemValue('item', 'custcolrvs_modeloptionitemgroup', curModelOption.itemId);
    			if(optGroupExistingIdx > 0) {
    				nlapiSelectLineItem('item', optGroupExistingIdx); //JLS - Need to select lines before you can delete them client-side
    				nlapiRemoveLineItem('item');
    			}
    			//Then add the new option
    			self.addOptionLineItem(curModelOption.selectedComponent().itemId, curModelOption.selectedComponent().quantity, curModelOption.optionSortOrder, curModelOption.isMandatory, curModelOption.selectedComponent().msrpAmount, curModelOption.itemId);
    		}
    		else {
    			//If the option is no longer selected, remove it from the line items.
    			var curOptionIdx = nlapiFindLineItemValue('item', 'item', curModelOption.itemId);
    			if(curOptionIdx > 0) {
    				nlapiSelectLineItem('item', curOptionIdx); //JLS - Need to select lines before you can delete them client-side
    				nlapiRemoveLineItem('item');
    			}
    			
    			//And remove any option that might have been added from the group.
    			var optGroupIdx = nlapiFindLineItemValue('item', 'custcolrvs_modeloptionitemgroup', curModelOption.itemId);
    			if(optGroupIdx > 0) {
    				nlapiSelectLineItem('item', optGroupIdx); //JLS - Need to select lines before you can delete them client-side
    				nlapiRemoveLineItem('item');
    			}
    		}
    	}
    	
    	//Call the window's RVS After Option Save function script entry point that may or may not be set to run account-specific code.
    	//Specific clients will have this function set on window by the client code that is loaded for their Unit Orders.
    	if (typeof(window.RVS_AfterUnitOrderOptionSave) == 'function') window.RVS_AfterUnitOrderOptionSave();
    	
    	//Hide the spinner and close the popup
    	nlapiSetFieldValue('custbodyrvsallowdeletelineitems', 'F', false, true);
    	self.toggleSpinner(false);
    	ss$('.ui-dialog-titlebar-close').click();
    };
    
    //Adds an Option to the item sublist is the correct order. 
    self.addOptionLineItem = function(itemId, quantity, sortOrder, isMandatory, msrpAmount, optionGroupId) {
    	//Make sure this item doesn't already exist on the line items
		if (nlapiFindLineItemValue('item', 'item', itemId) < 1) {
			//Find where the option should be inserted. Loop over the existing lines to find the sort order.
			//Loop over the lines plus one extra line for the "new line" that doesn't exist at the end of the line items.
			// We need to do this in the case where the option needs to be insert as the second-to-last line.
			var curLineCount = nlapiGetLineItemCount('item');
            var foundOptionItem = false;
			for(var curLineIndex = 1; curLineIndex <= curLineCount + 1; curLineIndex++) {
                // Grab these values to make the if statement more readable/eliminate duplicate reads
                var curItemCategory = nlapiGetLineItemValue('item', 'custcolrvsitemcategory', curLineIndex);
                var curItemSortOrder = ConvertNSFieldToFloat(nlapiGetLineItemValue('item', 'custcolrvs_modeloptionsortorder', curLineIndex));
                var curItemId = nlapiGetLineItemValue('item', 'item', curLineIndex);

                // Here we set the sort order for non-option items in the item list. This includes subtotals, Models, Decor and discount lines
                if (curItemCategory != UNITORDERSCRIPT_ITEMCATEGORYOPTIONID)
                {
                    if (!foundOptionItem) 
                    {
                        // If this non-option item is at the top, keep it at the top
                        curItemSortOrder = 0;
                    } else 
                    {
                        // This non-option item is not at the top. The new option should not be inserted before it
                        curItemSortOrder = sortOrder + 1;
                    }
                } else
                {
                    // the first time we see an option item, set this to true so that we start putting non-options in the bottom of the sort
                    foundOptionItem = true;
                }

				if (curLineIndex > curLineCount ||  curItemSortOrder >= sortOrder)
                {
					//We found where to insert the line if we ran into:
					// 1. The end of the list
					// 2. An item that is an option and has a sort order greater than or equal to the current option's sort order value
                    // 3. An item that is not an option, where we have set the sort order to be greater than the current option's sort order value
					//This means that we need to insert a line right after the current line, unless we're at the end of the list. In that case, select a new line.
					if(curLineIndex > curLineCount) {
						nlapiSelectNewLineItem('item');
					}
					else {
						nlapiInsertLineItem('item', curLineIndex);
					}
					
					//Set the information on the line and commit it.
					nlapiSetCurrentLineItemValue('item', 'quantity', quantity, false, true);
					nlapiSetCurrentLineItemValue('item', 'item', itemId, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcolrvs_modeloptionsortorder', sortOrder, false, true);
					nlapiSetCurrentLineItemValue('item', 'custcolrvsismandatoryoption', (isMandatory ? 'T' : 'F'), false, true);
					nlapiSetCurrentLineItemValue('item', 'custcolrvsmsrpamount', msrpAmount, false, true);
					nlapiSetCurrentLineItemValue('item', 'custcolrvs_modeloptionitemgroup', optionGroupId, false, true);
					//Make sure that the amount is okay. If it isn't, then set the amount to 0.
					var curAmt = nlapiGetCurrentLineItemValue('item', 'rate');
					if (curAmt == null || curAmt == '' || isNaN(curAmt)) {
						nlapiSetCurrentLineItemValue('item', 'rate', 0, false, true);
						nlapiSetCurrentLineItemValue('item', 'amount', 0, false, true);
					}
					nlapiCommitLineItem('item');
					break;
				}
			}
		}
    };
}

/**
 * Represents a single Model Option in the Options table
 */
function RVSModelOption(data, parentVM, isUserDealer) {
	/** STATICS AND OBSERVABLES */
	//Statics
	var self = this;
	self.id = data.id;
	self.itemId = data.itemId;
	self.itemName = data.itemName;
	self.itemDisplayName = data.itemDisplayName;
	self.itemDescription = decodeEntities(data.itemDescription);
	self.itemType = data.itemType;
	self.isMandatory = data.isMandatory;
	self.isStandard = data.isStandard;
	self.standardComponent = data.standardComponent;
	self.selectedComponent = ko.observable(null);
	self.stateAbbreviation = data.stateAbbreviation;
	self.isRestrictedToSalespersonRole = data.isRestrictedToSalespersonRole;
	self.optionSortOrder = ConvertNSFieldToFloat(data.optionSortOrder);
	self.msrpAmount = data.msrpAmount;
	self.quantity = data.quantity;
	self.hiddenOption = data.hiddenOption;
	self.basePrice = data.basePrice;
	self.showInDealerPortal = data.showInDealerPortal;
	self.itemOptionHeaderDisplay = self.itemName.toUpperCase() + ' ' + self.itemDescription.toUpperCase() + (self.isMandatory ? '*' : '');
	self.components = null;
	//Show the price in the format $1000 or -$1000.
	var basePriceFloat = ConvertNSFieldToFloat(data.basePrice);
	self.basePriceCurrencyFormat = (basePriceFloat < 0 ? '-' : '') + '$' + Math.abs(basePriceFloat).toFixed(2);

	//Add the Option Group components.
	if(self.itemType == 'Group') {
		var tempArr = [];
		for(var i = 0; i < data.components.length; i++) {
    		tempArr.push(new RVSModelOptionComponent(data.components[i], self.quantity));
    	}
    	self.components = tempArr;

    	//Set the default selected component for this Option Group.
		//Select the standard component if any of the following are true:
    	// 1. We're in the pre-order Suitelet
    	// 2. We're on the Sales Order and any of the following are true:
    		// a. There are no line items (that means they're likely viewing the popup for the first time)
    		// b. The model on the popup is different than what's on the form (that means they're changing the base of the entire order)
    	if(parentVM.DIALOG_TYPE == RVS_DIALOGTYPE_SUITELET || 
    			(parentVM.DIALOG_TYPE == RVS_DIALOGTYPE_ORDER && 
    				(nlapiGetLineItemCount('item') == 0 ||
					 nlapiGetFieldValue(parentVM.modelFieldId) != parentVM.selectedModel().id)
				 )
			) {
    		self.selectedComponent(ko.utils.arrayFirst(self.components, function(item) {
    	        return item.itemId == self.standardComponent; })
    	    );
    	}
    	else if (parentVM.DIALOG_TYPE == RVS_DIALOGTYPE_ORDER) {
    		//If we're not going to set the standard component, then try to find the selected item in this group on the line items.
        	//We can get the item that is selected in the group by looking at the Model Option Item Group column, which stores the parent of the actual Option on the line.
    		var grpIdx = nlapiFindLineItemValue('item', 'custcolrvs_modeloptionitemgroup', self.itemId);
    		if(grpIdx > 0) {
    			var selectedItemId = nlapiGetLineItemValue('item', 'item', grpIdx);
    			self.selectedComponent(ko.utils.arrayFirst(self.components, function(item) {
        	        return item.itemId == selectedItemId; })
        	    );
    		}
    	}
    	
    	else if (parentVM.DIALOG_TYPE == RVS_DIALOGTYPE_CHANGEORDER) {
    		//If we're on the change order, then we always look to the array on the form to tell us which component to select in the list.
    		var selectedOptions = JSON.parse(nlapiGetFieldValue('custpagervs_selectedoptions'));
    		var optionInfo = ko.utils.arrayFirst(selectedOptions, function(item) {return item.optGroupId == self.itemId;});
    		if(optionInfo) {
    			self.selectedComponent(ko.utils.arrayFirst(self.components, function(item) {return item.itemId == optionInfo.itemId;}));
    		}
    	}
	}
	
	//Determine whether or not this Model Option can be changed by the user.
	//The Option cannot be changed in the following cases:
	// 1. The parent VM is disabled
	// 2. The Item is not an Option Group AND:
		// a. The option is mandatory OR
		// b. The current user does not have the RVS Sales Manager role and the option is retricted to the Sales Person Role and a Dealer is not logged in
	self.isDisabled = parentVM.isDisabled() || 
					  (self.itemType != 'Group' && 
							  (self.isMandatory || 
							  (!ROLE_RVS20_USERISSALESMANAGER && self.isRestrictedToSalespersonRole && !isUserDealer)));
	
	//Observable used by the checkbox.
	//(If the Option is an Option Group, then it is Selected if the selectedComponent is not null, but that doesn't matter for this observable)
	self.isSelected = ko.observable(false);
	if(self.itemType != 'Group') {
		if(parentVM.DIALOG_TYPE == RVS_DIALOGTYPE_CHANGEORDER) {
			//This Option defaults to selected if it is the array on the form to be selected.
			var selectedOptions = JSON.parse(nlapiGetFieldValue('custpagervs_selectedoptions'));
			self.isSelected(ko.utils.arrayFirst(selectedOptions, function(item) {return item.itemId == self.itemId;}) ? true : false);
		}
		else {
			//This Option defaults to selected if it is not an Item Group and any of the following are true:
			// 1. The option's item appears on a line on this order.
			// 2. The option is mandatory.
			// 3. The option is standard and the model in the parent VM doesn't match the model on the order (this means they haven't saved the popup for the first time yet with the current model).
			// 4. The State on the option is set and matches the current ship-to State on the order.
			self.isSelected(
					(nlapiFindLineItemValue('item', 'item', self.itemId) > 0) || 
					(self.isMandatory) ||
					(self.isStandard && parentVM.selectedModel().id != nlapiGetFieldValue(parentVM.modelFieldId)) ||
					(ConvertNSFieldToString(self.stateAbbreviation).length > 0 && self.stateAbbreviation == nlapiGetFieldValue('shipstate')));
		}
	}
}

/**
 * Represents a single Component of an Item Group Model Option
 */
function RVSModelOptionComponent(data, parentQty) {
	/** STATICS AND OBSERVABLES */
	var self = this;
	self.itemId = data.itemId;
	self.itemName = data.itemName;
	self.itemDescription = decodeEntities(data.itemDescription);
	self.itemDisplayName = decodeEntities(data.itemDisplayName);
	self.itemType = data.itemType;
	self.stateAbbreviation = data.stateAbbreviation;
	self.isRestrictedToSalespersonRole = data.isRestrictedToSalespersonRole;
	self.optionSortOrder = ConvertNSFieldToFloat(data.optionSortOrder);
	self.msrpAmount = data.msrpAmount;
	self.quantity = data.quantity * parentQty;
	self.hiddenOption = data.hiddenOption;
	self.basePrice = data.basePrice;
	self.showInDealerPortal = data.showInDealerPortal;
	//Show the option as Item Number Item Description in the dropdown.
	self.dropdownText = self.itemName + ' ' + self.itemDescription;
	//Show the price in the format $1000 or -$1000.
	var basePriceFloat = ConvertNSFieldToFloat(data.basePrice);
	self.basePriceCurrencyFormat = (basePriceFloat < 0 ? '-' : '') + '$' + Math.abs(basePriceFloat).toFixed(2);
}

/**
 * Name: document.ready()
 * Description: Page event that fires after the DOM is initialized.  Sets up all the event bindings 
 * and Jquery widget initializations
 * @returns {void} 
 */
$( document ).ready(function() {
	//Determine the dialog type based on the URL of the order.
	var dialogType = RVS_DIALOGTYPE_ORDER;
	if(location.pathname.indexOf('scriptlet') > 0) dialogType = RVS_DIALOGTYPE_SUITELET;
	else if(location.pathname.indexOf('custrecordentry') > 0) dialogType = RVS_DIALOGTYPE_CHANGEORDER;
	
	//Init the VM and bind it to the HTML
	var rvsUnitOrderVM = new RVS_UnitOrderViewModel(dialogType);
	rvsUnitOrderVM.initialize();
	ko.applyBindings(rvsUnitOrderVM);
	window.GetRVSUnitOrderVM = function() {return rvsUnitOrderVM;};
}); 
ss$ = jQuery.noConflict(true); //This needs to be outside of document.ready() for the sortable list to load.

/**
 * Additional function on subscribables to get both the old and new values when the observable is changed.
 */
ko.subscribable.fn.subscribeChanged = function (callback) {
    var oldValue = null;
    this.subscribe(function (_oldValue) {
        oldValue = _oldValue;
    }, this, 'beforeChange');

    this.subscribe(function (newValue) {
        callback(newValue, oldValue);
    });
};

ko.bindingHandlers.jqAuto = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
    	var options = valueAccessor() || {},
            allBindings = allBindingsAccessor(),
            unwrap = ko.utils.unwrapObservable,
            modelValue = allBindings.jqAutoValue,
            source = allBindings.jqAutoSource,
            valueProp = allBindings.jqAutoSourceValue,
            inputValueProp = allBindings.jqAutoSourceInputValue || valueProp,
            labelProp = allBindings.jqAutoSourceLabel || valueProp;

        //function that is shared by both select and change event handlers
        function writeValueToModel(valueToWrite) {
            if (ko.isWriteableObservable(modelValue)) {
               modelValue(valueToWrite);  
            } else {  //write to non-observable
               if (allBindings['_ko_property_writers'] && allBindings['_ko_property_writers']['jqAutoValue'])
                        allBindings['_ko_property_writers']['jqAutoValue'](valueToWrite);    
            }
        }
        
        //on a selection write the proper value to the model
        options.select = function(event, ui) {
            writeValueToModel(ui.item ? ui.item.actualValue : null);
        };
            
        //on a change, make sure that it is a valid value or clear out the model value
        options.change = function(event, ui) {
            var currentValue = ss$(element).val();
            var matchingItem =  ko.utils.arrayFirst(unwrap(source), function(item) {
               return unwrap(item[inputValueProp]) === currentValue;  
            });
            
            if (!matchingItem) {
               writeValueToModel(null);
            }    
        };
        
        //handle the choices being updated in a DO, to decouple value updates from source (options) updates
        var mappedSource = ko.dependentObservable(function() {
                mapped = ko.utils.arrayMap(unwrap(source), function(item) {
                    var result = {};
                    result.label = labelProp ? unwrap(item[labelProp]) : unwrap(item).toString();  //show in pop-up choices
                    result.value = inputValueProp ? unwrap(item[inputValueProp]) : unwrap(item).toString();  //show in input box
                    result.actualValue = valueProp ? unwrap(item[valueProp]) : item;  //store in model
                    return result;
            });
            return mapped;                
        });
        
        //whenever the items that make up the source are updated, make sure that autocomplete knows it
        mappedSource.subscribe(function(newValue) {
           ss$(element).autocomplete("option", "source", newValue); 
        });
        
        options.source = mappedSource();
        
        //initialize autocomplete
        ss$(element).autocomplete(options);
    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
       //update value based on a model change
       var allBindings = allBindingsAccessor(),
           unwrap = ko.utils.unwrapObservable,
           modelValue = unwrap(allBindings.jqAutoValue) || '', 
           valueProp = allBindings.jqAutoSourceValue,
           inputValueProp = allBindings.jqAutoSourceInputValue || valueProp;
        
       //if we are writing a different property to the input than we are writing to the model, then locate the object
       if (valueProp && inputValueProp !== valueProp) {
           var source = unwrap(allBindings.jqAutoSource) || [];
           var modelValue = ko.utils.arrayFirst(source, function(item) {
                 return unwrap(item[valueProp]) === modelValue;
           }) || {};  //probably don't need the || {}, but just protect against a bad value          
       } 

       //update the element with the value that should be shown in the input
       ss$(element).val(modelValue && inputValueProp !== valueProp ? unwrap(modelValue[inputValueProp]) : modelValue.toString());    
    }
};

ko.bindingHandlers.jqAutoCombo = {
    init: function(element, valueAccessor) {
       var autoEl = ss$("#" + valueAccessor());
       
        ss$(element).click(function() {
        	//Close if already visible
            if (autoEl.autocomplete("widget").is(":visible")) {
                autoEl.autocomplete( "close" );
                return;
            }

            autoEl.autocomplete("search", " ");
            autoEl.focus(); 
        });
    }  
};
	
	
	



/**
 * Decodes an HTML-encoded string by using a textarea DOM element.
 * Decodes things like &amp; and &lt;
 * 
 * @param encodedString
 * @returns
 */
function decodeEntities(encodedString) {
    var textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
}


function ConvertNSFieldToFloat(value) {
	if (value == null || value == '')
		return 0;
	else 
		return parseFloat(value);
}

function ConvertNSFieldToString(value) {
	if (value == null)
		return '';
	else 
		return nlapiEscapeXML(value);
}
