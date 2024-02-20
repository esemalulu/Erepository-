import QAAppNetSuiteHandler from './QAAppNetSuiteHandler';
import QAAppDataHandler from './QAAppDataHandler';
import QAAppUI from './QAAppUI';
import QAMainController from './controllers/QAMainController';

let netSuiteHandler, dataHandler, qaAppController;

class QAAppMain {
    constructor(props) {
        this.restletUrl = $('#restleturl').val();
        this.controllers = [];
    }

    loadModules() {
        console.log('loadModules');
        netSuiteHandler = new QAAppNetSuiteHandler(this.restletUrl);
        window.netSuiteHandler = netSuiteHandler;
        dataHandler = new QAAppDataHandler();
        window.dataHandler = dataHandler;
        // start the process.
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({
                    restletUrl: this.restletUrl
                });
            }, 50);
        });
    }

    initalize() {
        console.log('loading');
        const mainPromise = this.loadModules();
        mainPromise.then(function (response) {
            return response;
        }).then(result => {
            return dataHandler.createTestTypesStore();
        }).then(result => {
            return dataHandler.createLocationsStore();
        }).then(r => {
            qaAppController = new QAMainController(this, dataHandler);
            window.qaAppController = qaAppController;
            //return qaAppController.createStaticElements();
        });
    }
}

window.qaApp = QAAppMain;