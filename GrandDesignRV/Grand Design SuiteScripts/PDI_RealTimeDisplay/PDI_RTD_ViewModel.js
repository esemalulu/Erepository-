/**
 * The KO object model for the MAVRON Vehicle Check-In Mobile app
 * 
 * Version    Date            Author           Remarks
 * 1.00       7 Feb 2017	  Brian Sutter
 *
 */

function PDI_RTD_ViewModel () {
	
	/** STATICS AND OBSERVABLES */
    var self = this;
    self.locations = ko.observableArray();
    self.selectedLocation = ko.observable();
    self.previousLocation = ko.observable();
    self.loggedInUser = ko.observable();
    self.linesPerPage = ko.observable();
    self.pageDuration = ko.observable();
    self.lastUpdateTime = ko.observable();
    self.errorCount = ko.observable();
    self.isInitialized = false; //initialized to false.
    
    self.dataSets = ko.observableArray();
    self.currentDataSet = ko.observable();
    self.currentDataSetIndex = ko.observable();
    self.currentPageIndex = ko.observable();

    /**
     * Determines which template will be used for the main display.
     */
    self.templateToUse = ko.computed(function () {
    	if (self.currentDataSet() == null || self.currentDataSet().template == null) {
    		return 'template-nodata';
    	}
    	else if (self.currentDataSet().template == '1') {
    		return 'template1';
    	}
    });
    
    /** INITIALIZE */
    //When the view model is initialized, get the employee list from the NetSuite account, and default the inspection date to today
    self.initialize = function () {
    	
	   // check for authorization token and initiate login if missing
	   if(GetAuthToken() == null || GetAuthToken() == 'undefined')
	   {
		   console.log('Not Authorized');
		   self.netSuiteLogin();
	   }
	   else	//Authorization successful
	   {
		   console.log('Authorization Successful');
		   
		   self.currentDataSetIndex(0);	//Initialize the dataSet index to be 0.
		   self.currentPageIndex(1);  	//Initialize the page index to be 1. Sorry.
		   self.linesPerPage(10);
		   self.pageDuration(15);
		   self.errorCount(0);
		   
		   self.getLocations();
		   
		   setTimeout(function(){
		       ss$.mobile.loading('show', {
		    	   text: "Updating...",
		    	   textVisible: true,
		    	   theme: "b",
		    	   html: ""  });
		       //Call the getTests RESTlet, initializing the chain of 'complete' callbacks that will update the display continuously
		       self.getTests(true);
		   }, 1000);
	    	
		   //Subscribe to the old value of the location drop down, so we can tell if it has changed
		   //We do this to avoid creating a cookie when the page first loads, since the normal subscribe function fires then
		   self.selectedLocation.subscribe(function(previousValue){
			   self.previousLocation(previousValue);
		   }, self, 'beforeChange');
		   
		   //Subscribe to the location drop down, so the tests can be updated immediately when it is changed
		   self.selectedLocation.subscribe(function(newValue){
			   showSpinningLoader();
			   //Set the page index to the last page, so the dataSet will advance
			   if(self.currentDataSet())
				   self.currentPageIndex(self.currentDataSet().maxPageCount());
			   self.dataSets.removeAll();
			   self.getTests(false);
			   
			   //If the selected location has changed, then create a cookie to store the selected location
			   if(self.selectedLocation() && self.previousLocation() && (self.selectedLocation().locationId != self.previousLocation().locationId))
			   {
				   createLocationCookie(self.selectedLocation().locationId);
			   }
	       });
	    	
		   //Subscribe to the lines per page drop down, so the tests can be updated immediately when it is changed
		   self.linesPerPage.subscribe(function(newValue){
			   showSpinningLoader();
			   //Set the page index to the last page, so the dataSet will advance
			   if(self.currentDataSet())
				   self.currentPageIndex(self.currentDataSet().maxPageCount());
			   self.dataSets.removeAll();
			   self.getTests(false);
	       });
		   self.isInitialized = true;
	   }
    	//End initialize
    };
    
    // Handle logging in to NetSuite to get a valid session
    self.netSuiteLogin = function(){
    	ss$( "#popupSettings" ).popup('open');
    };
    
	// Retrieve login credentials and get new auth token
    self.postLogin = function(){
    		// 
		   setTimeout(function(){
		        ss$.mobile.loading('show', {
		        	text: "Logging In...",
		        	  textVisible: true,
		        	  theme: "b",
		        	  html: ""  });
		    		},1);   
		    var email = ss$('#loginEmail').val();
		    var pass = ss$('#loginPassword').val();
		    // remove the password from the form now that we have it
		    ss$('#loginPassword').val('');
		    
		   CreateAuthToken(email,pass, function(status, data) {
			   if(status)
			   {
				   ss$( "#popupSettings" ).popup('close');
			   }
			   else
			   {
				   alert("Error Logging In: " + data.error.message);
			   }
			   setTimeout(function(){
	                ss$.mobile.loading('hide');
	            },300);
			   if(!self.isInitialized)
				   self.initialize();
		   });		   
	};
    
    self.getLocations = function() {
    	var proxy = new ProxyObject(GetAuthToken(), 
    			"/app/site/hosting/restlet.nl?script=customscriptpdi_rtd_getlocations_restlet&deploy=customdeploypdi_rtd_getlocations_restlet", null, 'GET');
    	proxy.makeRequest({
    		successCallback: function (result) {
    			var locationsTemp = [];
    			//result = JSON.parse(result);
    	        var locationData = result.locationsArray;
    	        
    	        ss$.each(locationData, function(i, item) {
    	        	locationsTemp.push(new PDI_Location(item));
    	        });
    	        self.locations(locationsTemp);
    	        self.loggedInUser(result.user);
    	        
    			   var locationCookie = getLocationCookie();
    			   console.log('Getting location cookie: ' + locationCookie);
    			   if(locationCookie != null && isNaN(locationCookie) == false)
    			   {
    				   self.selectedLocation(ko.utils.arrayFirst(self.locations(), function(item) {
    					   //console.log(item.locationId + ' ' + locationCookie);
    				        return item.locationId == locationCookie; })
    				    );
    				   ss$("#location").selectmenu("refresh",true);
    			   }
	         },
	         failureCallback: function() {
	        	 alert("Error Retrieving Locations");
	        	 //self.netSuiteLogin();
	         }
    	});
	 };
	 
    /*
     * Gets QA Tests from the current day at the selected location.
     * Parameters:
     * {boolean} isRecurring - whether or not to start call the RESTlet again after completion.
     * Without this, you could set off multiple chains of GET calls, which would update the viewModel more than desired.
     * But we want to be able to update the viewModel when we want, without starting a new chain
     */
	 self.getTests = function(isRecurring) {
	    	var proxy = new ProxyObject(GetAuthToken(), 
	    			"/app/site/hosting/restlet.nl?script=customscriptpdi_rtd_getqatests_restlet&deploy=customdeploypdi_rtd_getqatests_restlet", {'location': (self.selectedLocation() ? self.selectedLocation().locationId : '')}, 'GET');
	    	proxy.makeRequest({
	    		successCallback: function (result) {
	            	
	            	var tempDataSet = '';
	            	var qaTestData = result.qaTests;
	            	var qaTestsFailedTemp = [];
	    			var qaTestsPassedTemp = [];
	    			
	    	        console.log('Got Tests for ' + (self.selectedLocation() ? self.selectedLocation().name : '[No Location Set]'));
	    	        var passPageIndex = 0;
	    	        var failPageIndex = 0;
	    	        
	    	        if(qaTestData)
		        	{
	    	        	tempDataSet = new PDI_DataSet({template: '1'});
		        	}
	    	        
	    	        ss$.each(qaTestData, function(i, item) {
	    	        	if(item.failures == 0)
	    	        	{
	    	        		if(qaTestsPassedTemp.length % self.linesPerPage() == 0)
	    	        			passPageIndex++;
	    	        		qaTestsPassedTemp.push(new PDI_QATest(item, passPageIndex));
	    	        	}
	    	        	else
		        		{
	    	        		if(qaTestsFailedTemp.length % self.linesPerPage() == 0)
	    	        			failPageIndex++;
	    	        		qaTestsFailedTemp.push(new PDI_QATest(item, failPageIndex));
		        		}
	    	        });
	    	        tempDataSet.failPageCount(failPageIndex);
	    	        tempDataSet.passPageCount(passPageIndex);
	    	        
	    	        //Add each temp array to the appropriate observable array on the dataSet
	    	        tempDataSet.testsFailed(qaTestsFailedTemp);
	    	        tempDataSet.testsPassed(qaTestsPassedTemp);
	    	        
	    	        self.dataSets.removeAll();
	    	        self.dataSets.push(tempDataSet);
	    	        
	    	        var date = new Date();
	    	        date = formatTime(date);
	    	        self.lastUpdateTime(date);
	    	        
	            	self.incrementPage();
	            	ss$.mobile.loading('hide');	//Hide the 'Loading' spinner
	            	
	            	//We don't always want to call a recurring chain of getTests
	            	if(isRecurring)
	        		{
		        		self.errorCount(0);
		        		setTimeout(function(){self.getTests(true);}, self.pageDuration()*1000);
	        		}
	            	//End success callback
		         },
		         failureCallback: function() {
	            	console.log('Failed to get QA Tests');
	            	self.errorCount(self.errorCount() + 1);
	            	if(self.errorCount() < 5)
	        		{
	                	if(isRecurring)
	                		setTimeout(function(){self.getTests(true);}, self.pageDuration()*1000);
	        		}
	            	else
	            	{
	            		ss$.mobile.loading('hide');	//Hide the 'Loading' spinner
	        	    	var proxy = new ProxyObject(GetAuthToken(), 
	        	    			"/app/site/hosting/restlet.nl?script=customscriptpdi_rtd_getqatests_restlet&deploy=customdeploypdi_rtd_getqatests_restlet", ko.toJSON(self), 'POST');
	        	    	proxy.makeRequest({
	        	    		successCallback: function (result) {
	        	    			console.log('Error Email Sent');
	        	    		},
	        	    		failureCallback: function () {
	        	    			console.log('Failed to send Error Email');
	        	    		},
	        	    		completeCallback: function () {
	        	    			//Complete
	        	    		}
	        	    	});
	            	}
	            	//End failure callback
		         },
		         completeCallback: function() {
		            //We have specific behavior for errors & success, so we don't need to do anything on 'complete'
		         }
	    	});
	    //End getTests function
    };
    
    //This function controls how the app cycles through its dataSets and the pages of those dataSets
    self.incrementPage = function (value) {
    	//If there's no currentDataSet, then set it to be the first one in the dataSet array
    	if(self.currentDataSet() == null && self.dataSets().length > 0)
    		self.currentDataSet(self.dataSets()[0]);
    	
    	//First, check to see if we should advance through the pages of the current dataSet
    	if(self.currentPageIndex() < self.currentDataSet().maxPageCount())
		{
    		self.currentPageIndex(self.currentPageIndex() + 1);
		}
    	//If we're at the last page of the current dataSet, move to the next dataSet
    	else
		{
    		self.currentPageIndex(1);
            //If we're on the last dataSet, go back to the first dataSet. Otherwise, go to the next dataSet.
        	if(self.currentDataSetIndex() == self.dataSets().length - 1)
            	self.currentDataSetIndex(0);
            else
            	self.currentDataSetIndex(self.currentDataSetIndex() + (value || 1));
        	//Set the current dataSet to be the one at the appropriate index
        	self.currentDataSet(self.dataSets()[self.currentDataSetIndex()]);
		}
    };
    
    //These functions filter the Failed & Passed tests automatically, only showing the tests that match the current page index
    self.filterFailedTests = ko.computed(function() {
        if(self.currentDataSet())
        {
            return ko.utils.arrayFilter(self.currentDataSet().testsFailed(), function(test, i) {
            	return (test.filterGroup == self.currentDataSet().currentFailPageIndex());
            });
        }
    });
    self.filterPassedTests = ko.computed(function() {
        if(self.currentDataSet())
        {
            return ko.utils.arrayFilter(self.currentDataSet().testsPassed(), function(test, i) {
            	return (test.filterGroup == self.currentDataSet().currentPassPageIndex());
            });
        }
    });
    
}

