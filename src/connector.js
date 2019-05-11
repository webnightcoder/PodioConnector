var podioSchema;
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


function getSchema(request) {
    var fields = getFields(request).build();
        podioSchema = fields;
    return {
        'schema':fields
    }
}

function getFields(request){
    var headers = {
        Authorization : "Bearer " + getOAuthService().getAccessToken()
    }
    var url = 'https://api.podio.com/app/' +request.configParams.app_id + '/';
    var result = UrlFetchApp.fetch(url, {headers : headers});
    var orgObj = []
    var context = JSON.parse(result.getContentText());
    var appFields  = context.fields;
    var cc = DataStudioApp.createCommunityConnector();
    var fields = cc.getFields();
    var types = cc.FieldType;
    var aggregations = cc.AggregationType;
    
    for(var i =0; i < appFields.length; i++){
        if(appFields[i].type == 'app' || appFields[i].type == 'text'){
            if(appFields[i].status == 'active'){
                fields.newDimension()
                    .setId(appFields[i].external_id)
                    .setName(appFields[i].label)
                    .setType(types.TEXT);
            }
        }else if(appFields[i].type == 'date'){
            if(appFields[i].status == 'active'){
                fields.newDimension()
                    .setId(appFields[i].external_id)
                    .setName(appFields[i].label)
                    .setType(types.YEAR_MONTH_DAY);
            }
        }else if(appFields[i].type == 'calculation'){
            if(appFields[i].status == "active"){

                fields.newMetric()
                .setId(appFields[i].external_id)
                .setName(appFields[i].label)
                .setType(types.NUMBER)
            }
        }else if(appFields[i].type == "number"){
            if(appFields[i].status == 'active'){
                fields.newMetric()
                .setId(appFields[i].external_id)
                .setName(appFields[i].label)
                .setType(types.NUMBER)
            }
        }else if(appFields[i].type == 'location'){
            if(appFields[i].status == 'active'){
                fields.newDimension()
                    .setId(appFields[i].external_id)
                    .setName(appFields[i].label)
                    .setType(types.TEXT);
            }
        }else if(appFields.type == 'catagory'){
            if(appFields[i].status == 'active'){
                fields.newDimension()
                    .setId(appFields[i].external_id)
                    .setName(appFields[i].label)
                    .setType(types.TEXT);
            }
        }
    }

    return fields;
}


function getData(request) {
    // Create schema for requested fields
    console.log("Request :" + JSON.stringify(request));
    console.log("GET DATA " + podioSchema);
    var requestedSchema = request.fields.map(function(field) {
      for (var i = 0; i < podioSchema.length; i++) {
        if (podioSchema[i].name == field.name) {
          return podioSchema[i];
        }
      }
    });
    console.log("requested Schema is : " + JSON.stringify(requestedSchema));
  
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
        // tempObj['item_id'] = item_id;
        for(var j =0; j < fields.length; j++){
            // if(fields[i].external_id == )
        }
        itemData.push(tempObj);
        tempObj = {};
    }
  
    return {
      schema: requestedSchema,
      rows: itemData
    };
}


