/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/runtime', 'N/file', 'N/error', `N/record`],
  function (search, runtime, file, error, record) {
    const exports = {};
    const DO_NOT_RUN_PARAM = 'custscript_extkit_del_fc_file_dnt_execut';

    function getScriptLevelParameter(param) {
      return runtime.getCurrentScript().getParameter({ name: param });
    }

    function doNoExecute() {
      let doNotRun = getScriptLevelParameter(DO_NOT_RUN_PARAM);

      if (doNotRun) {
        log.audit({ title: 'Forcefully stopped execution' });
        return;
      }
    }

    const getArrayChunk = (arr, chunkSize = 50) => {
      const arrChunk = [];

      for (let i = 0; i < arr.length; i += chunkSize) {
        arrChunk.push(arr.slice(i, i + chunkSize));
      }

      return arrChunk;
    }

    const getAllResults = ({searchObj, maxResults = 5000 }) => {
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

        if (searchResults.length >= maxResults) {
          return true;
        }

        return false;
      })

      log.debug({
        title: `getAll Results searchResults: ${searchResults.length}`,
        details: searchResults,
      });

      return searchResults;
    }

    /**
     * @param {Object} context
     */
    function _getInputData() {
      log.debug({ title: 'getInputData', details: 'M/R getInputData' });
      doNoExecute();
      let searchId = getScriptLevelParameter('custscript_extkit_del_fc_file_search_id');

      if (!searchId) {
        throw error.create({
          name: 'EXTEND_MR_DELETE_FILE_CABINET',
          message: 'Search Id is required'
        });
      }

      let fileCabinetFieldId = getScriptLevelParameter('custscript_extkit_del_fc_file_cabinet_fi');

      if (!fileCabinetFieldId) {
        throw error.create({
          name: 'EXTEND_MR_DELETE_FILE_CABINET',
          message: 'File Cabinet Field Id is required'
        });
      }

      const fileResults = getAllResults({
        searchObj: search.load({
          id: searchId
        }),
      });

      if (fileResults.length === 0) {
        return log.audit({
          title: `All results processed`,
          details: fileResults,
        });
      }

      return getArrayChunk(fileResults);
    }

    /**
     * @param {Object} context
     */
    function _reduce(context) {
      /* return  */log.debug({ title: '_reduce context', details: context.values });
      doNoExecute();

      try {
        const fileObjectList = JSON.parse(context.values[0]);

        fileObjectList.forEach(filesRecordObject => {
          try {
            log.audit(`reduce list filesRecordObject`, filesRecordObject);

            // @NOTE: currently only support single select
            // in-case of select file-cabinet field
            let fcId = filesRecordObject.values?.custrecord_extfile_file_cabinet_id ||
            filesRecordObject.values?.custrecord_extfile_file_cabinet?.[0]?.value || filesRecordObject.values?.custrecord_extfile_file_cabinet?.[0];

            if (fcId) {
              file.delete({
                id: fcId,
              });
            }

            record.submitFields({
              type: filesRecordObject.recordType,
              id: filesRecordObject.id,
              values: {
                custrecord_extfile_fc_file_deleted: true,
              },
              options: {
                ignoreMandatoryFields: true,
              },
            });
          } catch (ex) {
            log.error({ title: 'ERROR OCCURRED WHILE DELETING FILES', details: ex.message });
            log.error({ title: 'STACK', details: ex.stack });
          }
        })
      } catch (e) {
        log.error({ title: 'REDUCE JSON PARSE ERROR', details: e.message });
        log.error({ title: 'STACK', details: e.stack });
      }
    }

    /**
     * @param {Object} summary
     */
    function _summarize() {
      log.debug({ title: '_summarize', details: 'M/R Completed' });
      doNoExecute();

    }

    /**
     * @desc -
     */
    function getInputData() {
      try {
        return _getInputData();
      } catch (ex) {
        log.error({ title: 'Get Input Phase Error', details: ex });
        return [];
      }
    }

    /**
     * @desc -
     */
    function reduce(context) {
      try {
        return _reduce(context);
      } catch (ex) {
        log.error({ title: 'Reduce Phase Error', details: ex });
        return;
      }
    }

    /**
     * @desc -
     */
    function summarize(summary) {
      try {
        return _summarize(summary);
      } catch (ex) {
        log.error({ title: 'Summarize Phase Error', details: ex });
        return;
      }
    }

    exports.getInputData = getInputData;
    exports.reduce = reduce;
    exports.summarize = summarize;
    return exports;
  }
);