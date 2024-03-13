  /**
   * @NApiVersion 2.x
   * @NScriptType restlet
   */
  define(['N/search', 'N/record'], function(search, record) {
      function searchCust(data) {
          var metasploitRecords = [];
          var appSpiderRecords = [];
          var nExposeRecords = [];

          function sort(data) {
              return data.sort(function(current, next) {
                  var currentlName = current.lastName.toLowerCase();
                  var currentFName = current.firstName.toLowerCase();
                  var nextlName = next.lastName.toLowerCase();
                  var nextFname = next.firstName.toLowerCase();

                  if (currentlName > nextlName || (currentlName == nextlName && currentFName > nextFname))
                      return 1;
                  else
                      return -1;
              });
          }

          var contactModel = [{
              'modelType': 'customrecordr7metasploitlicensing',
              'customerKey': 'custrecordr7mslicensecustomer',
              'contactKey': 'custrecordr7mslicensecontact',
              'responseKey': 'metasploit',
              'responseValues': []
          }, {
              'modelType': 'customrecordr7appspiderlicensing',
              'customerKey': 'custrecordr7asplicensecustomer',
              'contactKey': 'custrecordr7asplicensecontact',
              'responseKey': 'appspider',
              'responseValues': []
          }, {
              'modelType': 'customrecordr7nexposelicensing',
              'customerKey': 'custrecordr7nxlicensecustomer',
              'contactKey': 'custrecordr7nxlicensecontact',
              'responseKey': 'nexpose',
              'responseValues': []
          }, {
              'modelType': 'customrecordr7insightplatform',
              'customerKey': 'custrecordr7inplicensecustomer',
              'contactKey': 'custrecordr7inplicensecontact',
              'responseKey': 'insight',
              'responseValues': []
          }]
          var finalResponse = {};
          for (var modelIndex = 0; modelIndex < contactModel.length; modelIndex++) {
              var isContactPresent = {}
              var resultSet = search.create({
                      'type': contactModel[modelIndex].modelType,
                      'filters': [{
                          name: contactModel[modelIndex].customerKey,
                          operator: search.Operator.IS,
                          values: data.customer_id
                      }],
                      columns: [{
                          'name': contactModel[modelIndex].customerKey
                      }, {
                          'name': contactModel[modelIndex].contactKey
                      }]
                  })
                  .run()
              var results = resultSet.getRange({
                  start: 0,
                  end: 50
              });

              // log.debug('contact', contactModel[modelIndex].modelType + ' results length ' + results.length);
              for (var contactIndex = 0; contactIndex < results.length; contactIndex++) {
                  var contactId = results[contactIndex].getValue({
                      'name': contactModel[modelIndex].contactKey
                  });
                  if (contactId && !isContactPresent[contactId]) {
                      isContactPresent[contactId] = true
                      var objRecord = record.load({
                          type: record.Type.CONTACT,
                          id: contactId,
                          isDynamic: true,
                      });
                      var tempObj = {};
                      tempObj.firstName = objRecord.getValue('firstname')
                      tempObj.lastName = objRecord.getValue('lastname')
                      tempObj.phone = objRecord.getValue('phone')
                      tempObj.email = objRecord.getValue('email')
                      // tempObj.title = objRecord.getValue('title')
                      tempObj.custentityr7contactjoblevel = objRecord.getText('custentityr7contactjoblevel')
                      contactModel[modelIndex].responseValues.push(tempObj)
                  }
              }
              var sortedData = sort(contactModel[modelIndex].responseValues);
              finalResponse[contactModel[modelIndex]['responseKey']] = sortedData;
          }

          return finalResponse;
      }

      return {
          'post': searchCust
      }
  });