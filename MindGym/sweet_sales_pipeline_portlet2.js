/****************************************************************************


  Sales pipline portlet


*****************************************************************************/

/**
 * Main function
 *
 * @param {nlobjPortlet} portlet
 * @param {int} column (1 = left column, 2 = middle column, 3 = right column)
 */
function sweet_main(portlet, column) {
  
  nlapiLogExecution('DEBUG', 'Start', 'portlet starts');
  
  var financial_year = nlapiGetContext().getSetting('SCRIPT', 'custscript_financial_year2');
  var subsidiary = nlapiGetContext().getSetting('SCRIPT', 'custscript_subsidiary2');
  
  var title = 'Sales Pipeline '
  if (subsidiary == 2) {
    title = title + 'UK ' + financial_year;
  } else if (subsidiary == 3) {
    title = title + 'US ' + financial_year;
  }
  
  portlet.setTitle(title);
  
  // Create the columns
  portlet.addColumn('label', 'text', 'Type', 'LEFT');
  portlet.addColumn('amount_1', 'text', 'Apr', 'RIGHT');
  portlet.addColumn('amount_2', 'text', 'May', 'RIGHT');
  portlet.addColumn('amount_3', 'text', 'Jun', 'RIGHT');
  portlet.addColumn('amount_4', 'text', 'Jul', 'RIGHT');
  portlet.addColumn('amount_5', 'text', 'Aug', 'RIGHT');
  portlet.addColumn('amount_6', 'text', 'Sep', 'RIGHT');
  portlet.addColumn('amount_7', 'text', 'Oct', 'RIGHT');
  portlet.addColumn('amount_8', 'text', 'Nov', 'RIGHT');
  portlet.addColumn('amount_9', 'text', 'Dec', 'RIGHT');
  portlet.addColumn('amount_10', 'text', 'Jan', 'RIGHT');
  portlet.addColumn('amount_11', 'text', 'Feb', 'RIGHT');
  portlet.addColumn('amount_12', 'text', 'Mar', 'RIGHT');
  portlet.addColumn('total', 'text', 'This year', 'RIGHT');
 
  // QUOTES
  portlet.addRow(getRowData('estimate', 'customsearch_quotes_by_revrec', '375', 'grossamount', 'Quotes', 'custcol_bo_date', financial_year, 'subsidiary', subsidiary, '0'));
  
  // SALES ORDERS
  portlet.addRow(getRowData('salesorder', 'customsearch_salesorders_by_revrec', '373', 'grossamount', 'Sales orders', 'custcol_bo_date', financial_year, 'subsidiary', subsidiary, '0'));
  
  // TOTAL
  portlet.addRow(getRowData('transaction', 'customsearch_kpi_total_pipeline', '435', 'formulacurrency', 'Total', 'custcol_bo_date', financial_year, 'subsidiary', subsidiary, '0'));
  
  // BUDGET
  portlet.addRow(getRowData('customrecord_budget', 'customsearch_kpi_budget', '443', 'custrecord_budget_amount', 'Budget', 'custrecord_budget_month', financial_year, 'custrecord_budget_subsidiary', subsidiary, '1'));
  
  // REVISED BUDGET
  portlet.addRow(getRowData('customrecord_budget', 'customsearch_kpi_budget', '443', 'custrecord_budget_amount', 'Revised Budget', 'custrecord_budget_month', financial_year, 'custrecord_budget_subsidiary', subsidiary, '2'));
  
  // UNALLOCATED
  //portlet.addRow(getRowData('estimate', 'customsearch_quotes_by_revrec_2_2', '441', 'grossamount', '(Unallocated)', 'custcol_bo_date', financial_year, 'subsidiary', subsidiary, '0'));
  
  nlapiLogExecution('DEBUG', 'End', 'portlet ends');
}

/**
 * Get saved search row
 *
 * @param searchType
 * @param searchId
 * @param searchIdNum
 * @param fieldName
 * @param rowLabel
 * @param dateField
 * @param year
 * @param subsidiaryField
 * @param subsidiary
 * @param version
 *
 * @return {Array}
 */
