/*
 * @author suvarshi
 */


var arrCustomerFields_opp_cs = [];
arrCustomerFields_opp_cs.push(['custentityr7custpoprocess','custbodyr7poprocess']);
arrCustomerFields_opp_cs.push(['custentityr7internalips','custbodyr7internalips']);
arrCustomerFields_opp_cs.push(['custentityr7externalips','custbodyr7externalips']);
arrCustomerFields_opp_cs.push(['custentityr7currentwebscanner','custbodyr7oppcurrentwebscanner']);
arrCustomerFields_opp_cs.push(['custentityr7currentwebscannerrenewal','custbodyr7oppcurrentwebscannerrenewal']);
arrCustomerFields_opp_cs.push(['custentityr7currentdbscanner','custbodyr7oppcurrentdbscanner']);
arrCustomerFields_opp_cs.push(['custentityr7currentdbscannerrenewal','custbodyr7oppcurrentdbscannerrenewal']);
arrCustomerFields_opp_cs.push(['custentityr7approvedproject','custbodyr7salesoppapprovedproject']);
arrCustomerFields_opp_cs.push(['custentityr7custvulnerabilitymgmntprog','custbodyr7oppvulnerabilitymgmntprog']);
arrCustomerFields_opp_cs.push(['custentityr7currententerprisescanner','custbodyr7oppcurrententerprisescanner']);
arrCustomerFields_opp_cs.push(['custentityr7currententerprisescannerdate','custbodyr7currententerprisescannerdate']);
arrCustomerFields_opp_cs.push(['custentityr7custsubjecttopcicompliance','custbodyr7oppsubjecttopcicompliance']);
arrCustomerFields_opp_cs.push(['custentityr7custsubjecttofisma','custbodyr7oppsubjecttofisma']);
arrCustomerFields_opp_cs.push(['custentityr7custsubjecttonerc','custbodyr7oppsubjecttonerc']);
arrCustomerFields_opp_cs.push(['custentityr7custneed','custbodyr7need']);
arrCustomerFields_opp_cs.push(['custentityr7budget','custbodyr7opportunitybudget']);
arrCustomerFields_opp_cs.push(['custentityr7currentpenetrationtest','custbodyr7oppcurrentpenetrationtest']);
arrCustomerFields_opp_cs.push(['custentityr7currentpenetrationtestdate','custbodyr7oppcurrentpenetrationrenewal']);
arrCustomerFields_opp_cs.push(['custentityr7currentexternalscanner','custbodyr7oppcurrentexternalscanner']);
arrCustomerFields_opp_cs.push(['custentityr7currentexternalscannerdate','custbodyr7currentexternalscannerdate']);
arrCustomerFields_opp_cs.push(['custentityr7leadsourceprim','leadsource']);

var helperSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7_transaction_cs_helper', 'customdeployr7_transaction_cs_helper', false);
var objSalesRepLLCLocationMap = {};

var isR7OpportunitySalesForm = (nlapiGetFieldValue('customform') == '162');
var isR7OpportunityRenewalForm = (nlapiGetFieldValue('customform') == '142');
var isR7Opportunity = (nlapiGetRecordType() == "opportunity");

//PAGE INIT
function r7_opp_cs_pageInit(type){
	
	if (type == 'create') {
		sourceOppFieldsFromCustomer(nlapiGetFieldValue('entity'));
		sourceLLCLocationFromSalesRep(nlapiGetFieldValue('salesrep'));
	}
	
	if (type == 'edit' && isR7OpportunitySalesForm) {
		setWinLossRequirements(nlapiGetFieldValue('entitystatus'));
	}
}

//FIELD CHANGED
function r7_opp_cs_fieldChanged(type, name, linenum){
	if (name == 'salesrep') {
		sourceLLCLocationFromSalesRep(nlapiGetFieldValue('salesrep'));
	}

	if (isR7Opportunity) {
		if (name == 'entitystatus') {
			setWinLossRequirements(nlapiGetFieldValue('entitystatus'));
		}
	}
	
	// Execute the following field change conditions when the form being used is the R7 Opportunity Sales Form
	if (isR7OpportunitySalesForm) {
		
		if (name == 'entitystatus') {
			setWinLossRequirements(nlapiGetFieldValue('entitystatus'));
		}

		if (name == 'custbodyr7statussalesselected') {
			setWinLossRequirements(nlapiGetFieldValue('custbodyr7statussalesselected'));
		}
	
		if (name == 'custbodyr7opportunitycompetitor') {
			setOtherCompetitor(nlapiGetFieldValue('custbodyr7opportunitycompetitor'));
		}
	
		if (name == 'custbodyr7opportunityincumbent') {
			setOtherIncumbent(nlapiGetFieldValue('custbodyr7opportunityincumbent'));
		}
	}
}