/**** CLASSES ****/

/* PDI_DataSet
 * Class to represent a dataSet.
 * The app will automatically cycle through the dataSets in the main view model's 'dataSets' observableArray
 */
function PDI_DataSet(data) {
    var self = this;
    self.template = data.template;
    self.testsFailed = ko.observableArray();
    self.testsPassed = ko.observableArray();
    self.failPageCount = ko.observable();
    self.passPageCount = ko.observable();
    self.maxPageCount = ko.computed(function() {
    	return Math.max(self.failPageCount(), self.passPageCount());
    });
    self.currentFailPageIndex = ko.computed(function() {
    	return Math.min(window.pdiGetVM().currentPageIndex(), self.failPageCount());
    });
    self.currentPassPageIndex = ko.computed(function() {
    	return Math.min(window.pdiGetVM().currentPageIndex(), self.passPageCount());
    });
}

/* PDI_Location
 * Class to represent a location.
 */
function PDI_Location(data) {
    var self = this;
    self.name = data.name;
    self.locationId = data.locationId;
}

/* PDI_QATest
 * Class to represent a QA Test, which are displayed on individual lines.
 */
function PDI_QATest(data, filterGroup) {
    var self = this;
    self.id = data.id;
    self.unitId = data.unitId;
    self.vin = data.vin;
    self.model = data.model;
    self.failures = data.failures;
    self.filterGroup = filterGroup;
}

