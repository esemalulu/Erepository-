/**
 * Module Description
 * The javascript object model for the QA Test javascript IPad Application
 * Version    Date            Author           Remarks
 * 1.00       04 Nov 2015     rbritsch
 *
 */


var STATUS_INPROGRESS = 1;
var STATUS_COMPLETE = 2;
var STATUS_REWORK = 3;
//Global Token Created from constants put in the page by the suitelet


// Class to represent the QA Test View
function QATestViewModel() {
    var self = this;
    //*** Properties
    self.test = ko.observable();	
    self.testTypes = ko.observableArray();
    //self.selectedType = ko.observable();
    self.selectedCategoryId = ko.observable();
    self.selectedVIN = ko.observable();
    self.selectedTest = ko.observable();
    self.selectedLocation = ko.observable();
    self.selectedQuestion = ko.observable();
    self.qaLines =  ko.observableArray([]);
    self.Categories = ko.observableArray([]);
    self.units = ko.observableArray([]);
    self.locations = ko.observableArray([]);
    self.date = ko.observable(new Date());    
    self.testHistory = ko.observableArray([]); // not currently used but already linked up to a REST call for future
    self.isInitialized = false; //initialized to false.  If there is a value, then the intialization has completed
    self.loggedInUser = ko.observable();
    
    // ****** COMPUTED PROPERTIES **************
    
    // computed status field dependent and whether it's an existing test and whether it's completed
    self.status = ko.computed(function() {
    	if(!self.test()){
    		return "";
    	}else if(!self.test().testId || self.test().testId === '') {
            return "New"; 
        } else if(self.test().status() == STATUS_COMPLETE){
            return "Completed";
        } else if(self.test().status() == STATUS_REWORK){
	        return "Re-Work";
	    }else {
	    	return "In Progress";
        }
    });
    
    // Dirty flag to track if unsaved changes have been made
    self.dirtyFlag = new ko.dirtyFlag(self.test);
    self.isDirty = ko.computed(function(){
    	return self.dirtyFlag.isDirty();
    });

    //Grabs the test id, if there is one.  Used by the print function
    self.getTestId = ko.computed(function(){
    	if(!self.test()){
    		return "";
    	}
    	else if(self.test().testId != null)
    	{
    		return self.test().testId;
    	}
    	else{return 'No Test Selected';}
    });
    	
    	
    // Automatically filters the lines by the selected Category
    self.filterQALines = ko.computed(function() {
        if(!self.selectedCategoryId()) {
            return self.qaLines(); 
        } else {
            return ko.utils.arrayFilter(self.qaLines(), function(qaLine) {
                return qaLine.categoryName == self.selectedCategoryId();
            });
        }
    });
    
    // filters units by location and sorts by serial number
    self.filterUnits = ko.computed(function() {
    	if(!self.selectedLocation()) {
            return self.units().sort(function (a, b) {return a.serialNumber > b.serialNumber ? 1:-1;}); 
        } else {
            return ko.utils.arrayFilter(self.units(), function(unit) {
                return unit.location == self.selectedLocation().name;
            }).sort(function (a, b) {return a.serialNumber > b.serialNumber ? 1:-1;});
        }
    });
    
    
    // ****** Event Handlers and Behaviors ********
    
    // if location, VIN or Test Type changes, clear the current test so it is not modified under the wrong attributes
    // these values can only change if there are not unsaved changes
    self.selectedVIN.subscribe(function(newValue){
    	self.clearTest();
    });
     
    self.selectedTest.subscribe(function(newValue){
    	self.clearTest();
    });
    
    self.selectedLocation.subscribe(function(newValue){
    	self.clearTest();
    	self.getUnits();
    });
    
    self.setQuestionSelected = function(line){
    	self.selectedQuestion(line);
    	$( "#notesPopup" ).popup('open');
    	$("#textarea-a").focus();
    };
    
    // Action from Add Comments button 
    self.openComments = function(){
    	$( "#commentsPopup" ).popup('open');
    	$("#commentsTextArea").focus();
    };
    
    self.saveOrLoadTest = function(){
    	if(self.isDirty())
    	{
    		// set the status the first time if it is not already set
    		if(!self.test().status() || self.test().status() === '')
    			self.test().status(STATUS_INPROGRESS);
    		self.saveTest();
    	}
    	else
    		self.getTest();
    	
    };
    
    // Functions that handle the canceling of an open test
    self.cancelTest = function(){
    	if(self.isDirty())
    		$( "#popupDialog" ).popup('open');
    	
    };
    self.continueCancel = function(){
    	self.clearTest("Changes Cancelled");
    };
    // Clears all current test data and accepts a status message to be displayed
    self.clearTest = function(message){
    	self.qaLines.removeAll();
    	self.Categories.removeAll();
    	self.selectedCategoryId(message);
    	self.selectedQuestion(null);
    	self.test(null);
   	   
    	self.dirtyFlag.reset();    	
    	
    	$( "#popupDialog" ).popup('close');
    };
    
    // Handle logging in to NetSuite to get a valid session
    self.netSuiteLogin = function(){
    	$( "#loginDialog" ).popup('open');
    	    	
    };
    
    self.showHelpPopup = function(){
    	$( "#helpDialog" ).popup('open');
    };
       
    // Change Categories Event
    self.goToCategory = function(category) { 
     
    	self.selectedCategoryId(category);
    	
    };
    
    // Custom Event Handler to get before and after values so we can tell if we shoudl scroll right or left
    self.selectedCategoryId.beforeAndAfterSubscribe(function(oldValue, newValue){
    	$("#questionsTable").trigger("create");
        
       if(self.Categories.indexOf(oldValue) > self.Categories.indexOf(newValue))
    	   self.showPrevAnimation($("#questionsTable"));
       else
    	   self.showNextAnimation($("#questionsTable"));
    });
    
    // set next category
    self.nextCategory = function() { 
        var index = self.Categories.indexOf(self.selectedCategoryId());
        if(index < self.Categories().length-1)
        {
        	self.hideNextAnimation($("#questionsTable"), function(){
        		self.selectedCategoryId(self.Categories()[index+1]);
        	});
        	
        }
        	
   };
   self.previousCategory = function() { 
       var index = self.Categories.indexOf(self.selectedCategoryId());
       if(index > 0)
       {
    	   self.hidePrevAnimation($("#questionsTable"), function(){
    		   self.goToCategory(self.Categories()[index-1]);
       		});
       }
    	   
  };

  // ***** REST Calls
  self.getTest = function() {
	  // Get Test
	  showOrHideSpinner(true, 'Loading Test...');
	  var proxy = new ProxyObject(GetAuthToken(), 
  			"/app/site/hosting/restlet.nl?script=customscriptrvs_qatest_testrest&deploy=customdeployrvs_qatest_testrest", {testType: self.selectedTest().typeId, unit: self.selectedVIN().unitId}, 'GET');
	  	proxy.makeRequest({
	  		successCallback: function (data) {
	  			 var lines = [];
	    	        self.test( new QATest(data));
	    	        $.each(data.qaLines, function(i, item) {
	    	            lines.push(new QALine(item));	
	    	            
	    	        });
	    	        self.qaLines(lines);
	    	        
	    	        // set the test lines to point to the qaLines so the dirty flag works with both lines and the test comments
	    	        self.test().testLines = self.qaLines();
	    	        	    	        
	    	        var cats = ko.utils.arrayMap(self.qaLines(), function(item){ return item.categoryName;});
	    	        self.Categories(ko.utils.arrayGetDistinctValues(cats).sort()); 
	    	        var oldCat = self.selectedCategoryId();
	    	        self.selectedCategoryId(self.Categories()[0]);
	    	        // if the value is the same, the change event won't fire so force it to because this is new data
	    	        if(oldCat == self.selectedCategoryId())
	    	        	self.selectedCategoryId.valueHasMutated();
	    	        
	    	        self.dirtyFlag.reset();
	    	        
		         },
		         failureCallback: function() {
		        	 alert("Error Retrieving Test.\n\n1.Make sure the tablet is connected to the internet.\n2.Open the Settings panel on the right to check login status.");
	    	         //self.netSuiteLogin();
		         },
		         completeCallback: function() {
		        	 showOrHideSpinner(false);
		         }
	  	});  	
	   	
	};
	      
   // Get Locations
    self.getLocations = function() {
    	var proxy = new ProxyObject(GetAuthToken(), 
    			"/app/site/hosting/restlet.nl?script=customscriptrvs_qatest_getlocationsrest&deploy=customdeployrvs_qatest_getloc_deploy", null, 'GET');
    	proxy.makeRequest({
    		successCallback: function (data) {
    			
    			var locationsTemp = [];
    	        var locationData = data.locationsArray;
    	        
    	        $.each(locationData, function(i, item) {
    	        	locationsTemp.push(new QALocation(item));
    	            
    	        });
    	        self.locations(locationsTemp);
    	        self.loggedInUser(data.user);
	         },
	         failureCallback: function() {
	        	 alert("Error Retrieving Locations.\n\n1.Make sure the tablet is connected to the internet.\n2.Open the Settings panel on the right to check login status.");
	        	 //self.netSuiteLogin();
	         }
    	});
    	
	 };
	   
	self.getTestTypes = function() {
		var proxy = new ProxyObject(GetAuthToken(), 
    			"/app/site/hosting/restlet.nl?script=customscriptrvs_qatest_gettesttypesrest&deploy=customdeployrvs_qatestgettesttypesdeploy", null, 'GET');
    	proxy.makeRequest({
    		successCallback: function (data) {
    			var typesTemp = [];
		    	   
    	        $.each(data, function(i, item) {
    	        	typesTemp.push(new QATestType(item));
    	            
    	        });
    	        self.testTypes(typesTemp);
    
	         },
	         failureCallback: function() {
	        	 alert("Error Retrieving Test Types.\n\n1.Make sure the tablet is connected to the internet.\n2.Open the Settings panel on the right to check login status.");
	        	 //self.netSuiteLogin();
	         }
    	});
    	
			   	
	};
	self.getUnits = function() {
		showOrHideSpinner(true, 'Loading Units...');
		var proxy = new ProxyObject(GetAuthToken(), 
    			"/app/site/hosting/restlet.nl?script=customscriptrvs_qatestgetunitsrest&deploy=customdeployrvs_qatestgetunitsrest", {'location': (self.selectedLocation() ? self.selectedLocation().locationId : '')}, 'GET');
    	proxy.makeRequest({
    		successCallback: function (data) {
    			var unitsTemp = [];
 	    	   
    	        $.each(data, function(i, item) {
    	            unitsTemp.push(new QAUnit(item));
    	            
    	        });
    	        self.units(unitsTemp);
	         },
	         failureCallback: function() {
	        	 alert("Error Retrieving Units.\n\n1.Make sure the tablet is connected to the internet.\n2.Open the Settings panel on the right to check login status.");
	        	 //self.netSuiteLogin();
	         },
	         completeCallback: function() {
	        	 showOrHideSpinner(false);
	         }
    	});
        	
	};
		   
	// Retrieve login credentials and get new auth token
    self.postLogin = function(){
    		// 
		   setTimeout(function(){
		        $.mobile.loading('show', {
		        	text: "Logging In...",
		        	  textVisible: true,
		        	  theme: "b",
		        	  html: ""  });
		    		},1);   
		    
		    var email = $('#loginEmail').val();
		    var pass = $('#loginPassword').val();
		    // remove the password from the form now that we have it
		    $('#loginPassword').val('');
		    
		   CreateAuthToken(email,pass, function(status, data) {
			   if(status)
			   {
				   $( "#loginDialog" ).popup('close');
				   
			   }
			   else
			   {
				   alert("Error Logging In: " + data.error.message);
			   }
			   setTimeout(function(){
	                $.mobile.loading('hide');
	            },300);
			   if(!self.isInitialized)
				   self.initialize();
		   });		   
	};
		
   self.saveTest = function(callback){
	  setTimeout(function(){
	        $.mobile.loading('show', {
	        	text: "Saving...",
	        	  textVisible: true,
	        	  theme: "b",
	        	  html: ""  });
	    },1); 
	var proxy = new ProxyObject(GetAuthToken(), 
				"/app/site/hosting/restlet.nl?script=customscriptrvs_qatest_testrest&deploy=customdeployrvs_qatest_testrest", ko.toJSON(self), 'POST');
  	proxy.makeRequest({
  		successCallback: function (data) {
	  			var testId = data;
	        	self.clearTest('Test Saved Successfully.');
	        	
	        	if(typeof callback ==="function")
	        		callback(testId);
	         },
	         failureCallback: function() {
	        	 alert("Error Saving Test.\n\n1.Make sure the tablet is connected to the internet.\n2.Open the Settings panel on the right to check login status.");
	        	 //self.netSuiteLogin();
	         },
	         completeCallback: function() {
	        	 setTimeout(function(){
		                $.mobile.loading('hide');
		            },300);  
	         }
  	});
  	
   };
   
   self.printTest = function(){
	   if(self.isDirty())
		   self.saveTest(self._print);
	   else
		   self._print(self.test().testId);
   };
   self._print = function(testId)
   {
	   var printProxy = new PrintProxyObject(GetAuthToken(), 
			   '/app/site/hosting/restlet.nl?script=customscriptqa_printtest&deploy=customdeployqa_printtest', {custparam_qatestid : testId}, 'QA Test # ' + testId +'.pdf');
	   var printUrl = printProxy.getFileUrl();
	  
	   $('#printoutFrame').prop('src', printUrl);
	   $( "#printoutPopup" ).popup('open');
   };
   
   //Marks test as completed, and to be printed later (via the desktop suitelet) and saves it
   self.markCompleted = function(){
			   
		   var invalidLines =  ko.utils.arrayFilter(self.qaLines(), function(qaLine) {
			    return !qaLine.value() && (qaLine.notes() == 'undefined' || qaLine.notes() == '');
            });
		   
		   if(invalidLines.length > 0)
		   {
			   alert('Cannot complete test.  Please enter notes for all failed lines.');
		   }
		   else{
			   // check if any lines failed so we can mark for Rework
			   var failedLines =  ko.utils.arrayFilter(self.qaLines(), function(qaLine) {
				    return !qaLine.value();
	            });
			   if(failedLines.length > 0)
				   self.test().status(STATUS_REWORK);
			   else
				   self.test().status(STATUS_COMPLETE);
			   		   
			   self.test().toBePrinted(true);
			   self.saveTest();
		   }
	   };
	   

   // *** Initialize Model
   self.initialize = function() {
	   // check for authorization token and initiate login if missing
	   if(GetAuthToken() == null || GetAuthToken() == 'undefined')
	   {
		   self.netSuiteLogin();
	   }else
	   {	   
		   self.getLocations();
		   self.getUnits();
		   self.getTestTypes();
		   self.dirtyFlag.reset();
	   }
   };
   
      
   // Animations - not sure in the model is best place for this, but need to call them from model events 
   // probably should create event delegates and register the handlers in document.onReady
   self.showNextAnimation = function(elem) { 
	  $(elem).css({marginLeft: "100%", width: "0px"});
		   $(elem).animate({
			    marginLeft: 0,
			    width: '100%'
			});
   };
   self.hideNextAnimation = function(elem, callback) { 
	   $(elem).animate({width: '0'}, callback);
   };
   
   self.showPrevAnimation = function(elem) { 
	   	$(elem).css({marginLeft: "0", width: "0"});
		   $(elem).animate({
			   width: '100%'
			});
   };
   self.hidePrevAnimation = function(elem, callback) { 
	  $(elem).css({marginLeft: "0", width: "100%"});
	   $(elem).animate({
		    marginLeft: '100%',
		    width: '0'
		}, callback);
   };

}


