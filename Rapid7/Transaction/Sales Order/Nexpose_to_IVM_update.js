/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 *   1.0    24.11.2018      N.Grigoriev
 *   */

define(['N/record','N/search'],

    /**
     *
     *
     * @param {record} record
     *
     *
     */
    function (record, search) {
        var itemsMap = {
            'RNXENTALL'                 : {item: 'RXMIG-RIVM'},
            'RNXENTALL-IDRBUNDLE'       : {item: 'RXMIG-RIVM'},
            'RNXENTALLCONS'             : {item: 'RXMIG-RIVMCONS'},
            'RNXENTALLCONS-ADD'         : {item: 'RXMIG-RIVMCONS-ADD'},
            'RNXENTALLCONS-TERM'        : {item: 'RXMIG-RIVMCONS'},
            'RNXENTALLIP'               : {item: 'RXMIG-RIVMASSETS'},
            'RNXENTALLIP-IDRBUNDLE'     : {item: 'RXMIG-RIVMASSETS'},
            'RNXENTALLIPTERM'           : {item: 'RXMIG-RIVMASSETS'},
            'RNXENTALLTERM'             : {item: 'RXMIG-RIVM'},
            'RNXENTIP'                  : {item: 'RXMIG-RIVM'},
            'RNXEXPIP'                  : {item: 'RXMIG-RIVMASSETS'},
            'RNXEXPP1024'               : {item: 'RXMIG-RIVM', qty:1024},
            'RNXEXPP128'                : {item: 'RXMIG-RIVM',qty:128},
            'RNXEXPP256'                : {item: 'RXMIG-RIVM',qty:256},
            'RNXEXPP512'                : {item: 'RXMIG-RIVM',qty:512},
            'RNXEXPPR'                  : {item: 'RXMIG-RIVM'},
            'RNXHOS'                    : {item: 'RXMIG-RIVMHOS512'},
            'RNXHOS512'                 : {item: 'RXMIG-RIVMHOS512'},
            'RNXHOS512-TERM'            : {item: 'RXMIG-RIVMHOS512'},
            'RNXHOSD'                   : {item: 'RXMIG-RIVMHOSD'},
            'RNXHOSD-TERM'              : {item: 'RXMIG-RIVMHOSD'},
            'RNXIDR'                    : {item: 'RXMIG-RIVM'},
            'RNXIDR-DE'                 : {item: 'RXMIG-RIVM'},
            'RNXIDRASSET'               : {item: 'RXMIG-RIVMASSETS'}
        }

        /**
         * Function called upon sending a POST request to the RESTlet.
         *
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         */
        function doGet(requestBody) {
            var response = 'error';
            
            log.debug('called Restlet script!',requestBody);
            var soRecord = record.load({
                type:record.Type.SALES_ORDER,
                id:requestBody.custscript_salesorder,
                isDynamic:true
            });

            response = processNexposeItems(soRecord);
            return response;
        }

        function processNexposeItems(soRecord){
            try {
                var linesCount = soRecord.getLineCount({
                    sublistId: 'item'
                });
                var itemsUpdated = false;
                log.debug('processNexposeItems ');
                for (var lineId = 0; lineId < linesCount; lineId++) {
                    linesCount = soRecord.getLineCount({sublistId: 'item'});
                    log.debug('loop '+lineId+' updatetCount',linesCount);
                    if(lineId<linesCount) {
                        var itemToreplace = needToProcessLine(soRecord, lineId);
                        log.debug('looks at line ' + lineId + ' itemToreplace ', itemToreplace);
                        if (itemToreplace) {
                            log.debug('item to replace on line ' + lineId, itemToreplace);
                            var itemData = collectDataFromGroup(soRecord, lineId, itemToreplace);
                            log.debug('processNexposeItems itemData', itemData);
                            if(!itemData.quantityfulfilled&&!itemData.quantitybilled) {
                                replaceGroupItem(lineId, itemData, soRecord, itemToreplace);
                                /*soRecord = record.load({
                                    type: record.Type.SALES_ORDER,
                                    id: soRecord.id,
                                    isDynamic: true
                                })*/
                                itemsUpdated = true;
                            }
                        }
                    }
                }
                if (itemsUpdated) {
                    soRecord.save();
                    return 'SO Updated'
                } else {
                    return 'Nothing to Update'
                }
            }catch (e) {
                log.error('processNexposeItems',e)
                return e.message
            }

        }

        function needToProcessLine(soRecord,lineId) {
            log.debug('needToProcessLine 1')
            var itemName = soRecord.getSublistText({
                sublistId:'item',
                line:lineId,
                fieldId:'item'
            });
            log.debug('needToProcessLine 2')
            return itemsMap[itemName];
        }

        function collectDataFromGroup(soRecord,lineId, itemToreplace){
            //Start Date, End Dates, (RA) Created From, Rate, Qty, and Amount t
            var itemData;
            log.debug('search.Type.ITEM,',search.Type.ITEM)
            while (!itemData){
                var pricingLine = search.lookupFields({
                    type:search.Type.ITEM,
                    id: soRecord.getSublistValue({
                        sublistId:'item',
                        fieldId:'item',
                        line:++lineId
                    }),
                    columns:'custitem_arm_upgrade_pricing_line'
                });
                log.debug('pricingLine',pricingLine);
                if(pricingLine.custitem_arm_upgrade_pricing_line){
                    itemData = {
                        revrecstartdate:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'revrecstartdate'}),
                        revrecenddate:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'revrecenddate'}),
                        custcolr7startdate:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'custcolr7startdate'}),
                        custcolr7enddate:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'custcolr7enddate'}),
                        custcol_start_date_so_line:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'custcol_start_date_so_line'}),
                        custcol_end_date_so_line:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'custcol_end_date_so_line'}),
                        custcolr7acvstartdate:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'custcolr7acvstartdate'}),
                        custcolr7acvenddate:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'custcolr7acvenddate'}),
                        custcolr7_category_purchased_expire:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'custcolr7_category_purchased_expire'}),
                        custcolr7createdfromra:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'custcolr7createdfromra'}),
                        custcolr7createdfromra_lineid:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'custcolr7createdfromra_lineid'}),
                        quantity: itemToreplace.qty?itemToreplace.qty:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'quantity'}),
                        rate:itemToreplace.qty?Number(soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'rate'}))/itemToreplace.qty: soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'rate'}) ,
                        taxcode:soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'taxcode'}),
                        location: soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'location'}),
                        quantityfulfilled: soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'quantityfulfilled'}),
                        quantitybilled: soRecord.getSublistValue({sublistId:'item',line:lineId,fieldId:'quantitybilled'})
                    }
                    itemData=itemData?itemData:true;
                }
            }
            return itemData;
        }

        function replaceGroupItem(lineId,itemdata, soRecord,itemToreplace){
            var itemId = searchItem(itemToreplace.item);
            soRecord.selectLine({sublistId:'item',line:lineId});
            soRecord.setCurrentSublistValue({
                sublistId:'item',
                fieldId:'item',
                value:itemId
            });
            for(var property in itemdata){
                soRecord.setCurrentSublistValue({
                    sublistId:'item',
                    fieldId:property,
                    value:itemdata[property]
                });
            }
            soRecord.commitLine({sublistId:'item'});
            //soRecord.save();
        }

        function searchItem(itemName){
            var itemId;
            var itemSearch = search.create({
                type:search.Type.ITEM,
                filters:[{
                    name: 'itemid',
                    operator: 'is',
                    values: itemName
                }]
            }).run().each(function (result) {
                log.debug('search for item '+itemName, result.id);
                itemId = result.id
            })
            return itemId
        }

        return {
            get: doGet
        };

    });