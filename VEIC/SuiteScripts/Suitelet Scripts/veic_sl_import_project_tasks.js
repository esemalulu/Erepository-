/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * 
 * Provides a form with a file input field for selecting a CSV of Project Tasks
 * to import. Creates or updates the project tasks provided in the CSV.
 */

const FORM_TITLE = 'Create/Update Project Tasks';
const CLIENT_MODULE_PATH = 'SuiteScripts/Client Scripts/veic_cs_task_and_resource_import.js';
const UPLOAD_FIELD_ID = 'custpage_proj_task_input';
const ALERT_TYPE = {
    SUCCESS: 'success',
    INFO: 'info',
    WARNING: 'warning',
    DANGER: 'danger',
};

// To avoid going over governance limits, cap the number of tasks.
// If we want deal with this in more robust way, move processing to a Map/Reduce Script
const MAX_TASK_IMPORT = 50;

// Even though status are stored as a string, they still effectively have an ID, use
// this map to convert from the user-friendly version to the ID of the status
const TASK_STATUS_MAP = new Map();
TASK_STATUS_MAP.set("Completed", "COMPLETE");
TASK_STATUS_MAP.set("In Progress", "PROGRESS");
TASK_STATUS_MAP.set("Not Started", "NOTSTART");

/**
 * @typedef UserAlert
 * @property {string} type - use ALERT_TYPE enum
 * @property {string} title
 * @property {string} msg
 */

/**
 * POD for intermediately storing ProjectTask data before creating the actual records.
 * Performs some basic validation of user provided to data.
 * 
 * Note: fields in the uploaded CSV file use slightly more user-friendly names than
 * the actual field IDs of the Project Task record
 */
class ProjectTask {
    static REQUIRED_FIELDS = [
        'externalId',
        'title',
        'project',
        'status',
        'constraintType',
        'plannedWork',
        'startDate', // should this actually be required?
        // 'endDate'
    ];
    static STATUSES = [
        'Completed',
        'In Progress',
        'Not Started'
    ];

    constructor(data = {}) {
        /** @type {string[]} */
        this.validationErrors = [];

        /** @type {number | null} */
        this.id = data.taskId ? data.taskId : null;

        /** @type {boolean} */
        this.isParent = false;

        /** @type {string | null} */
        this.externalId = data.externalId ? data.externalId : null;

        /** @type {string} */
        this.title = data.title ?? '';

        /** @type {number | null} */
        this.project = data.projectId ? data.projectId : null;

        /** @type {number | null} */
        this.parent = data.parentTaskId ? data.parentTaskId : null;

        /** @type {string | null} */
        this.parentName = data.parentTaskName ? data.parentTaskName : null;

        /** @type {string} */
        this.status = data.status ? data.status : 'In Progress';

        /** @type {boolean} */
        this.nonBillableTask = data.nonBillable ? data.nonBillable === 'TRUE' : false;

        /** @type {string} */
        this.constraintType = data.constraintType ? data.constraintType : 'As Soon As Possible';

        /** @type {number} */
        this.plannedWork = data.plannedWork ? data.plannedWork : 0.0;

        /** @type {Date | null} */
        this.startDateTime = null;

        /** @type {Date | null} */
        this.endDate = null;

        /** @type {boolean} */
        this.isValidated = false;

        const startDate = data.startDate ? parseDate(data.startDate) : null;
        if (startDate === null && data.startDate) {
            this.validationErrors.push(`startDate must be in mm/dd/yyyy format, got: ${data.startDate}`);
        } else {
            this.startDateTime = startDate;
        }

        const endDate = data.endDate ? parseDate(data.endDate) : null;
        if (endDate === null && data.endDate) {
            this.validationErrors.push(`endDate must be in mm/dd/yyyy format, got: ${data.endDate}`);
        } else {
            this.endDate = endDate;
        }
    }

    /**
     * Get the full name of the task including the project it belongs to. This uniquely identifies
     * the task since multiple projects might have tasks with the same name.
     * 
     * @returns {string}
     */
    fullName() {
        return `${this.project}_${this.title}`;
    }