//POST SOURCING
function r7_opp_cs_postSourcing(type, name, linenum){

	if (name == 'entity') {
		sourceOppFieldsFromCustomer(nlapiGetFieldValue('entity'));
		var item = nlapiGetCurrentLineItemValue('item','item');
		if (!item){nlapiCancelLineItem('item');}
	}
	
	if (type == 'item' && name == 'item') {
		var item = nlapiGetCurrentLineItemValue('item','item');
		if (!item){nlapiCancelLineItem('item');}
		else {nlapiSetCurrentLineItemValue('item', 'location', getSalesRepLLCLocation(nlapiGetFieldValue('salesrep')), false);}
	
	}
}
// Set line location
function r7_opp_cs_validateLine(type)
{
    if (type == 'item') {
        var headerLocation = nlapiGetFieldValue('location');
        if (headerLocation == null || headerLocation == '')
        {
            var curSubsidiary = parseInt(nlapiGetFieldValue('subsidiary'));
            if (curSubsidiary == 1) // Rapid7 LLC
            {
                nlapiSetCurrentLineItemValue('item', 'location', 1, false, true); // MA BOSTON
                return true;
            }
            else if (curSubsidiary == 10) // Rapid7 International
            {
                nlapiSetCurrentLineItemValue('item', 'location', 29, false, true); // UKS London
                return true;
            }
        }
        nlapiSetCurrentLineItemValue('item', 'location', headerLocation, false, true);
        return true;
    }
    return true;
}

//LINE INIT
function r7_opp_cs_lineInit(type){

	if (type == 'item') {
		nlapiSetCurrentLineItemValue('item', 'location', getSalesRepLLCLocation(nlapiGetFieldValue('salesrep')), false);
	}
}

//SAVE RECORD

function r7_opp_cs_saveRecord() {

	if (isR7Opportunity && !isR7OpportunityRenewalForm) {

		var tReason = nlapiGetFieldMandatory('custbodyr7terminationreason')
		var tReasonValue = nlapiGetFieldValue('custbodyr7terminationreason') == '';
		var tReasonReq = (tReason && tReasonValue);

		var tDetail = nlapiGetFieldMandatory('custbodyr7terminationdetail')
		var tDetailValue = nlapiGetFieldValue('custbodyr7terminationdetail') == '';
		var tDetailReq = (tDetail && tDetailValue);

		var oWinner = nlapiGetFieldMandatory('custbodyr7oppwinner')
		var oWinnerValue = nlapiGetFieldValue('custbodyr7oppwinner') == '';
		var oWinnerReq = (oWinner && oWinnerValue);

		var owlDescription = nlapiGetFieldMandatory('custbodyr7oppwinlossdescription')
		var owlDescriptionValue = nlapiGetFieldValue('custbodyr7oppwinlossdescription') == '';
		var owlDescriptionReq = (owlDescription && owlDescriptionValue);

		if ((tReasonReq || tDetailReq || oWinnerReq || owlDescriptionReq) && isR7Opportunity) {
			alert("Please fill in the required Win/Loss Fields on Opportunity");
			return false;
		}
	}
	
	if (isR7OpportunitySalesForm) {
		
		var offering = nlapiGetFieldMandatory('custbodyr7opportunityoffering');
		var offvalue = nlapiGetFieldValue('custbodyr7opportunityoffering') == '';
		var offreq = (offering && offvalue);
		
		var incumbent = nlapiGetFieldMandatory('custbodyr7opportunityincumbent');
		var incvalue = nlapiGetFieldValue('custbodyr7opportunityincumbent') == '';
		var increq = (incumbent && incvalue);
		
		var otherincumbent = nlapiGetFieldMandatory('custbodyr7opportunityotherincumbent');
		var otherincvalue = nlapiGetFieldValue('custbodyr7opportunityotherincumbent') == '';
		var otherincreq = (otherincumbent && otherincvalue);
		
		var competitor = nlapiGetFieldMandatory('custbodyr7opportunitycompetitor');
		var compvalue = nlapiGetFieldValue('custbodyr7opportunitycompetitor') == '';
		var compreq = (competitor && compvalue);
		
		var compsolution = nlapiGetFieldMandatory('custbodyr7opportunitycompetitorsolutio');
		var compsoluvalue = nlapiGetFieldValue('custbodyr7opportunitycompetitorsolutio') == '';
		var compsolureq = (compsolution && compsoluvalue);
		
		var reason = nlapiGetFieldMandatory('custbodyr7opportunitywinlossreason1');
		var reasvalue = nlapiGetFieldValue('custbodyr7opportunitywinlossreason1') == '';
		var reasreq = (reason && reasvalue);
		
		var subreason = nlapiGetFieldMandatory('custbodyr7opportunitywinlossubreason1');
		var subreasvalue = nlapiGetFieldValue('custbodyr7opportunitywinlossubreason1') == '';
		var subreasreq = (subreason && subreasvalue);
		
		var description = nlapiGetFieldMandatory('custbodyr7oppwinlossdescription');
		var descvalue = nlapiGetFieldValue('custbodyr7oppwinlossdescription') == '';
		var descreq = (description && descvalue);
		
		if ((offreq || increq || otherincreq || compreq || compsolureq || reasreq || subreasreq || descreq) && isR7OpportunitySalesForm) {
			alert("Please fill in the required Win-Loss Fields on Opportunities marked as Closed");
			return false;
		}
	}

	return true;
	
}


