/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * 
 * Import a set a resources (employees) from a JSON file saved by the Import
 * Project Resources Suitelet. Each object in the data is a resource and project pair. For
 * each pair, add/update the resource to the project and to every task for that project.
 */

const FILE_ID_PARAM = 'custscript_veic_resources_file_id';
const EMAIL_SENDER_ID_PARAM = 'custscript_veic_email_sender';
const EMAIL_RECIPIENT_ID_PARAM = 'custscript_veic_email_recipient';
const EMAIL_STATUS = {
    SENT: 'sent',
    FAILED: 'failed',
};
const EMAIL_SENDER_SENTINEL = -999;

/**
 * ProjectResource is the shape of data for each row in the import.
 * 
 * Note: *name fields are informational only and aren't required for importing. They
 * are used to provide more detail in the import results sent to the user. The user
 * can omit these fields from the import file if they wish.
 * 
 * @typedef ProjectResource
 * @property {number} projectId
 * @property {string} projectName
 * @property {number} resourceId
 * @property {string} employeeName
 * @property {number} roleId
 * @property {number} billingClassId
 * @property {string} billingClassName
 * @property {number} plannedWork
 * @property {number} units
 */

/**
 * @typedef AssigneeLine
 * @property {number} id
 * @property {number} line
 */

/**
 * @typedef AssignmentError
 * @property {string} details
 * @property {ProjectResource} resource
 */

/**
 * @typedef AssignmentResults
 * @property {Array<ProjectResource>} added
 * @property {Array<ProjectResource>} updated
 * @property {Array<AssignmentError>} errors
 */

/**
 * @typedef MapValue
 * @property {string} projectId
 * @property {Array<Object<string, string>>} resources
 */

/**
 * @typedef ResultRow
 * @property {number} taskId
 * @property {string} action
 * @property {string} details
 * @property {number} projectId
 * @property {string} projectName
 * @property {number} resourceId
 * @property {string} employeeName
 * @property {number} roleId
 * @property {number} billingClassId
 * @property {string} billingClassName
 * @property {number} plannedWork
 * @property {number} units
 */

/**
 * @typedef ProcessedSummary
 * @property {number} projectCount
 * @property {number} taskCount
 * @property {number} addedCount
 * @property {number} updatedCount
 * @property {number} errorCount
 */

/**
 * @typedef ErrorSummary
 * @property {string} stage
 * @property {string} error
 */

/**
 * @typedef CsvHelper
 * @property {CallableFunction} readCsv
 * @property {CallableFunction} writeCsv
 */

/**
 * Parse input data provided by the JSON file passed from the
 * import resources Suitelet.
 * 
 * It's assumed that the data saved to the JSON file have all the correct
 * properties. This is primarily about getting the types right.
 * 
 * @param {Array<Object<string, string>>} data 
 * @returns {ProjectResource[]}
 */
function parseResources(data) {
    const resources = [];
    for (const d of data) {
        resources.push({
            projectId:        Number(d.projectId),
            projectName:      d.projectName,
            resourceId:       Number(d.resourceId),
            employeeName:     d.employeeName,
            roleId:           Number(d.roleId),
            billingClassId:   Number(d.billingClassId),
            billingClassName: d.billingClassName,
            plannedWork:      Number(d.plannedWork),
            units:            Number(d.units),
        });
    }

    return resources;
}

/**
 * Assign the provided resources to the project. From some projects, this is a
 * prerequisite of being able to assign the resources to its tasks.
 * 
 * @param {number} projectId 
 * @param {Array<ProjectResource>} resources 
 * @param {record} record 
 * @returns {void}
 */