function getRowData(searchType, searchId, searchIdNum, fieldName, rowLabel, dateField, year, subsidiaryField, subsidiary, version) {
  
  var row = new Array();
  row['label'] = rowLabel;
  
  // Start of financial year is 1st of April
  var now = new Date();
  var startDate = nlapiAddMonths(nlapiStringToDate('1/1/' + year), 3);
  var endDate = new Date();
  
  // Get the data for each column
  var keyPrefix = 'amount_';
  var i = 0; n = 12;
  for (i; i < n; i++) {
    
    // Calculate the end date
    endDate = nlapiAddMonths(startDate, 1);
    endDate = nlapiAddDays(endDate, -1);
    
    nlapiLogExecution('DEBUG', 'Start date', startDate.toDateString());
    nlapiLogExecution('DEBUG', 'End date', endDate.toDateString());
    nlapiLogExecution('DEBUG', 'Subsidiary', subsidiary);
    nlapiLogExecution('DEBUG', 'Version', version);
    
    // Create the filter
    var filters = new Array();
    filters.push(new nlobjSearchFilter(dateField, null, 'within', startDate, endDate));
    filters.push(new nlobjSearchFilter(subsidiaryField, null, 'is', subsidiary));
    if (version != 0) {
      filters.push(new nlobjSearchFilter('custrecord_budget_version', null, 'is', version));
    }
    
    // Run the search query
    var results = nlapiSearchRecord(searchType, searchId, filters);
    
    // Add the results to our row
    var value = results[0].getValue(fieldName, null, 'sum');
    
    // Is this a budget row?
    if (version != 0) {
      
      // Yes...
      
      // Budget currency
      //var budgetCurrency = results[0].getValue('custrecord_budget_currency', null, 'max');
      var budgetCurrency = results[0].getValue('internalid', 'custrecord_budget_currency', 'max');
      var budgetExchangeRate = results[0].getValue('custrecord_budget_exchangerategbptousd', null, 'max');
      
      // Employee currency
      //var employeeId = nlapiGetUser();
      //var employee = nlapiLoadRecord('employee', employeeId);
      //var employeeCurrency = employee.getFieldValue('currency');
      var employeeCurrency = getEmployeeCurrency(nlapiGetUser());
	  
	  // Getting Currency of the role subsidiary
	  var roleId = nlapiGetRole();
	  var role = nlapiLoadRecord('role', roleId);
	  var roleSubsidiaryId = role.getFieldValue('subsidiary');
	  var roleSubsidiary = nlapiLoadRecord('subsidiary', roleSubsidiaryId);
	  var roleCurrency = roleSubsidiary.getFieldValue('currency');
      
      // Convert value to employee currency
      switch (roleCurrency) {
        
        case '1': // British Pound
          
          switch (budgetCurrency) {
            case '1': // British Pound
              // Do nothing
              break;
            case '2': // US Dollar
              value = (1 / budgetExchangeRate) * value;
              break;
            default: // Unsupported currency
              //throw nlapiCreateError('SWEET_ERROR_UNKNOWN_BUDGET_CURRENCY', 'Unsupported budget currency: ' + budgetCurrency);
              break;
          }
          break;
          
        case '2': // US Dollar
          
          switch (budgetCurrency) {
            case '1': // British Pound
              value = budgetExchangeRate * value;
              break;
            case '2': // US Dollar
              // Do nothing
              break;
            default: // Unsupported currency
              //throw nlapiCreateError('SWEET_ERROR_UNKNOWN_BUDGET_CURRENCY', 'Unsupported budget currency: ' + budgetCurrency);
              break;
          }
          break;
          
        default: // Unsupported currency
          throw nlapiCreateError('SWEET_ERROR_UNKNOWN_EMPLOYEE_CURRENCY', 'Unsupported employee currency: ' + employeeCurrency);
          break;
      }
    }
    
    // Round and format the value
    value = formatNumber(Math.round(value).toFixed(0));
    
    // Make the value into a link if NOT budget row
    if (version == 0) {
      value = buildLink(searchIdNum, startDate, endDate, subsidiary, value);
    }
    
    // Add value to row
    row[keyPrefix + (i + 1)] = value;
    
    // Move the start date to the next month
    startDate = nlapiAddMonths(startDate, 1); // Add one month
  }
  
  // Retrieve total year results
  startDate = nlapiAddMonths(nlapiStringToDate('1/1/' + year), 3);
  endDate = nlapiAddMonths(startDate, 12);
  endDate = nlapiAddDays(endDate, -1);
  
  // Create the filter
  var filters = new Array();
  filters.push(new nlobjSearchFilter(dateField, null, 'within', startDate, endDate));
  filters.push(new nlobjSearchFilter(subsidiaryField, null, 'is', subsidiary));
  if (version != 0) {
    filters.push(new nlobjSearchFilter('custrecord_budget_version', null, 'is', version));
  }
  
  // Run the search query
  var results = nlapiSearchRecord(searchType, searchId, filters);
  
  // Add the results to our row
  var totalValue = formatNumber(Math.round(results[0].getValue(fieldName, null, 'sum')).toFixed(0));
  row['total'] = buildLink(searchIdNum, startDate, endDate, subsidiary, totalValue);
  
  return row;
 }