// *** Objects used to represent data

//Class to represent a row in QA Test
//function QALine(test, templateLine, category, flatRateCode, value, sortOrder) {
function QALine(data) {
    var self = this;
    self.testLineId = data.testLineId;
    self.templateId = data.templateId;
    self.name = data.name;
    self.code = data.code;
    self.templateLine = data.templateLine;
    self.categoryId = data.categoryId;
    self.categoryName = data.categoryName;
    self.flatRate = data.flatRate;
    self.value = ko.observable(data.value).extend({
        booleanValue: null
    });
    self.type = data.type;
    self.sortOrder = data.sortOrder;   
    self.notes = ko.observable(data.notes);
    
    self.fixed = ko.observable(data.fixed).extend({
        booleanValue: null
    });
    self.fixedUser = data.fixedUser;
    self.fixedUserId = data.fixedUserId;
    self.fixedDate = data.fixedDate;
    if(self.fixed().formattedValue)
    {
    	var tempDate = new Date(data.fixedDate);
	    self.fixedDate = tempDate.getUTCMonth() + '/' + tempDate.getUTCDay() + '/' + tempDate.getUTCFullYear();
    }  
}

//Class to represent a QA Test Instance
function QATest(data) {
    var self = this;
    self.testId = data.testId;
    self.templateId = ko.observable(data.templateId);
    self.version = ko.observable(data.version);
    self.date = ko.observable(data.date);
    self.user = ko.observable(data.user);
    self.unit = ko.observable(data.unit);
    self.status = ko.observable(data.status);
    self.systemsHold = ko.observable(data.systemsHold);
    self.toBePrinted = ko.observable(data.toBePrinted);
    self.comments = ko.observable(data.comments);
    self.testLines = ko.observableArray(data.qaLines);
    
    self.isCompleted = ko.computed(function() {
    	if(self.status() == STATUS_COMPLETE || self.status() == STATUS_REWORK){
            return true;
        } else {
        	return false;
        }
    });
    
}

