/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
*/
define([
  'N/file', 'N/error', 'N/record'
], (file, error, record) => {

  /**
   * @param {Object} args
   * @prop  {Object} args.title     - Title used while logging error message
   * @prop  {Object} args.exception
   */
  const logErrorAndStack = (args) => {
    let requestId = '';
    log.error({
      title: (args.title || 'Error Message'),
      details: 'requestId=' + requestId + ', code=' + (args.exception.name || args.exception.code || '') + ', message=' + (args.exception.message || '')
    });
    log.error({
      title: 'Error Stack',
      details: args.exception.stack || ''
    });
    return requestId;
  }

  const deleteFileCabinetFiles = ({ fileDeletionIds }) => {
    for (const fileObj of fileDeletionIds) {
      try {
        const valuesToSet = {};
        valuesToSet['custrecord_extfile_fc_file_deleted'] = true;
        log.debug({ title: `Fields to set on File: (${fileObj.fileId})`, details: valuesToSet });

        // Deleting FC file
        file.delete({ id: fileObj.fcFileId });

        // Updating eXtendFiles record
        record.submitFields({
          type: 'customrecord_extend_files_aut',
          id: fileObj.fileId,
          values: valuesToSet,
          options: {
            ignoreMandatoryFields: true
          }
        });
      } catch (error) {
        logErrorAndStack({ title: 'EXTEND_GD_FILE_DELETION_ERROR', exception: error });
      }
    }
  }

  /**
   *
   * @param {Object} context
   * @prop  {String} context.action
   * @prop  {Object []} context.fileIds
   */
  const post = (context) => {
    log.debug({ title: 'POST check context', details: context });
    const fileDeletionIds = context.fileIds;

    if (fileDeletionIds?.length > 0) {
      log.debug({ title: `Files to delete, File Count:.`, details: fileDeletionIds.length });
      deleteFileCabinetFiles({ fileDeletionIds });
    } else {
      throw error.create({
        name: 'EXTEND_GRAND_DESIGN_INVALID_REQUEST',
        message: 'Invalid Request. FC File Ids: ' + (JSON.stringify(fileDeletionIds) || '[]')
      });
    }
  }

  /**
   *
   * @param {Function} method
   */
  const errorWrapper = (method) => {
    return (args) => {
      try {
        return method(args);
      } catch (e) {
        logErrorAndStack({ title: 'EXTEND_GRAND_DESIGN_RESTLET_ERROR', exception: e });

        return {
          success: false,
          error: e.message || e.name || 'Unexpected Error Occurred.',
          httpCode: 400
        };
      }
    }
  }

  return {
    post: errorWrapper(post)
  };
});
