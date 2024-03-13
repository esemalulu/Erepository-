/**
 * @NApiVersion 2.0
 */
define(["N/record", "N/search", "N/log", "N/render"], function (record, search, log, render) {

  var interimPackages;

  /**
   * Returns a list of interim ids based on results from customsearch_r7_interim_package_ids
   */
  function getInterimPackageIds() {
    var interimIds = [];
    const interimPackageIdSearch = search.load({ id: 'customsearch_r7_interim_package_ids' });
    interimPackageIdSearch.run().each(function (result) {
      const interimItemId = result.getValue({ name: 'internalId', join: 'CUSTRECORD_R7_INTERIM_PACKAGE_ITEM' });
      interimIds.push(interimItemId);
      return true;
    });
    return interimIds;
  }

  // Array.prototype.find() polyfill
  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, "find", {
      value: function (predicate) {
        if (this == null) {
          throw TypeError('"this" is null or not defined');
        }
        var o = Object(this);
        var len = o.length >>> 0;
        if (typeof predicate !== "function") {
          throw TypeError("predicate must be a function");
        }
        var thisArg = arguments[1];
        var k = 0;
        while (k < len) {
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
          }
          k++;
        }
        return undefined;
      },
      configurable: true,
      writable: true,
    });
  }

  var NECESSARY_ITEM_DETAILS = [
    "item",
    "quantity",
    "rate",
    "amount",
    "location",
    "description",
    "department",
    "taxrate1",
    "custcolr7inlinediscount",
    "custcolr7inlinepartnerdiscount",
    "custcolr7startdate",
    "custcolr7enddate",
    "custcolr7_one_item_flow",
    "custcolr7totalownership",
    "custcolr7onepriceterm",
    "custcol_r7_pck_package_level",
    "custcol_r7_pck_package_item",
    "custcol_r7_pck_package_license",
    "custcolr7onepriceinvoicedisplay",
    "custcolr7itemqtyunit",
    "custcolr7_incumbent_purchase_type",
    "custcolr7_promo_amount",
    "custcol_crc_fair_value_calculation",
    "custcol_mdrp_fair_value_calculation",
  ];

  function transformELAInvoice(transactionRec) {
    var linesToRemove = [];
    var lineHashesRemoved = [];
    var psLineHashesRemoved = [];
    var servicesTotal = 0;
    var partnerDiscountsTotal = 0;
    var discountsTotal = 0;
    var taxTotal = 0;

    var psServicesTotal = 0;
    var psPartnerDiscountsTotal = 0;
    var psDiscountsTotal = 0;
    var psTaxTotal = 0;
    var prevLineWasService = false;
    var custcolr7startdate, custcolr7enddate, custcolr7onepriceterm, location, department, psCustcolr7onepriceterm, psLocation, psDepartment;

    var itemCount = transactionRec.getLineCount({
      sublistId: "item",
    });

    for (var i = 0; i < itemCount; i++) {
      var itemRevCategory = Number(transactionRec.getSublistValue("item", "custcol_r7_item_rev_category", i));
      var serviceRevCategories = [2,20,8,1,25,41,40,15,4,24,1,23,42,8,28,6,7,29,21,31,33,14];
      var itemType = transactionRec.getSublistValue('item', 'itemtype', i);

      if(serviceRevCategories.indexOf(itemRevCategory) != -1 && itemType != 'EndGroup') {
        custcolr7startdate = transactionRec.getSublistValue("item", "custcolr7startdate", i) || custcolr7startdate;
        custcolr7enddate = transactionRec.getSublistValue("item", "custcolr7enddate", i) || custcolr7enddate;
        custcolr7onepriceterm = transactionRec.getSublistValue("item", "custcolr7onepriceterm", i) || custcolr7onepriceterm;
        location = transactionRec.getSublistValue("item", "location", i) || location;
        department = transactionRec.getSublistValue("item", "department", i) || department;

        linesToRemove.push(i);
        var lineHash = transactionRec.getSublistValue("item", "custcolr7_linehash", i);
        lineHashesRemoved.push(lineHash);

        var lineAmount = Number(transactionRec.getSublistValue("item", "amount", i));
        servicesTotal += lineAmount;
        discountsTotal += Number(transactionRec.getSublistValue("item", "custcolr7inlinediscount", i));
        partnerDiscountsTotal += Number(transactionRec.getSublistValue("item", "custcolr7inlinepartnerdiscount", i)); //make sure this is a negative number as these should be discounts

        var lineTaxRate = transactionRec.getSublistValue("item", "taxrate1", i);
        taxTotal  += lineTaxRate > 0 ? (Number(lineAmount) * parseFloat(lineTaxRate)) / 100 : 0;
        prevLineWasService = true;
      } else if(itemRevCategory == 19 || itemRevCategory == 12 || itemRevCategory == 9) {
        psCustcolr7onepriceterm = transactionRec.getSublistValue("item", "custcolr7onepriceterm", i) || psCustcolr7onepriceterm;
        psLocation = transactionRec.getSublistValue("item", "location", i) || psLocation;
        psDepartment = transactionRec.getSublistValue("item", "department", i) || psDepartment;

        linesToRemove.push(i);
        var lineHash = transactionRec.getSublistValue("item", "custcolr7_linehash", i);
        psLineHashesRemoved.push(lineHash);

        var lineAmount = Number(transactionRec.getSublistValue("item", "amount", i));
        psServicesTotal += lineAmount;
        psDiscountsTotal += Number(transactionRec.getSublistValue("item", "custcolr7inlinediscount", i));
        psPartnerDiscountsTotal += Number(transactionRec.getSublistValue("item", "custcolr7inlinepartnerdiscount", i)); //make sure this is a negative number as these should be discounts

        var lineTaxRate = transactionRec.getSublistValue("item", "taxrate1", i);
        psTaxTotal += lineTaxRate > 0 ? (Number(lineAmount) * parseFloat(lineTaxRate)) / 100 : 0;
        prevLineWasService = false;
      } else {
        var linkedLineHash = transactionRec.getSublistValue("item", "custcolr7_parentlinehash", i);
        var itemDisplay = transactionRec.getSublistValue("item", "item_display", i);
        var quoteSigItems = ["PONOTES-NOPO", "PONOTES-REQPO", "RENTERMS"];
        if(quoteSigItems.indexOf(itemDisplay) == -1) {
          if(lineHashesRemoved.indexOf(linkedLineHash) > -1) {
            //services
            linesToRemove.push(i);
          }else if(psLineHashesRemoved.indexOf(linkedLineHash) > -1) {
            //psServices
            linesToRemove.push(i);
          }
        }
        var isDiscount =  transactionRec.getSublistValue("item", "itemtype", i) == 'Discount';
        if(isDiscount && transactionRec.type == 'estimate') {
          if(prevLineWasService) {
            if(itemDisplay == 'Partner Discount') {
              partnerDiscountsTotal += Number(transactionRec.getSublistValue("item", "amount", i));
            } else {
              discountsTotal += Number(transactionRec.getSublistValue("item", "amount", i));
            }
          } else {
            if(itemDisplay == 'Partner Discount') {
              psPartnerDiscountsTotal += Number(transactionRec.getSublistValue("item", "amount", i));
            } else {
              psDiscountsTotal += Number(transactionRec.getSublistValue("item", "amount", i));
            }
          }
        }
      }
    }

     // remove bundled items
     linesToRemove
     .sort(function (a, b) {
       return Number(a) - Number(b);
     })
     .reverse();

    log.debug({
      title: "linesToRemove",
      details: JSON.stringify(linesToRemove),
    });
    linesToRemove.forEach(function (index) {
      transactionRec.removeLine({
        sublistId: "item",
        line: index,
      });
    });

    if(psServicesTotal > 0) {
      createELALine(transactionRec,
        7641, //uat 7618, 
        "custbody_r7_ela_ps_summary", 
        psServicesTotal, 
        null,
        null, 
        psCustcolr7onepriceterm, 
        psLocation, 
        psDepartment,
        (psTaxTotal / servicesTotal) * 100, 
        psTaxTotal, 
        psDiscountsTotal, 
        psPartnerDiscountsTotal);
    }

    createELALine(transactionRec,
      7640, //uat 7619
      "custbody_r7_ela_summary", 
      servicesTotal, 
      custcolr7startdate,
      custcolr7enddate, 
      custcolr7onepriceterm, 
      location, 
      department, 
      (taxTotal / servicesTotal) * 100,
      taxTotal, 
      discountsTotal, 
      partnerDiscountsTotal);

    return transactionRec
  } 

  function createELALine(transactionRec, itemId, elaSummaryFieldId, servicesTotal, custcolr7startdate, custcolr7enddate, custcolr7onepriceterm, location, department, taxTotalPercentage, taxTotal, discountsTotal, partnerDiscountsTotal) {
    var elaLineProperties = {
      item: itemId, // ELA item id
      price: "-1",
      amount: servicesTotal,
      custcolr7startdate: custcolr7startdate,
      custcolr7enddate: custcolr7enddate,
      custcolr7onepriceterm: custcolr7onepriceterm,
      location: location,
      department: department,
      tax1amt: taxTotal,
      taxrate1: null,
      custcolr7inlinediscount: discountsTotal,
      custcolr7inlinepartnerdiscount: partnerDiscountsTotal
    };

    var itemRec = record.load({type:'serviceitem', id:itemId});
    elaLineProperties["item_display"] = itemRec.getValue('itemid');

    transactionRec.insertLine({
      sublistId: "item",
      line: 0,
    });
    setAllItemProps(
      transactionRec,
      elaLineProperties,
      true
    );
    transactionRec.commitLine({
      sublistId: "item",
    });

    //update description after sourcing from item
    transactionRec.selectLine({
      sublistId: "item",
      line: 0
    });

    var currDescription = transactionRec.getCurrentSublistValue({
      sublistId: "item",
      fieldId: "description"
    });
    transactionRec.setCurrentSublistValue({
      sublistId: "item",
      fieldId: "description",
      value: currDescription + "\n\r" + transactionRec.getValue(elaSummaryFieldId) + "\n\r\n\r"
    });
    transactionRec.commitLine({
      sublistId: "item",
    });

    const overallDiscountTotal = discountsTotal + (transactionRec.type != 'estimate' ? partnerDiscountsTotal : 0);
    if(overallDiscountTotal != 0) {
      transactionRec.insertLine({
        sublistId: "item",
        line: 1,
      });
      setAllItemProps(
        transactionRec,
        {
          item: 51, // Discount Item Id
          price: "-1",
          amount: overallDiscountTotal,
          custcolr7startdate: custcolr7startdate,
          custcolr7enddate: custcolr7enddate,
          custcolr7onepriceterm: custcolr7onepriceterm,
          location: location,
          department: department,
          taxrate1: transactionRec.type == 'estimate' ? 0 : taxTotalPercentage,
        },
        true
      );
      transactionRec.commitLine({
        sublistId: "item",
      });
    }

    if(transactionRec.type == 'estimate' &&  partnerDiscountsTotal != 0) {
      const insertLine = overallDiscountTotal != 0 ? 2 : 1
      transactionRec.insertLine({
        sublistId: "item",
        line: insertLine,
      });
      setAllItemProps(
        transactionRec,
        {
          item: -2, // Subtotal
          location: location,
        },
        true
      );
      transactionRec.commitLine({
        sublistId: "item",
      });

      transactionRec.insertLine({
        sublistId: "item",
        line: insertLine + 1,
      });
      setAllItemProps(
        transactionRec,
        {
          item: -6, // Partner Discount Item Id
          price: "-1",
          amount: partnerDiscountsTotal,
          custcolr7startdate: custcolr7startdate,
          custcolr7enddate: custcolr7enddate,
          custcolr7onepriceterm: custcolr7onepriceterm,
          location: location,
          department: department,
          taxrate1: 0,
        },
        true
      );
      transactionRec.commitLine({
        sublistId: "item",
      });
    }

  }

  function getPackagedRecord(transactionId) {
    interimPackages = getInterimPackageIds();
    try {
      var transactionRec = getTransactionType(transactionId);

      var isELAInvoice = transactionRec.getValue("custbody_r7_ela_invoice");
      if(isELAInvoice) {
        return transformELAInvoice(transactionRec);
      }

      var packageArr = [];
      var lineIndexesToRemove = [];

      // gather info about packaged items
      var itemCount = transactionRec.getLineCount({
        sublistId: "item",
      });

      for (var i = 0; i < itemCount; i++) {
        // recognize package items by a link to ... package item in the corresponding column
        var packageItemId = getItemSublistValue(
          transactionRec,
          "custcol_r7_pck_package_item",
          i
        );
        log.debug({
          title: "packageItemId",
          details: packageItemId,
        });
        if (!isNullOrEmpty(packageItemId)) {
          var currentPackage = createOrFindPackageObject(
            packageArr,
            packageItemId
          );

          var itemObj = getItemDetails(transactionRec, i);
          // distinguish between services and prorate items:
          // prorate items will have package item, but no package license attached:
          if (!isNullOrEmpty(itemObj["custcol_r7_pck_package_license"])) {
            //logic added for ISP packages that don't appear on generated docs
            //because they're included in CRC package, so not shown on seperate line.
            currentPackage.serviceItems.push(itemObj);
            // handle discounts (search for 3 lines after service items for discounts)
            for (var j = i + 1; j <= i + 4; j++) {
              var itemId = getItemSublistValue(transactionRec, "item", j);
              // if we reach other type of item,
              log.debug({
                title: "itemId",
                details: itemId,
              });
              if (
                itemId != "51" &&
                itemId != "-6" &&
                itemId != "48" &&
                itemId != "-2"
              ) {
                break;
              }

              if (itemId == "51") {
                log.debug("discount!");
                var discountObj = getItemDetails(transactionRec, j);
                log.debug({
                  title: "discountItems",
                  details: JSON.stringify(currentPackage.discountItems),
                });
                if (interimPackages.indexOf(currentPackage.id) == -1) {
                  currentPackage.discountItems.push(discountObj);
                  lineIndexesToRemove.push(j);
                  currentPackage.deletedItems++;
                }
              } else if (itemId == "-6") {
                log.debug("partnerDiscount!");
                var partnerDiscountObj = getItemDetails(transactionRec, j);
                log.debug({
                  title: "partnerDiscountItems",
                  details: JSON.stringify(currentPackage.partnerDiscountItems),
                });
                if (interimPackages.indexOf(currentPackage.id) == -1) {
                  currentPackage.partnerDiscountItems.push(partnerDiscountObj);
                  lineIndexesToRemove.push(j);
                  currentPackage.deletedItems++;
                }
              } else if (itemId == "48") {
                log.debug("promotionAmount!");
                var promotionAmtDiscountObj = getItemDetails(transactionRec, j);
                log.debug({
                  title: "promotionAmtItems",
                  details: JSON.stringify(currentPackage.promotionAmtItems),
                });
                if (interimPackages.indexOf(currentPackage.id) == -1) {
                  currentPackage.promotionAmtItems.push(promotionAmtDiscountObj);
                  lineIndexesToRemove.push(j);
                  currentPackage.deletedItems++;
                }
              } else if (itemId == "-2" && isHiddenItem(packageItemId)) {
                var lineItemObj = getItemDetails(transactionRec, j);
                currentPackage.discountItems.push(lineItemObj);
                lineIndexesToRemove.push(j);
                currentPackage.deletedItems++;
              }
            }
          } else {
            currentPackage.prorateItems.push(itemObj);
          }

          // package items to be removed from the record later
          lineIndexesToRemove.push(i);
          currentPackage.deletedItems++;
        }
      }

      // create a package item for each type of items included in the package
      packageArr.forEach(function (packageObj) {
        if (packageObj.serviceItems.length !== 0) {
          packageObj.packageServiceItem = {
            insertIndex: Number(packageObj.serviceItems[0].line),
          };
        }
        if (packageObj.discountItems.length !== 0) {
          discountItems = packageObj.discountItems.length - 1;
          packageObj.packageDiscountItem = {
            insertIndex: Number(packageObj.discountItems[0].line),
          };
        }
        if (packageObj.partnerDiscountItems.length !== 0) {
          packageObj.packagePartnerDiscountItem = {
            insertIndex: Number(packageObj.partnerDiscountItems[0].line),
          };
        }
        if (packageObj.promotionAmtItems.length !== 0) {
          packageObj.packagePromoAmountItem = {
            insertIndex: Number(packageObj.promotionAmtItems[0].line),
          };
        }
        if (packageObj.prorateItems.length !== 0) {
          packageObj.packageProrateItem = {
            insertIndex: Number(packageObj.prorateItems[0].line),
          };
        }
      });

      // modify transaction according to gathered package info
      packageArr.forEach(function (packageObj, packageIndex) {
        // initiate new service item properties
        if (packageObj.serviceItems.length !== 0) {
          var packageServiceItemProps = {
            item: packageObj.id,
            price: "-1",
            amount: 0,
            custcolr7inlinediscount: 0,
            custcolr7inlinepartnerdiscount: 0,
            custcolr7_promo_amount: 0,
          };
          var packageTaxableAmount = 0;
          var fairValueInfo = "";
          
          // summarize amounts and discounts of packaged items
          packageObj.serviceItems.forEach(function (item) {
            packageServiceItemProps.amount += Number(item.amount);
            packageServiceItemProps.custcolr7inlinediscount += Number(
              item.custcolr7inlinediscount
            );
            packageServiceItemProps.custcolr7inlinepartnerdiscount += Number(
              item.custcolr7inlinepartnerdiscount
            );
            packageServiceItemProps.custcolr7_promo_amount += Number(
              item.custcolr7_promo_amount
            );

            if(item.custcol_crc_fair_value_calculation){
              fairValueInfo += " " + item.custcol_crc_fair_value_calculation;
            }
            if(item.custcol_mdrp_fair_value_calculation){
              fairValueInfo += " " + item.custcol_mdrp_fair_value_calculation;
            }

            packageTaxableAmount +=
              (Number(item.amount) * parseFloat(item.taxrate1)) / 100;
          });
          log.debug({
            title: "packageTaxableAmount",
            details: JSON.stringify(packageTaxableAmount),
          });
          log.debug({
            title: "(packageTaxableAmount / packageServiceItemProps.amount)",
            details: JSON.stringify(
              (packageTaxableAmount / packageServiceItemProps.amount) * 100
            ),
          });
          var packageServiceTaxrate1 =
            (packageTaxableAmount / packageServiceItemProps.amount) * 100;

          packageServiceItemProps.quantity =
            packageObj.serviceItems[0].quantity;
          packageServiceItemProps.rate =
            packageServiceItemProps.amount / packageServiceItemProps.quantity;
          packageServiceItemProps.taxrate1 =
            getCorrectPercentFloatingPointValue(packageServiceTaxrate1);
          packageServiceItemProps.location =
            packageObj.serviceItems[0].location;
          packageServiceItemProps.department =
            packageObj.serviceItems[0].department;
          packageServiceItemProps.custcolr7startdate =
            packageObj.serviceItems[0].custcolr7startdate;
          packageServiceItemProps.custcolr7enddate =
            packageObj.serviceItems[0].custcolr7enddate;
          packageServiceItemProps.custcolr7totalownership =
            packageObj.serviceItems[0].custcolr7totalownership;
          packageServiceItemProps.custcolr7onepriceterm =
            packageObj.serviceItems[0].custcolr7onepriceterm;
          packageServiceItemProps.custcol_r7_pck_package_level =
            packageObj.serviceItems[0].custcol_r7_pck_package_level;
          packageServiceItemProps.custcol_r7_pck_package_item =
            packageObj.serviceItems[0].custcol_r7_pck_package_item;
          packageServiceItemProps.custcol_r7_pck_package_license =
            packageObj.serviceItems[0].custcol_r7_pck_package_license;
          packageServiceItemProps.custcolr7onepriceinvoicedisplay =
            packageObj.serviceItems[0].custcolr7onepriceinvoicedisplay;
          packageServiceItemProps.custcolr7itemqtyunit =
            packageObj.serviceItems[0].custcolr7itemqtyunit;
          packageServiceItemProps.description = getPackageLevelDescription(
            packageServiceItemProps.custcol_r7_pck_package_level
          )  + fairValueInfo;
          packageObj.packageServiceItem.properties = packageServiceItemProps;
        }
        // discounts
        if (
          packageObj.discountItems.length !== 0 &&
          interimPackages.indexOf(packageObj.id) == -1
        ) {
          var packageDiscountItemProps = {
            item: "51",
            price: "-1",
            amount: 0,
          };
          packageObj.discountItems.forEach(function (item) {
            packageDiscountItemProps.amount += Number(item.amount);
          });
          packageDiscountItemProps.location =
            packageObj.discountItems[0].location;
          packageDiscountItemProps.department =
            packageObj.discountItems[0].department;
          packageObj.packageDiscountItem.properties = packageDiscountItemProps;
        }

        // partner discounts
        if (
          packageObj.partnerDiscountItems.length !== 0 &&
          interimPackages.indexOf(packageObj.id) == -1
        ) {
          var packagePartnerDiscountItemProps = {
            item: "-6",
            price: "-1",
            amount: 0,
          };
          packageObj.partnerDiscountItems.forEach(function (item) {
            packagePartnerDiscountItemProps.amount += Number(item.amount);
          });
          packagePartnerDiscountItemProps.location =
            packageObj.partnerDiscountItems[0].location;
          packagePartnerDiscountItemProps.department =
            packageObj.partnerDiscountItems[0].department;
          packageObj.packagePartnerDiscountItem.properties =
            packagePartnerDiscountItemProps;
        }

        // promo amounts
        if (
          packageObj.promotionAmtItems.length !== 0 &&
          interimPackages.indexOf(packageObj.id) == -1
        ) {
          log.debug({
            title: "processing promotionAmtItems",
            details: JSON.stringify(packageObj.promotionAmtItems),
          });
          var packagePromoAmountItemProps = {
            item: "48",
            price: "-1",
            amount: 0,
          };
          packageObj.promotionAmtItems.forEach(function (item) {
            packagePromoAmountItemProps.amount += Number(item.amount);
          });
          packagePromoAmountItemProps.location =
            packageObj.promotionAmtItems[0].location;
          packagePromoAmountItemProps.department =
            packageObj.promotionAmtItems[0].department;
          packageObj.packagePromoAmountItem.properties =
            packagePromoAmountItemProps;
        }

        // prorate items
        if (
          packageObj.prorateItems.length !== 0 &&
          interimPackages.indexOf(packageObj.id) == -1
        ) {
          var packageProrateItemProps = {
            item: 7523, // hard code to SUB-PRORATE item
            price: "-1",
            amount: 0,
          };
          var packageProrateTaxableAmount = 0;
          packageObj.prorateItems.forEach(function (item) {
            packageProrateItemProps.amount += Number(item.amount);
            packageProrateTaxableAmount +=
              (Number(item.amount) * parseFloat(item.taxrate1)) / 100;
          });
          var packageProrateTaxrate1 =
            (packageProrateTaxableAmount / packageProrateItemProps.amount) *
            100;
          log.debug("packageProrateTaxableAmount", packageProrateTaxableAmount);
          log.debug(
            "packageProrateItemProps.amount",
            packageProrateItemProps.amount
          );
          log.debug("packageProrateTaxrate1", packageProrateTaxrate1);
          packageProrateItemProps.taxrate1 =
            getCorrectPercentFloatingPointValue(packageProrateTaxrate1);
          packageProrateItemProps.custcolr7startdate =
            packageObj.prorateItems[0].custcolr7startdate;
          packageProrateItemProps.custcolr7enddate =
            packageObj.prorateItems[0].custcolr7enddate;
          packageProrateItemProps.custcolr7onepriceterm =
            packageObj.prorateItems[0].custcolr7onepriceterm;
          packageProrateItemProps.location =
            packageObj.prorateItems[0].location;
          packageProrateItemProps.department =
            packageObj.prorateItems[0].department;

          packageObj.packageProrateItem.properties = packageProrateItemProps;
        }
      });

      log.debug({
        title: "packageArr",
        details: JSON.stringify(packageArr),
      });

      // remove bundled items
      lineIndexesToRemove
        .sort(function (a, b) {
          return Number(a) - Number(b);
        })
        .reverse();

      log.debug({
        title: "lineIndexesToRemove",
        details: JSON.stringify(lineIndexesToRemove),
      });
      lineIndexesToRemove.forEach(function (index) {
        log.debug({
          title: "index to remove",
          details: index,
        });
        transactionRec.removeLine({
          sublistId: "item",
          line: index,
        });
      });

      var hasInterimPackage = false;
      packageArr.forEach(function (packageObj) {
        if (interimPackages.indexOf(packageObj.id) != -1) {
          hasInterimPackage = true;
        }

        //log.debug("package lines", packageObj.packageServiceItem.insertIndex);
      });
      if (hasInterimPackage) {
        var itemCount = transactionRec.getLineCount({
          sublistId: "item",
        });
        var count = 0;
        log.debug(itemCount);
        for (var i = 0; i < itemCount; i++) {
          var itemId = getItemSublistValue(transactionRec, "item", i);
          if (itemId == "-2") {
            var line = getItemSublistValue(transactionRec, "line", i);
            log.debug("lines", line);
          }
        }
      }
      log.debug("transactionrec", JSON.stringify(transactionRec));

      var index = getFirstInsertIndex(packageArr);
      var firstIndex = index;

      var linesAdded = 0;
      var linesDeleted = 0;
      //split record creation for interim vs 1price packages
      packageArr.forEach(function (packageObj, i) {
        if (!isHiddenItem(packageObj.id)) {
          if (!isNullOrEmpty(packageObj.packageServiceItem)) {
            if (packageObj.packageServiceItem.insertIndex > firstIndex) {
              index = packageObj.packageServiceItem.insertIndex - linesDeleted + linesAdded;
            } else {
              index = 0;
            }
            log.debug("curr index: " + index);
            transactionRec.insertLine({
              sublistId: "item",
              line: index++,
            });
            linesAdded++;
            setAllItemProps(
              transactionRec,
              packageObj.packageServiceItem.properties,
              true,
              ["price"]
            );
            transactionRec.commitLine({
              sublistId: "item",
            });
          }
          if (
            !isNullOrEmpty(packageObj.packageDiscountItem)
          ) {
            transactionRec.insertLine({
              sublistId: "item",
              line: index++,
            });
            linesAdded++;
            setAllItemProps(
              transactionRec,
              packageObj.packageDiscountItem.properties,
              true
            );
            transactionRec.commitLine({
              sublistId: "item",
            });
          }
          if (
            !isNullOrEmpty(packageObj.packagePartnerDiscountItem)
          ) {
            transactionRec.insertLine({
              sublistId: "item",
              line: index++,
            });
            linesAdded++;
            setAllItemProps(
              transactionRec,
              packageObj.packagePartnerDiscountItem.properties,
              true
            );
            transactionRec.commitLine({
              sublistId: "item",
            });
          }
          if (
            !isNullOrEmpty(packageObj.packagePromoAmountItem)
          ) {
            transactionRec.insertLine({
              sublistId: "item",
              line: index++,
            });
            linesAdded++;
            setAllItemProps(
              transactionRec,
              packageObj.packagePromoAmountItem.properties,
              true
            );
            transactionRec.commitLine({
              sublistId: "item",
            });
          }
          if (
            !isNullOrEmpty(packageObj.packageProrateItem)
          ) {
            transactionRec.insertLine({
              sublistId: "item",
              line: index++,
            });
            linesAdded++;
            setAllItemProps(
              transactionRec,
              packageObj.packageProrateItem.properties,
              true,
              ["price"]
            );
            transactionRec.commitLine({
              sublistId: "item",
            });
          }
        }
        linesDeleted += packageArr[i].deletedItems;
      });

      var objSublist = transactionRec.getSublist({
        sublistId: "item",
      });
      var objColumn = objSublist.getColumn({
        fieldId: "taxrate1",
      });

      checkICONPro(transactionRec);
      checkSubtotals(transactionRec); //wrap & execute only if quote
      checkOldPriceRate(transactionRec); //set oldprice package rate to null
      hideNonPackageItems(transactionRec); //remove non-package items
      return transactionRec;
    } catch (er) {
      log.error({
        title: "error",
        details: JSON.stringify(er),
      });
    }
  }

  function isHiddenItem(packageItemId) {
    var hiddenSearch = search.create({
      type: 'customrecord_r7_trans_package_exception',
      columns: [{ name: 'custrecord_r7_hide_on_docs' }],
      filters: [
        ['custrecord_r7_hide_on_docs', search.Operator.IS, 'T'],
        'and',
        ['custrecord_r7_interim_package_item', search.Operator.ANYOF, packageItemId],
      ]
    });
    var hidden = false;
    hiddenSearch.run().each(function (result) {
      hidden = result.getValue({ name: 'custrecord_r7_hide_on_docs' });
      return true;
    });
    return hidden;
  }

  //finds the line index to insert the packageArr into. it's not always line 0..
  function getFirstInsertIndex(packageArr) {
    if (packageArr.length > 0) {
      packageArr.forEach(function (x) {
        log.debug('item', x);
      })
      //index 0 always includes the item to be inserted first
      const packageObj = packageArr[0];
      //it's not always the serviceItem that's inserted first; like in the case of upgrades and the sub-prorate
      const objItems = [
        "packageServiceItem",
        "packageDiscountItem",
        "packagePartnerDiscountItem",
        "packageProrateItem",
      ];
      var index = null;
      objItems.forEach(function (objItem) {
        if (!isNullOrEmpty(packageObj[objItem])) {
          var objItemIndex = packageObj[objItem].insertIndex;
          //set index if it's null, otherwise only change it if current insertIndex is less than it
          if (index == null || (index != null && objItemIndex < index)) {
            index = objItemIndex;
          }
        }
      });
      return index;
    }
  }

  function getTransactionType(transactionId) {
    var creditMemoLookup = search.lookupFields({
      type: search.Type.CREDIT_MEMO,
      id: transactionId,
      columns: ["type"],
    });
    var quoteLookup = search.lookupFields({
      type: search.Type.ESTIMATE,
      id: transactionId,
      columns: ["type"],
    });
    // if no types found assume invoice
    log.debug("transactionTypeLookup.type", !!creditMemoLookup.type);
    var transactionType;
    if (creditMemoLookup.type) {
      transactionType = record.Type.CREDIT_MEMO;
    } else if (quoteLookup.type) {
      transactionType = record.Type.ESTIMATE;
    } else {
      transactionType = record.Type.INVOICE;
    }
    return record.load({
      type: transactionType,
      id: transactionId,
      isDynamic: true,
    });
  }

  function getCorrectPercentFloatingPointValue(number) {
    var numberString = roundTwoDecimals(number).toFixed(2);
    var decimals = numberString.split(".")[1];
    return decimals
      ? decimals.lastIndexOf("0") == 1
        ? decimals.indexOf("0") == 0
          ? roundTwoDecimals(number).toFixed(0)
          : roundTwoDecimals(number).toFixed(1)
        : roundTwoDecimals(number).toFixed(2)
      : number;
  }

  function roundTwoDecimals(num) {
    return Math.round((Math.round(num * 1000) / 1000) * 100) / 100;
  }

  // helper to reduce typing ( record obj is non-extendable )
  function getItemSublistValue(rec, fieldId, line) {
    try {
      return rec.getSublistValue({
        sublistId: "item",
        fieldId: fieldId,
        line: line,
      });
    } catch (er) {
      if (er.name == "SSS_INVALID_SUBLIST_OPERATION") {
        return "";
      } else {
        throw er;
      }
    }
  }

  function getItemDetails(rec, line) {
    var detailsObj = {
      line: line,
    };
    NECESSARY_ITEM_DETAILS.forEach(function (fieldId) {
      detailsObj[fieldId] = getItemSublistValue(rec, fieldId, line);
    });
    return detailsObj;
  }

  function setAllItemProps(rec, propsObj, setItemId, exceptionsArr) {
    if (!exceptionsArr) {
      exceptionsArr = [];
    }
    Object.getOwnPropertyNames(propsObj).forEach(function (prop) {
      log.debug("logging prop", prop);
      if ((prop === "item" && setItemId) || prop !== "item") {
        if (exceptionsArr.indexOf(prop) === -1) {
          rec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: prop,
            value: propsObj[prop],
          });
        }
      }
    });
  }

  function createOrFindPackageObject(packageArr, packageItemId) {
    var currentPackage = packageArr.find(function (packageObj) {
      return packageObj.id === packageItemId;
    });
    if (isNullOrEmpty(currentPackage)) {
      currentPackage = {
        id: packageItemId,
        serviceItems: [],
        prorateItems: [],
        discountItems: [],
        partnerDiscountItems: [],
        promotionAmtItems: [],
        deletedItems: 0,
      };
      packageArr.push(currentPackage);
    }
    return currentPackage;
  }

  function getPackageLevelDescription(levelId) {
    if(isNullOrEmpty(levelId)){
      var packageLevelDescription = "";
    }else{
      var packageLevelDescription = search.lookupFields({
        type: "customrecord_r7_pck_level",
        id: levelId,
        columns: ["custrecord_r7_pl_invoice_description"],
      }).custrecord_r7_pl_invoice_description;
    }
    return packageLevelDescription;
  }

  // function to evaluate if the parameter given is empty
  function isNullOrEmpty(value) {
    if (
      value === "" ||
      value === " " ||
      value === null ||
      value === undefined
    ) {
      return true;
    } else {
      return false;
    }
  }

  // if ICN-PRO-SUB, then revert qty & rate back to be 1 to match SF quote.
  // on SO, if new sale/renewal, qty = 99,999. Invoice should show 1.
  // Rate should be updated to match.
  function checkICONPro(transactionRec) {
    log.debug("Checking for ICN-PRO-SUB");
    var icnProLine = transactionRec.findSublistLineWithValue({
      sublistId: "item",
      fieldId: "item",
      value: 7557,
    });
    log.debug("icnProLine", icnProLine);
    if (icnProLine !== -1) {
      transactionRec.selectLine({
        sublistId: "item",
        line: icnProLine,
      });
      var newRate = transactionRec.getCurrentSublistValue({
        sublistId: "item",
        fieldId: "amount",
      });
      transactionRec.setCurrentSublistValue({
        sublistId: "item",
        fieldId: "quantity",
        value: "1",
      });
      transactionRec.setCurrentSublistValue({
        sublistId: "item",
        fieldId: "rate",
        value: newRate,
      });
      transactionRec.commitLine({
        sublistId: "item",
      });
    }
  }

  function checkSubtotals(transactionRec) {
    log.debug("checking subtotals");
    //remove any subtotal lines that are zero dollar
    var sublistLen = transactionRec.getLineCount({
      sublistId: 'item'
    });
    if(sublistLen == 0) {
      return;
    }
    //var lastIndex = Number(sublistLen)-1;
    var currentIndex = 0;
    while (currentIndex != transactionRec.getLineCount('item') - 1) {
      log.debug("currentIndex", currentIndex);
      //check for subtotal line
      var thisItemType = transactionRec.getSublistValue({
        sublistId: 'item',
        fieldId: 'itemtype',
        line: currentIndex
      });
      log.debug("thisItemType", thisItemType);
      if (thisItemType == 'Subtotal') {
        //if this line has 0.00 amount, then remove
        var thisLineAmount = transactionRec.getSublistValue({
          sublistId: 'item',
          fieldId: 'amount',
          line: currentIndex
        });
        log.debug("CheckSubtotal thisLineAmount", thisLineAmount);
        if (thisLineAmount == 0) {
          log.debug("removing subtotal line with index", currentIndex);
          transactionRec.removeLine({
            sublistId: "item",
            line: currentIndex,
          });
        } else {
          //check next line, if discount, then do not show this subtotal line
          var nextIndex = currentIndex + 1;
          var nextLineItemType = transactionRec.getSublistValue({
            sublistId: 'item',
            fieldId: 'itemtype',
            line: nextIndex
          });
          log.debug("nextLineItemType", nextLineItemType);
          if (nextLineItemType != "Discount") {
            transactionRec.selectLine({
              sublistId: 'item',
              line: currentIndex
            });
            transactionRec.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'custcol_r7_show_subtotal',
              value: true
            });
            transactionRec.commitLine({
              sublistId: 'item',
              ignoreRecalc: true
            });
          }
          currentIndex++;
        }
      } else {
        currentIndex++;
      }
    }
  }

  //The rate value for oldPrice packages needs to be hidden. The amount is slightly incorrect
  //and causing customer questions. Hiding it from the 
  function checkOldPriceRate(transactionRec) {
    log.debug("checking old price package rates");
    for (var currentIndex = 0; transactionRec.getLineCount("item") > currentIndex; currentIndex++) {

      //Get oneItemFlow and Package Level values
      var isOnePrice = transactionRec.getSublistValue({
        sublistId: "item",
        fieldId: "custcolr7_one_item_flow",
        line: currentIndex,
      });
      var isAPackage = transactionRec.getSublistValue({
        sublistId: "item",
        fieldId: "custcol_r7_pck_package_level",
        line: currentIndex,
      });

      //SKIP if OneItemFlow has a value, or Package Level is empty
      if (isOnePrice || !isAPackage) continue;

      //If SKIP didn't trigger, set rate to 0
      //Unsure why, but you NEED to get amount and set it, otherwise it'll be 0 too
      transactionRec.selectLine({
        sublistId: 'item',
        line: currentIndex
      });
      transactionRec.setCurrentSublistValue({
        sublistId: "item",
        fieldId: "price_display",
        value: "Custom",
      });
      transactionRec.setCurrentSublistValue({
        sublistId: "item",
        fieldId: "rate",
        value: null
      });
      var lineAmount = transactionRec.getSublistValue({
        sublistId: "item",
        fieldId: "amount",
        line: currentIndex,
      });
      transactionRec.setCurrentSublistValue({
        sublistId: "item",
        fieldId: "amount",
        value: lineAmount
      });
      transactionRec.commitLine({
        sublistId: 'item',
        ignoreRecalc: true
      });
    }
  }

  //hide any items that are flagged to be hidden
  function hideNonPackageItems(transactionRec){
     //get the total items
     var itemCount = transactionRec.getLineCount({
      sublistId: "item",
    });

    for (var i = 0; i < itemCount; i++) {
      var itemId = getItemSublistValue(transactionRec,"item",i);
      if(itemId && isHiddenItem(itemId)){
        transactionRec.removeLine({
          sublistId: 'item',
          line: i
        });
      }
    }
  }

  function renderQuote(quoteRec) {
    const form = quoteRec.getValue({
      fieldId: 'customform' 
    });
    
    var rendererTemplate;
    switch(form){
        case "135":
            rendererTemplate = "CUSTTMPL_R7QUOTE_NO_EULA";
            break;
        case "106":
            rendererTemplate = "CUSTTMPL_R7QUOTE_RENEWAL";
            break;
        case "174":
            rendererTemplate = "CUSTTMPL_R7QUOTE_RENEWAL_NOTC";
            break;
        default:
            rendererTemplate = 'CUSTTMPL_111_663271_SB5_649';
    }
    var renderer = render.create();
    renderer.setTemplateByScriptId({
        scriptId: rendererTemplate
    });
    renderer.addRecord({
        templateName: 'record',
        record: quoteRec,
    });

    return renderer;
  }

  return {
    getPackagedRecord: getPackagedRecord,
    renderQuote: renderQuote
  };
});
