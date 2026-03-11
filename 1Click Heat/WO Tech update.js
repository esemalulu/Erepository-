/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime', 'N/task'],
  function(search, record, log, runtime, task) {

    function execute(context) {
      // 🔒 Kill switch
      var abort = runtime.getCurrentScript().getParameter({ name: 'custscript_abort_tech_script' });
      if (abort === 'T') {
        log.audit('Script Aborted by User', 'Execution was manually cancelled.');
        return;
      }

      var serviceGroups = [
        { ids: [815, 1860, 1911], fieldId: 'custrecord_central_inspection_technician', label: 'Central Inspection Tech' },
        { ids: [814, 1861, 1915], fieldId: 'custrecord_ductless_inspection_technicia', label: 'Ductless Inspection Tech' },
        { ids: [474], fieldId: 'custrecord_installation_technician', label: 'Installation Tech' },
        { ids: [1588], fieldId: 'custrecord_panel_upgrade_technician', label: 'Panel Upgrade Tech' }
      ];

      var lastProcessedId = runtime.getCurrentScript().getParameter({ name: 'custscript_last_processed_id' });
      var remainingUsageThreshold = 200;
      var lastProcessedThisRun = null;

      var filters = [];
      if (lastProcessedId) {
        filters.push(['internalidnumber', 'greaterthan', lastProcessedId]);
      }

      var serviceOrderSearch = search.create({
        type: 'customrecord_cmms_equipment_service',
        filters: filters,
        columns: [
          search.createColumn({ name: 'internalid', sort: search.Sort.ASC }),
          'custrecord_cmms_eqsrv_srvc'
        ]
      });

      var pagedResults = serviceOrderSearch.runPaged({ pageSize: 100 });

      for (var p = 0; p < pagedResults.pageRanges.length; p++) {
        var page = pagedResults.fetch({ index: p });

        for (var r = 0; r < page.data.length; r++) {
          if (runtime.getCurrentScript().getRemainingUsage() < remainingUsageThreshold) {
            rescheduleScript(lastProcessedThisRun);
            return;
          }

          var result = page.data[r];
          var serviceOrderId = result.getValue('internalid');
          lastProcessedThisRun = serviceOrderId;

          var serviceType = parseInt(result.getValue('custrecord_cmms_eqsrv_srvc'), 10);
          var matchedGroup = null;

          for (var i = 0; i < serviceGroups.length; i++) {
            if (serviceGroups[i].ids.indexOf(serviceType) !== -1) {
              matchedGroup = serviceGroups[i];
              break;
            }
          }

          if (!matchedGroup) continue;

          // Get latest Tech Trip
          var tripSearch = search.create({
            type: 'customrecord_cmms_tech_time_allocation',
            filters: [['custrecord_cmms_techtimealloc_srvc_order', 'anyof', serviceOrderId]],
            columns: [
              search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
              'custrecord_cmms_techtimealloc_tech'
            ]
          });

          var latestTechId = null;
          tripSearch.run().each(function(tripResult) {
            latestTechId = tripResult.getValue('custrecord_cmms_techtimealloc_tech');
            return false;
          });

          if (!latestTechId) continue;

// Skip inactive or invalid technicians (Employee or Vendor)
var techIsActive = true;
var techLoaded = false;

try {
  // Try to load as Employee
  var techRec = record.load({
    type: record.Type.EMPLOYEE,
    id: latestTechId,
    isDynamic: false
  });

  techLoaded = true;
  var isInactive = techRec.getValue({ fieldId: 'isinactive' }) === true;

  if (isInactive) {
    log.debug('Technician is inactive (Employee), skipping', 'Work Order#' + serviceOrderId + ' × Tech#' + latestTechId);
    techIsActive = false;
  }

} catch (e1) {
  // Try to load as Vendor
  try {
    var techRec = record.load({
      type: record.Type.VENDOR,
      id: latestTechId,
      isDynamic: false
    });

    techLoaded = true;
    var isInactive = techRec.getValue({ fieldId: 'isinactive' }) === true;

    if (isInactive) {
      log.debug('Technician is inactive (Vendor), skipping', 'Work Order#' + serviceOrderId + ' × Tech#' + latestTechId);
      techIsActive = false;
    }

  } catch (e2) {
    log.debug('Technician record could not be loaded as Employee or Vendor, skipping',
              'Work Order#' + serviceOrderId + ' × Tech#' + latestTechId);
    techIsActive = false;
  }
}

if (!techLoaded || !techIsActive) continue;


          try {
            var svcRec = record.load({
              type: 'customrecord_cmms_equipment_service',
              id: serviceOrderId,
              isDynamic: false
            });

            svcRec.setValue({
              fieldId: matchedGroup.fieldId,
              value: latestTechId
            });

            svcRec.save({
              enableSourcing: true,
              ignoreMandatoryFields: true
            });

            log.audit('Updated ' + matchedGroup.label,
              'Work Order#' + serviceOrderId + ' ← Tech#' + latestTechId);

          } catch (e) {
            // Silently skip project/resource-related issues
            if (e.name !== 'APPCANCEL' && e.name !== 'INVALID_FLD_VALUE') {
              log.error('Unexpected Save Error', 'Work Order#' + serviceOrderId + ': ' + e.toString());
            }
          }
        }
      }
    }

    function rescheduleScript(lastProcessedId) {
      try {
        task.create({
          taskType: task.TaskType.SCHEDULED_SCRIPT,
          scriptId: runtime.getCurrentScript().id,
          deploymentId: runtime.getCurrentScript().deploymentId,
          params: {
            custscript_last_processed_id: lastProcessedId
          }
        }).submit();

        log.audit('Rescheduling script...', 'Last processed ID: ' + lastProcessedId);
      } catch (e) {
        log.error('Reschedule Failed', e.toString());
      }
    }

    return {
      execute: execute
    };
  });
