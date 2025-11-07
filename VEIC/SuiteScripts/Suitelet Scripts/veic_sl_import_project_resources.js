/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * 
 * Provide a form with a file input field for selecting a CSV of Project Resources
 * to import. Each resource will be added to the designated project and assigned to
 * all tasks that belong to that project using the billing class provided for each resource.
 * 
 * This Suitelet handles presenting the form, validating the CSV file, and passing the data
 * off to a map/reduce script which handles the actual assignments. Calling a map/reduce script
 * is necessary to avoid hitting governance limits since the number of record load/create/saves can be
 * pretty big for some imports.
 * 
 * ### A note on displaying validation errors ###
 * I'm not using a POST -> Redirect flow when there are errors. If the user refreshes the
 * page, they will repost the data. The reason I took this approach is because if we redirect on
 * error, the errors would have to serialized and passed in the redirect request. If there
 * are a lot of errors that could be tricky. So this simplifies displaying errors at
 * the expense of possible re-posting but I can live with that.
 * 
 * Uploads that don't contain validation errros will use the usual POST -> Redirect flow.
 */

const FORM_TITLE = 'Add/Update Project Resources';
const CLIENT_MODULE_PATH = 'SuiteScripts/Client Scripts/veic_cs_task_and_resource_import.js';
const RESOURCES_FOLDER_ID_PARAM = 'custscript_veic_resources_folder_id' // SB1 = 1602
const IMPORT_RESOURCES_MR_SCRIPT_ID = 'customscript_veic_mr_import_resources';
const IMPORT_RESOURCES_MR_DEPLOYEMENT_ID = 'customdeploy_veic_mr_import_resources';
const UPLOAD_FIELD_ID = 'custpage_proj_resource_input';
const ERROR_SUBLIST_ID = 'custpage_import_error_sublist';
const ROLE_ID_STAFF = -3;
const ALERT_TYPE = {
    SUCCESS: 'success',
    INFO: 'info',
    WARNING: 'warning',
    DANGER: 'danger',
};

/**
 * @typedef UserAlert
 * @property {string} type - use ALERT_TYPE enum
 * @property {string} title
 * @property {string} msg
 */

/**
 * @typedef ValidationError
 * @property {number} projectId
 * @property {number} resourceId
 * @property {string} message
 */

/**
 * @typedef CsvHelper
 * @property {CallableFunction} readCsv
 * @property {CallableFunction} writeCsv
 */

/**
 * @typedef TaskResults
 * @property {string} taskId
 * @property {file} fileId
 */

class ProjectResource {
    static REQUIRED_FIELDS = [
        'projectId',
        'resourceId',
        'billingClassId',
        'plannedWork',
        'units'
    ];
    static FIELD_SENTINEL = -999;

    constructor(data = {}) {
        /** @type {number} */
        this.projectId = data.projectId ? Number(data.projectId) : ProjectResource.FIELD_SENTINEL;

        /** @type {string} */
        this.projectName = data.projectName ? data.projectName : '';

        /** @type {number} */
        this.resourceId = data.resourceId ? Number(data.resourceId) : ProjectResource.FIELD_SENTINEL;

        /** @type {string} */
        this.employeeName = data.employeeName ? data.employeeName : '';

        /** @type {number} */
        this.role = data.role ? Number(data.role) : ROLE_ID_STAFF;

        /** @type {number} */
        this.billingClassId = data.billingClassId ? Number(data.billingClassId) : ProjectResource.FIELD_SENTINEL;

        /** @type {string} */
        this.billingClassName = data.billingClassName ? data.billingClassName : '';

        /** @type {number} */
        this.plannedWork = data.plannedWork ? Number(data.plannedWork) : 0.0;

        /** @type {number} */
        this.units = data.units ? Number(data.units) : ProjectResource.FIELD_SENTINEL;

        /** @type {string[]} */
        this.validationErrors = [];

        this.validate();
    }

    /**
     * A unique name used for sorting and comparing resources in a single input file
     * 
     * @returns {string}
     */
    fullName() {
        return `${this.projectId}_${this.resourceId}`;
    }

    /**
     * The fields formatted and named according Netsuite's record structure
     * 
     * @returns {Object.<string, number | string>}
     */
    toNetsuiteObj() {
        return {
            projectId:        this.projectId,
            projectName:      this.projectName,
            resourceId:       this.resourceId,
            employeeName:     this.employeeName,
            roleId:           this.role,
            billingClassId:   this.billingClassId,
            billingClassName: this.billingClassName,
            plannedWork:      this.plannedWork,
            units:            this.units
        };
    }

