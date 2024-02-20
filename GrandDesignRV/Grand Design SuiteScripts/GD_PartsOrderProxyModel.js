/* 
 * Parts Order Proxy Record View Model. 
 */

function RVS_PartsOrderProxy_ViewModel() {
    var self = this;
    self.lineItems = ko.observableArray();
    self.selectedLine = ko.observable(); // stores the selected line item
    self.oldLine = null; //If the user cancels the line, the oldLine will be put back. 

    self.itemcat1Options = [];
    self.itemcat2Options = [];
    self.uomOptions = [];
    self.partReturnOptions = [];

    /** TEMPLATES */
    //Determines which template will be used for each line.
    self.itemTemplateToUse = function (item) {
		return self.selectedLine() === item ? 'editLineTmpl' : 'viewLineTmpl';
    };
    
    /** INITIALIZE */
    //When the view model is initialized, create the static lists from NetSuite. 
    self.initialize = function () {
    	
    	//Initialize the static lists. These are loaded before load and set on a field on the form. 
    	self.itemcat1Options = JSON.parse(nlapiGetFieldValue('custpage_rvsitemcat1'));
    	self.itemcat2Options = JSON.parse(nlapiGetFieldValue('custpage_rvsitemcat2'));
    	self.uomOptions = JSON.parse(nlapiGetFieldValue('custpage_rvsuoms'));
    	
    	//Check to see if there are inquiry lines to set, and if so, create line items for them here.
    	var inquiryLines = JSON.parse(nlapiGetFieldValue('custpage_inquirylines')) || {};
    	if(inquiryLines.keys)
    	{
    		//We set information in the inquiryLines object on before load.
        	var tempLines = [];
        	for (var i = 0; i < inquiryLines.keys.length; i++) {
        		
        		itemId = inquiryLines.keys[i];
        		
        		//Create a new RVS_PartsOrderProxy_LineItem for each inquiry line.
        		tempLines.push(new RVS_PartsOrderProxy_LineItem({
        			item: new RVS_PartsOrderProxy_Item({id: itemId, name: inquiryLines[itemId].label, uomType: inquiryLines[itemId].uomType, rate: inquiryLines[itemId].basePrice}),
        			uomId: inquiryLines[itemId].defaultUOM,
        			quantity: inquiryLines[itemId].quantity,
        			rate: RoundCurrency(inquiryLines[itemId].basePrice),
        			amount: RoundCurrency(ConvertNSFieldToFloat(inquiryLines[itemId].basePrice)*ConvertNSFieldToFloat(inquiryLines[itemId].quantity)),
        			vendorPartNo: inquiryLines[itemId].vendorPartNo,
        			partsNotes: ''
        		}, self));
        	}
        	self.lineItems(tempLines);
    	}
    };
    
    /** BUTTON FUNCTIONS */
    self.editLine = function (item) {
    	if (!self.canSubmitLine()) return;
    	
    	//Store the old line so we can put it back if necessary
    	self.oldLine = item;
    	
    	//Duplicate the item for the new line and insert it in the old item's position.
    	var copiedItem = self.copyLine(item);
    	self.lineItems.replace(item, copiedItem);
        self.selectedLine(copiedItem);
        
        //Update the transaction total
        self.updateTotal();
    };

    self.cancelLine = function () {
    	//Reset the old criteria value in the array.
    	if (self.oldLine)
    		self.lineItems.replace(self.selectedLine(), self.oldLine);
    	else
    		self.lineItems.remove(self.selectedLine());

    	self.selectedLine(null);
        
        //Update the transaction total
        self.updateTotal();
    };

    self.addLine = function () {
    	//Before you add a new line, check if you can save the current one.
    	if (!self.canSubmitLine()) return;

    	//Clear out the old line, create a new line, and select it.
    	self.oldLine = null;
        var newItem = new RVS_PartsOrderProxy_LineItem(null, self);
        self.selectedLine(newItem);
        self.lineItems.push(newItem);
        
        //Update the transaction total
        self.updateTotal();
    };
    
    self.removeLine = function (item) {
    	self.lineItems.remove(item);
    	
        //Update the transaction total
    	self.updateTotal();
    };
    
    self.saveLine = function (item) {
    	if (self.canSubmitLine())
    	{
        	self.selectedLine(null);
        	
            //Update the transaction total
        	self.updateTotal();
    	}
    };
    
    self.configureLine = function (item) {
    	//Open the popup with the currently selected item.
    	var minWidth = parseInt(window.innerWidth * .5);
		var minHeight = parseInt(window.innerHeight * .6);
    	ss$("#modal-opline").dialog({
			position: {my: "top", at:'top', of: '#modalanchor'},
    		draggable: true,
    		resizeable: true,
    		width: minWidth,
    		minWidth: 600,
    		minHeight: minHeight,
    		modal: true,
    		dialogClass: 'srvdialog',
    		open: function( event, ui ) {
    			//Add the close icon
    			ss$(".ui-dialog-titlebar-close").css('display', 'none');
    			//Make the lists part of the popup so they don't appear behind the popup.
    			ss$("ul.ui-menu.ui-widget.ui-widget-content.ui-autocomplete.ui-front").prependTo("#modal-opline");
    		},
    		beforeClose: function( event, ui ) {
    			//Move the lists back to the main screen again so we can see them when the popup closes.
    			ss$("ul.ui-menu.ui-widget.ui-widget-content.ui-autocomplete.ui-front").prependTo("#modalanchor");
    		}
    	});
    };
    
    /** POPUP FUNCTIONS */
    //Closes the popup and clears out the item. 
    self.cancelPopup = function() {
    	self.selectedLine().item(new RVS_PartsOrderProxy_Item({id: '', name: '', uomType: '', rate: ''}));
    	ss$('.ui-dialog-titlebar-close').click();
    };
    
    //If there's an item selected, closes the popup. If not, they can't save.
    self.savePopup = function() {
    	if(self.selectedLine().item().id != '')
        	ss$('.ui-dialog-titlebar-close').click();
    	else
    		alert('choose an item or click Cancel.');
    };
    
    /** VALIDATOR FUNCTIONS */
    //Try to submit the current line.
    self.canSubmitLine = function () {
    	if(self.selectedLine()) return self.selectedLine().canSave();
    	
    	return true;
    };
    
    //Returns whether or not the VM can be submitted. This is called in the save record function in the client script associated with this record.
    self.saveRecord = function () {
    	//check if you can submit the currently selected line.
    	if (!self.canSubmitLine()) return false;
        
        //Gets a plain JS version of this view model with no dependencies
    	selfJS = self.getJSSelf();
    	
    	//Make sure there is at least one line
        if(selfJS.lineItems.length == 0)
        {
        	alert('You must add at least one line item.');
        	return false;
        }
        
        //Set the KO data in a field on the form so that server side code can access it and commit it in NetSuite.
    	nlapiSetFieldValue('custpage_kodata', JSON.stringify(selfJS));
    	return true;
    };
    
    /** UTILITIES **/ 
    //Performs a deep copy of a Line Item
    self.copyLine = function(itemNotJS) {
    	var item = ko.toJS(itemNotJS);
    	var newLine = new RVS_PartsOrderProxy_LineItem({
			id: item.id,
			itemCat1Id: item.selectedItemCat1 ? item.selectedItemCat1.id : null,
			itemCat2Id: item.selectedItemCat2 ? item.selectedItemCat2.id : null,
			uomId: item.selectedUOM ? item.selectedUOM.id : null,
			item: item.item,
			name: item.name,
			description: item.description,
			quantity: item.quantity,
			rate: item.rate,
			amount: item.amount,
			partsNotes: item.partsNotes,
			vendorPartNo: item.vendorPartNo,
		}, self);
    	
    	return newLine;
    };
    
    //Gets a plain JS version of this view model with no dependencies
    self.getJSSelf = function () {
    	//Convert the current view model to JS so we can loop over the lineItems list and set the parent references to null.
    	//If we don't set the .parent to null, we get a "Converting circular structure to JSON" error
    	var selfJS = ko.toJS(self);
    	for (var i = 0; i < selfJS.lineItems.length; i++) {
    		selfJS.lineItems[i].parent = null;
    	}
    	
    	//Set the old line to empty. This also causes a circular reference
    	selfJS.oldLine = null;
    	
    	return selfJS;
    };
    
    //Update transaction total by looping over the line amounts.
    self.updateTotal = function() {
    	var total = 0;
    	
    	ss$.each(self.lineItems(), function(idx, curLine){
    		total += ConvertNSFieldToFloat(curLine.amount());
		});
    	
    	nlapiSetFieldValue('custrecordpartsorderproxy_total', total);
    };
}

