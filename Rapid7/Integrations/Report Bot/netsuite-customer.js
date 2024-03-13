  /**
   * @NApiVersion 2.x
   * @NScriptType restlet
   */
  define(["N/search"], function (s) {
    function searchCust(data) {
      var resultSet = s.create({
        'type': s.Type.CUSTOMER,
        'filters': [{
          name: "internalId",
          operator: s.Operator.IS,
          values: data.customer_id
        }],
        'columns': [{
          "name": "custentityr7accountmanager"
        }, {
          "name": "custentityr7csmcustomergroup"
        }, {
          "name": "custentityr7dateoffirstsalestoredvalue"
        }, {
          "name": "custentityr7uispecialist"
        }, {
          "name": "custentityr7nextrenewaldate"
        },{
          "name": "custentityr7reportingdivision"
        },{
          "name": "custentityr7directorlevelteam"
        },{
          "name": "custentityr7rapid7industry"
        },{
          "name": "custentityr7ivmmigrationstatus"
        },{
          "name": "salesrep"
        }]
      }).run()
      var results = resultSet.getRange({
        start: 0,
        end: 1
      });

      return results;
    }

    return {
      'post': searchCust
    }
  });
