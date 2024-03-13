/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */
define(['N/log'], function (log) {
    /**
     * Automatically retry a function call if an exception is thrown.
     *
     * @param {number=} params.maxTries The number of times to try executing the function before re-throwing the error
     * @param {function} params.functionToExecute The function to retry if execution fails
     * @param {Array=} params.arguments The arguments to pass to the function being executed
     * @param {string=} params.retryOnError The specific exception name to look for.  If defined, will only retry
     *                                      if this exception is thrown.  If not specified, will retry on any exception.
     */
function retry(params) {
        var functionToExecute = params.functionToExecute;
        var arguments = [].concat(params.arguments);
        var maxTries = params.maxTries || 1;
        var retryOnError = params.retryOnError;

        if (typeof functionToExecute !== 'function') {
            throw functionToExecute + 'is not a function';
        }

        var isMatchingError;
        var tries = 0;

        do {
            try {
                return functionToExecute.apply(this, arguments);
            } catch (ex) {
                isMatchingError = !retryOnError || ex.name === retryOnError;

                if (isMatchingError) {
                    log.error({
                        title: 'Initiating Retry Logic',
                        details: 'Attempt ' + (++tries) + ' - Encounted error: ' + ex.name
                    });
                }

                if (!isMatchingError || tries >= maxTries) {
                    throw ex;
                }
            }
        } while (isMatchingError && tries < maxTries)
    }

    return retry;
});