function RVS_PartsOrderProxy_LineItem(data, parent) {
	/** STATICS AND OBSERVABLES */
	var self = this;
	self.parent = parent;
	self.id = data ? data.id : null;
	
	//Observable dropdowns
	self.item = ko.observable(data ? data.item : new RVS_PartsOrderProxy_Item({id: '', name: '', uomType: '', rate: ''}));

	self.selectedItemCat1 = ko.observable(data ? ko.utils.arrayFirst(self.parent.itemcat1Options, function(item) {
        return item.id == data.itemCat1Id; }) : null
    );
	self.selectedItemCat2 = ko.observable(data ? ko.utils.arrayFirst(self.parent.itemcat2Options, function(item) {
        return item.id == data.itemCat2Id; }) : null
    );
	self.selectedUOM = ko.observable(data ? ko.utils.arrayFirst(self.parent.uomOptions, function(item) {
        return item.id == data.uomId; }) : null
    );
	
	//Observables for text boxes and numerics
	self.name = ko.observable(data ? data.name : '');
	self.description = ko.observable(data ? data.description : '');
	self.quantity = ko.observable(data ? data.quantity : 0);
	self.rate = ko.observable(data ? data.rate : '');
	self.amount = ko.observable(data ? data.amount : '');
	self.partsNotes = ko.observable(data ? data.partsNotes: '');
	self.timeAllowed = ko.observable(data ? data.timeAllowed : '');
	self.vendorPartNo = ko.observable(data ? data.vendorPartNo : '');

	
    /** FILTER DROP DOWNS */
    //Filter the item cat 2 options by the selected Item Category 1 
    self.filteredItemCat2 = ko.computed(function(){
    	if(self.selectedItemCat1()) {
			return self.parent.itemcat2Options.filter(function(val) { 
				return val.itemCat1 == self.selectedItemCat1().id;
			});
		}
		return self.parent.itemcat2Options;
    });
	//Filters the list of all UOMs by the selected item's UOM type
	self.filteredUOMs = ko.computed(function() {
		if(self.item() && self.item().id && self.item().uomType && self.item().uomType.length > 0) {
			//filter array by uom type
			return self.parent.uomOptions.filter(function(val) { 
				return val.uomType ==  self.item().uomType;
			});
		}
		return self.parent.uomOptions;
	});
	
	//Computed fields
	self.selectedUOMText = ko.computed(function() {
		if(self.selectedUOM()) return self.selectedUOM().abbr;
		return '';
	});
    
    /** SUBSCRIBERS */
	//Set the base price and requested amount when the item changes
	self.item.subscribe(function() {self.onPartChange();});
	
	// update the requested amount and calculated amount when the quantity or base price change
	self.quantity.subscribe(function() {self.updateAmount();});
	self.rate.subscribe(function() {self.updateAmount();});

	//Checks required fields to see if we can save this line.
	self.canSave = function() {
		if(!self.item() || !self.item().id || self.item().id.length == 0) {
			alert('Enter a value for Item'); return false;
		} else if (!self.selectedUOM()) {
			alert('Enter a value for Units'); return false;
		} else if (!self.quantity() || self.quantity().length < 1 || isNaN(self.quantity())) {
			alert('Enter a value for Quantity. It must be a number.'); return false;
		}
		
		return true;
	};
		
	/** UTILITY FUNCTIONS */
	//Update the amount on the line to be the rate * quantity
	self.updateAmount = function() {
		
		//get the base price and quantity
		var rate = ConvertNSFieldToFloat(self.rate());
		var qty = ConvertNSFieldToFloat(self.quantity());
		
		//set the amount
		self.amount(RoundCurrency(rate * qty));
	};
	
	//when the part changes, default the quantity to 1, and update the rate and amount
	self.onPartChange = function()
	{
		//default the quantity to 1;
		self.quantity(1);
		
		//set the base price on the line from the item
		var rate = self.item() ? RoundCurrency(self.item().rate) : 0;
		self.rate(rate);
		
		//Set the vendor part number for this line from the item.
		self.vendorPartNo(self.item() ? self.item().vendorPartNo : '');
	}
}

