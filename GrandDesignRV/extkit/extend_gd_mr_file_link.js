/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
 define([
  `N/search`, `N/runtime`, `N/config`, `N/task`, `N/record`
], (search, runtime, config, task, record) => {

  const CONSTANTS = {
    // searchPageSize: 10,
    searchPageSize: 1000,
    maxSearchPageCount: 10,

    scriptParam: {
      stateConfig: `custscript_ext_file_migrate_state`,
      filesSearchId: `custscript_ext_file_migrate_search_id`,
    },

    recordTypeFieldMap: {
      // transaction
      creditmemo: `custrecord_extfile_cred_memo_pref`,
      deposit: `custrecord_extfile_deposit_pref`,
      invoice: `custrecord_extfile_invoice_pref`,
      itemreceipt: `custrecord_extfile_gd_item_receipt`,
      journalentry: `custrecord_extfile_gd_journal`,
      purchaseorder: `custrecord_extfile_po_pref`,
      returnauthorization: `custrecord_extfile_ret_auth_pref`,

      // custom-record
      customrecordrvsclaim: `custrecord_pref_rvsclaim`,
      customrecordrvsclaimoperationline: `custrecord_pref_rvsclaimoperationline`,
      customrecordrvspreauthoperationline: `custrecord_pref_rvspreauthoperationline`,
      supportcase: `custrecord_extfile_case_pref`,
      customer: `custrecord_extfile_cust_pref`,
      customrecordgranddesignpartsinquiry: `custrecord_pref_granddesignpartsinquiry`,
      customrecordrvsproductchangenotice: `custrecord_pref_rvsproductchangenotice`,
      customrecordsrv_serviceworkorder: `custrecord_pref_srv_serviceworkorder`,
      customrecordrvsunit: `custrecord_pref_rvsunit`,
      vendor: `custrecord_extfile_vend_pref`,
      customrecordrvsvendorchargeback: `custrecord_pref_rvsvendorchargeback`,
    },

    // array of searches
    linkSearchRecordType: [
      `customrecordrvsclaimoperationline`,
      `customrecordrvspreauthoperationline`,
      `supportcase`,
      `customrecordrvsclaim`,
      `customer`,
      `customrecordgranddesignpartsinquiry`,
      `customrecordrvsproductchangenotice`,
      `customrecordsrv_serviceworkorder`,
      `customrecordrvsunit`,
      `vendor`,
      `customrecordrvsvendorchargeback`,
    ],

    filesReferenceField: {
      error: `custrecord_extend_files_upl_additio_info`,
    }
  };

  const getArrayChunk = (arr, chunkSize = 50) => {
    const arrChunk = [];

    for (let i = 0; i < arr.length; i += chunkSize) {
      arrChunk.push(arr.slice(i, i + chunkSize));
    }

    return arrChunk;
  }

  const getAllResults = searchObj => {
    log.debug({
      title: `getAll Results`,
      details: searchObj,
    });

    const pagesSearchObject = searchObj.runPaged({
      pageSize: 1000,
    });

    const searchResults = [];

    pagesSearchObject.pageRanges.some(pageRange => {
      const pageSearchResults = pagesSearchObject.fetch(pageRange);

      searchResults.push(...pageSearchResults.data);

      // return true;
    })

    log.debug({
      title: `getAll Results searchResults: ${searchResults.length}`,
      details: searchResults,
    });

    return searchResults;
  }

  class Config {
    static getConfig() {
      let stateConfig = runtime.getCurrentScript().getParameter({
        name: CONSTANTS.scriptParam.stateConfig,
      });

      if (!stateConfig) {
        stateConfig = {
          lastRunPageIndex: -1,
          maxSearchPages: CONSTANTS.maxSearchPageCount,
        };
      } else {
        stateConfig = JSON.parse(stateConfig);
      }

      return {
        ...stateConfig,
      };
    }

    /**
     *
     * @param {Object} stateConfig
     * @returns
     */
    static update(stateConfig) {
      const configRecord = config.load({
        type: config.Type.COMPANY_PREFERENCES
      });

      configRecord.setValue({
        fieldId: CONSTANTS.scriptParam.stateConfig,
        value: JSON.stringify(stateConfig),
      });

      log.audit('updating config', stateConfig);

      return configRecord.save();
    }
  }

  const getExtendFilesList = stateConfig => {
    const filesSearchId = runtime.getCurrentScript().getParameter({
      name: CONSTANTS.scriptParam.filesSearchId,
    });

    const filesSearchPagedObject = search.load({
      id: filesSearchId,
    })
      .runPaged({
        pageSize: CONSTANTS.searchPageSize,
      });

    const filesSearchResults = [];

    let processedPageCount = 0;
    let lastProcessedPagedIndex = 0;

    log.audit({
      title: `File search object`,
      details: {
        pageCount: filesSearchPagedObject.pageRanges.length,
        filesSearchPagedObject,
      },
    });

    filesSearchPagedObject.pageRanges.some(pageRange => {
      lastProcessedPagedIndex = pageRange.index;
      if (+pageRange.index <= +stateConfig.lastRunPageIndex) {
        // log.audit(`skipping page`, { pageRange, stateConfig });

        return;
      }

      processedPageCount++;

      const pagedSearchResult = filesSearchPagedObject.fetch(pageRange);

      pagedSearchResult.data.forEach(filesResult => {
        filesSearchResults.push({
          id: filesResult.id,
          fileCabinetId: filesResult.getValue({ name: `custrecord_extfile_file_cabinet_id` })
            || filesResult.getValue({ name: `custrecord_extfile_file_cabinet` }),
        });
      })

      // break loop
      // when max page count is reached,
      log.debug({
        title: `config update check`,
        details: {
          processedPageCount,
          maxSearchPages: stateConfig.maxSearchPages,
          lastProcessedPagedIndex,
          pageRange,
        },
      })
      if (processedPageCount === stateConfig.maxSearchPages) {
        // update state
        Config.update({
          lastRunPageIndex: pageRange.index,
          maxSearchPages: stateConfig.maxSearchPages || CONSTANTS.maxSearchPageCount,
        });

        return true;
      }
    })

    // ALL-RESULTS-PROCESSED when
    // either no files results found
    // OR last-processed-index === page-range-length
    if (filesSearchResults.length === 0
      || lastProcessedPagedIndex === (filesSearchPagedObject.pageRanges.length - 1)
    ) {
      // all results processed
      Config.update({
        lastRunPageIndex: lastProcessedPagedIndex,
        allResultsProcessed: true,
      });
    }

    log.audit(`files length: ${filesSearchResults.length}`, filesSearchResults);


    return getArrayChunk(filesSearchResults);
  }

  const getFileCabinetTransactionMap = ({ fileCabinetIdList }) => {
    const transactionSearchFilters = [
      ['file.internalid', `anyof`, fileCabinetIdList],
      `and`,
      [`mainline`, `is`, true],
    ];

    const transactionSearchResults = getAllResults(search.create({
      type: `transaction`,
      filters: transactionSearchFilters,
      columns: [`file.internalid`, ]
    }));

    const fileCabinetTransactionMap = {};

    transactionSearchResults.forEach(tranSearchResult => {
      const fileCabinetId =  tranSearchResult.getValue({
        name: `internalid`,
        join: `file`,
      });

      if (!fileCabinetTransactionMap[fileCabinetId]) {
        fileCabinetTransactionMap[fileCabinetId] = [];
      }

      fileCabinetTransactionMap[fileCabinetId].push({
        id: tranSearchResult.id,
        type: tranSearchResult.recordType,
      });
    })

    return fileCabinetTransactionMap;
  }

  const getFileCabinetCustomRecordMap = ({ fileCabinetIdList }) => {
    const fileCabinetRecordMap = {};

    CONSTANTS.linkSearchRecordType.forEach(linkedRecordType => {
      const linkedRecordSearchFilters = [
        [`isinactive`, `is`, false],
        `and`,
        [`file.internalid`, `anyof`, fileCabinetIdList]
      ];

      const linkedRecordSearchResults = getAllResults(search.create({
        type: linkedRecordType,
        filters: linkedRecordSearchFilters,
        columns: [`file.internalid`],
      }));

      linkedRecordSearchResults.forEach(recordSearchResult => {
        const fileCabinetId = recordSearchResult.getValue({
          name: `internalid`,
          join: `file`,
        });

        if (!fileCabinetRecordMap[fileCabinetId]) {
          fileCabinetRecordMap[fileCabinetId] = [];
        }

        fileCabinetRecordMap[fileCabinetId].push({
          id: recordSearchResult.id,
          type: recordSearchResult.recordType,
        });
      })
    });

    return fileCabinetRecordMap;
  }

  const getInputData = () => {
    try {
      const stateConfig = Config.getConfig();

      if (stateConfig.allResultsProcessed) {
        return log.audit(`All results processed`);
      }

      return getExtendFilesList(stateConfig);
    } catch (ex) {
      log.error({
        title: 'INPUT_ERROR',
        details: ex.message,
      });
      log.error({
        title: `INPUT_ERROR_STACK`,
        details: ex.stack,
      });
    }
  }

  const reduce = context => {
    try {
      context.values.forEach(reduceValue => {
        const filesChunk = JSON.parse(reduceValue);

        const fileCabinetIdList = filesChunk.map(fileObj => fileObj.fileCabinetId);

        // TODO: get linked tranasctions custom record
        const fileCabinetTransactionMap = getFileCabinetTransactionMap({
          fileCabinetIdList,
        });

        const fileCabinetCustomRecordMap = getFileCabinetCustomRecordMap({
          fileCabinetIdList,
        });

        filesChunk.forEach(fileObj => {
          const fcTransactionList = fileCabinetTransactionMap[fileObj.fileCabinetId] || [];
          const fcCustomRecordList = fileCabinetCustomRecordMap[fileObj.fileCabinetId] || [];

          if (fcTransactionList.length === 0 && fcCustomRecordList.length === 0) {
            return;
          }

          const extendFilesRecord = record.load({
            type: `customrecord_extend_files_aut`,
            id: fileObj.id,
            isDynamic: true,
          });

          log.debug({
            title: `Linking file`,
            details: {
              fileObj,
              fcTransactionList,
              fcCustomRecordList,
            },
          });

          const errors = [];

          fcTransactionList.forEach(linkedTransactionObj => {
            const filesReferenceFieldId = CONSTANTS.recordTypeFieldMap[linkedTransactionObj.type];

            const linkedTransaction = extendFilesRecord.getValue({
              fieldId: filesReferenceFieldId
            });

            if (linkedTransaction && linkedTransaction != linkedTransactionObj.id) {
              return errors.push(`Linked transaction already present on for field: ${filesReferenceFieldId}, Type: ${linkedTransactionObj.type}, Existing ref: ${linkedTransaction}, new-transaction: ${linkedTransactionObj.id}.`)
            }

            extendFilesRecord.setValue({
              fieldId: filesReferenceFieldId,
              value: linkedTransactionObj.id,
            });
          })

          fcCustomRecordList.forEach(linkedRecordObj => {
            const filesReferenceFieldId = CONSTANTS.recordTypeFieldMap[linkedRecordObj.type];

            const existingLinkedValue = extendFilesRecord.getValue({
              fieldId: filesReferenceFieldId
            });

            if (existingLinkedValue && existingLinkedValue != linkedRecordObj.id) {
              return errors.push(`Linked Custom-Record already present on for field: ${filesReferenceFieldId}, Type: ${linkedRecordObj.type}, Existing ref: ${existingLinkedValue}, current-ref: ${linkedRecordObj.id}.`)
            }

            extendFilesRecord.setValue({
              fieldId: filesReferenceFieldId,
              value: linkedRecordObj.id,
            });
          })

          if (errors.length > 0) {
            extendFilesRecord.setValue({
              fieldId: CONSTANTS.filesReferenceField.error,
              value: JSON.stringify(errors),
            });
          }

          // log.debug({
          //   title: `file linked`,
          //   details: {
          //     fileObj,
          //     fcTransactionList,
          //     fcCustomRecordList,
          //   }
          // })

          return extendFilesRecord.save({
            ignoreMandatoryFields: true,
          });
        })
      })
    } catch (ex) {
      log.error({
        title: 'REDUCE_ERROR',
        details: ex.message,
      });
      log.error({
        title: `REDUCE_ERROR_STACK`,
        details: ex.stack,
      });
    }
  }

  const summarize = () => {
    try {
      // re-schedule m/r
      const stateConfig = Config.getConfig();

      if (!stateConfig.stopExecution && !stateConfig.allResultsProcessed) {
        log.debug({ title: 'RESCHEDULING M/R', details: stateConfig });
        task.create({
          taskType: task.TaskType.MAP_REDUCE,
          scriptId: `customscript_ext_gd_mr_file_link`,
          deploymentId: `customdeploy_ext_gd_mr_file_link`,
        }).submit();
      }

    } catch (ex) {
      log.error({
        title: 'SUMMARIZE_ERROR',
        details: ex.message,
      });
      log.error({
        title: `SUMMARIZE_ERROR_STACK`,
        details: ex.stack,
      });
    }
  }

  return {
    getInputData,
    reduce,
    summarize,
  };
});