function assignResourcesToProject(projectId, resources, record) {
    const project = record.load({
        type: record.Type.JOB,
        id: projectId
    });
    /** @type {AssigneeLine[]} assignees */
    const assignees = [];    
    let lineCnt = project.getLineCount({sublistId: 'jobresources'});
    for (let i = 0; i < lineCnt; i++) {
        assignees.push({
            id: Number(project.getSublistValue({
                sublistId: 'jobresources',
                fieldId: 'jobresource',
                line: i
            })),
            line: i
        });
    }

    let updated = false;
    for (const resource of resources) {
        /** @type {AssigneeLine | undefined} existingAssignee */
        const existingAssignee = assignees.find(a => a.id === resource.resourceId);
        if (existingAssignee) {
            // We're not going to update resources on the project. The only reason to
            // do so would be to update their role, but since we are only using
            // Staff and Project Manager roles at the project level, we'll leave this
            // to be taken care of manually.
            continue;
        }

        project.insertLine({sublistId: 'jobresources', line: lineCnt});
        project.setSublistValue({
            sublistId: 'jobresources',
            line: lineCnt,
            fieldId: 'jobresource',
            value: resource.resourceId
        });
        project.setSublistValue({
            sublistId: 'jobresources',
            line: lineCnt,
            fieldId: 'role',
            value: resource.roleId
        });
        lineCnt++;
        updated = true;
    }

    if (updated) {
        project.save();
    }
}

/**
 * Assign/Update all resources for the provided task
 * 
 * @param {number} taskId 
 * @param {Array<ProjectResource>} resources 
 * @param {record} record
 * @returns {AssignmentResults} A summary of the additions/updates
 */
function assignResourcesToTask(taskId, resources, record) { 
    const task = record.load({
        type: 'projecttask',
        id: taskId
    });

    /** @type {AssigneeLine[]} assignees */
    const assignees = [];
    let assigneeCnt = task.getLineCount({sublistId: 'assignee'});
    for (let i = 0; i < assigneeCnt; i++) {
        assignees.push({
            id: Number(task.getSublistValue({
                sublistId: 'assignee',
                fieldId: 'resource',
                line: i
            })),
            line: i
        });
    }

    /** @type {AssignmentResults} results */
    const results = {
        added: [],
        updated: [],
        errors: [],
    };
    for (const resource of resources) {
        /** @type {number} assigneeCnt */
        let lineNum = assigneeCnt;

        /** @type {boolean} isUpdate */
        let isUpdate = false;

        /** @type {AssigneeLine | undefined} existingAssignee */
        const existingAssignee = assignees.find(a => a.id === resource.resourceId);

        try {
            if (existingAssignee) {
                lineNum = existingAssignee.line;
                isUpdate = true;
            } else {
                task.insertLine({
                    sublistId: 'assignee',
                    line: lineNum
                });
                task.setSublistValue({
                    sublistId: 'assignee',
                    fieldId: 'resource',
                    line: lineNum,
                    value: resource.resourceId 
                });

                isUpdate = false;
                assigneeCnt++;
            }

            task.setSublistValue({
                sublistId: 'assignee',
                fieldId: 'billingclass',
                line: lineNum,
                value: resource.billingClassId
            });
            task.setSublistValue({
                sublistId: 'assignee',
                fieldId: 'plannedwork',
                line: lineNum,
                value: resource.plannedWork
            });
            task.setSublistValue({
                sublistId: 'assignee',
                fieldId: 'role',
                line: lineNum,
                value: resource.roleId
            });
            task.setSublistValue({
                sublistId: 'assignee',
                fieldId: 'units',
                line: lineNum,
                value: resource.units
            });

            if (isUpdate) {
                results.updated.push(resource);
            } else {
                results.added.push(resource);
            }
        } catch (e) {
            results.errors.push({
                details: `Unable to assign resource: ${e.message}`,
                resource: resource
            });
        }
    }

    task.save();

    return results;
}

/**
 * 
 * @param {ResultRow[]} results 
 * @param {ProcessedSummary} processedSummary 
 * @param {ErrorSummary | null} errorSummary 
 * @param {runtime} runtime 
 * @param {email} email 
 * @param {log} log 
 * @param {CsvHelper} csvHelper 
 * @returns {string} EMAIL_STATUS enum
 */
