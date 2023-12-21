/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * @author Ards Bautista
 * @overview The script deletes records based off a saved search.
 */
define(['N/record', 'N/search', 'N/runtime'], (record, search, runtime) => {
  /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
  const getInputData = () => {
    log.debug('getInputData', '*** Start of Execution ***');
    const searchId = runtime.getCurrentScript().getParameter({
      name: 'custscript_mhi_yyf_deleterecords_search'
    });

    if (searchId) {
      return search.load({
        id: searchId
      });
    }
  };

  /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
  const map = (context) => {

  };

  /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
  const reduce = (context) => {
    const recordId = context.key;
    const logTitle = 'reduce_' + recordId;
    const reduceData = context.values.reduce((group, initial, index) => {
      return group.concat(JSON.parse(initial));
    }, []);
    log.debug(logTitle, reduceData.length + ' reduceData=' + JSON.stringify(reduceData));

    const { recordType } = reduceData[0];

    record.delete({
      type: recordType,
      id: recordId
    });
    log.audit(logTitle, recordType + ' has been deleted. ID=' + recordId);

    context.write({
      key: recordId,
      value: recordType
    });
  };


  /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
  const summarize = (summary) => {
    const logTitle = 'summarize_';
    try {
      const errorReduce = [];
      summary.reduceSummary.errors.iterator().each((key, value) => {
        log.error(logTitle + 'errorReduce_' + key, value);
        errorReduce.push({
          stage: 'reduce',
          key,
          error: JSON.parse(value)
        });
        return true;
      });

      let index = 0;
      const success = [];
      summary.output.iterator().each((key, value) => {
        log.debug(logTitle + index, value + ' : ' + key);
        success.push({
          key,
          value
        });
        index += 1;

        return true;
      });

      log.audit(logTitle + 'errorReduce', errorReduce.length + ' errors occurred.');
      log.audit(logTitle + 'success', success.length + ' records deleted');
    } catch (error) {
      log.error(logTitle, error);
    }
  };

  return {
    getInputData,
    // map,
    reduce,
    summarize
  };
});
