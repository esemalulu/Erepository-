
function zc_run_srp_relatedprojects_scheduled() {

    try {
        //get parameter
        var context = nlapiGetContext();
        var projectInternalId = context.getSetting('SCRIPT', 'custscript_projectinternalid');
        nlapiLogExecution('DEBUG', '-started-');
        nlapiLogExecution('DEBUG', 'got project id ' + projectInternalId);

        //init relatedProjectIDs array
        var relatedProjectIDs = [];
        relatedProjectIDs.push(projectInternalId.toString());

        //load project record, collect related projects
        var projectRecord = nlapiLoadRecord('job', projectInternalId);
        var related = projectRecord.getFieldValues('custentityr7relatedprojects');
        for (var i = 0; i < related.length; i++) {
            relatedProjectIDs.push(related[i]);
        }
        nlapiLogExecution('DEBUG', 'projects related to project id ' + projectInternalId, JSON.stringify(related));

        //tie other projects to each other
        for (var i = 0; i < relatedProjectIDs.length; i++) {
            if (i > 0) {
                var currentProject = nlapiLoadRecord('job', relatedProjectIDs[i]);
                var projectsToRelate = relatedProjectIDs.slice(0);
                projectsToRelate.splice(projectsToRelate.indexOf(relatedProjectIDs[i]), 1);
                currentProject.setFieldValues('custentityr7relatedprojects', projectsToRelate);
                nlapiSubmitRecord(currentProject);
                nlapiLogExecution('DEBUG', 'updating project id ' + relatedProjectIDs[i], 'tied to ' + JSON.stringify(projectsToRelate));
                
            }
        }

        nlapiLogExecution('DEBUG', '-finished-');
    }
    catch (e) {
        nlapiLogExecution('ERROR', 'Error processing project id ' + projectInternalId, JSON.stringify(e));
    } 
}