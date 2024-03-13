/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */

 /*

 example of the JSON payload
{
  "subscription": {
    "id": "7492311",
    "licensingEventId": "12975",
    "number": "S774482",
    "source": "NETSUITE",
    "object": "SALES_ORDER",
    "customer": {
      "id": "150267379",
      "name": "NeuAnalytics",
      "ipimsOrgId": "",
      "ipimsCustomerId": ""
    },
    "products": [
      {
        "type": "PURCHASED",
        "licenseId": "NXL623792",
        "id": "623792",
        "orderType": "1",
        "startDate": 1585022400000,
        "expirationDate": 1585022400000,
        "productFamily": "Nexpose",
     "attributes": {
          "numberOfNodes": 1,
          "numberOfHostedNodes": 0,
          "scanEngineCount": 999,
          "assetBuffer": 200,
          "licenseModel": "Node limited",
          "adaptiveSecurity": true,
          "agents": false,
          "centrics": false,
          "cis": true,
          "cloud": false,
          "community": false,
          "customreporting": true,
          "disastigs": true,
          "discovery": true,
          "earlyAccess": false,
          "editor": true,
          "enginePool": true,
          "exposureAnalytics": false,
          "express": false,
          "fdcc": true,
          "insightVM": false,
          "liveNode": true,
          "mobile": true,
          "msspDiscovery": false,
          "multitenancy": false,
          "pci": true,
          "perpetual": true,
          "policyScan": true,
          "remediationAnalytics": false,
          "richDataExport": true,
          "scada": true,
          "usgcb": true,
          "webScan": true,
          "virtualization": true
        },
        "contact": {
          "email": "eric.glenn@neauanalytics.com",
          "firstName": "Eric",
          "id": "163339106",
          "lastName": "Glenn"
        }
      }
    ]
  }
}
 */