function sourceOppFieldsFromCustomer(customerId){

	if (customerId != null && customerId != '') {
		
		//get fields to lookup on customer
		var fieldsToLookup = [];
		for (var i = 0; i < arrCustomerFields_opp_cs.length; i++) {
			fieldsToLookup.push(arrCustomerFields_opp_cs[i][0]);
		}
		
		//lookup fields on customer
		var fieldValues = nlapiLookupField('customer', customerId, fieldsToLookup);
		
		//set looked up values on opportunity
		for (var i = 0; i < arrCustomerFields_opp_cs.length; i++) {
			try {
				nlapiSetFieldValue(arrCustomerFields_opp_cs[i][1], fieldValues[arrCustomerFields_opp_cs[i][0]]);
			} 
			catch (err) {
				alert("Issue with setting field " + arrCustomerFields_opp_cs[i][1] + ". Please contact Administration");
			}
		}
	}
}

function sourceLLCLocationFromSalesRep(salesRepId){
	
	if (salesRepId){
		var llcLocation = getSalesRepLLCLocation(salesRepId);
		
		if (llcLocation){
			nlapiSetFieldValue('location', llcLocation, false);
			
			var lineCount = nlapiGetLineItemCount('item');
			var item = nlapiGetCurrentLineItemValue('item','item');
			if (!item){nlapiCancelLineItem('item');}
			// SF- commenting out because location is populating when there are no line items. Opps can't be saved.
			//if (lineCount == 0) { 
			//nlapiSelectLineItem('item', 1);
			//nlapiSetCurrentLineItemValue('item', 'location', getSalesRepLLCLocation(nlapiGetFieldValue('salesrep')), false, true);

			}
			else {
				for (var i = 1; i <= lineCount; i++) {
					nlapiSelectLineItem('item', i);
					nlapiSetCurrentLineItemValue('item', 'location', llcLocation, false, true);
					nlapiCommitLineItem('item');
				}
			}
		}
	}

/**
 * This function determines whether we should set the win/loss fields as required when the @param entityStatusId is set as:
 * id 66 == OPPORTUNITY-CLOSED
 * id 92 == OPPORTUNITY-CLOSED-DUPLICATE
 * id 101 == OPPORTUNITY-CLOSED-MIGRATED
 * id 100 == OPPORTUNITY-CLOSED-REPLACED
 * id 67 == OPPORTUNITY-LOST
 * id 97 == LOST
 * id 13 == WON
 * 
 * id 16 == Lost (Non-Renewing Customers Only)    // (APPS-4954)
 */