    /**
     * Get the full name of the parent task including the project it belongs to. This uniquely identifies
     * the parent task since multiple projects might have tasks with the same name.
     * 
     * @returns {string}
     */
    parentFullName() {
        return `${this.project}_${this.parentName}`;
    }

    /**
     * Return the fields used by Netsuite's Project Task record
     * 
     * ## A note on external ID ##
     * custevent_veic_external_id is a user editable external ID that is synced 
     * with standard externalId. If you don't set this field, it will overwrite the regular external ID
     * with null.
     * 
     * @returns {Object}
     */
    netsuiteFields() {
        return {
            id:              this.id,
            externalId:      this.externalId,
            title:           this.title,
            company:         this.project,
            parent:          this.parent,
            status:          TASK_STATUS_MAP.get(this.status),
            plannedwork:     this.isParent ? 0 : this.plannedWork, // Parent tasks are containers only -- no planned work is allowed
            nonBillableTask: this.nonBillableTask,
            constraintType:  this.constraintType,
            startdate:       this.startDateTime,
            enddate:         this.endDate,
            custevent_veic_external_id: this.externalId, // Custom, user-editable external ID field
        };
    }

    /**
     * Check that the required fields are set. Store any errors
     */
    validate() {
        for (const f of ProjectTask.REQUIRED_FIELDS) {
            if (this[f] === null) {
                this.validationErrors.push(`A value must be provided for ${f}, null given`);
            }

            if (f === 'title' && this.title === '') {
                this.validationErrors.push('Project task title must not be blank');
            }
        }

        if (!ProjectTask.STATUSES.includes(this.status)) {
            const validStatuses = ProjectTask.STATUSES.join(', ');
            this.validationErrors.push(`Invalid status provided for ${this.title}: ${this.status}. Status must be one of: ${validStatuses}`);
        }

        if (this.parent !== null && this.parentName !== null) {
            this.validationErrors.push(`Parent ID and name both set for ${this.title}. Must only provide parent name or id, not both.`);
        }

        if (!this.isParent && this.plannedWork <= 0.0) {
            this.validationErrors.push(`Planned work must be greater than 0 for task ${this.title}`);
        }

        this.isValidated = true;
    }

    /**
     * Were there any errors during validating the user provided data?
     * 
     * @returns {boolean}
     */
    isValid() {
        if (!this.isValidated) {
            this.validate();
        }

        return this.validationErrors.length === 0;
    }
}

/**
 * TaskManager is responsible for
 * 
 * - parsing CSV data into ProjectTasks
 * - sorting tasks into a graph to ensure parents are created before children, 
 * - creating new Netsuite Task records
 * - updating existing Netsuite Task records
 */
class TaskManager {
    /**
     * @param {record} record // N/record module
     * @param {log} log       // N/log module
     * @param {error} error   // N/error module
     * @param {CallableFunction} readCsv // veic_csv_reader.readCsv
     */
    constructor(record, log, error, readCsv) {
        this.record = record;
        this.log = log;
        this.error = error;
        this.readCsv = readCsv;

        /**
         * Dictionary of task names to tasks
         * 
         * TODO: maybe refactor as Map?
         * 
         * @type {Object.<string, ProjectTask>}
         */
        this.tasks = {};

        /**
         * Dictionary of task names to task IDs
         * 
         * @type {Map<string, number>}
         */
        this.createdTasks = new Map();

        /** @type {string[]} */
        this.errors = [];
    }

    /**
     * Read the uploaded CSV and convert rows into Project Task objects
     * 
     * @param {Object} csvFile
     */
    load(csvFile) {
        const rows = this.readCsv(csvFile);
        for (const row of rows) {
            const task = new ProjectTask(row);
            if (this.tasks.hasOwnProperty(task.fullName())) {
                this.errors.push(`Attempted to upload multiple tasks with the name ${task.title} for project: ${task.project}`);
            }

            this.tasks[task.fullName()] = task;            
        }

        // Identify parent tasks
        Object.values(this.tasks).forEach(t => {
            if (t.parentName && this.tasks.hasOwnProperty(t.parentFullName())) {
                this.tasks[t.parentFullName()].isParent = true;
            }
        });

        this.validateTasks();
    }