//Object for token based calls through the proxy suitelet
function ProxyObject(token, restUrl, data, method) {
	var self = this;
	self.token = token;
	self.restUrl = GLOBAL_REST_URL + restUrl;
	self.method = method;
	// conditionally set this to a url query string because it's easy to do in JQuery and hard to do in a suitelet
	self.data = (self.method === 'GET' && data) ? ss$.param( data ) : data;
		 
	self.makeRequest = function(args)
	{		
		 ss$.ajax({
    		 url: GLOBAL_PROXY_REST, //requestData.url,
      	     type: self.method,
      	     processData: (self.method === 'POST') ? false : true,
             data: (self.method === 'POST') ? JSON.stringify(self): {proxyData :  JSON.stringify(self)},
             dataType: "json",
             contentType: "application/json; charset=utf-8",
             success: function (data) {
            	 //console.log("fetch complete + " + self.restUrl);
            	 if (typeof args['successCallback'] === "function") {
            		 args['successCallback'](data);
     	      	 }	    	        
             },
             error: function() { if(typeof args['failureCallback'] === "function")args['failureCallback']();},
             complete: function() { if(typeof args['completeCallback'] === "function")args['completeCallback']();}
         });	   
	};
}

ss$ = jQuery.noConflict(true); //This needs to be outside of document.ready()
/**
 * Name: document.ready()
 * Description: Page event that fires after the DOM is initialized.  Sets up all the event bindings 
 * and Jquery widget initializations
 * @returns {void} 
 */
