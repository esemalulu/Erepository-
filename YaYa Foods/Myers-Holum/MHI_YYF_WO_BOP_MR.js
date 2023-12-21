/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define([
  'N/record',
  'N/search',
  'N/runtime',
  'N/encode',
  'N/format',
  'N/log',
  'N/render',
  'N/email',
  'N/file',
  'N/https'
], (record, search, runtime, encode, format, log, render, email, file, https) => {
  const currentScript = runtime.getCurrentScript();

  function getInputData() {
    const searchId = currentScript.getParameter({
      name: 'custscript_mhi_yyf_bop_search'
    });

    const manualTrigger = currentScript.getParameter({
      name: 'custscript_mhi_yyf_manual_trigger_mr'
    });

    const now = new Date(
      format.format({
        value: new Date(),
        type: format.Type.DATETIMETZ,
        timezone: format.Timezone.AMERICA_NEW_YORK
      })
    );
    const currentHour = now.getHours();
    const isAfterSixPm = currentHour >= 18;
    const sixAM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
    const six30AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
    const twelve30PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 30, 0);
    const onePM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0);
    const fivePM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
    const five30PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 30, 0);
    log.audit('now', now);

    log.audit('fivePM', fivePM);
    log.audit('five30PM', five30PM);

    const sixAMTrigger = now >= sixAM && now <= six30AM;
    const twelve30Trigger = now >= twelve30PM && now <= onePM;
    const fivePMTrigger = now >= fivePM && now <= five30PM;
    log.audit('sixAMTrigger', sixAMTrigger);
    log.audit('twelve30Trigger', twelve30Trigger);
    log.audit('fivePMTrigger', fivePMTrigger);

    if (!manualTrigger) {
      if (!sixAMTrigger && !twelve30Trigger && !fivePMTrigger) return [];
    }

    return search.load({
      id: searchId
    });
  }

  function map(context) {
    try {
      let monthEndInvoice = false;
      const assemblyBuildResult = JSON.parse(context.value);
      log.debug('assemblyBuildResult', assemblyBuildResult.values);
      const assemblyBuildId = assemblyBuildResult.values.internalid.value;
      const assemblyBuildRec = record.load({
        type: 'assemblybuild',
        id: assemblyBuildId
      });

      const assemblyItem = assemblyBuildRec.getValue('item');
      const itemSearch = search.lookupFields({
        type: 'item',
        id: assemblyItem,
        columns: ['custitem_mhi_yyf_bop_hold_time', 'cseg_yaya_tech']
      });
      /* const holdTime = itemSearch.custitem_mhi_yyf_bop_hold_time || 0;
      log.debug('holdTime', holdTime);

      const assemblyBuildDate = assemblyBuildRec.getValue('trandate');
      const daysDiff = getDaysDiff(currentDate, new Date(assemblyBuildDate));
      log.debug('daysDiff', daysDiff);

      if (daysDiff <= holdTime) return;
    */

      let currentDate = currentScript.getParameter({
        name: 'custscript_mhi_yyf_current_date'
      });
      if (!currentDate) {
        currentDate = new Date();
      }

      const varietyPack = currentScript.getParameter({
        name: 'custscript_mhi_yyf_variety_pack'
      });
      const rippleFoods = currentScript.getParameter({
        name: 'custscript_mhi_yyf_ripple_foods'
      });
      const woId = assemblyBuildRec.getValue('createdfrom');

      const woSearch = search.lookupFields({
        type: 'transaction',
        id: woId,
        columns: ['entity', 'built', 'quantity', 'trandate']
      });

      const customer = woSearch.entity[0] ? woSearch.entity[0].value : false;
      const woQty = woSearch.quantity;
      const assenblyTranDate = assemblyBuildRec.getValue('trandate');

      const itemTech = itemSearch.cseg_yaya_tech[0] ? itemSearch.cseg_yaya_tech[0].value : false;
      const location = assemblyBuildRec.getValue('location');

      // if (itemTech != varietyPack && customer != rippleFoods) {
      if (itemTech != varietyPack) {
        // AutoInvoice
        const headerInvDetailRec = assemblyBuildRec.getSubrecord({ fieldId: 'inventorydetail' });
        const lotNum = headerInvDetailRec.getSublistValue({
          sublistId: 'inventoryassignment',
          fieldId: 'receiptinventorynumber',
          line: 0
        });
        log.debug('lotNum', lotNum);

        const lotId = getLotId(lotNum, location, assemblyItem);
        log.debug('lotId', lotId);

        const assemblyQty = assemblyBuildRec.getValue('quantity');
        const itemList = [
          { itemId: assemblyItem, itemQty: Number(assemblyQty), lotList: [{ lotId, assemblyQty }] }
        ];
        const invoiceId = createInvoice(customer, location, itemList, [woId], assenblyTranDate);

        /* const invoiceRec = record.create({
          type: 'invoice',
          isDynamic: true
        });
        invoiceRec.setValue('entity', customer);
        invoiceRec.setValue('location', location);
        invoiceRec.selectNewLine('item');
        invoiceRec.setCurrentSublistValue('item', 'item', assemblyItem);
        invoiceRec.setCurrentSublistValue('item', 'quantity', Number(assemblyQty));
        const unitCost = invoiceRec.getCurrentSublistValue('item', 'custcol_yaya_so_unitmatcost');

        invoiceRec.setCurrentSublistValue(
          'item',
          'custcol_yaya_so_totmatcost',
          Number(unitCost) * Number(assemblyQty)
        );
        const rate = invoiceRec.getCurrentSublistValue('item', 'rate');
        invoiceRec.setCurrentSublistValue('item', 'amount', Number(rate) * Number(assemblyQty));
        if (lotId) {
          const invDetailRec = invoiceRec.getCurrentSublistSubrecord({
            sublistId: 'item',
            fieldId: 'inventorydetail'
          });
          invDetailRec.selectNewLine('inventoryassignment');

          invDetailRec.setCurrentSublistValue('inventoryassignment', 'issueinventorynumber', lotId);
          invDetailRec.setCurrentSublistValue(
            'inventoryassignment',
            'quantity',
            Number(assemblyQty)
          );

          invDetailRec.commitLine('inventoryassignment');
        }

        invoiceRec.commitLine('item');
        invoiceRec.setValue('custbody_mhi_yyf_bop_wo', woId);

        const InvoiceId = invoiceRec.save({
          ignoreMandatoryFields: true
        }); */
        log.debug('InvoiceId', invoiceId);

        assemblyBuildRec.setValue('custbody_mhi_yyf_bop_invoice', invoiceId);
        assemblyBuildRec.save({
          ignoreMandatoryFields: true
        });
      } else {
        const isLastDay = isLastDayOfMonth(currentDate);
        log.debug('isLastDay', isLastDay);

        if (isLastDay) {
          monthEndInvoice = true;
        } else {
          record.submitFields({
            type: 'workorder',
            id: woId,
            values: {
              custbody_mhi_yyf_wo_month_end_invoice: true
            },
            options: {
              ignoreMandatoryFields: true
            }
          });
        }
      }

      context.write({
        key: customer,
        value: { woId, assemblyItem, location, woQty }
      });
    } catch (e) {
      log.error('error', e);
    }
  }

  function getLotId(lotNum, location, item) {
    if (!lotNum) return false;
    const inventorynumberSearchObj = search.create({
      type: 'inventorynumber',
      filters: [
        ['location', 'anyof', location],
        'AND',
        ['item', 'anyof', item],
        'AND',
        ['inventorynumber', 'is', lotNum]
      ],
      columns: [
        search.createColumn({
          name: 'inventorynumber',
          sort: search.Sort.ASC
        }),
        'item',
        'memo',
        'expirationdate',
        'location',
        'quantityonhand',
        'quantityavailable',
        'quantityonorder',
        'isonhand',
        'quantityintransit',
        'datecreated',
        'custitemnumber_aln_country_of_origin',
        'custitemnumber_aln_heat_code',
        'custitemnumber_aln_manufactured_date',
        'custitemnumber_aln_supplier_lot_number',
        'internalid'
      ]
    });

    let lotId = false;
    inventorynumberSearchObj.run().each(result => {
      lotId = result.getValue('internalid');
      return true;
    });

    return lotId;
  }

  function isLastDayOfMonth(date) {
    const oneDayInMs = 1000 * 60 * 60 * 24;

    return new Date(date.getTime() + oneDayInMs).getDate() === 1;
  }

  function getDaysDiff(date1, date2) {
    const difference = date1.getTime() - date2.getTime();
    const totalDays = Math.ceil(difference / (1000 * 3600 * 24));
    return totalDays;
  }

  function getCustomerCurrency(customer) {
    const cuomsterSearch = search.lookupFields({
      type: 'customer',
      id: customer,
      columns: ['currency']
    });

    return cuomsterSearch.currency[0] ? cuomsterSearch.currency[0].value : false;
  }

  function createInvoice(customer, location, itemList, woIdList, assenblyTranDate) {
    const invoiceRec = record.create({
      type: 'invoice',
      isDynamic: true
    });

    invoiceRec.setValue('entity', customer);
    invoiceRec.setValue('location', location);

    /* if (assenblyTranDate) {
      invoiceRec.setValue('trandate', assenblyTranDate);
    } */

    const customerCurrency = getCustomerCurrency(customer);
    if (customerCurrency) {
      invoiceRec.setValue('currency', customerCurrency);
    }

    for (let i = 0; i < itemList.length; i += 1) {
      const { itemId, itemQty, lotList } = itemList[i];
      invoiceRec.selectNewLine('item');
      invoiceRec.setCurrentSublistValue('item', 'item', itemId);
      invoiceRec.setCurrentSublistValue('item', 'quantity', Number(itemQty));
      const unitMatCost = invoiceRec.getCurrentSublistValue('item', 'custcol_yaya_so_unitmatcost');
      const unitMatHandlingCost = invoiceRec.getCurrentSublistValue(
        'item',
        'custcol_yaya_so_unitmathandlingcost'
      );
      const unitCoPackCost = invoiceRec.getCurrentSublistValue(
        'item',
        'custcol_yaya_so_unitcopackprice'
      );

      log.debug('customerCurrency', customerCurrency);
      log.debug('unitCost', customerCurrency);

      invoiceRec.setCurrentSublistValue(
        'item',
        'custcol_yaya_so_totmatcost',
        Number(unitMatCost) * Number(itemQty)
      );

      invoiceRec.setCurrentSublistValue(
        'item',
        'custcol_yaya_so_totcopackprice',
        Number(unitCoPackCost) * Number(itemQty)
      );

      invoiceRec.setCurrentSublistValue(
        'item',
        'custcol_yaya_so_totmathandcost',
        Number(unitMatHandlingCost) * Number(itemQty)
      );
      const rate = invoiceRec.getCurrentSublistValue('item', 'rate');
      log.debug('rate', rate);

      invoiceRec.setCurrentSublistValue('item', 'amount', Number(rate) * Number(itemQty));

      if (lotList[0].lotId) {
        const invDetailRec = invoiceRec.getCurrentSublistSubrecord({
          sublistId: 'item',
          fieldId: 'inventorydetail'
        });

        for (let j = 0; j < lotList.length; j += 1) {
          const { lotId, qty } = lotList[j];

          if (lotId) {
            invDetailRec.selectNewLine('inventoryassignment');

            invDetailRec.setCurrentSublistValue(
              'inventoryassignment',
              'issueinventorynumber',
              lotId
            );
            invDetailRec.setCurrentSublistValue('inventoryassignment', 'quantity', Number(qty));

            invDetailRec.commitLine('inventoryassignment');
          }
        }
      }

      invoiceRec.commitLine('item');
    }

    invoiceRec.setValue('custbody_mhi_yyf_bop_wo', woIdList[0]);
    const invoiceId = invoiceRec.save({
      ignoreMandatoryFields: true
    });

    return invoiceId;
  }

  function getWOLotObj(woId) {
    const assemblybuildSearchObj = search.create({
      type: 'assemblybuild',
      filters: [
        ['type', 'anyof', 'Build'],
        'AND',
        ['mainline', 'is', 'T'],
        'AND',
        ['createdfrom', 'anyof', woId],
        'AND',
        ['custbody_mhi_yyf_bop_invoice', 'anyof', '@NONE@']
      ],
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'trandate' }),
        search.createColumn({ name: 'transactionnumber' }),
        search.createColumn({ name: 'quantity' }),
        search.createColumn({ name: 'item' }),
        search.createColumn({
          name: 'inventorynumber',
          join: 'inventoryDetail'
        })
      ]
    });

    // let qty = 0;
    const assemblyBuildList = [];
    const itemList = [];
    assemblybuildSearchObj.run().each(result => {
      const id = result.getValue('internalid');
      assemblyBuildList.push(id);
      const itemId = result.getValue('item');

      const qty = result.getValue('quantity');
      const lotId = result.getValue({
        name: 'inventorynumber',
        join: 'inventoryDetail'
      });

      const itemIndex = itemList.findIndex(line => line.itemId == itemId);

      if (itemIndex == -1) {
        itemList.push({ itemId, itemQty: Number(qty), lotList: [{ lotId, qty }] });
      } else {
        itemList[itemIndex].lotList.push({ lotId, qty });
        itemList[itemIndex].itemQty += Number(qty);
      }

      // qty += Number(assemblyQty);
      return true;
    });

    return { itemList, assemblyBuildList };
  }

  function reduce(context) {
    try {
      const customer = JSON.parse(context.key);
      const list = [];

      for (let k = 0; k < context.values.length; k += 1) {
        list.push(JSON.parse(context.values[k]));
      }

      const woIdList = [];
      const assemblyItemList = [];
      const woQtyObj = {};
      let invoiceLoaction = false;
      for (let i = 0; i < list.length; i += 1) {
        const { woId, assemblyItem, location, woQty } = list[i];
        woQtyObj[woId] = woQty;
        woIdList.push(woId);
        assemblyItemList.push(assemblyItem);
        invoiceLoaction = location;
      }

      let currentDate = currentScript.getParameter({
        name: 'custscript_mhi_yyf_current_date'
      });
      if (!currentDate) {
        currentDate = new Date();
      }

      const isLastDay = isLastDayOfMonth(currentDate);

      if (isLastDay) {
        // const customer = woRec.getValue('entity');
        const invoiceLotObj = getWOLotObj(woIdList);
        log.debug('invoiceLotObj', invoiceLotObj);
        const { itemList, assemblyBuildList } = invoiceLotObj;
        const invoiceId = createInvoice(customer, invoiceLoaction, itemList, woIdList);
        /* const invoiceRec = record.create({
          type: 'invoice',
          isDynamic: true
        });
        const customer = woRec.getValue('entity');
        const assemblyItem = woRec.getValue('assemblyitem');
        const location = woRec.getValue('location');

        invoiceRec.setValue('entity', customer);
        invoiceRec.setValue('location', location);

        const assemblybuildSearchObj = search.create({
          type: 'assemblybuild',
          filters: [
            ['type', 'anyof', 'Build'],
            'AND',
            ['mainline', 'is', 'T'],
            'AND',
            ['createdfrom', 'anyof', woId],
            'AND',
            ['custbody_mhi_yyf_bop_invoice', 'anyof', '@NONE@']
          ],
          columns: [
            search.createColumn({ name: 'internalid' }),
            search.createColumn({ name: 'trandate' }),
            search.createColumn({ name: 'transactionnumber' }),
            search.createColumn({ name: 'quantity' }),
            search.createColumn({ name: 'item' }),
            search.createColumn({
              name: 'inventorynumber',
              join: 'inventoryDetail'
            })
          ]
        });

        let qty = 0;
        const assemblyBuildList = [];
        // const lotList = [];
        assemblybuildSearchObj.run().each(result => {
          const id = result.getValue('internalid');
          assemblyBuildList.push(id);

          const assemblyQty = result.getValue('quantity');
          const lotId = result.getValue({
            name: 'inventorynumber',
            join: 'inventoryDetail'
          });

          lotList.push({ lotId, assemblyQty });
          qty += Number(assemblyQty);
          return true;
        });
        invoiceRec.selectNewLine('item');
        invoiceRec.setCurrentSublistValue('item', 'item', assemblyItem);
        invoiceRec.setCurrentSublistValue('item', 'quantity', Number(qty));
        const unitCost = invoiceRec.getCurrentSublistValue('item', 'custcol_yaya_so_unitmatcost');

        invoiceRec.setCurrentSublistValue(
          'item',
          'custcol_yaya_so_totmatcost',
          Number(unitCost) * Number(qty)
        );
        const rate = invoiceRec.getCurrentSublistValue('item', 'rate');
        invoiceRec.setCurrentSublistValue('item', 'amount', Number(rate) * Number(qty));
        const invDetailRec = invoiceRec.getCurrentSublistSubrecord({
          sublistId: 'item',
          fieldId: 'inventorydetail'
        });

        for (let j = 0; j < lotList.length; j += 1) {
          const { lotId, assemblyQty } = lotList[j];
          invDetailRec.selectNewLine('inventoryassignment');

          invDetailRec.setCurrentSublistValue('inventoryassignment', 'issueinventorynumber', lotId);
          invDetailRec.setCurrentSublistValue(
            'inventoryassignment',
            'quantity',
            Number(assemblyQty)
          );

          invDetailRec.commitLine('inventoryassignment');
        }

        invoiceRec.commitLine('item');
        invoiceRec.setValue('custbody_mhi_yyf_bop_wo', woId);
        const invoiceId = invoiceRec.save(); */

        for (let i = 0; i < assemblyBuildList.length; i += 1) {
          const assemblyBuildId = assemblyBuildList[i];
          record.submitFields({
            type: 'assemblybuild',
            id: assemblyBuildId,
            values: {
              custbody_mhi_yyf_bop_invoice: invoiceId
            },
            options: {
              ignoreMandatoryFields: true
            }
          });
        }
      }

      // Built Qty = WO Qty ?

      for (let j = 0; j < woIdList.length; j += 1) {
        const woId = woIdList[j];
        let builtQty = 0;

        const assemblybuildSearchObj = search.create({
          type: 'assemblybuild',
          filters: [
            ['type', 'anyof', 'Build'],
            'AND',
            ['createdfrom', 'anyof', woId],
            'AND',
            ['mainline', 'is', 'T'],
            'AND',
            ['custbody_mhi_yyf_bop_invoice', 'noneof', '@NONE@']
          ],
          columns: [
            search.createColumn({
              name: 'quantity',
              summary: 'SUM'
            })
          ]
        });

        assemblybuildSearchObj.run().each(result => {
          builtQty = result.getValue({
            name: 'quantity',
            summary: 'SUM'
          });
          return true;
        });

        const woQty = woQtyObj[woId];

        if (Number(woQty) == Number(builtQty)) {
          record.submitFields({
            type: 'workorder',
            id: woId,
            values: {
              custbody_mhi_yyf_wo_fully_invoiced: true
            },
            options: {
              ignoreMandatoryFields: true
            }
          });
        }
      }
    } catch (e) {
      log.error('Error', e);
    }
  }

  function summarize(summary) {}

  return {
    getInputData,
    map,
    reduce,
    summarize
  };
});