/**
 * Represents a single item.  Used to encapsulate the part on a part line.
 */
function RVS_PartsOrderProxy_Item(data) {
	var self = this;
	self.id = data.id;
	self.name = data.name;
	self.uomType = data.uomType;
	self.rate = data.rate;
	self.vendorPartNo = data.vendorPartNo;
}

/**
 * Name: document.ready()
 * Description: Page event that fires after the DOM is initialized.  Sets up all the event bindings 
 * and Jquery widget initializations
 * @returns {void} 
 */
$( document ).ready(function() {
	var partsProxyViewModel = new RVS_PartsOrderProxy_ViewModel();
	partsProxyViewModel.initialize();
	ko.applyBindings(partsProxyViewModel);
	window.GetPartProxyLinesVM = function() {return partsProxyViewModel;};
}); 
ss$ = jQuery.noConflict(true); //This needs to be outside of document.ready() for the sortable list to load.

//connect items with observableArrays
ko.bindingHandlers.sortableList = {
    init: function(element, valueAccessor) {
        var list = valueAccessor();
        ss$(element).sortable({
            update: function(event, ui) {
                //retrieve our actual data item
                var item =ko.dataFor(ui.item[0]);//.tmplItem().data;
                //figure out its new position
                var position = ko.utils.arrayIndexOf(ui.item.parent().children(), ui.item[0]);
                //remove the item and add it back in the right spot
                if (position >= 0) {
                    list.remove(item);
                    list.splice(position, 0, item);
                }
                ui.item.remove();
            }
        });
    }
};