define(['N/search','N/runtime','N/record','N/util','N/format'],
function(search, runtime, record, util, format) {

    function buildJSONPayload(soId){
        var soOject = search.lookupFields({
            type: search.Type.SALES_ORDER,
            id: soId,
            columns:['internalid','number','entity']
            
        });
        soOject.getLookupValue = getLookupValue;
        //main JSON object
        var JSONPayload = {};
        JSONPayload.subscription = {
            "id": soOject.getLookupValue('internalid'),
            "licensingEventId": null,
            "number": soOject.getLookupValue('number'),
            "source": "NETSUITE",
            "object": "SALES_ORDER",
            "customer": {
                "id": soOject.getLookupValue('entity'),
                "name": soOject.getLookupValue('entity', true),
                //"ipimsOrgId": "",
                "ipimsCustomerId": ""
            },
            products:[]
        };
        buildProductObject(soId, JSONPayload.subscription.products);
        return (JSONPayload);
    }

    function buildProductObject(soId, productArray){
       //because we will have other product types in the future, with different structures, each type will have its own function
       getNexposeRecords(soId, productArray);
    }

    /*
    * used to build JSON data structure for Nexpose records. Data is takes from saved search . data is pushed to the arr of products
    * @param soId - text - id of the SO to collect data for
    * @productArray - [] - array of products to push data to
    * 
    */
    function getNexposeRecords(soId, productArray){
        var licenceSearch = runtime.getCurrentScript().getParameter('custscriptr7_nexpose_search');
        var soSearch = search.load({
            id: licenceSearch
        });
        var idFilter = search.createFilter({
            name: 'custrecordr7nxlicensesalesorder',
            operator: search.Operator.ANYOF,
            values:[soId]
        });
        var soRec = record.load({ type: record.Type.SALES_ORDER, id: soId });
        soSearch.filters.push(idFilter);        
        soSearch.run().each(function(result) {
            var productFamily = result.getText('custrecordcustrecordr7nxlicenseitemfamil');
            var pkey = result.getValue('custrecordr7nxproductkey');
            log.debug('pkey', pkey);
            log.debug('pkey.substring(0, 4)', pkey.substring(0, 4));
            var oneItemFlow = soRec.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcolr7_one_item_flow',
                line: parseInt(result.getValue({ name: 'linesequencenumber', join: 'CUSTRECORDR7NXLICENSESALESORDER' }))
            });
            var isNewSale = oneItemFlow == 1 ? true : false;
            var productObj = {
                type: "PURCHASED",//how to get non-PURCHASED?
                licenseId:result.getValue('name'),
                id:result.id,
                //productKey:result.getValue('custrecordr7nxproductkey')?result.getValue('custrecordr7nxproductkey'):null,
                productKey: pkey.substring(0, 4)!='PEND'?result.getValue('custrecordr7nxproductkey'):null,
                productSerialNumber: pkey.substring(0, 4) !== 'PEND' ? result.getValue('custrecordr7nxproductserialnumber') : null,
                startDate:  isNewSale ? format.parse(result.getValue({name: "startdate",join: "CUSTRECORDR7NXLICENSESALESORDER"}),format.Type.DATE).getTime() : null,
                expirationDate:    format.parse(result.getValue({name:'custrecordr7nxlicenseexpirationdate'}),format.Type.DATE).getTime(),
                lineSequenceId: result.getValue({name:'custrecordr7createdfromlinehash'}),
                productFamily: 'Nexpose',//'InsightVM'?'Nexpose':productFamily,
                attributes:{
                    numberOfHostedNodes     : result.getValue('custrecordr7nxlicensenumberhostedips'),
                    scanEngineCount         : result.getValue('custrecordr7nxnumberengines'),
                    assetBuffer             : result.getValue('custrecordr7nxlicenselivelicenselimit'),
                    licenseModel            : result.getText('custrecordr7nxlicensemodel')=='Node limited'?'GENLIC':'GENFIXEDIPLIC',
                    adaptiveSecurity        : result.getValue('custrecordr7nxlicenseadaptivesecurity'),
                    agents                  : result.getValue('custrecordr7nxlicenseagents'),
                    centrics                : result.getValue('custrecordr7nxlicense_centrics'),
                    cis                     : result.getValue('custrecordr7nxlicensecis'),
                    cloud                   : result.getValue('custrecordr7nxcloud'),
                    community               : result.getValue('custrecordr7nxcommunitylicense'),
                    customreporting         : result.getValue('custrecordr7nxdisa'),
                    disastigs               : result.getValue('custrecordr7nxlicenseadaptivesecurity'),
                    discovery               : result.getValue('custrecordr7nxlicensediscoverylicense'),
                    earlyAccess             : result.getValue('custrecordr7nxlicenseearlyaccess'),
                    editor                  : result.getValue('custrecordr7nxlicensepolicyeditor'),
                    enginePool              : result.getValue('custrecordr7nxlicenseenginepool'),
                    exposureAnalytics       : result.getValue('custrecordr7nxlicenseexposureanalytics'),
                    express                 : result.getValue('custrecordr7nxexpress'),
                    fdcc                    : result.getValue('custrecordr7nxlicensefdcc'),
                    liveNode                : result.getValue('custrecordr7nxlicenselivelicense'),
                    mobile                  : result.getValue('custrecordr7nxlicensing_mobileoption'),
                    msspDiscovery           : result.getValue('custrecordr7nxmsspdiscovery'),
                    multitenancy            : result.getValue('custrecordr7nxlicensemultitenancy'),
                    pci                     : result.getValue('custrecordr7nxlicensepcitemplate'),
                    policyScan              : result.getValue('custrecordr7nxpolicy'),
                    remediationAnalytics    : result.getValue('custrecordr7nxlicenseremedanalytics'),
                    richDataExport          : result.getValue('custrecordr7nxlicensecsvrichdataexport'),
                    scada                   : result.getValue('custrecordr7nxscada'),
                    usgcb                   : result.getValue('custrecordr7nxlicenseusgcb'),
                    webScan                 : result.getValue('custrecordr7nxwebscan'),
                    virtualization: result.getValue('custrecordr7nxlicensevirtualization'),
                    enterprise: true,
                    insightVM: result.getValue('custrecordr7nxlicenseinsightvm'),
                    virtualScanning: result.getValue('custrecordr7nxlicensevassetscan'),
                    apeCustomPol: result.getValue('custrecordr7nxlicensecustompolicies'),
                    policyEngineV2: result.getValue('custrecordr7nxlicenseadvancedpolicyeng')
                },
                contact:{
                    email                   : result.getValue({
                                                name: 'email',
                                                join: 'CUSTRECORDR7NXLICENSECONTACT'
                                            }),
                    firstName               : result.getValue({
                                                name: 'firstname',
                                                join: 'CUSTRECORDR7NXLICENSECONTACT'
                                            }),
                    id                      : result.getValue({
                                                name: 'internalid',
                                                join: 'CUSTRECORDR7NXLICENSECONTACT'
                                            }),
                    lastName                : result.getValue({
                                                name: 'lastname',
                                                join: 'CUSTRECORDR7NXLICENSECONTACT'
                                            })
                }
            };
            var cols = result.columns;
            var attributes = productObj.attributes;
            cols.forEach(function(col){
            switch(col.label){
                case 'product: orderType'                   : productObj.orderType = result.getValue(col); break;
                case 'product: numberOfNodes'               : attributes.numberOfNodes = result.getValue(col); break;
            }
            });
            productArray.push(productObj);
            if(productFamily==='InsightVM'||productFamily==='One-InsightVM'){
                var oneItemFlow = soRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7_one_item_flow',
                    line: parseInt(result.getValue({ name: 'linesequencenumber', join: 'CUSTRECORDR7NXLICENSESALESORDER' }))
                });
                var isNewSale = oneItemFlow == 1 ? true : false;
                var productObj = {
                    "ipimsOrgId": "",
                    type: "PURCHASED",//how to get non-PURCHASED?
                    licenseId: result.getValue('name'),
                    id: result.id,
                    productToken: (result.getValue('custrecordr7nxproducttoken') != '' && result.getValue('custrecordr7nxproducttoken') != null) ? result.getValue('custrecordr7nxproducttoken') : null,
                    startDate: isNewSale ? format.parse(result.getValue({name: "startdate",join: "CUSTRECORDR7NXLICENSESALESORDER"}), format.Type.DATE).getTime() : null,
                    expirationDate: format.parse(result.getValue({name: 'custrecordr7nxlicenseexpirationdate'}), format.Type.DATE).getTime(),
                    lineSequenceId: result.getValue({name:'custrecordr7createdfromlinehash'}),
                    productFamily: 'InsightVM',
                    //datacenterLocation: result.getValue({name: 'formulatext'}),
                    contact: {
                        email: result.getValue({
                            name: 'email',
                            join: 'CUSTRECORDR7NXLICENSECONTACT'
                        }),
                        firstName: result.getValue({
                            name: 'firstname',
                            join: 'CUSTRECORDR7NXLICENSECONTACT'
                        }),
                        id: result.getValue({
                            name: 'internalid',
                            join: 'CUSTRECORDR7NXLICENSECONTACT'
                        }),
                        lastName: result.getValue({
                            name: 'lastname',
                            join: 'CUSTRECORDR7NXLICENSECONTACT'
                        })
                    }
                };
                var cols = result.columns;

                cols.forEach(function(col){
                    switch(col.label){
                        case 'product: orderType'                   : productObj.orderType = result.getValue(col); break;
                        case 'DataCenter Location'                  : productObj.datacenterLocation = result.getValue(col); break;
                    }
                });
                productArray.push(productObj);
            }
            return true;
        });        
    }

    function createEventRecord(JSONPayload){
        var eventRec = record.create({
            type: 'customrecordr7_licencing_event', 
            isDynamic: false,
        });
        log.debug('saving payload for SO ',JSONPayload.subscription.id);
        log.debug('saving payload for SO ',JSONPayload);
        eventRec.setValue({
            fieldId: 'custrecordr7_request_payload',
            value: JSON.stringify(JSONPayload)
        });
        eventRec.setValue({
            fieldId: 'custrecordr7_licensing_event_status',
            value: 1 //Ready for Fulfillment
        });
        eventRec.setValue({
            fieldId: 'custrecordr7_licensing_sales_order',
            value: JSONPayload.subscription.id
        });

        return eventRec.save();

    }

    /*
    * Returns value or text from NS Lookup object. Some fields are represented as arrays, but some as values, only value is returned
    * @param fieldName - text - name of field to return 
    * @param getText   - bool, default - false set to true, if need to return text, not value
    *
    */
    function getLookupValue(fieldName, getText){
        if(this[fieldName]){
            return util.isArray(this[fieldName])? this[fieldName][0][getText?'text':'value']: this[fieldName];
        }
    }

    return{
        buildJSONPayload:buildJSONPayload,
        createEventRecord:createEventRecord
    };
});