function QAUnit(data) {
    var self = this;
    self.unitId = data.unitId;
    self.vin = data.vin;
    self.model = data.model;
    self.dealer = data.dealer;
    self.serialNumber = data.serialNumber;
    self.location = data.location;

}
function QALocation(data) {
    var self = this;
    self.name = data.name;
    self.locationId = data.locationId;
}

function QATestType(data) {
    var self = this;
    self.name = data.name;
    self.typeId = data.typeId;
    self.templateId = data.templateId;
    self.currentVersionNumber = data.currentVersionNumber;
}

// Object for token based calls through the proxy suitelet
function ProxyObject(token, restUrl, data, method) {
	var self = this;
	self.token = token;
	self.restUrl = GLOBAL_REST_URL + restUrl;
	self.method = method;
	// conditionally set this to a url query string because it's easy to do in JQuery and hard to do in a suitelet
	self.data = (self.method === 'GET' && data) ? $.param( data ) : data;
		 
	self.makeRequest = function(args)
	{		
		 $.ajax({
    		 url: GLOBAL_PROXY_REST, //requestData.url,
      	     type: self.method,
      	     processData: (self.method === 'POST') ? false : true,
             data: (self.method === 'POST') ? JSON.stringify(self): {proxyData :  JSON.stringify(self)},
             dataType: "json",
             contentType: "application/json; charset=utf-8",
             success: function (data) {
            	 console.log("fetch complete + " + self.restUrl);
            	 if (typeof args['successCallback'] === "function") {
            		 args['successCallback'](data);
     	      	 }	    	        
             },
             error: function() { if(typeof args['failureCallback'] === "function")args['failureCallback']();},
             complete: function() { if(typeof args['completeCallback'] === "function")args['completeCallback']();}
         });	   

		
	};
}

