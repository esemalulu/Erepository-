export default class QAAppNetSuiteHandler {
    constructor(restletUrl) {
        console.log('NetSuiteHandler');
        this.name = 'NetSuite Handler';
        this.restletUrl = restletUrl;
        console.log(restletUrl);
        this.https = undefined;
        const that = this;
        window.require(['N/https'], function (https) {
            that.https = https;
        })
    }
    getUrl(method, params) {
        let url = `${this.restletUrl}&method=${method}`;
        for (const key in params) {
            if (params.hasOwnProperty(key) && params[key]) {
                url += `&${key}=${params[key]}`;
            }
        }
        return url;
    }
    async getNetSuiteDataAsync(method, params) {
        console.log('getNetSuiteDataAsync');
        console.log(params);
        //await this.getHttps();
        const url = this.getUrl.call(this, method, params);
        console.log(url);
        const headers = {};
        headers['Content-Type'] = 'application/json';
        return this.https.get.promise({
            url,
            headers
        });
    }
    async executeTaskAsync(method, data) {
        //await this.getHttps();
        const url = this.suiteletUrl;
        const jsonText = JSON.stringify({'method': method, 'data': data});
        const headers = {};
        headers['Content-Type'] = 'application/json';
        return this.https.post.promise({
            url,
            headers,
            body: jsonText
        });
    }
    getNetSuiteData(method, callback, params) {
        const url = this.getUrl.call(this, method, params);
        const headers = {};
        headers['Content-Type'] = 'application/json';
        const response = this.https.get({
            url,
            headers
        });
        if (callback) {
            return callback(response.body);
        }
        return response.body;

    }

    postNetSuiteDataAsync(method, data) {
        const url = this.restletUrl;
        const jsonText = JSON.stringify({'method': method, 'data': data});
        const headers = {};
        headers['Content-Type'] = 'application/json';
        return this.https.post.promise({
            url,
            headers,
            body: jsonText
        });
    }
    
    deleteNetsuiteDataAsync(method, params) {
        const url = this.getUrl.call(this, method, params);
        const headers = {};
        headers['Content-Type'] = 'application/json';
        return this.https.delete.promise({
            url,
            headers
        });
    }
    
    getData(methodName, params) {
        return this.getNetSuiteDataAsync(methodName, params);
    }
}