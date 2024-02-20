/**
 * @NApiVersion 2.1
 */
define([],

    () => {

        /**
         * @class
         * @property {number} templateLineId
         * @property {number} categoryId
         * @property {string} categoryName
         * @property {number} flatRate
         * @property {boolean} value
         * @property {number} sortOrder
         * @property {string} name
         * @property {number} code
         * @property {number} testLineId
         * @property {string} notes
         * @property {string} qaFailedImageUrl
         * @property {number} qaFailedImageId
         * @property {number} reasonCodeId
         * @property {boolean} fixed
         * @property {string} fixedUser
         * @property {number} fixedUserId
         * @property {string} fixedDate
         */
        class QATestLine {
            constructor() {
                this.templateLineId = 0
                this.categoryId = 0
                this.categoryName = ''
                this.flatRate = 0
                this.value = false
                this.sortOrder = 1
                this.name = ''
                this.code = 0
                this.testLineId = 0
                this.notes = ''
                this.qaFailedImageUrl = ''
                this.qaFailedImageId = 0
                this.reasonCodeId = 0
                this.fixed = false
                this.fixedUser = ''
                this.fixedUserId = 0
                this.fixedDate = ''
            }
        }

        return QATestLine;

    });
