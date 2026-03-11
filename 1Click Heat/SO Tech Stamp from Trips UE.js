/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime'], function(search, record, log, runtime) {

  var SERVICE_GROUPS = [
    {
      ids: [1911, 1919, 2052, 2053],
      fieldId: 'custrecord_central_inspection_technician',
      label: 'Central Inspection Tech'
    },
    {
      ids: [1915, 1917, 1920],
      fieldId: 'custrecord_ductless_inspection_technicia',
      label: 'Ductless Inspection Tech'
    },
    {
      ids: [474, 1912, 1921, 2054],
      fieldId: 'custrecord_installation_technician',
      label: 'Installation Tech'
    },
    {
      ids: [1588],
      fieldId: 'custrecord_panel_upgrade_technician',
      label: 'Panel Upgrade Tech'
    }
  ];

  function afterSubmit(context) {
    if (context.type !== context.UserEventType.CREATE &&
        context.type !== context.UserEventType.EDIT &&
        context.type !== context.UserEventType.XEDIT) {
      return;
    }

    var serviceOrderId = context.newRecord && context.newRecord.id;
    if (!serviceOrderId) {
      return;
    }

    try {
      var svcRec = record.load({
        type: 'customrecord_cmms_equipment_service',
        id: serviceOrderId,
        isDynamic: false
      });

      var serviceType = parseInt(svcRec.getValue({ fieldId: 'custrecord_cmms_eqsrv_srvc' }), 10);
      if (!serviceType) {
        log.debug('Skipping', {
          serviceOrderId: serviceOrderId,
          reason: 'Missing service type'
        });
        return;
      }

      var matchedGroup = getMatchedGroup(serviceType);
      if (!matchedGroup) {
        log.debug('Skipping', {
          serviceOrderId: serviceOrderId,
          reason: 'No matching service group',
          serviceType: serviceType
        });
        return;
      }

      var latestTechId = getLatestTripTech(serviceOrderId);
      if (!latestTechId) {
        log.debug('Skipping', {
          serviceOrderId: serviceOrderId,
          reason: 'No technician found on tech trips'
        });
        return;
      }

      var currentValue = svcRec.getValue({ fieldId: matchedGroup.fieldId });
      if (String(currentValue || '') === String(latestTechId)) {
        log.debug('No update needed', {
          serviceOrderId: serviceOrderId,
          fieldId: matchedGroup.fieldId,
          technician: latestTechId
        });
        return;
      }

      svcRec.setValue({
        fieldId: matchedGroup.fieldId,
        value: latestTechId
      });

      svcRec.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });

      log.audit('Stamped technician from latest trip', {
        serviceOrderId: serviceOrderId,
        serviceType: serviceType,
        executionContext: runtime.executionContext,
        eventType: context.type,
        fieldUpdated: matchedGroup.fieldId,
        fieldLabel: matchedGroup.label,
        technician: latestTechId
      });
    } catch (e) {
      log.error('Error stamping technician on Service Order', {
        serviceOrderId: serviceOrderId,
        message: e.message,
        stack: e.stack
      });
    }
  }

  function getMatchedGroup(serviceType) {
    for (var i = 0; i < SERVICE_GROUPS.length; i += 1) {
      if (SERVICE_GROUPS[i].ids.indexOf(serviceType) !== -1) {
        return SERVICE_GROUPS[i];
      }
    }
    return null;
  }

  function getLatestTripTech(serviceOrderId) {
    var tripSearch = search.create({
      type: 'customrecord_cmms_tech_time_allocation',
      filters: [
        ['custrecord_cmms_techtimealloc_srvc_order', 'anyof', serviceOrderId],
        'and',
        ['isinactive', 'is', 'F']
      ],
      columns: [
        search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
        'custrecord_cmms_techtimealloc_tech'
      ]
    });

    var latestTechId = null;
    tripSearch.run().each(function(result) {
      latestTechId = result.getValue({ name: 'custrecord_cmms_techtimealloc_tech' });
      return false;
    });

    return latestTechId;
  }

  return {
    afterSubmit: afterSubmit
  };
});
