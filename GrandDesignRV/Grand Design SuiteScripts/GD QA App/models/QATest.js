/**
 * @NApiVersion 2.1
 */
define([],

    () => {

        /**
         * @class
         * @property {number} testId
         * @property {number} templateId
         * @property {number} typeId
         * @property {number} version
         * @property {string} date
         * @property {number} user
         * @property {number} unit
         * @property {boolean} systemsHold
         * @property {boolean} isCompleted
         * @property {boolean} toBePrinted
         * @property {number} status
         * @property {string} comments
         * @property {QATestLine[]} testLines
         */
        class QATest {
            constructor() {
                this.testId = 0;
                this.templateId = 0;
                this.typeId = 0;
                this.version = 1;
                this.date = '';
                this.user = 0;
                this.unit = 0;
                this.systemsHold = false;
                this.isCompleted = false;
                this.toBePrinted = false;
                this.status = 1;
                this.comments = '';
                this.testLines = [];
            }
        }

        return QATest;

    });
