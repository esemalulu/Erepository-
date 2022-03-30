function demoList(request, response)
{
  try {
    
    var list = nlapiCreateList('Simple List');
    list.setStyle(request.getParameter('style'));
    //list.setScript(239);
    
    var column = list.addColumn('number', 'text', 'Pick', 'LEFT');
    column.setURL('http://www.themindgym.com', false);
    //column.setURL(nlapiResolveURL('RECORD', 'salesorder'));
    //column.addParamToURL('id', 'id', true);
    list.addColumn('trandate', 'date', 'Date', 'LEFT');
    list.addColumn('name_display', 'text', 'Customer', 'LEFT');
    list.addColumn('salesrep_display', 'text', 'Sales Rep', 'LEFT');
    list.addColumn('amount', 'currency', 'Amount', 'RIGHT');
    list.addColumn('randomstuff', 'text', 'Amount', 'RIGHT');
    
    var returncols = new Array();
    returncols[0] = new nlobjSearchColumn('trandate');
    returncols[1] = new nlobjSearchColumn('number');
    returncols[2] = new nlobjSearchColumn('name');
    returncols[3] = new nlobjSearchColumn('salesrep');
    returncols[4] = new nlobjSearchColumn('amount');
    
    var results = nlapiSearchRecord('estimate', null, new
    nlobjSearchFilter('mainline',null,'is','T'), returncols);
    list.addRows(results);
    
    //list.addPageLink('Create Phone Call', nlapiResolveURL('TASKLINK','EDIT_CALL'));
    //list.addPageLink('Create SalesOrder', nlapiResolveURL('TASKLINK','EDIT_TRAN_SALESORD'));
    //list.addButton('custombutton','Simple Button',"alert('hello world')");
    
    response.writePage(list);
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution( 'DEBUG', 'System Error', e.getCode() + ' ' + e.getDetails())
    } else {
      nlapiLogExecution( 'DEBUG', 'Unexpected Error', e.toString() )
    }
  }
}