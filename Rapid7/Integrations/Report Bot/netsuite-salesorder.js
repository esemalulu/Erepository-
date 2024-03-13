/**
 * @NApiVersion 2.x
 * @NScriptType restlet
 */
define(['N/search', 'N/record'], function(search, record) {

  function format(data, contactModel) {
    var result = [];
    for (var i = 0; i < data.length; i++) {
      result.push({
        'orderType': data[i].getText(contactModel.orderType),
        'itemFamily': data[i].getText(contactModel.itemFamily),
        'expirationDate': data[i].getValue(contactModel.expirationDate),
        'licenceContact': data[i].getText(contactModel.licenceContact),
        'productKey': data[i].getValue(contactModel.productKey),
        'recType': contactModel.recType,
        'id': data[i].getValue('internalid')
      });
    }
    return result;
  }

  function searchCust(data) {

    var excludeLicense = [{
      'types': ['1', '3']
    }, {
      'types': []
    }, {
      'types': ['2', '7']
    }, {
      'types': []
    }];

    var contactModel = [{
      'customerKey': 'custrecordr7mslicensecustomer',
      'modelType': 'customrecordr7metasploitlicensing',
      'licenceContact': 'custrecordr7mslicensecontact',
      'productKey': 'custrecordr7msproductkey',
      'orderType': 'custrecordr7msordertype',
      'itemFamily': 'custrecordr7mslicenseitemfamily',
      'expirationDate': 'custrecordr7mslicenseexpirationdate',
      'recType': '',
      'responseKey': 'metasploit',
      'responseValues': []
    }, {
      'customerKey': 'custrecordr7asplicensecustomer',
      'modelType': 'customrecordr7appspiderlicensing',
      'licenceContact': 'custrecordr7asplicensecontact',
      'productKey': 'custrecordr7asplicenseproductkey',
      'orderType': 'custrecordr7asplicenseordertype',
      'itemFamily': 'custrecordr7asplicenseitemfamily',
      'expirationDate': 'custrecordr7asplicenseexpirationdate',
      'recType': '',
      'responseKey': 'appspider',
      'responseValues': []
    }, {
      'customerKey': 'custrecordr7nxlicensecustomer',
      'modelType': 'customrecordr7nexposelicensing',
      'licenceContact': 'custrecordr7nxlicensecontact',
      'productKey': 'custrecordr7nxproductkey',
      'orderType': 'custrecordr7nxordertype',
      'itemFamily': 'custrecordcustrecordr7nxlicenseitemfamil',
      'expirationDate': 'custrecordr7nxlicenseexpirationdate',
      'recType': '',
      'responseKey': 'nexpose',
      'responseValues': []
    }, {
      'customerKey': 'custrecordr7inplicensecustomer',
      'modelType': 'customrecordr7insightplatform',
      'licenceContact': 'custrecordr7inplicensecontact',
      'productKey': 'custrecordr7inplicenseprodcutkey',
      'orderType': 'custrecordr7inplicenseordertype',
      'itemFamily': 'custrecordr7inplicenseitemfamily',
      'expirationDate': 'custrecordr7inplicenseexpirationdate',
      'recType': '',
      'responseKey': 'insight',
      'responseValues': []
    }];
    var finalResponse = {};
    for (var modelIndex = 0; modelIndex < contactModel.length; modelIndex++) {
      var isContactPresent = {};
      var filters = [{
        name: contactModel[modelIndex].customerKey,
        operator: search.Operator.IS,
        values: data.customer_id
      }];
      if (excludeLicense[modelIndex].types.length > 0) {
        filters.push({
          name: contactModel[modelIndex].orderType,
          operator: 'noneof',
          values: excludeLicense[modelIndex].types
        });
      }

      var resultSet = search.create({
        'type': contactModel[modelIndex].modelType,
        'filters': filters,
        columns: [{
          'name': 'internalid'
        }, {
          'name': contactModel[modelIndex].orderType
        }, {
          'name': contactModel[modelIndex].itemFamily
        }, {
          'name': contactModel[modelIndex].expirationDate,
          "sort": search.Sort.DESC
        }, {
          'name': contactModel[modelIndex].licenceContact
        }, {
          'name': contactModel[modelIndex].productKey
        }, {
          'name': contactModel[modelIndex].customerKey
        }]
      }).run()
      var results = resultSet.getRange({
        start: 0,
        end: 50
      });

      if (results.length > 0) {
        var objRecord = record.load({
          type: contactModel[modelIndex].modelType,
          id: results[0].getValue('internalid'),
          isDynamic: true,
        });

        contactModel[modelIndex]['recType'] = objRecord.getValue('rectype');
      }

      finalResponse[contactModel[modelIndex]['responseKey']] = format(results, contactModel[modelIndex]);
    }
    return finalResponse;
  }

  return {
    'post': searchCust
  }
});
