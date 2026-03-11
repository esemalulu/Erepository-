/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log'], function(record, log) {

  function afterSubmit(context) {
    if (context.type !== context.UserEventType.CREATE &&
        context.type !== context.UserEventType.EDIT) {
      return;
    }

    var allocRec     = context.newRecord;
    var techId       = allocRec.getValue({ fieldId: 'custrecord_cmms_techtimealloc_tech' });
    var serviceOrder = allocRec.getValue({ fieldId: 'custrecord_cmms_techtimealloc_srvc_order' });

    log.debug('Triggered', {
      techId: techId,
      serviceOrder: serviceOrder
    });

    if (!serviceOrder || !techId) {
      log.debug('Skipping', 'Missing Technician or Work Order');
      return;
    }

    try {
      var svcRec = record.load({
        type: 'customrecord_cmms_equipment_service',
        id: serviceOrder,
        isDynamic: false
      });

      var serviceTypeRaw = svcRec.getValue({ fieldId: 'custrecord_cmms_eqsrv_srvc' });
      var serviceType = parseInt(serviceTypeRaw, 10); // force to int

      log.debug('Loaded Work Order', {
        serviceTypeRaw: serviceTypeRaw,
        parsedServiceType: serviceType
      });

      if (!serviceType) {
        log.debug('No Service found on a Work Order. Skipping...');
        return;
      }

      var serviceGroups = [
        {
          ids: [815, 1860, 1911, 1916, 1919, 2052, 2053],
          fieldId: 'custrecord_central_inspection_technician',
          label: 'Central Inspection Tech'
        },
        {
          ids: [814, 1861, 1915, 1917, 1920],
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

      var matched = false;

      serviceGroups.forEach(function(group) {
        if (group.ids.indexOf(serviceType) !== -1) {
          svcRec.setValue({
            fieldId: group.fieldId,
            value: techId
          });
          matched = true;
          log.audit('Stamped Technician', {
            label: group.label,
            serviceOrder: serviceOrder,
            technician: techId,
            fieldUpdated: group.fieldId
          });
        }
      });

      if (matched) {
        svcRec.save({
          enableSourcing: true,
          ignoreMandatoryFields: true
        });
      } else {
        log.debug('No matching service group found for service type', serviceType);
      }

    } catch (e) {
      log.error('Error during technician stamping', e.toString());
    }
  }

  return {
    afterSubmit: afterSubmit
  };
});