    /**
     * Check that each task is valid and that there is a parent for any task that has a named parent.
     */
    validateTasks() {
        for (const task of Object.values(this.tasks)) {
            if (!task.isValid()) {
                const errorDetails = task.validationErrors.join('; ');
                this.errors.push(`The data provided for ${task.title} is invalid: ${errorDetails}`);
            }

            if (task.parentName !== null && !this.tasks.hasOwnProperty(task.parentFullName())) {
                this.errors.push(`Task ${task.title} has a parent with the name ${task.parentName} but that task could not be found for project ${task.project}`);
            }
        }
    }

    /**
     * Create each task record in order of parent --> children
     * 
     * @returns {number} the number of tasks that were created/updated
     */
    processTasks() {
        if (!this.tasksAreValid()) {
            throw new this.error.create({
                name: 'INVALID_TASKS',
                message: 'Attempted to process invalid tasks. Did you forget to check tasksAreValid() before processing?'
            });
        }

        for (const task of Object.values(this.tasks)) {
            this.ensureCreated(task);
        }

        return this.createdTasks.size;
    }

    /**
     * Makes sure that a task and it's parents are created in order. Before creating a task record, first
     * checks if the parent has been created and will take care of that first. This ensures that relationships
     * between parent and child tasks are set properly.
     * 
     * @param {ProjectTask} task 
     */
    ensureCreated(task) {
        if (this.createdTasks.has(task.fullName())) {
            return;
        }

        if (task.parentName !== null && task.parent === null) {
            // task has a parent but doesn't know the id yet, make sure the parent record has been created first
            this.ensureCreated(this.tasks[task.parentFullName()]);
            task.parent = this.tasks[task.parentFullName()].id;
        }

        const taskId = this.createOrUpdateTaskRecord(task);
        this.tasks[task.fullName()].id = taskId;
        this.createdTasks.set(task.fullName(), taskId);
    }

    /**
     * Create or update the Project Task record on the server.
     * 
     * - If no task ID is provided then a new one will be created
     * - If an ID for the task is provided then it will be loaded from the server and updated
     * - If a task ID is provided but no task exists for that ID, throws an exception
     * 
     * @param {ProjectTask} task 
     * @returns {number} the internal id of the created or update task
     */
    createOrUpdateTaskRecord(task) {
        let taskRecord;
        let action;
        if (task.id) {
            try {
                taskRecord = this.record.load({
                    type: this.record.Type.PROJECT_TASK,
                    id: task.id
                });
                action = 'updated';
            } catch (e) {
                // TODO: in order to keep imports atomic, we should probably check if any tasks for update exist before
                // starting to update/create records.
                throw this.error.create({
                    name: "TASK_NOT_FOUND",
                    message: `Project task does not exist for ID: ${task.id}`
                });
            }
        } else {
            taskRecord = this.record.create({
                type: this.record.Type.PROJECT_TASK,
            });
            action = 'created';
        }

        for (const [field, val] of Object.entries(task.netsuiteFields())) {
            if (val === null) {
                // TODO: might want to actually set nulls when updating existing tasks.
                // For new tasks though this simplifies things.
                continue;
            }

            taskRecord.setValue({
                fieldId: field,
                value: val
            });
        }

        // const id = getMockTaskId();
        const id = taskRecord.save({});
        this.log.debug({
            title: `Task ${action}`,
            details: `Task ID: ${id}`
        });

        return id;
    }

    /**
     * Get the number of tasks that have been loaded
     * 
     * @returns {number}
     */
    taskCount() {
        return Object.values(this.tasks).length;
    }

    /**
     * Returns true if there were no task validation errors or errors thrown
     * while instantiating ProjectTasks
     * 
     * @returns {boolean}
     */
    tasksAreValid() {
        return this.errors.length === 0;
    }
}

/**
 * A useful little function for testing if you need to simulate saving
 * a task but don't actually want to save it to the database.
 * 
 * Doesn't really guarantee unique IDs but close enough for simple testing.
 * 
 * @returns {number} a pseudo random ID
 */
function getMockTaskId() {
    const getRandomInt = (min, max) => {
        const minCeiled = Math.ceil(min);
        const maxFloored = Math.floor(max);
        
        return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
    };
    
    return getRandomInt(1, 99999);
}

