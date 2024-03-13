/**
 * @NApiVersion 2.1
 * @NScriptType restlet
 * @module
 * @description
 */
define(["N/file", "N/error", "N/search"], function (
    file,
    error,
    search
) {
  /**
   * @function get
   * @description description
   *
   * @public
   * @param  {type} - description
   * @return {type} - description
   */
  let isTransaction;

  function get(context) {
    log.debug("record id", context.recordid);
    log.debug("search record type", context.recordtype)
    doValidation([context.recordid, context.recordtype], ["recordid", "recordtype"], "GET");
    isTransaction = checkIfTransaction(context.recordtype);
    try {
      //get all files that are directly on the given record
      var recFilesArr = getRecordFiles(context.recordid, context.recordtype);
      //getting messages has been abandoned for now - commenting out logic but keeping it here
      //in case it's needed again.
      //if the record has messages, check for attachments and add those also
      //recFilesArr['messages'] = getMessageFiles(context.recordid, context.recordtype);
    } catch (e) {
      log.error({
        title: "Error while getting record files",
        details: e,
      });
      throw e;
    }
    log.debug({
      title: "Response for GET request",
      details: JSON.stringify(recFilesArr),
    });
    return recFilesArr;
  }

  function doValidation(args, argNames, methodName) {
    for (var i = 0; i < args.length; i++)
      if (!args[i] && args[i] !== 0)
        throw error.create({
          name: "MISSING_REQ_ARG",
          message: "Missing a required argument: [" +
              argNames[i] +
              "] for method: " +
              methodName,
        });
  }

  /**
   * Checking if the given record type is a transaction - if it is we need to set
   * mainline to true in our searches. This works by checking if we can do a search
   * where mainline = true for the given record type. If the record type isnt a transaction
   * this will fail; otherwise it will pass.
   * @param recType
   * @returns {boolean}
   */
  function checkIfTransaction(recType) {
    let searchFilters = [];
    searchFilters.push(search.createFilter({
      name: 'mainline',
      operator: search.Operator.IS,
      values: 'T'
    }));
    searchFilters.push(search.createFilter({
      name: 'internalidnumber',
      operator: search.Operator.EQUALTO,
      values: 0
    }));
    try {
      search.create({
        type: recType,
        filters: searchFilters,
        columns: []
      }).runPaged(0, 1);
    } catch (e) {
      return false;
    }
    return true;
  }

  function addMainLine(searchFilters) {
    if (isTransaction) {
      searchFilters.push(search.createFilter({
        name: 'mainline',
        operator: search.Operator.IS,
        values: 'T'
      }));
    }
  }

  /**
   * For the given record, check for any files attached to it
   * @param recIntId
   * @param recType
   * @returns {[]}
   */
  function getRecordFiles(recIntId, recType) {
    var searchFilters = [];
    searchFilters.push(search.createFilter({
      name: "internalid",
      operator: "is",
      values: recIntId
    }));
    addMainLine(searchFilters);
    var fileIds = getFileIds(recType, 'file', searchFilters);
    return getFiles(fileIds);
  }

  /**
   * If the given record has messages; check those for files; if they have files,
   * get their IDs and add them to the return list
   * @param recIntId
   * @param recType
   * @returns {[]}
   */
  function getMessageFiles(recIntId, recType) {
    let results = [];
    let messageFileIds = getMessageFileIds(recIntId, recType);
    if (messageFileIds.length > 0) {
      let searchFilters = [];
      searchFilters.push(search.createFilter({
        name: 'internalid',
        operator: search.Operator.ANYOF,
        values: messageFileIds
      }));
      var fileIds = getFileIds('message', 'attachments', searchFilters);
      results = getFiles(fileIds);
    }
    return results;
  }

  /**
   * Checks if the current record has any messages with attachments, and if it does, returns
   * the internal ids of those messages.
   * @param recIntId
   * @param recType
   * @returns {[]}
   */
  function getMessageFileIds(recIntId, recType) {
    let searchFilters = [];
    searchFilters.push(search.createFilter({
      name: 'hasattachment',
      operator: search.Operator.IS,
      join: 'messages',
      values: 'T'
    }));
    searchFilters.push(search.createFilter({
      name: 'internalid',
      operator: search.Operator.IS,
      values: recIntId
    }));
    addMainLine(searchFilters);
    let searchColumns = [];
    searchColumns.push(search.createColumn({
      name: "internalid",
      join: "messages",
    }));

    var messageSearch = search.create({
      type: recType,
      filters: searchFilters,
      columns: searchColumns
    });
    let results = [];
    try {
      messageSearch.run().each(function (result) {
        var intId = result.getValue({
          name: "internalid",
          join: "messages",
        });
        if (intId) {
          results.push(intId);
        }
        return true;
      });
    } catch (e) {
      log.error('Error getting messages. Record Type: \"' + recType + '\" may not support messages.')
    }
    return results;
  }

  /**
   * Using the below search this will get fileIds, names and their folder.
   * getRecordFiles provides a single record that can have multiple files
   * getMessageFiles provides multiple messages that may have multiple attachments.
   *
   * @param recType
   * @param joinName
   * @param searchFilters
   * @returns {[]}
   */
  function getFileIds(recType, joinName, searchFilters) {
    var files = [];
    var searchColumns = [];
    searchColumns.push(search.createColumn({
      name: "internalid",
      join: joinName
    }));
    searchColumns.push(search.createColumn({
      name: "name",
      join: joinName
    }));
    searchColumns.push(search.createColumn({
      name: "folder",
      join: joinName
    }));
    var newSearch = search.create({
      type: recType,
      filters: searchFilters,
      columns: searchColumns
    });

    //search will always return a result as it's looking for a record
    //of type = recType & internalid = recIntId
    //The check for any files associated has to be performed inside the result loop
    newSearch.run().each(function (result) {
      var intId = result.getValue({
        name: "internalid",
        join: joinName,
      });
      var name = result.getValue({
        name: "name",
        join: joinName,
      });
      var folder = result.getValue({
        name: "folder",
        join: joinName,
      });

      //check if the record returned has a file associated
      //if yes, then return required info
      //if not, return empty array
      if (intId) {
        files.push({
          intId: intId,
          name: name,
          folder: folder
        });
      }
      return true;
    });
    return files;
  }

  /**
   * Using the data found from getFileIds, load the file details into an array, along
   * with a base64 encoded string of the contents
   *
   * @param files
   * @returns {[]}
   */
  function getFiles(files) {
    let arrRecFiles = [];
    for (fileObj of files) {
      //to get around permissions issues on some files,
      //the try/catch will log out any error, but not
      //throw an error, and allow the script to continue
      //processing other files.
      try {
        arrRecFiles.push({
          fileInternalId: fileObj.intId,
          fileName: fileObj.name,
          fileFolder: fileObj.folder,
          fileContents: getEncodedFileContents(fileObj.intId)
        });
      } catch (e) {
        log.error(e.name, e.message);
      }
    }
    return arrRecFiles;
  }

  function getEncodedFileContents(intId) {
    //Load file object
    var fileRec = file.load({
      id: intId
    });
    //get file content as string
    var contentStr = fileRec.getContents();

    return contentStr;
  }

  return {
    get: get,
  };
});