//control visibility, give element focus, and select the contents (in order)
ko.bindingHandlers.visibleAndSelect = {
    update: function(element, valueAccessor) {
        ko.bindingHandlers.visible.update(element, valueAccessor);
        if (valueAccessor()) {
            setTimeout(function() {
                ss$(element).focus().select();
            }, 0); //new tasks are not in DOM yet
        }
    }
};

//Set up the Item Inputs to allow them to query items in the system
ko.bindingHandlers.setupItemInputs = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {

    	initializeItemInputs(viewModel);
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {

    }
};

//Additional function on subscribables to get both the old and new values when the observable is changed.
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

//Handles the async querying of items by name
function initializeItemInputs(viewModel) {
	var inputs = [{id:'#lineitem_input', position: { my: "left bottom", at: "left top", within: "#modalanchor", collision: "flip" }},
	              {id:'#popupitem_input', position: { my: "top", at: "bottom", collision: "none" }}];
	
	for(var n = 0; n < inputs.length; n++)
	{
	    ss$(inputs[n].id).autocomplete({
	    	delay: 300,
	    	autoFocus: true,
	    	position: inputs[n].position,
	    	source: function( request, response ) {
	        	if (request.term.length > 0) {
	        		ss$.ajax( {
	        			url: "/app/site/hosting/scriptlet.nl?script=customscriptrvs_warr2_getitems_suite&deploy=customdeployrvs_warr2_getitems_suite",
	                    dataType: "json",
	                    data: {
	                      term: request.term,
	                      itemCat1: viewModel.selectedItemCat1() ? viewModel.selectedItemCat1().id : '',
	                      itemCat2: viewModel.selectedItemCat2() ? viewModel.selectedItemCat2().id : '',
	                      restrictTypes: 'T',
	                      basePrice: 'T',
	                    },
	                    success: function( data, i ) {
	                    	var tempArray = [];
	                    	for(var i = 0; i < data.items.length; i++){
	                    		tempArray.push({
	                    			id: data.items[i].id,
	                    			label: data.items[i].label,
	                    			basePrice: data.items[i].basePrice,
	                    			uomType: data.items[i].uomType,
	                    			defaultUOM: data.items[i].defaultUOM,
	                    			vendorPartNo: data.items[i].vendorPartNo
	                    		});
	                    	}
	                      response( tempArray );
	                    },
	                    error: function (textStatus, errorThrown) {
	                    	response("Error Loading Items");
	                  }
	                });
	        	}
	        	else {
	               viewModel.item(new RVS_PartsOrderProxy_Item({id: '', name: '', uomType: '', rate: 0}));
	        	}
	        },
	        minLength: 3,
	        select: function( event, ui ) { 
	        	if (ui.item.id != '-1') {
	        		viewModel.item(new RVS_PartsOrderProxy_Item({id: ui.item.id, name: ui.item.label, uomType: ui.item.uomType, rate: ui.item.basePrice, vendorPartNo: ui.item.vendorPartNo}));
	        		viewModel.selectedUOM(ko.utils.arrayFirst(viewModel.parent.uomOptions, function(item) {return item.id == ui.item.defaultUOM; }));
	        	}
	        	else {
	        		viewModel.item(new RVS_PartsOrderProxy_Item({id: '', name: '', uomType: '', rate: 0}));
	        	}
	        },
	        change: function (event, ui) {
	        	if(viewModel.item().name == null || viewModel.item().name == '') {
	        		viewModel.item(new RVS_PartsOrderProxy_Item({id: '', name: '', uomType: '', rate: 0}));
	        	}
	        }
	    });
	}
}

function ConvertNSFieldToFloat(value)
{
	if (value == null || value == '')
		return 0;
	else 
		return parseFloat(value);
}

//Given a number or a string, returns a decimal rounded to two places.
function RoundCurrency(value)
{
	if(!value || isNaN(value))
		value = 0;

	//turn it into a float with two decimal places.
	return parseFloat(value).toFixed(2);
}