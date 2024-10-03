/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/log', "N/format","N/record","N/search"], function (log, format,record, search) {

  function beforeLoad(params) {
    try {

      const newRecord = params?.newRecord;
      var thisForm = newRecord.getValue('customform');
      var isDropShip = newRecord.getValue('custbody_dropship_order');
      log.debug("thisForm",thisForm)
      log.debug("isDropShip",isDropShip)
      if(thisForm == 300 || thisForm == '300' || isDropShip)return;
      var id = newRecord?.id

      //------------------Item Lines Colors Functionality 07/06/2024---------------- 
      //for dropship form (id: custform_424_5774630_351 or 300),
      //setup Warehouse(id:location) field to Dropship Warehouse (id: 129)
      try {
        newRecord.setValue("custbody_sdb_content_code", `<style>
        #myId>* {
            background-color: #f4f476 !important;
        }
        #myId2>* {
          background-color: #ffa420 !important;
        }
        #myId3>* {
          background-color: #f08080 !important;
        }
        </style>
        <script>
              function getNextBusinessDayNew(sDate) {
              try {
                var aHolidays = loadHolidaysPageInit();
                var dDate = new Date(sDate);
                var sReturn;
                do {
                  dDate.setDate(dDate.getDate() + 1);
                  sReturn = dDate;
                  sReturn = getFormatDate(sReturn)
                } while (aHolidays.indexOf(sReturn) >= 0 || dDate.getDay() == 6 || dDate.getDay() == 0);
            
                return new Date(sReturn);
              } catch (error) {
                log.error("getNextBusinessDayNew",error)
              }
            }
    
            function getFormatDate(d) {
              try {
                return [d.getMonth() + 1 < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1),
                  d.getDate() < 10 ? "0" + d.getDate() : d.getDate(),
                  d.getFullYear()].join('/')
              } catch (error) {
                log.error("getFormatDate",error)
              }
            }
    
          function loadHolidaysPageInit() {
            try {
            
                 var aHolidays = [];
                  var searchResult = nlapiSearchRecord("customrecord_acme_official_holidays", null, [], [
                    new nlobjSearchColumn("custrecord_aoh_holiday_date"),
                  ]);
    
                  if (searchResult && searchResult.length > 0) {
                    for (var i = 0; i < searchResult.length; i++) {
                      var result = searchResult[i];
                      var date = result.getValue('custrecord_aoh_holiday_date');
                      console.log(date);
                      aHolidays.push(date);
                    }
                  }
    
              return aHolidays;
            } catch (error) {
              log.error("loadHolidaysPageInit",error);
            }
          }
            
            var id = nlapiGetFieldValue("id");
            if (id) {
                var record = nlapiLoadRecord("salesorder", id);
                var shipDate = record.getFieldValue("startdate");
                var shipDateFormated = new Date(shipDate);
            
                var currentDate = new Date();
                var nextBusinessDay = getNextBusinessDayNew(currentDate);
            
                var linenum = record.getLineItemCount("item");
                var objItems = {};
            
                for (var i = 1; i <= linenum; i++) {
                    var DNR = record.getLineItemValue("item", "custcol_sdb_dnr", i)
                    var bo_Line = record.getLineItemValue("item", "quantitybackordered", i)
                    var itemType = record.getLineItemValue("item", "itemtype", i);
                    if (DNR == 2 && Number(bo_Line) > 0 && itemType == 'InvtPart') {
                        var itemText = record.getLineItemValue("item", "item_display", i);
                        var itemNumber = itemText?.split(' ')[0];
                        var resultsItem = {};
                        objItems[itemNumber] = { index: i, dnr: DNR };
                    } else if ((itemType == 'InvtPart') && (shipDateFormated > nextBusinessDay && DNR != 2) || (DNR == 1 && Number(bo_Line) > 0)) {
                        var itemText = record.getLineItemValue("item", "item_display", i);
                        var itemNumber = itemText?.split(' ')[0];
                        var resultsItem = {};
                        objItems[itemNumber] = { index: i, dnr: DNR };
                    }
                    else if (itemType == 'NonInvtPart') {
                        var itemText = record.getLineItemValue("item", "item_display", i);
                        var itemNumber = itemText?.split(' ')[0];
                        var resultsItem = {};
                        objItems[itemNumber] = { index: i, dnr: 'NonInvt' };
                    }
                }
                console.log(objItems);
                var doc1 = document.querySelectorAll("#item_splits tr td:nth-child(2)");
                for (let i = 0; i < doc1.length; i++) {
                    var itemText = doc1[i]?.querySelector("a")?.innerHTML;
                    if (itemText) {
                        var item = itemText?.split(' ')[0];
                        if (objItems[item] && objItems[item].index && objItems[item].dnr == 'NonInvt') {
                            doc1[objItems[item].index].parentElement.id = "myId3";
                        }
                        else if (objItems[item] && objItems[item].index && objItems[item].dnr != 2) {
                            doc1[objItems[item].index].parentElement.id = "myId";
                        }
                        else if (objItems[item] && objItems[item].index && objItems[item].dnr == 2) {
                            doc1[objItems[item].index].parentElement.id = "myId2";
                        }
                    }
                }
            }
        </script>`)
      } catch (error) {
        log.error("newRecord setValue", error);
      }
    } catch (error) {
      log.error('ERROR', error)
    }

  }

  return {
    beforeLoad: beforeLoad
  };
});