ss$( document ).ready(function() {
//	var pdiDisplayViewModel = new PDI_RTD_ViewModel();
//	ko.applyBindings(pdiDisplayViewModel);
//	pdiDisplayViewModel.initialize();
//	window.pdiGetVM = function() {return pdiDisplayViewModel;};
	
	ss$("#create-rtd-page").load(GLOBAL_MAIN_PAGE,
		function() {
			// Trigger the jquery mobile creation of the page before we apply our knockout bindings
			ss$(this).trigger('create');
			var pdiDisplayViewModel = new PDI_RTD_ViewModel();
			ko.applyBindings(pdiDisplayViewModel);
			pdiDisplayViewModel.initialize();
			window.pdiGetVM = function() {return pdiDisplayViewModel;};
	});
	
	ss$( document ).on( "mobileinit", function() {
		  ss$.mobile.loader.prototype.options.text = "loading";
		  ss$.mobile.loader.prototype.options.textVisible = false;
		  ss$.mobile.loader.prototype.options.theme = "b";
		  ss$.mobile.loader.prototype.options.html = "";
		});
});

/**** HELPER FUNCTIONS ****/

function showSpinningLoader() {
	setTimeout(function(){
	    ss$.mobile.loading('show', {
	    	text: "Updating...",
	    	  textVisible: true,
	    	  theme: "b",
	    	  html: ""  });
		}, 1);
}

//Function for formatting the time correctly
function formatTime(d) {
	var h = d.getHours();
	var m = d.getMinutes();
	var amOrPm = 'AM';
	//Display the time in 12-hr format rather than 24-hr
	if(h >= 12)
		amOrPm = 'PM';
	if(h > 12)
		h = h - 12;
		
	m = addZero(m);
	return h + ':' + m + ' ' + amOrPm;
}

function addZero(i) {
	if (i < 10) {
	  i = "0" + i;
	}
	return i;
}