function sendNotificationEmail(results, processedSummary, errorSummary, runtime, email, log, csvHelper) {
    const script = runtime.getCurrentScript();

    /** @type {number} author */
    const author = script.getParameter({name: EMAIL_SENDER_ID_PARAM}) ?? EMAIL_SENDER_SENTINEL;

    /** @type {string} recipient */
    const recipient = script.getParameter({name: EMAIL_RECIPIENT_ID_PARAM}) ?? '';
    const subject = 'Project Resource Import Results';
    const errorCount = errorSummary !== null
        ? processedSummary.errorCount + 1
        : processedSummary.errorCount;
    const bodyLines = [
        'Project Resource Import has completed.',
        '',
        '## Summary ##',
        `- Errors:            ${errorCount}`,
        `- Projects updated:  ${processedSummary.projectCount}`,
        `- Tasks updated:     ${processedSummary.taskCount}`,
        `- Resources added:   ${processedSummary.addedCount}`,
        `- Resources updated: ${processedSummary.updatedCount}`,
    ];

    const attachments = [];
    if (results.length > 0) {
        const fileName = `resource_import${Date.now()}.csv`;
        const csv = csvHelper.writeCsv(fileName, results);
        attachments.push(csv);
        bodyLines.push('');
        bodyLines.push('See CSV attachment for full details.');
    } else {
        bodyLines.push('');
        bodyLines.push('Unable to provide result details. Results are empty.');
    }

    // Add any unexpected errros to the report as well
    if (errorSummary !== null) {
        bodyLines.push('');
        bodyLines.push('## Other Errors ##');
        bodyLines.push(`Stage: ${errorSummary.stage}`);
        bodyLines.push('Errors:');
        bodyLines.push(errorSummary.error);
    }

    let emailStatus = '';
    try {
        if (author === EMAIL_SENDER_SENTINEL || recipient === '') {
            let errMsg = 'Unable to send email.'
            if (author === EMAIL_SENDER_SENTINEL) {
                errMsg += ' Sender is empty.';
            }

            if (recipient === '') {
                errMsg += ' Recipient is empty.';
            }

            throw new Error(errMsg);
        }

        email.send({
            author,
            subject,
            attachments,
            body: bodyLines.join('\n'),
            recipients: [recipient],
        });
        emailStatus = EMAIL_STATUS.SENT;
    } catch (e) {
        let errMsg = `Unable to send email. Sender: ${author}, recipient: ${recipient}, error: ${e.message}`
        log.error({title: 'Email error', details: errMsg});
        emailStatus = EMAIL_STATUS.FAILED;
    }
    
    log.audit({
        title: 'Import Complete',
        details: `Results: 
            errors:       ${processedSummary.errorCount},
            projects:     ${processedSummary.projectCount},
            tasks:        ${processedSummary.taskCount},
            added:        ${processedSummary.addedCount},
            updated:      ${processedSummary.updatedCount}
            notification: ${emailStatus}`,
    });

    return emailStatus;
}

/**
 * Log the script params available within a stage
 * 
 * @param {runtime} runtime 
 * @param {log} log 
 * @param {string} stage 
 */
function logScriptParams(runtime, log, stage) {
    const script = runtime.getCurrentScript();
    const resourcesFileId = script.getParameter({name: FILE_ID_PARAM});
    const emailSender = script.getParameter({name: EMAIL_SENDER_ID_PARAM});
    const emailRecipient = script.getParameter({name: EMAIL_SENDER_ID_PARAM});
    log.debug({
        title: 'Script Params',
        details: `Stage: ${stage}
            Resource file: ${resourcesFileId},
            email sender: ${emailSender},
            email recipient: ${emailRecipient}`
    });
}

