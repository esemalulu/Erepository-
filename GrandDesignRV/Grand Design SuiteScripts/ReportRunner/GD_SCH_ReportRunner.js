/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/file', 'N/https', 'N/url'],
    (file, https, url) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            try {
                const reportRunnerURL = url.resolveScript({
                    scriptId: 'customscript_gd_sl_report_runner',
                    deploymentId: 'customdeploy_gd_sl_report_runner',
                    returnExternalUrl: true
                })
                //const reportURL = 'https://3598857-sb2.app.netsuite.com/app/reporting/reportrunner.nl?cr=292&whence='
                const reportResponse = https.requestSuitelet({
                    scriptId: 'customscript_gd_sl_report_runner',
                    deploymentId: 'customdeploy_gd_sl_report_runner',
                    external: true
                });

                log.debug('ReportRunner', reportResponse);
                if (reportResponse.code === 200) {
                    const reportHTML = reportResponse.body;
                    const regex = /<input.*?name="id".*?value="([^"]+)"/;
                    const match = reportHTML.match(regex);
                    if (match) {
                        const reportExecutionId = match[1];
                        const reportRunURL = `https://3598857-sb2.app.netsuite.com/app/reporting/reportrunner.nl?id=${reportExecutionId}&reportaction=exportcsv&apptype=html&visibleranges=0,201`;
                        const csvResponse = https.post({
                            url: reportRunURL
                        });
                        log.debug('ReportRunner', csvResponse);
                        if (csvResponse.code === 200) {
                            const csvFile = file.create({
                                name: `report_${reportExecutionId}.csv`,
                                fileType: file.Type.CSV,
                                contents: csvResponse.body
                            });
                            csvFile.folder = 55499809;
                            csvFile.save();
                            log.debug('ReportRunner', `Report ${reportExecutionId} saved to file cabinet`);
                        }
                    }
                }
            } catch (e) {
                log.error('ReportRunner', e);
            }
        }
        return {execute}
    });
