/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime', 'N/task'],
  function(search, record, log, runtime, task) {

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

    function execute() {
      var serviceOrderSearch = search.create({
        type: 'customrecord_cmms_equipment_service',
        filters: [
          ['isinactive', 'is', 'F'],
          'and',
          ['custrecord_central_inspection_technician', 'anyof', '@NONE@'],
          'and',
          ['custrecord_ductless_inspection_technicia', 'anyof', '@NONE@'],
          'and',
          ['custrecord_installation_technician', 'anyof', '@NONE@'],
          'and',
          ['custrecord_panel_upgrade_technician', 'anyof', '@NONE@']
        ],
        columns: [
          'internalid',
          'custrecord_cmms_eqsrv_srvc',
          'custrecord_central_inspection_technician',
          'custrecord_ductless_inspection_technicia',
          'custrecord_installation_technician',
          'custrecord_panel_upgrade_technician'
        ]
      });

      var pagedResults = serviceOrderSearch.runPaged({ pageSize: 100 });

      for (var p = 0; p < pagedResults.pageRanges.length; p += 1) {
        var page = pagedResults.fetch({ index: p });

        for (var r = 0; r < page.data.length; r += 1) {
          if (isUsageLow()) {
            rescheduleScript();
            return;
          }

          var result = page.data[r];
          var serviceOrderId = result.getValue({ name: 'internalid' });
          var serviceType = parseInt(result.getValue({ name: 'custrecord_cmms_eqsrv_srvc' }), 10);
          var matchedGroup = getMatchedGroup(serviceType);

          if (!matchedGroup) {
            continue;
          }

          var latestTechId = getLatestTripTech(serviceOrderId);
          if (!latestTechId) {
            continue;
          }

          var currentTechId = result.getValue({ name: matchedGroup.fieldId });
          if (String(currentTechId || '') === String(latestTechId)) {
            continue;
          }

          try {
            var values = {};
            values[matchedGroup.fieldId] = latestTechId;

            record.submitFields({
              type: 'customrecord_cmms_equipment_service',
              id: serviceOrderId,
              values: values,
              options: {
                enableSourcing: true,
                ignoreMandatoryFields: true
              }
            });

            log.audit('Stamped technician', {
              serviceOrderId: serviceOrderId,
              serviceType: serviceType,
              fieldUpdated: matchedGroup.fieldId,
              fieldLabel: matchedGroup.label,
              technician: latestTechId
            });
          } catch (e) {
            log.error('Error updating Service Order', {
              serviceOrderId: serviceOrderId,
              message: e.message,
              stack: e.stack
            });
          }
        }
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
          ['isinactive', 'is', 'F'],
          'and',
          ['custrecord_cmms_techtimealloc_tech', 'noneof', '@NONE@']
        ],
        columns: [
          search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
          'custrecord_cmms_techtimealloc_tech'
        ]
      });

      var latestTechId = null;
      tripSearch.run().each(function(tripResult) {
        latestTechId = tripResult.getValue({ name: 'custrecord_cmms_techtimealloc_tech' });
        return false;
      });

      return latestTechId;
    }

    function isUsageLow() {
      return runtime.getCurrentScript().getRemainingUsage() < 200;
    }

    function rescheduleScript() {
      var scriptId = runtime.getCurrentScript().id;
      var deploymentId = runtime.getCurrentScript().deploymentId;

      try {
        task.create({
          taskType: task.TaskType.SCHEDULED_SCRIPT,
          scriptId: scriptId,
          deploymentId: deploymentId
        }).submit();

        log.audit('Rescheduling script', {
          scriptId: scriptId,
          deploymentId: deploymentId
        });
      } catch (e) {
        log.error('Failed to reschedule script', {
          message: e.message,
          stack: e.stack
        });
      }
    }

    return {
      execute: execute
    };
  });
