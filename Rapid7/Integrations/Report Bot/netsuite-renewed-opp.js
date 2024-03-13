/**
* @NApiVersion 2.x
* @NScriptType restlet
*/
define(['N/search','N/record'], function (search,record) {

  function getCurrencySymbol(id){
    var opp = record.load({
      type: 'OPPORTUNITY',
      id: id,
      isDynamic: false,
    });
    var data = opp.getValue({
      fieldId: "currencysymbol"
    });
    return data;
  }
  function format(data){
    var result = [];
    for(var i = 0; i < data.length; i++){
      result.push({
        'transactionNumber':data[i].getValue("transactionnumber"),
        'id':data[i].id,
        'title':data[i].getValue("title"),
        'status':data[i].getText("status"), 'expectedOrActualClose':data[i].getValue("custbodyr7expectedoractualclose"),
        'currency':getCurrencySymbol(data[i].id),
        'projectedTotal':data[i].getValue("projectedtotal")
      });
    }
    return result;
  }

  function getOpportunity(data) {
    var finalResponse = {};
    var isContactPresent = {};
    var resultSet = search.create({
      'type': search.Type.OPPORTUNITY,
      'filters': [{
        name:'entity',
        operator: 'is',
        values: data.customer_id
      }, {
        name:'status',
        operator:'is',
        values:['A']
      }],
      columns: [{
        'name': 'transactionnumber'
      }, {
        'name': 'title'
      }, {
        'name': 'status'
      },{
        'name': 'entitystatus'
      }, {
        'name': 'custbodyr7expectedoractualclose',
        "sort": search.Sort.DESC
      }, {
        'name': 'projectedtotal'
      }]
    }).run()
    var results = resultSet.getRange({
      start: 0,
      end: 50
    });
    return finalResult = format(results);
  }

  return {
    'post': getOpportunity
  }
});