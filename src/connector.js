
function getAuthType() {
    var response = {
      type: 'OAUTH2'
    };
    return response;
}
var getOAuthService = function() {
    var scriptProps = PropertiesService.getScriptProperties();
    return OAuth2.createService('Podio')
                .setAuthorizationBaseUrl('https://podio.com/oauth/authorize')
                .setTokenUrl('https://podio.com/oauth/token')
                .setClientId('podio-connector-220bvh')
                .setClientSecret('meRpc8a76owj3pOLH2eq2QiMR7fv1QB6V8eCToO8i7yb6mh8D7YqnuzJUxEpISQZ')
                .setPropertyStore(PropertiesService.getUserProperties())
                .setScope('granted_scope_string')
                .setCallbackFunction('authCallback');
};

function authCallback(request) {
    var authorized = getOAuthService().handleCallback(request);
    if (authorized) {
        return HtmlService.createHtmlOutput('Success! You can close this tab.');
    } else {
        return HtmlService.createHtmlOutput('Denied. You can close this tab');
    }
}

function isAuthValid() {
    var service = getOAuthService();
    if (service == null) {
        return false;
    }
    return service.hasAccess();
}

function get3PAuthorizationUrls() {
    var service = getOAuthService();
    if (service == null) {
      return '';
    }
    return service.getAuthorizationUrl();
}

function resetAuth() {
    var service = getOAuthService();
    service.reset();
}

function getConfig(request) {
    var cc = DataStudioApp.createCommunityConnector();
    var config = cc.getConfig();
    
    config
        .newTextInput()
        .setId('org_id')
        .setName('org_id')
        .setHelpText('Enter the Id of Orgnization')
        .setAllowOverride(true)
        .setPlaceholder('Enter the Id of Orgnization')

    config
        .newTextInput()
        .setId('space_id')
        .setName('space_id')
        .setHelpText('Enter the id of space')
        .setAllowOverride(true)
        .setPlaceholder('Enter the id of space')
    
    config
        .newTextInput()
        .setId('app_id')
        .setName('app_id')
        .setHelpText('Enter the id of app')
        .setAllowOverride(true)
        .setPlaceholder('Enter the id of app')
    
    config.setDateRangeRequired(false);
    return config.build();
}
var podioSchema;
function getSchema(request) {
    var reqSchema =  getDynamicSchema(request.configParams.app_id);
    podioSchema = reqSchema;
    return {
        schema : reqSchema
    }

}

function getData(request) {
    // Create schema for requested fields
    var requestedSchema = request.fields.map(function(field) {
      for (var i = 0; i < podioSchema.length; i++) {
        if (podioSchema[i].name == field.name) {
          return podioSchema[i];
        }
      }
    });
  
    // Fetch and parse data from API
    var headers = {
        Authorization : "Bearer " + getOAuthService().getAccessToken()
    }
    var url = 'https://api.podio.com/item/app/'+request.configParams.app_id+'/';
    var result = UrlFetchApp.fetch(url, {headers : headers});
    var context = JSON.parse(result.getContentText());
    var items = context.items;
    var itemData = [];
    for(var i =0 ; i < items.length; i++){
        var item_id = items[i].item_id;
        var fields = items[i].fields;
        var tempObj = {};
        tempObj['item_id'] = item_id;
        for(var j =0; j < fields.length; j++){
            var external_id = fields[j].external_id;
            
            if(fields[j].type == 'text'){
                tempObj[external_id] = fields[j].values[0].value;
            }else if(fields[j].type == 'app'){
                
                 tempObj[external_id]  = fields[j].values[0].value.item_id;

            }else if(fields[j].type == 'date'){

                tempObj[external_id]  = (fields[j].values[0].start_date).split('-').join('');

            }else if(fields[j].type == 'calculation'){

                tempObj[external_id]  = fields[j].values[0].value;

            }else if(fields[j].type == "number"){
                tempObj[external_id]  = parseInt(fields[j].values[0].value);

            }else if(fields[j].type == 'location'){
                tempObj[external_id]  = fields[j].values[0].value;

            }else if(fields[j].type == 'catagory'){

                tempObj[external_id]  = fields[j].values[0].value.id;
            }
        }
        itemData.push(tempObj);
        tempObj = {};
    }
  
    return {
      schema: requestedSchema,
      rows: itemData
    };
}


function getDynamicSchema(app_id){
    var self = this;
    var apiKey  = getOAuthService().getAccessToken();
    var headers = {
        Authorization : "Bearer " + apiKey
    }
    console.log('apiKey Is : ' + apiKey );
    var url = 'https://api.podio.com/app/'+app_id + '/';
    var result = UrlFetchApp.fetch(url, {headers : headers});
    var orgObj = []
    var context = JSON.parse(result.getContentText());
    var fields  = context.fields;
    var schema = [];
    schema.push({
        name  : 'item_id',
        dataType : "NUMBER",
        semantics: {
            conceptType: 'DIMENSION'
        }
    })
    for(var i =0; i < fields.length; i++){
        if(fields[i].type == 'app' || fields[i].type == 'text'){
            if(fields[i].status == 'active'){
                schema.push({
                    name  : fields[i].external_id,
                    label :fields[i].external_id,
                    dataType : "STRING",
                    semantics: {
                        conceptType: 'DIMENSION'
                    }
                })
            }
        }else if(fields[i].type == 'date'){
            if(fields[i].status == 'active'){
                schema.push({
                    name  : fields[i].external_id,
                    label  : fields[i].external_id,
                    dataType : "DATE",
                    semantics: {
                        'conceptType': 'METRIC'
                    }
                })
            }
        }else if(fields[i].type == 'calculation'){
            if(fields[i].status == "active"){
                schema.push({
                    name  : fields[i].external_id,
                    label  : fields[i].external_id,
                    dataType : "NUMBER",
                    semantics: {
                        conceptType: 'METRIC',
                    }
                })
            }
        }else if(fields[i].type == "number"){
            if(fields[i].status == 'active'){
                schema.push({
                    name  : fields[i].external_id,
                    label  : fields[i].external_id,
                    dataType : "NUMBER",
                    semantics: {
                        conceptType: 'METRIC',
                    }
                })
            }
        }else if(fields[i].type == 'location'){
            if(fields[i].status == 'active'){
                schema.push({
                    name  : fields[i].external_id,
                    label  : fields[i].external_id,
                    dataType : "STRING",
                    semantics: {
                        conceptType: 'DIMENSION'
                    }
                })
            }
        }else if(fields.type == 'catagory'){
            if(fields[i].status == 'active'){
                schema.push({
                    name  : fields[i].external_id,
                    label  : fields[i].external_id,
                    dataType : "STRING",
                    semantics: {
                        conceptType: 'DIMENSION'
                    }
                })
            }
        }
    }
    return schema;
}