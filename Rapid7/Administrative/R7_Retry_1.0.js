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
                nlapiLogExecution('error', 'Initiating Retry Logic', 'Attempt ' + (++tries) + ' - Encounted error: ' + ex.name)
            }

            if (!isMatchingError || tries >= maxTries) {
                throw ex;
            }
        }
    } while (isMatchingError && tries < maxTries)
}