function PrintProxyObject(token, restUrl, data, fileName) {
	var self = this;
	self.token = token;
	self.restUrl = GLOBAL_REST_URL + restUrl;
	self.fileName = fileName;
	
	// conditionally set this to a url query string because it's easy to do in JQuery and hard to do in a suitelet
	self.data = $.param( data );
	
	self.getFileUrl = function()
	{
		var url = GLOBAL_PROXY_PRINT_URL + '&' + $.param({proxyData :  JSON.stringify(self)});
		return url;
		
	};
}

/**
 * showOrHideSpinner - Toggles the loading spinner
 * @param isShow [Boolean] - true to show the spinner, false to hide
 * @param textToShow [String] - the text to display with the spinner
 */
function showOrHideSpinner(isShow, textToShow) {
	if(isShow) {
		setTimeout(function(){
	        $.mobile.loading('show', {
	        	text: textToShow,
	        	  textVisible: true,
	        	  theme: "b",
	        	  html: ""  });
	    },1); 
	}
	else {
	   setTimeout(function(){
           $.mobile.loading('hide');
       },300);
	}
}


/**
 * Name: document.ready()
 * Description: Page event that fires after the DOM is initialized.  Sets up all the event bindings 
 * and Jquery widget initializations
 * @returns {void} 
 */