    /**
     * Checks that required fields are present.
     */
    validate() {
        for (const f of ProjectResource.REQUIRED_FIELDS) {
            if (this[f] === ProjectResource.FIELD_SENTINEL) {
                this.validationErrors.push(`A value must be provided for ${f}, null given`);
            }

            if (f === 'units' && (this.units < 0 || this.units > 100)) {
                if (this.units !== ProjectResource.FIELD_SENTINEL) {
                    this.validationErrors.push(`Units must be between 0 and 100, got ${this.units}`);
                }
            }

            if (f === 'plannedWork' && this.plannedWork <= 0.0) {
                this.validationErrors.push(`Planned work must be greater than 0, got ${this.plannedWork}`);
            }
        }
    }

    /**
     * Were there any errors during validating the user provided data?
     * 
     * @returns {boolean}
     */
    isValid() {
        return this.validationErrors.length === 0;
    }
}

/**
 * Create the import form displayed in the UI
 * 
 * @param {Object} serverWidget 
 */
function createImportForm(serverWidget) {
    const form = serverWidget.createForm({title: FORM_TITLE});
    form.clientScriptModulePath = CLIENT_MODULE_PATH;
    form.addField({
        id: UPLOAD_FIELD_ID,
        type: serverWidget.FieldType.FILE,
        label: 'Upload CSV'
    });

    form.addSubmitButton({label: 'Upload'});

    return form;
}

/**
 * Add a sublist with validation error details to display to the user
 * 
 * @param {serverWidget.Form} form
 * @param {serverWidget} serverWidget
 * @param {ValidationError[]} errors
 * @returns {serverWidget.Form}
 */
function addErrorsToForm(form, serverWidget, errors) {
    if (errors.length === 0) {
        throw new Error("Unable to add error sublist to form. Errors are empty.");
    }

    const errorList = form.addSublist({
        id : ERROR_SUBLIST_ID,
        type : serverWidget.SublistType.LIST,
        label : 'Validation Errors'
    });
    const fields = [
        {id: 'project_id',         label: 'Project ID',  type: serverWidget.FieldType.TEXT},
        {id: 'resource_id',        label: 'Resource ID', type: serverWidget.FieldType.TEXT},
        {id: 'validation_message', label: 'Details',     type: serverWidget.FieldType.TEXT},
    ];
    fields.forEach(f => errorList.addField(f));

    let lineNum = 0;
    for (const error of errors) {
        errorList.setSublistValue({
            id: 'project_id',
            line: lineNum,
            value: error.projectId === ProjectResource.FIELD_SENTINEL ? ' ' : error.projectId
        });
        errorList.setSublistValue({
            id: 'resource_id',
            line: lineNum,
            value: error.resourceId === ProjectResource.FIELD_SENTINEL ? ' ' : error.resourceId
        });
        errorList.setSublistValue({
            id: 'validation_message',
            line: lineNum,
            value: error.message
        });

        lineNum++;
    }

    return form;
}

/**
 * Add an init message to the form
 * 
 * ### A note on flash messages ###
 * When this Suitelet is run, it is possible to pass data used in init messages by
 * adding alert_* query params. Since we only want to display messages to the user once
 * (a flash message), the query params are stripped from the browser url bar via
 * a pageInit() function in the client script attached to the Suitelet. This prevents the
 * message from showing every time the page is refreshed.
 *  
 * @param {serverWidget.Form} form 
 * @param {UserAlert} alert
 * @param {message} message
 * @returns {serverWidget.Form}
 */
function addAlertMessageToForm(form, alert, message) {
    let msgType;
    switch (alert.type) {
        case ALERT_TYPE.SUCCESS:
            msgType = message.Type.CONFIRMATION;
            break;
        case ALERT_TYPE.INFO:
            msgType = message.Type.INFORMATION;
            break;
        case ALERT_TYPE.WARNING:
            msgType = message.Type.WARNING;
            break;
        case ALERT_TYPE.DANGER:
            msgType = message.Type.ERROR;
            break;
        default:
            msgType = message.Type.INFORMATION;
    }

    const msg = message.create({
        type: msgType,
        title: alert.title,
        message: alert.msg
    });
    form.addPageInitMessage({message: msg});

    return form;
}

/**
 * 
 * @param {Object} uploadFile 
 * @param {CsvHelper} csvHelper
 * @returns {ProjectResource[]}
 */
function readProjectResources(uploadFile, csvHelper) {
    const resources = [];
    const rows = csvHelper.readCsv(uploadFile);
    for (const row of rows) {
        resources.push(new ProjectResource(row));
    }

    return resources;
}

/**
 * Get a list of all active projects. Used to validated the projects
 * provided by the user.
 * 
 * @param {query} query 
 * @returns {Array<number>} the project IDs
 */
