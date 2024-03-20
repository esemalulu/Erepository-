/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/search', 'N/runtime', 'N/query'], function(search, runtime, query) {

    function _get(context) {
        function getAllResults(s) {
            var results = s.run();
            var searchResults = [];
            var searchid = 0;
            var resultslice;
            do {
              resultslice = results.getRange({
                start: searchid,
                end: searchid + 1000
              });
              resultslice.forEach(function (slice) {
                searchResults.push(slice);
                searchid += 1;
              });
            } while (resultslice.length >= 1000);
            return searchResults;
          }
      log.debug('','context: ' + JSON.stringify(context))
        // var params = context.params;
      var ship_date_PARAM = context.ship_date;
      var location_PARAM = context.location;

      
        log.debug('', 'ship_date_PARAM: ' + ship_date_PARAM);
        log.debug('', 'location_PARAM: ' + location_PARAM);

        var scriptObj = runtime.getCurrentScript();
        var ssid = scriptObj.getParameter('custscript_dakota_so_quantity_replenishm');
        var searchObj;
        var searchObjFiltersArr;
        var allResults;
        var returnObj = [];
        var location,shipDate, itemId,itemNumber,bfcNormalUOMCode,bfcBrkDwn1UOMCode,quantitySoldBaseUOM, unit, normalUOM, breakdown1UOM, quantity;
        var paginatedSQL;
        var queryResults;
        var locationId;
      
        if(ssid) {
            searchObj = search.load(ssid);
            //searchObjFiltersArr = searchObj.filters;

          if(ship_date_PARAM) {
            searchObj.filters.push(search.createFilter({
             name: 'shipdate',
             //join: 'role',
             operator: search.Operator.ON,
             values: ship_date_PARAM
            })) //must be in format of MM/DD/YYYY
            log.debug('', 'ship_date_PARAM added to filters' + ship_date_PARAM);
          }
          
          if(location_PARAM) {
            paginatedSQL = `SELECT loc.id FROM location AS loc WHERE loc.name = '${location_PARAM}'`;
            queryResults = query.runSuiteQL( { query: paginatedSQL, } ).asMappedResults();
            
            if(queryResults.length) {
              locationId = queryResults[0].id 
            }
            
            searchObj.filters.push(search.createFilter({
             name: 'location',
             //join: 'role',
             operator: search.Operator.ANYOF,
             values: locationId
            }));
              log.debug('', 'locationId added to filters ' + locationId);
          } 
            allResults = getAllResults(searchObj);

          log.debug('', 'allResults length: ' + allResults.length);
            log.debug('', 'allResults: ' + JSON.stringify(allResults));
        } else if(!ssid) {
          return 'Please specify saved search in NS script deployment first'
        }

        allResults.forEach(function(result) {

          location = result.getValue({
            name: "locationnohierarchy",
            summary: "GROUP",
            label: "Location (no hierarchy)"
          }) || '';
          shipDate = result.getValue({
            name: "shipdate",
            summary: "GROUP",
            sort: search.Sort.ASC,
            label: "Ship Date"
          }) || '';
          itemNumber = result.getText({
                name: "item",
                summary: "GROUP",
                label: "Item"
             }) || '';

          bfcNormalUOMCode = result.getValue({
                name: "custitem_dakota_normal_uom_code",
                join: "item",
                summary: "GROUP",
                label: "BFC-Normal UOM Code"
             }) || '';

          bfcBrkDwn1UOMCode = result.getValue({
                name: "custitem_dakota_brkdwn1_uom_code",
                join: "item",
                summary: "GROUP",
                label: "BFC-Brkdwn 1 UOM Code"
             }) || '';

          quantitySoldBaseUOM = result.getValue({
                name: "quantity",
                summary: "SUM",
                label: "Quantity"
             }) || '';

          quantitySoldBrkDwn1 = result.getValue({
            name: "formulanumeric",
            summary: "SUM",
            formula: "CASE WHEN {unitabbreviation}<>{item.custitem_dakota_normal_uom_code} THEN  {quantity} END",
            label: "Brkdwn 1 UOM Qty"
          }) || '';


             returnObj.push({
               location: location,
               shipDate: shipDate,
               itemNumber: itemNumber,
               bfcNormalUOMCode: bfcNormalUOMCode,
               bfcBrkDwn1UOMCode: bfcBrkDwn1UOMCode == "- None -" ? "None" : bfcBrkDwn1UOMCode,
               quantitySoldBaseUOM: quantitySoldBaseUOM,
               quantitySoldBrkDwn1: quantitySoldBrkDwn1
             })

        });
        log.debug('', 'returnObj: ' + JSON.stringify(returnObj));

      // << VAS 21 July 2023 400 error on empty results fix
      
        return JSON.stringify(returnObj);
      
      // VAS 21 July 2023 400 error on empty results fix >>
      
    }

    function _post(context) {
        
    }

    function _put(context) {
        
    }

    function _delete(context) {
        
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