$( document ).ready(function() 
{
	//var test = new QATestViewModel(1,1,"11/1/2016","ryan","12345","True");
	var test = new QATestViewModel();
	$("#qa-test-page").load(GLOBAL_MAIN_PAGE,
		function() {
			// Trigger the jquery mobile creation of the page before we apply our knockout bindings
			 $(this).trigger('create');
			 ko.applyBindings(test);
			 test.initialize();
			 window.pdiGetVM = function() {return test;};
				
			 // Set the swipe area to be the full size of its parent, the main panel
			 $("#themain").height($("#qa-test-page").height());
			 // Bind the swipeHandler callback function to the swipe event on div.box
			$( "#themain" ).on( "swipeleft", swipeLeftHandler );
			$( "#themain" ).on( "swiperight", swipeRightHandler );
			 
			  // Callback function references the event target and adds the 'swipe' class to it
			  function swipeLeftHandler( event ){
			    test.nextCategory();
			  }
			  function swipeRightHandler( event ){
				    test.previousCategory();
			  }
			  
			  
			 			 
	});  
	
	$( document ).on( "mobileinit", function() {
		  $.mobile.loader.prototype.options.text = "loading";
		  $.mobile.loader.prototype.options.textVisible = false;
		  $.mobile.loader.prototype.options.theme = "a";
		  $.mobile.loader.prototype.options.html = "";
		});
	
	// register the page containerload event so we can handle the transition to a new page
	// have to manually wait for for jquery mobile to do it's thing before we can apply our bindings because it is doing it autoamtically and there isn't really a callback
	$(document).on("pagecontainerload", function (e, ui) {
		waitToLoad(ui.page[0].id);
	});
	
	function waitToLoad(pageID) {
	    if ($('#' + pageID).length > 0) {
	        ko.applyBindings(test, $('#' + pageID)[0]); //bind the external page
	    }
	    else {
	        setTimeout(function () { waitToLoad(pageID); }, 100);
	    }
	}
	


}); 


