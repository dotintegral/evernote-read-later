
var hostname = config.evernoteURL,
    tagName = config.readLaterTagName,
    oauth = OAuth({
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        callbackUrl: "chrome-read-later-extension",
        signatureMethod: "HMAC-SHA1",
    }),
    main,
    noteStore,
    authenticationToken,
    parseTags,
    findNotes,
    renderNotes,
    oauthFinalize,
    oauthSuccess,
    oauthGainAccess,
    oauthLogin;


chrome.storage.local.get(function (data) {
    if (data.edam_userId) {
        main(data);
    } else if (data.oauth_token == undefined || data.oauth_token_secret == undefined || data.oauth_verifier == undefined) {
        oauthLogin();
    } else {
        oauthFinalize(data);
    }
});

/*
 * Main logic
 */

main = function (data) {
    var noteStoreURL = decodeURIComponent(data.edam_noteStoreUrl);
        noteStoreTransport = new Thrift.BinaryHttpTransport(noteStoreURL),
        noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);

    tagName = data.tagName || tagName;
    authenticationToken = decodeURIComponent(data.oauth_token),
    noteStore = new NoteStoreClient(noteStoreProtocol);

    noteStore.listTags(authenticationToken,  
        parseTags,
        function (error) {
            console.log(error);
        }
    );
};

parseTags = function (tags) {
    foundTag = _.find(tags, function(tag) {
        return tag.name === tagName
    });

    var noteFilter = new NoteFilter({
        tagGuids: [foundTag.guid]
    });

    findNotes(noteFilter);
};

findNotes = function (noteFilter) {
    noteStore.findNotes(authenticationToken, noteFilter, 0, 50,
        renderNotes,
        function (error) {
            console.log(error);
        }
    );
};

renderNotes = function (noteList) {
    var template = $(".template").html(),
        container = $(".notes");

    _.each(noteList.notes, function (note) {
        var url = hostname + "/Home.action#n=" + note.guid + "&ses=4&sh=2&sds=5&";
            date = (new Date(note.updated)).toLocaleDateString(),
            html = template
                .replace("$title", note.title)
                .replace("$url", url)
                .replace("$date", date);

        container.append($(html));
    });
};

/*
 * OAuth logic
 */

oauthSuccess = function (arg) {
    var keyValues = arg.text.split("&"),
        response = {};

    _.each(keyValues, function(keyValue) {
        var sp = keyValue.split("=");
        response[sp[0]] = sp[1];
    });

    console.log(response);

    chrome.storage.local.set(response, function () {
        console.log("response saved");
    });
};

oauthFinalize = function (data) {
    oauth.setVerifier(data.oauth_verifier);
    oauth.setAccessToken([data.oauth_token, data.oauth_token_secret]);

    oauth.request({
        'method': 'GET', 
        'url': hostname + '/oauth', 
        'success': oauthSuccess,
        'failure': function () {
            console.log("fail", arguments);
        }
    });
};

oauthGainAccess = function (arg) {
    var keyValues = arg.text.split("&"),
        response = {};

    _.each(keyValues, function(keyValue) {
        var sp = keyValue.split("=");
        response[sp[0]] = sp[1];
    });

    chrome.storage.local.set(response, function () {
        window.location.href = hostname + "/OAuth.action?oauth_token=" + response.oauth_token;
    });
};

oauthLogin = function () {
    oauth.request({
        'method': 'GET', 
        'url': hostname + '/oauth', 
        'success': oauthGainAccess,
        'failure': function () {
            console.log("fail", arguments);
        }
    });
}