function setWinLossRequirements(entityStatusId) {
	if (entityStatusId == '66' || entityStatusId == '92' || entityStatusId == '101' 
		|| entityStatusId == '100' || entityStatusId == '67' || entityStatusId == '97' || entityStatusId == '13') {
		setWinLossRequiredFields(true);
	}
	else {
		setWinLossRequiredFields(false);
	}
	// APPS-4954 modification (https://issues.corp.rapid7.com/browse/APPS-4954) 
	if (entityStatusId == '16') {
		setNonRenewingLostRequiredFields(true)
	} else {
		setNonRenewingLostRequiredFields(false)
	}
}
/**
 * This function sets the win/loss fields as required when the @param boolean is passed as true, and not required when passed false
 */
function setWinLossRequiredFields(boolean) {
	nlapiSetFieldMandatory('custbodyr7opportunityoffering', boolean);
	nlapiSetFieldMandatory('custbodyr7opportunityincumbent', boolean);
	nlapiSetFieldMandatory('custbodyr7opportunitycompetitor', boolean);
	nlapiSetFieldMandatory('custbodyr7opportunitycompetitorsolutio', boolean);
	nlapiSetFieldMandatory('custbodyr7opportunitywinlossreason1', boolean);
	nlapiSetFieldMandatory('custbodyr7opportunitywinlossubreason1', boolean);
	nlapiSetFieldMandatory('custbodyr7oppwinlossdescription', boolean);
}

// APPS-4954 modification (https://issues.corp.rapid7.com/browse/APPS-4954) 
function setNonRenewingLostRequiredFields(boolean) {
	if (isR7OpportunityRenewalForm) {
		return;
	}

	nlapiSetFieldMandatory('custbodyr7terminationreason', boolean);
	nlapiSetFieldMandatory('custbodyr7terminationdetail', boolean);
	nlapiSetFieldMandatory('custbodyr7oppwinner', boolean);
	nlapiSetFieldMandatory('custbodyr7oppwinlossdescription', boolean);
}

/**
 * This function sets the "Other Incumbent" field as required when it is selected as 'Other' in the "Incumbent" field
 * @param incumbentId is the value of the "Incumbent" field passed in the function
 */
function setOtherIncumbent(incumbentId) {
	
	if (incumbentId == '29') {
		nlapiSetFieldMandatory('custbodyr7opportunityotherincumbent', true);
	}
	else {
		nlapiSetFieldMandatory('custbodyr7opportunityotherincumbent', false);
	}
}

/**
 * This function sets the other competitor and other competitor solution fields as required when it is selected as Other in the Competitor field
 * @param competitorId is the value of the Competitor field passed in the function
 */
function setOtherCompetitor(competitorId) {
	
	if (competitorId == '29') {
		nlapiSetFieldMandatory('custbodyr7opportunityothercompetitor', true);
		nlapiSetFieldMandatory('custbodyr7opportunityothercompsolution', true);
	}
	else {
		nlapiSetFieldMandatory('custbodyr7opportunityothercompetitor', false);
		nlapiSetFieldMandatory('custbodyr7opportunityothercompsolution', false);
	}
}


function getSalesRepLLCLocation(salesRepId){

	if (salesRepId) {
		
		if (objSalesRepLLCLocationMap && objSalesRepLLCLocationMap.hasOwnProperty(salesRepId)) {
			return objSalesRepLLCLocationMap[salesRepId];
		}
		
		var repSuiteletURL = helperSuiteletURL;
		repSuiteletURL += '&custparam_cmd=' + 'getSalesRepLLCLocation';
		repSuiteletURL += '&custparam_salesrepid=' + salesRepId;
		repSuiteletURL += '&time=' + Math.floor(Math.random() * 9999999);

		var helper_response = nlapiRequestURL(repSuiteletURL);
		if (helper_response) {
		
			var objResponse = JSON.parse(helper_response.getBody());
			
			if (objResponse.success) {
				objSalesRepLLCLocationMap[salesRepId] = objResponse.llcLocation;
				return objResponse.llcLocation;
			}
		}
	}
	return null;
}