// **** Custom Bindings
ko.dirtyFlag = function(root, isInitiallyDirty) {
    var result = function() {},
        _initialState = ko.observable(ko.toJSON(root)),
        _isInitiallyDirty = ko.observable(isInitiallyDirty);

    result.isDirty = ko.computed(function() {
        return _isInitiallyDirty() || _initialState() !== ko.toJSON(root);
    });

    result.reset = function() {
        _initialState(ko.toJSON(root));
        _isInitiallyDirty(false);
    };

    return result;
};

ko.extenders.booleanValue = function (target) {
    target.formattedValue = ko.computed({
        read: function () {
            if (target() === true) return "true";
            else if (target() === false) return "false";
        },
        write: function (newValue) {
            if (newValue) {
                if (newValue === "false") target(false);
                else if (newValue === "true") target(true);
            }
        }
    });

    target.formattedValue(target());
    return target;
};

ko.bindingHandlers.jqmRadio = {
    init: function (element, valueAccessor) {
        var result = ko.bindingHandlers.checked.init.apply(this, arguments);
        try {
            $(element).checkboxradio("refresh");
        } catch (x) {}
        return result;
    },
    update: function (element, valueAccessor) {
        ko.bindingHandlers.checked.update.apply(this, arguments);
        var value = valueAccessor();
        var valueUnwrapped = ko.utils.unwrapObservable(value);
        try {
            $(element).checkboxradio("refresh");
        } catch (x) {}
    }
};

ko.bindingHandlers.jqmFlip = {
    init: function (element, valueAccessor) {
        var result = ko.bindingHandlers.value.init.apply(this, arguments);
        try {
            $(element).slider("refresh");
        } catch (x) {}
        return result;
    },
    update: function (element, valueAccessor) {
        ko.bindingHandlers.value.update.apply(this, arguments);
        var value = valueAccessor();
        var valueUnwrapped = ko.utils.unwrapObservable(value);
        try {
        	
        	$root.makeDirty();//alert(valueUnwrapped);
            $(element).slider("refresh");
        } catch (x) {}
    }
};

//Here's a custom Knockout binding that makes elements shown/hidden via jQuery's fadeIn()/fadeOut() methods
//Could be stored in a separate utility library, no longer used here
ko.bindingHandlers.fadeVisible = {
	init: function(element, valueAccessor) {
	   // Initially set the element to be instantly visible/hidden depending on the value
	   var value = valueAccessor();
	   $(element).toggle(ko.unwrap(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
	},
	update: function(element, valueAccessor) {
	   // Whenever the value subsequently changes, slowly fade the element in or out
	   var value = valueAccessor();
	   
	   $(element).fadeOut('slow', function(){
	  	 $(element).delay(500).fadeIn('slow');
	   });     
	}
};

ko.observable.fn.beforeAndAfterSubscribe = function(callback, target) {
    var _oldValue;
    this.subscribe(function(oldValue) {
        _oldValue = oldValue;
    }, null, 'beforeChange');

    this.subscribe(function(newValue) {
        callback.call(target, _oldValue, newValue);
    });
};

ko.bindingHandlers.datePicker = {
	    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
	        // Register change callbacks to update the model
	        // if the control changes.
	        ko.utils.registerEventHandler(element, "change", function () {
	            var value = valueAccessor();
	            var target_date = element.valueAsDate;
	            var truncated = new Date(target_date.getUTCFullYear(), target_date.getUTCMonth(), target_date.getUTCDate());
	            value(truncated);
	        });
	    },
	    // Update the control whenever the view model changes
	    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
	        var value =  valueAccessor();
	        var unwrapped = ko.utils.unwrapObservable(value());
	        if(unwrapped === undefined || unwrapped === null) {
	            element.value = '';
	        } else {
	            element.valueAsDate = unwrapped;
	        }
	    }
	};