function getActiveProjects(query) {
    const projects = [];
    const q = `SELECT DISTINCT p.id
                FROM job p
                WHERE p.isinactive = 'F'
                ORDER BY p.id`;
    const resultsIterator = query.runSuiteQLPaged({
        query: q,
        pageSize: 1000
    }).iterator();
    resultsIterator.each(page => {
        const pageIterator = page.value.data.iterator();
        pageIterator.each(row => {
            projects.push(Number(row.value.getValue(0)));

            return true;
        });

        return true;
    });

    return projects;
}

/**
 * Fetch employee availablity. Used to validate that we can
 * actually assign the employees provided by the user.
 * 
 * @param {query} query 
 * @returns {Map<number, boolean>} employee ID -> is available as resource
 */
function getEmployeeAvailablityMap(query) {
    /** @type {Map<number, boolean>} */
    const employees = new Map();
    const q = `SELECT e.id, e.isJobResource
                FROM employee e
                WHERE e.isinactive = 'F'
                ORDER BY e.id`;
    const resultsIterator = query.runSuiteQLPaged({
        query: q,
        pageSize: 1000
    }).iterator();
    resultsIterator.each(page => {
        const pageIterator = page.value.data.iterator();
        pageIterator.each(row => {
            employees.set(Number(row.value.getValue(0)), row.value.getValue(1) === 'T');

            return true;
        });

        return true;
    });

    return employees;
}

/**
 * Check that the resource/project pairs are valid.
 * 
 * @param {ProjectResource[]} resources 
 * @param {query} query
 * @returns {ValidationError[]}
 */
function validateResources(resources, query) {
    const employeeAvailability = getEmployeeAvailablityMap(query);
    const activeProjectIds = getActiveProjects(query);

    /** @type {ValidationError[]} */
    const errors = [];
    for (const resource of resources) {
        resource.validate();
        if (!resource.isValid()) {
            for (const e of resource.validationErrors) {
                errors.push({
                    resourceId: resource.resourceId,
                    projectId: resource.projectId,
                    message: e
                });
            }
        }

        // Does the project exist?
        if (!activeProjectIds.includes(resource.projectId)) {
            errors.push({
                resourceId: resource.resourceId,
                projectId: resource.projectId,
                message: `There are no active projects for ID: ${resource.projectId}`
            });
        }

        // Does the employee exist and are they available as a resource?
        if (!employeeAvailability.has(resource.resourceId)) {
            errors.push({
                resourceId: resource.resourceId,
                projectId: resource.projectId,
                message: `Could not find employee record for ${resource.employeeName} with ID: ${resource.resourceId}`
            });
        } else if (employeeAvailability.get(resource.resourceId) === false) {
            errors.push({
                resourceId: resource.resourceId,
                projectId: resource.projectId,
                message: `Employee record for ${resource.employeeName} with ID ${resource.resourceId} is not marked as available as a resource`
            });
        }
    }

    return errors;
}

/**
 * Submit the resources for import to the Map/Reduce script.
 * 
 * Trigger the map/reduce script to update the charges. Pass the file ID of the pending
 * charges file as a param to the MR script.
 * 
 * @param {ProjectResource[]} resources
 * @param {number} resourceFolderId 
 * @param {string} notificationEmail
 * @param {file} file 
 * @param {task} task 
 * @returns {TaskResults}
 * 
 */
function submitResources(resources, resourceFolderId, notificationEmail, file, task) {
    const filename = `resource_import_${Date.now()}.json`;
    const contents = JSON.stringify(resources.map(r => r.toNetsuiteObj()));
    const resourcesFile = file.create({
        name: filename,
        fileType: file.Type.JSON,
        contents: contents,
        description: 'List of pending project resource imports',
        encoding: file.Encoding.UTF8,
        folder: resourceFolderId,
        isOnline: false
    });
    const fileId = resourcesFile.save();
    const mrTask = task.create({
        taskType: task.TaskType.MAP_REDUCE,
        scriptId: IMPORT_RESOURCES_MR_SCRIPT_ID,
        deploymentId: IMPORT_RESOURCES_MR_DEPLOYEMENT_ID,
        params: {
            custscript_veic_resources_file_id: fileId,
            custscript_veic_email_recipient: notificationEmail
        }
    });

    const taskId = mrTask.submit();

    return {
        taskId,
        fileId
    };
}