/**
 * Convert a list of errors to an HTML unordered list
 * 
 * @param {string[]} errors
 * @returns {string}
 */
function makeErrorList(errors) {
    let errorUl = `
            <ul>
                ${errors.map(e => `<li>${e}</li>`).join('\n')}
            </ul>
        `;

    return errorUl;
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
 * Parse a date string in mm/dd/yyyy format. I'm expecting that since import files will be
 * created in Excel, we can assume dates to be in this format.
 * 
 * @param {string} dateStr 
 * @returns {Date | null} the date or null if invalid date string provided
 */
function parseDate(dateStr) {
    const dateParts = dateStr.split('/').map(Number);
    if (dateParts.length !== 3) {
        return null;
    }

    return new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);
}

// @ts-ignore
define(
    [
        'N/log',
        'N/ui/serverWidget',
        'N/record',
        'N/error',
        'N/runtime',
        'N/redirect',
        'N/file',
        'N/ui/message',
        '/SuiteScripts/Lib/veic_csv_helper'
    ],
    /**
     * @typedef log
     * @typedef serverWidget
     * @typedef record
     * @typedef error
     * @typedef runtime
     * @typedef redirect
     * @typedef file
     * @typedef message
     * @typedef veic_csv_helper
     * @typedef serverWidget.Form
     * @typedef ServerRequest
     * @typedef ServerResponse
     * 
     * @param {log} log
     * @param {serverWidget} serverWidget
     * @param {record} record
     * @param {error} error
     * @param {runtime} runtime
     * @param {redirect} redirect
     * @param {file} file
     * @param {redirect} message
     * @param {veic_csv_helper} csvHelper
     */
    (log, serverWidget, record, error, runtime, redirect, file, message, csvHelper) => {
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
                if (!uploadFile) {
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
                    addAlertMessageToForm(form, {
                        type: ALERT_TYPE.DANGER,
                        title: 'Invalid File Type',
                        msg: `You must provide a CSV file for import. Got ${uploadType} instead`
                    }, message);
                    context.response.writePage(form);

                    return;
                }

                const taskManager = new TaskManager(record, log, error, csvHelper.readCsv);
                taskManager.load(uploadFile);
                if (taskManager.taskCount() > MAX_TASK_IMPORT) {
                    addAlertMessageToForm(form, {
                        type: ALERT_TYPE.WARNING,
                        title: 'Over Import Limit',
                        msg: `Import aborted. Attempted to import too many tasks. Maximum allowed for single upload is ${MAX_TASK_IMPORT}.`
                    }, message);
                    context.response.writePage(form);

                    return;
                }

                if (!taskManager.tasksAreValid()) {
                    addAlertMessageToForm(form, {
                        type: ALERT_TYPE.DANGER,
                        title: 'Invalid Tasks',
                        msg: `Could not import Project Tasks. See errors below.
                            <br /> ${makeErrorList(taskManager.errors)}`
                    }, message);
                    context.response.writePage(form);

                    return;
                }
                
                try {
                    const importCount = taskManager.processTasks();
                    return redirect.toSuitelet({
                        scriptId: runtime.getCurrentScript().id,
                        deploymentId: runtime.getCurrentScript().deploymentId,
                        parameters: {
                            alert_type: ALERT_TYPE.SUCCESS,
                            alert_title: 'Import Complete',
                            alert_msg: `Success! ${importCount} Project Tasks imported.`
                        }
                    });
                } catch (e) {
                    log.error({title: 'Unexpected error', details: e.message});

                    return redirect.toSuitelet({
                        scriptId: runtime.getCurrentScript().id,
                        deploymentId: runtime.getCurrentScript().deploymentId,
                        parameters: {
                            alert_type: ALERT_TYPE.DANGER,
                            alert_title: 'Unexpected Error',
                            alert_msg: `Unable to import tasks due to an unexpected error: ${e.message}`
                        }
                    });
                }
            } else {
                throw error.create({
                    name: 'INVALID_HTTP_METHOD',
                    message: `Invalid method used for create/update Project Task Suitelet: ${context.request.method}`
                });
            }
        }

        return { onRequest };
    }
);
