/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Sep 2020     michaelv
 *
 */
function WarrantyFlatRateCodeViewModel(data) {
    var parsedData = JSON.parse(data);

    var self = this;
    self.recTypeId = parsedData.recTypeId;
    self.urlString = parsedData.urlString.replace(/amp;/gi,'');
    self.searchTerm = ko.observable();
    self.searchType = ko.observable();

    self.currentPage = ko.observable(0);
    self.pageCount = ko.observable(0);
    self.pageSize = ko.observable(25);

    self.searchOptions = ko.observableArray([
        new searchOption(1, 'Display Name', 'displayName')
    ]);
    
    self.searchType('displayName');

    self.filterOptions = ko.observableArray([]);
    
    //************* CONSTANT PROPERTIES *****************
    // Uncomment to toggle between chevron and arrow
//    self.descending = "fa fa-arrow-down";
//    self.ascending = "fa fa-arrow-up";
    self.descending = "fa fa-chevron-down";
    self.ascending = "fa fa-chevron-up";

    //************* KNOCKOUT OBSERVABLES ******************
    
    // Observable array that represents each column in the table
    self.columns = ko.observableArray([
        {property: "links", header: "View ", type: "string", state: ko.observable(""), width: "cell-sm"},
        {property: "code", header: "Flat Rate Code ", type: "number", state: ko.observable(""), width: "cell-md"},
        {property: "displayName", header: "Display Name ", type: "string", state: ko.observable(""), width: "cell-md"},
        {property: "mainCategoryText", header: "Main Category ", type: "string", state: ko.observable(""), width: "cell-md"},
        {property: "subCategoryText", header: "Sub Category ", type: "string", state: ko.observable(""), width: "cell-md"},
        {property: "timeAllowed", header: "Time Allowed ", type: "number", state: ko.observable(""), width: "cell-sm"},
        {property: "straightTime", header: "Straight Time ", type: "string", state: ko.observable(""), width: "cell-sm"},
        {property: "preAuthRequired", header: "Pre-Auth Required ", type: "string", state: ko.observable(""), width: "cell-sm"}
    ]);
    
    var dataLines = parsedData.flatRateCodes;

    //Parse the data from a string and put it into a tempArray
    var tempData = new Array();
    if(dataLines != undefined) {
        for(var i = 0; i < dataLines.length; i++) {
            var tempRec = new FlatRateCode(dataLines[i]);
            
            tempData[i] = tempRec;
        }
    }
    
    //Create our Knockout Observable array, and fill it with our data
    self.dataList = ko.observableArray();
    self.dataList(tempData);

	// ************** DATA OBJECTS ********************
	//	Class to represent a PreAuth
	function FlatRateCode(data) {
	    var self = this;
	    self.id = data.id;
        self.code = data.code;
        self.displayName = data.displayName.replace(/amp;/gi, '');
        self.searchTerm = ko.observable();
        self.mainCategoryId = data.mainCategory.id;
        self.mainCategoryText = data.mainCategory.name.replace(/amp;/gi, '');
        self.subCategoryId = data.subCategory.id;
        self.subCategoryText = data.subCategory.name.replace(/amp;/gi, '');
        self.timeAllowed = data.timeAllowed;
        self.straightTime = data.straightTime == 'T' ? 'Yes' : 'No';
        self.preAuthRequired = data.preAuthRequired == 'Yes' ? 'Yes' : 'No';
	}

    self.clearFilters = function () {
//        self.searchType(null);
        self.searchTerm(null);
        ko.utils.arrayForEach(self.filterOptions() , function(filterItem) {
            filterItem.selected(false);
        });
    }

    self.reloadPage = function () {
        window.location.href = nlapiResolveURL('SUITELET', 'customscriptrvs_website2_warrflat_suite', 'customdeployrvs_website2_warrflat_suite') + '&showclosed=' + self.showClosed();
    }

    self.changePage = function () {
        self.currentPage(this);
    }

    //Pass in the filtered data, and this function will setup the pages appropriately
    self.paginate = function(data) {
        var pages = Math.floor(data.length / self.pageSize());
        pages += data.length % self.pageSize() > 0 ? 1 : 0;
        self.pageCount(pages)

        //If the user changes the filters, make sure they don't strand themselves on a page with no results
        if(self.currentPage() >= pages)
            self.currentPage(0);

        var first = self.currentPage() * self.pageSize();
        return data.slice(first, first + self.pageSize());
    }

    //These computed functions determine if there is a next page and changes te page
    self.hasPrevious = ko.computed(function() {
		return self.currentPage() !== 0;
    });

    self.hasNext = ko.computed(function() {
		return self.currentPage() !== self.pageCount() - 1;
    });

    self.next = function() {
		if(self.currentPage() < self.pageCount()) {
			self.currentPage(self.currentPage() + 1);
		}
    }

    self.previous = function() {
		if(self.currentPage() < self.pageCount()) {
			self.currentPage(self.currentPage() - 1);
		}
	}
    
    self.filterList = ko.computed(function() {
        if(self.dataList()) {
            var selectedFilters = ko.utils.arrayFilter(self.filterOptions() , function(filterItem) {
                return filterItem.selected();
            });

            // Create a regEx based on the user's input, if they've typed stuff and chosen a searchType
            var property = 'listItem';
            if(self.searchType() != undefined && self.searchTerm() != undefined) {
                var re = new RegExp(self.searchTerm().toUpperCase());
                property += '.' + self.searchType();
            }

            if(selectedFilters.length == 0) {
                // If none selected, return all filterOption categories
                if(self.searchType() == undefined || self.searchTerm() == undefined) {
                    return self.paginate(self.dataList());
                }
                else {
                    return self.paginate(ko.utils.arrayFilter(self.dataList(), function(listItem) {
                        return (re.test(eval(property).toUpperCase()));
                    }));
                }
            }
            else {
            //The user has selected filterOption categories, so only return those
                return self.paginate(ko.utils.arrayFilter(self.dataList(), function(listItem) {
                    return ko.utils.arrayFilter(selectedFilters, function(f) {
                        return (f.id == listItem.statusId && (self.searchType() == undefined || self.searchTerm() == undefined || re.test(eval(property))));
                    }).length > 0;
                }));
            }            
        }
    });
    
    //****CLASSES*****//
    function filterOption(id, name) {
        var self = this;
        self.id = id;
        self.name = name;
        self.selected = ko.observable(false);
        self.count = 0;
    }

    function searchOption(id, name, property) {
        var self = this;
        self.id = id;
        self.name = name;
        self.property = property;
    }
    
    //****************** SORTING METHODS *******************
    self.sortClick = function (column) {
        try {
            // Call this method to clear the state of any columns OTHER than the target
            // so we can keep track of the ascending/descending
            self.clearColumnStates(column);
            // Get the state of the sort type
            if (column.state() === "" || column.state() === self.descending) {
                column.state(self.ascending);
            }
            else {
                column.state(self.descending);
            }
            switch (column.type) {
                case "number":
                    self.numberSort(column);
                    break;
                case "date":
                    self.dateSort(column);
                    break;
                case "object":
                    self.objectSort(column);
                    break;
                case "string":
                default:
                    self.stringSort(column);
                    break;
            }
        }
        catch (err) {
            // Always remember to handle those errors that could occur during a user interaction
            alert(err);
        }
    };
    
    // Sort strings
    self.stringSort = function (column) { // Pass in the column object
        self.dataList(self.dataList().sort(function (a, b) {
            // Set strings to lowercase to sort in a predictive way
            var postA = a[column.property].toLowerCase(), postB = b[column.property].toLowerCase();
            if (postA < postB) {
                return (column.state() === self.ascending) ? -1 : 1;
            }
            else if (postA > postB) {
                return (column.state() === self.ascending) ? 1 : -1;
            }
            else {
                return 0;
            }
        }));
    };
    
    // Sort numbers
    self.numberSort = function (column) {
        self.dataList(self.dataList().sort(function (a, b) {
            var postA = a[column.property], postB = b[column.property];
            if (column.state() === self.ascending) {
                return postA - postB;
            }
            else {
                return postB - postA;
            }
        }));
    };
    
    // Sort by date
    self.dateSort = function (column) {
        self.dataList(self.dataList().sort(function (a, b) {
            if(a[column.property] == '')
            {
                if(b[column.property] == '')
                {
                    if (column.state() === self.ascending)
                        return a.id - b.id;
                    else
                        return b.id - a.id;
                }
                return -1;
            }
            if(b[column.property] == '')
                return 1;
            if (column.state() === self.ascending) {
                return new Date(a[column.property]) - new Date(b[column.property]);
            }
            else {
                return new Date(b[column.property]) - new Date(a[column.property]);
            }
        }));
    };
    
    // Using a deep get method to find nested object properties
    self.objectSort = function (column) {
        self.dataList(self.dataList().sort(function (a, b) {
            var postA = self.deepGet(a, column.property),
                postB = self.deepGet(b, column.property);
            if (postA < postB) {
                return (column.state() === self.ascending) ? -1 : 1;
            }
            else if (postA > postB) {
                return (column.state() === self.ascending) ? 1 : -1;
            }
            else {
                return 0;
            }
        }));
    };
    
    //************** Utility Methods ******************************
    self.clearColumnStates = function (selectedColumn) {
        var otherColumns = self.columns().filter(function (col) {
            return col != selectedColumn;
        });
        for (var i = 0; i < otherColumns.length; i++) {
            otherColumns[i].state("");
        }
    };
    self.deepGet = function (object, path) {
        var paths = path.split('.'),
            current = object;
        for (var i = 0; i < paths.length; ++i) {
            if (current[paths[i]] == undefined) {
                return undefined;
            } else {
                current = current[paths[i]];
            }
        }
        // If the value of current is not a number, return a lowercase string. If it is, return a number.
        return (isNaN(current)) ? current.toLowerCase() : new Number(current);
    };
    
    function escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }
    
    //credit to: https://github.com/pstricker/koTableSort/blob/master/sortable.html
};

$(document).ready(function() {
    var data = nlapiGetFieldValue('custpage_warrantyflatratecodedata');
    var flatRateCodeVM = new WarrantyFlatRateCodeViewModel(data);
    ko.applyBindings(flatRateCodeVM);
    window.getVM = function() {return flatRateCodeVM;};
});

$(window).load(function() {
    // Animate loader off screen
    $(".rvs-table-cover").fadeOut("slow");
});