// @ts-ignore
define(
    [
        'N/error',
        'N/log',
        'N/runtime',
        'N/ui/serverWidget',
        'N/ui/message',
        'N/redirect',
        'N/file',
        'N/task',
        'N/query',
        '/SuiteScripts/Lib/veic_csv_helper'
    ],
    /**
     * @typedef error
     * @typedef log
     * @typedef runtime
     * @typedef serverWidget
     * @typedef message
     * @typedef redirect
     * @typedef file
     * @typedef task
     * @typedef query
     * @typedef ServerRequest
     * @typedef ServerResponse
     * @typedef serverWidget.Form
     * @typedef Record
     * 
     * @param {error} error
     * @param {log} log
     * @param {runtime} runtime
     * @param {serverWidget} serverWidget
     * @param {message} message
     * @param {redirect} redirect
     * @param {file} file
     * @param {task} task
     * @param {query} query
     * @param {CsvHelper} csvHelper
     */
    (error, log, runtime, serverWidget, message, redirect, file, task, query, csvHelper) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} context
         * @param {ServerRequest} context.request - Incoming request
         * @param {ServerResponse} context.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (context) => {
            /** @type {serverWidget.Form} */
            const form = createImportForm(serverWidget);
            if (context.request.method === 'GET') {
                if (context.request.parameters.alert_msg) {
                    /** @type {UserAlert} */
                    const alert = {
                        type: context.request.parameters.alert_type ?? ALERT_TYPE.INFO,
                        title: context.request.parameters.alert_title,
                        msg: context.request.parameters.alert_msg
                    };
                    addAlertMessageToForm(form, alert, message);
                }

                context.response.writePage(form);
            } else if (context.request.method === 'POST') {
                const uploadFile = context.request.files[UPLOAD_FIELD_ID];

                // ### Start: Error checking and basic validation ###
                if (!uploadFile) {
                    // No file
                    addAlertMessageToForm(form, {
                        type: ALERT_TYPE.DANGER,
                        title: 'Upload Error',
                        msg: 'No file provided'
                    }, message);
                    context.response.writePage(form);

                    return;
                }

                const uploadType = uploadFile.fileType;
                if (uploadType !== file.Type.CSV) {
                    // Non-CSV file
                    addAlertMessageToForm(form, {
                        type: ALERT_TYPE.DANGER,
                        title: 'Invalid File Type',
                        msg: `You must provide a CSV file for import. Got ${uploadType} instead`
                    }, message);
                    context.response.writePage(form);

                    return;
                }

                const resources = readProjectResources(uploadFile, csvHelper);
                const validationErrors = validateResources(resources, query);
                if (validationErrors.length > 0) {
                    // Bad data
                    addErrorsToForm(form, serverWidget, validationErrors);
                    addAlertMessageToForm(form, {
                        type: ALERT_TYPE.DANGER,
                        title: 'Import Error',
                        msg: 'Unable to import resources. Check errors below and try again.'
                    }, message);
                    context.response.writePage(form);

                    return;
                }

                const script = runtime.getCurrentScript();
                /** @type {number} resourcesFolderId */
                const resourcesFolderId = script.getParameter({name: RESOURCES_FOLDER_ID_PARAM});
                if (!resourcesFolderId) {
                    // Data folder param not set in script deployment
                    log.error({
                        title: 'Missing Script Param',
                        details: `Script parameter: ${RESOURCES_FOLDER_ID_PARAM} must be set in script deployment.
                            This is the ID of the folder used to store data passed to the Map/Reduce import script.`
                    });
                    addAlertMessageToForm(form, {
                        type: ALERT_TYPE.DANGER,
                        title: 'Script Deployment Error',
                        msg: 'The data folder used by this script has not been set up. Please contact a Netsuite admin to let them know.'
                    }, message);
                    context.response.writePage(form);

                    return;
                }
                // ### End: Error checking and basic validation ###

                const currentUser = runtime.getCurrentUser();
                const notificationEmail = currentUser.email || '';
                const taskResults = submitResources(resources, resourcesFolderId, notificationEmail, file, task);
                log.debug({
                    title: 'Resource import started',
                    details: `Importing resources
                        resources count: ${resources.length} 
                        file ID: ${taskResults.taskId} 
                        task ID: ${taskResults.taskId} 
                        notify: ${notificationEmail}`
                });

                return redirect.toSuitelet({
                    scriptId: runtime.getCurrentScript().id,
                    deploymentId: runtime.getCurrentScript().deploymentId,
                    parameters: {
                        alert_type: ALERT_TYPE.INFO,
                        alert_title: 'Upload in Progress',
                        alert_msg: `Importing ${resources.length} resources. You will receive an email when the import is complete`
                    }
                });
            } else {
                throw error.create({
                    name: 'INVALID_HTTP_METHOD',
                    message: `Invalid method used for create/update Project Task Suitelet: ${context.request.method}`
                });
            }
        }

        return {onRequest}
    }
);