/**
 * Build link to saved search
 * 
 * @param searchId
 * @param endDate
 * @param endDate
 * @param subsidiary
 * @param value
 *
 * @return {String}
 */
function buildLink(searchId, startDate, endDate, subsidiary, value) {
  
  var startDateFormatted = startDate.getDate() + '/' + (startDate.getMonth() + 1) + '/' + startDate.getFullYear();
  var endDateFormatted = endDate.getDate() + '/' + (endDate.getMonth() + 1) + '/' + endDate.getFullYear();
  
  var baseUrl = "/app/common/search/searchresults.nl?";
  var parameters = new Array();
  parameters['searchtype'] = "Transaction";
  parameters['Transaction_SUBSIDIARY'] = subsidiary;
  parameters['CUSTCOL_BO_DATEmodi'] = "WITHIN";
  parameters['CUSTCOL_BO_DATE'] = "CUSTOM";
  parameters['CUSTCOL_BO_DATErange'] = "CUSTOM";
  parameters['CUSTCOL_BO_DATEfrom'] = startDateFormatted;
  parameters['CUSTCOL_BO_DATEfromrel'] = "";
  parameters['CUSTCOL_BO_DATEfromreltype'] = "DAGO";
  parameters['CUSTCOL_BO_DATEto'] = endDateFormatted;
  parameters['CUSTCOL_BO_DATEtorel'] = "";
  parameters['CUSTCOL_BO_DATEtoreltype'] = "DAGO";
  parameters['sortcol'] = "Transaction_TRANDATE_raw";
  parameters['sortdir'] = "ASC";
  parameters['csv'] = "HTML";
  parameters['OfficeXML'] = "F";
  parameters['pdf'] = "";
  parameters['detail'] = "CUSTCOL_BO_DATE";
  parameters['style'] = "NORMAL";
  parameters['report'] = "";
  parameters['grid'] = "";
  parameters['searchid'] = searchId;
  parameters['dle'] = "";
  
  // Build query string
  var params = new Array();
  for (key in parameters) {
    params.push(key + '=' + parameters[key]);
  }
  var query = params.join('&');
  
  // Build and return link
  var url = baseUrl + query;
  var link = '<a class="dottedlink" href="' + url + '">' + value + "</a>";
  return link;
 }

/**
 * Insert thousand separators
 *
 * @param v
 */
function formatNumber(v) {
  
  var val = v.toString();
  var result = "";
  var len = val.length;
  while (len > 3){
    result = ","+val.substr(len-3,3)+result;
    len -=3;
  }
  return val.substr(0,len)+result;
}

/**
 * Get employee currency by employee id
 *
 * @param employeeId
 * @return employee currency or null if not found
 */
function getEmployeeCurrency(employeeId) {
  
  // Filter by employee id
  var filters = new Array();
  filters.push(new nlobjSearchFilter('internalid', null, 'is', employeeId));
  
  // Run the search query
  var results = nlapiSearchRecord('employee', 'customsearch_script_employee_currency', filters);
  
  // Return employee currency
  return results ? results[0].getValue('custentity_em_currency') : null;
}

