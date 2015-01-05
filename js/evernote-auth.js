console.log("EVERNOTE DETECTED");
console.log(document.location.href);

var url = document.location.href,
    urlArray;

if (/chrome-read-later-extension/.test(url)) {
    urlArray = url.split("&");

    _.each(urlArray, function (param) {
        var ver;

        if (/oauth_verifier/.test(param)) {
            ver = param.split("=")[1];

            chrome.storage.local.set({
                oauth_verifier: ver
            }, function () {
                alert("please reopen empty tab");
            });
        }
    });
}