// @ts-ignore
define(
    [
        'N/email',
        'N/file',
        'N/log',
        'N/record',
        'N/runtime',
        'N/search',
        '/SuiteScripts/Lib/veic_csv_helper'
    ],
    /**
     * @typedef email
     * @typedef file
     * @typedef log
     * @typedef record
     * @typedef runtime
     * @typedef search
     * @typedef Search
     * @typedef Query
     * @typedef NRecord
     * 
     * @param {email} email
     * @param {file} file
     * @param {log} log
     * @param {record} record
     * @param {runtime} runtime
     * @param {search} search
     * @param {CsvHelper} csvHelper
     */
    (email, file, log, record, runtime, search, csvHelper) => {
        /**
         * Read the data file saved and passed by the Suitelet, load the ProjectResources. Group
         * resources by project.
         * 
         * @param {Object} context
         * @param {boolean} context.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} context.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (context) => {
            logScriptParams(runtime, log, 'Input');

            const script = runtime.getCurrentScript();
            const resourcesFileId = script.getParameter({name: FILE_ID_PARAM});
            if (!resourcesFileId) {
                throw new Error('Missing filepath parameter for resource import file');
            }

            const resourceData = JSON.parse(file.load({id: resourcesFileId}).getContents());
            /** @type {Array<ProjectResource>} resources */
            const resources = parseResources(resourceData);

            /** @type {Object<string, Array<ProjectResource>>} projectResources */
            const projectResources = {};
            for (const r of resources) {
                if (!projectResources[r.projectId]) {
                    projectResources[r.projectId] = [];
                }

                projectResources[r.projectId].push(r);
            }

            return Object.keys(projectResources).map(projectId => {
                return {
                    projectId: projectId,
                    resources: projectResources[projectId]
                };
            });
        }

        /**
         * Map the project resources to task --> resource. In the reduce stage, each task will be updated
         * to add all assigned resources.
         * 
         * Additionally, check if each resource is already listed as a project resource and add them
         * if not.
         * 
         * @param {Object} context - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} context.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} context.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} context.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} context.key - Project ID
         * @param {string} context.value - Array of resources to assign to that project
         * @param {CallableFunction} context.write
         * @since 2015.2
         */
        const map = (context) => {
            /** @type {MapValue} input */
            const input = JSON.parse(context.value);
            const projectId = Number(input.projectId);
            const resources = parseResources(input.resources);

            log.debug({
                title: 'Map Started',
                details: `Project ID: ${projectId}, resource count: ${resources.length}`
            });

            try {
                // Start by assigning the resources to the base project
                assignResourcesToProject(projectId, resources, record);

                const taskSearch = search.create({
                    type: 'projecttask',
                    filters: [
                        ['company', 'anyof', projectId],
                        'AND',
                        ['issummarytask', 'is', 'F']
                    ],
                    columns: ['internalid']
                });
                const taskIds = [];
                taskSearch.run().each(res => {
                    taskIds.push(res.getValue({name: 'internalid'}));
                    return true;
                });
                for (const taskId of taskIds) {
                    for (const r of input.resources) {
                        context.write({
                            key: String(taskId),
                            value: r
                        });
                    }
                }

                log.debug({
                    title: 'Map Complete',
                    details: `Assigned ${resources.length} resources to project: ${projectId},
                        tasks to reduce: ${taskIds.length}`
                });
            } catch (e) {
                log.error({title: 'Map Error', details: e.message});
                throw e;
            }
        }

        /**
         * Load the task and assign/update all provided resources.
         * 
         * @param {Object} context - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} context.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} context.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} context.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} context.key - a Task ID
         * @param {Array<string>} context.values the serialized resources mapped to the task
         * @param {CallableFunction} context.write
         * @since 2015.2
         */
        const reduce = (context) => {
            /** @type {ProjectResource[]} */
            const resources = parseResources(context.values.map(val => JSON.parse(val)));

            // Using a Map to de-dup the resources. Last resource wins.
            /** @type {Map<number, ProjectResource>} resourcesMap */
            const resourcesMap = new Map();
            for (const resource of resources) {
                resourcesMap.set(resource.resourceId, resource);
            }

            const taskId = Number(context.key);
            log.debug({
                title: 'Assigning to Task',
                details: `Assigning ${resourcesMap.size} resources to task: ${taskId}`
            });

            try {
                const results = assignResourcesToTask(taskId, Array.from(resourcesMap.values()), record);
                context.write({
                    key: taskId,
                    value: results
                });
            } catch (e) {
                log.error({title: 'Reduce Error', details: e.message});
                throw e;
            }
        }

        /**
         * Report back to the user who initiated the script via email. Attach a summary CSV of the resources
         * that were added/updated.
         * 
         * @param {Object} context - Statistics about the execution of a map/reduce script
         * @param {number} context.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} context.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} context.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {any} context.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} context.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} context.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} context.yields - Total number of yields when running the map/reduce script
         * @param {Object} context.inputSummary - Statistics about the input stage
         * @param {Object} context.mapSummary - Statistics about the map stage
         * @param {Object} context.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (context) => {
            const taskSet = new Set();
            const projectSet = new Set();
            let addedCnt = 0;
            let updatedCnt = 0;
            let errorCnt = 0;

            /** @type {ResultRow[]} rows */
            const results = [];
            context.output.iterator().each((key, val) => {
                /** @type {AssignmentResults} resources */
                const resources = JSON.parse(val);
                const taskId = Number(key);
                taskSet.add(taskId);

                // Errors
                for (const e of resources.errors) {
                    results.push({
                        taskId: taskId,
                        action: 'Error',
                        details: e.details,
                        ...e.resource
                    });
                    errorCnt++;
                }

                // Added
                for (const r of resources.added) {
                    results.push({
                        taskId: taskId,
                        action: 'Added',
                        details: '',
                        ...r
                    });
                    projectSet.add(r.projectId);
                    addedCnt++;
                }

                // Updates
                for (const r of resources.updated) {
                    results.push({
                        taskId: taskId,
                        action: 'Updated',
                        details: '',
                        ...r
                    });
                    projectSet.add(r.projectId);
                    updatedCnt++;
                }

                return true;
            });

            // Send results as email attachement to user who triggered the script
            /** @type {ProcessedSummary} */
            const processedSummary = {
                addedCount: addedCnt,
                updatedCount: updatedCnt,
                errorCount: errorCnt,
                projectCount: projectSet.size,
                taskCount: taskSet.size,
            };
            const errorSummary = getErrorSummary(context);
            if (errorSummary !== null) {
                log.error({title: 'Processing Error', details: errorSummary.error});
            }

            sendNotificationEmail(
                results,
                processedSummary,
                errorSummary,
                runtime,
                email,
                log,
                csvHelper
            );

            // Delete the data file if no errors occurred
            const script = runtime.getCurrentScript();
            const resourcesFileId = script.getParameter({name: FILE_ID_PARAM});
            if (resourcesFileId) {
                file.delete({id: resourcesFileId});
            } else {
                log.error({
                    title: 'File cleanup error',
                    details: 'Unable to delete data file. File ID is undefined'
                });
            }
        }

        /**
         * Return details for any errors that occurred in any stage. If no errors occurred, return null.
         * 
         * @param {Object} summary - Statistics about the execution of a map/reduce script
         * @param {number} summary.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summary.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summary.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {any} summary.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summary.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summary.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summary.yields - Total number of yields when running the map/reduce script
         * @param {Object} summary.inputSummary - Statistics about the input stage
         * @param {Object} summary.mapSummary - Statistics about the map stage
         * @param {Object} summary.reduceSummary - Statistics about the reduce stage
         * @returns {ErrorSummary | null}
         */
        const getErrorSummary = (summary) => {
            const inputSummary = summary.inputSummary;
            const mapSummary = summary.mapSummary;
            const reduceSummary = summary.reduceSummary;

            let stagesWithErrors = [];
            let inputError = '';
            let mapErrors = [];
            let reduceErrors = [];

            // Input stage error
            if (inputSummary.error) {
                stagesWithErrors.push('input');
                inputError = inputSummary.error;
            }

            // Map stage errors
            mapSummary.errors.iterator().each((key, val) => {
                mapErrors.push(`Error processing Project, id: ${key}, error: ${JSON.parse(val).message}`);
                return true;
            });
            
            if (mapErrors.length > 0) {
                stagesWithErrors.push('map');
            }

            // Reduce stage errors
            reduceSummary.errors.iterator().each((key, val) => {
                reduceErrors.push(`Error processing Task, id: ${key}, error: ${JSON.parse(val).message}`);
                return true;
            });

            if (reduceErrors.length > 0) {
                stagesWithErrors.push('reduce');
            }

            /** @type {ErrorSummary | null} */
            let errorSummary = null;
            const errors = [inputError, ...mapErrors, ...reduceErrors].filter(e => e !== '');
            if (errors.length > 0) {
                errorSummary = {
                    stage: stagesWithErrors.join(', '),
                    error: JSON.stringify(errors)
                };
            }

            return errorSummary;
        }

        return {getInputData, map, reduce, summarize}
    });
