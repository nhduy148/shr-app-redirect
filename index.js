
// Written by Daniel Cohen Gindi
// danielgindi@gmail.com
// http://github.com/danielgindi/app-redirect

(function () {

    var queryString = {};
    var browserMovedToBackground = false;
    var isAndroid = /Android/.test(navigator.userAgent)
    var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)

    if(window.URLSearchParams) {
        queryString = Object.fromEntries(new URLSearchParams(window.location.href).entries())
    } else {
        (function (search) {
            
            search = (search || '').split(/[\&\?]/g);
            for (var i = 0, count = search.length; i < count; i++) {
                if (!search[i]) continue;
                var pair = search[i].split('=');
                queryString[pair[0]] = queryString[pair[0]] !== undefined ?
                    ([pair[1] || ''].concat(queryString[pair[0]])) : 
                    (pair[1] || '');
            }
            
        })(window.location.search);
    }

    // Listen to visibility change to prevent next url
    window.document.addEventListener("visibilitychange", function(e) {
        browserMovedToBackground = window.document.visibilityState === 'hidden' || window.document.visibilityState === 'unloaded';
    });
    window.addEventListener("blur", function(e) {
        browserMovedToBackground = true;
    });

    var AppRedirect = {
        /** 
         * @expose 
         * @public
         * */
        queryString: queryString,

        redirect: function (options) {

            var hasIos = !!(options.iosApp || options.iosAppStore);
            var hasAndroid = !!(options.android);
            var hasOverallFallback = !!(options.overallFallback);

            /**
            * What happens now is:
            * 1. We select the correct platform based on userAgent
            * 2. We try to open the app using the special schema
            *
            *    └───> If it succeded, the we have left the browser, and went to the app.
            *          *. If the user goes back to the browser at this stage, he will be sadly redirected to the second url (AppStore etc.)
            *    └───> If opening the app failed (schema not recognized), then:
            *          1. An error will be shown
            *          2. The user will be redirected to the second url.
            *          *.  Returning to the browser later will show the error.
            * 
            * For Android it's different. There's the intent:// url, which takes the "package" argument in order to fallback to the Store. 
            * But if you want to aggregate arguments to the store, you can use the "fallback" argument for that, and supply a Store url. 
            * QueryString arguments will be automatically aggregated.
            */

            var tryToOpenInMultiplePhases = function(urls) {

                browserMovedToBackground = false;

                var currentIndex = 0;
                var redirectTime = new Date();
                window.location = urls[currentIndex++];

                var next = function () {
                    if (urls.length > currentIndex) {
                        setTimeout(function () {

                            if (browserMovedToBackground) {
                                console.log('Browser moved to the background, we assume that we are done here')
                                return;
                            }

                            if (new Date() - redirectTime > 3000) {
                                console.log('Enough time has passed, the app is probably open');
                            } else {
                                redirectTime = new Date();
                                window.location = urls[currentIndex++];
                                next();
                            }

                        }, 10);
                    }
                };

                next();

            };

            // var chromeVersion = /Chrome\/([0-9\.]+)/.test(navigator.userAgent) ? navigator.userAgent.match(/Chrome\/([0-9\.]+)/)[1] : '';

            if (hasIos && isIOS) {

                var urls = [];
                if (options.iosApp) {
                    urls.push(options.iosApp);
                }
                if (options.iosAppStore) {
                    urls.push(options.iosAppStore);
                }
                tryToOpenInMultiplePhases(urls);

            } else if (hasAndroid && isAndroid) {
                var intentUrl
                // if(options.android.schemeUrl) {
                //     intentUrl = options.android.schemeUrl
                // } else {
                    var intent = options.android;
                    var intentUrl = [
                                        'intent://' + intent.host + '#Intent',
                                        'scheme=' + encodeURIComponent(intent.scheme),
                                        'package=' + encodeURIComponent(intent.package),
                                        intent.action ? 'action=' + encodeURIComponent(intent.action) : false,
                                        intent.category ? 'category=' + encodeURIComponent(intent.category) : false,
                                        intent.component ? 'component=' + encodeURIComponent(intent.component) : false,
                                        intent.fallback ? 'S.browser_fallback_url=' + encodeURIComponent(intent.fallback) : false,
                                        'end'
                                    ].filter(Boolean).join(';');
                // }
                console.log({intentUrl});
                var anchor = document.createElement('a');
                document.body.appendChild(anchor);
                anchor.href = intentUrl;
                console.log(intentUrl)
                if (anchor.click) {
                    anchor.click();
                } else {
                    window.location = intentUrl;
                }

            } else if(hasOverallFallback) {
                window.location = options.overallFallback;
            } else {
                console.log('Unknown platform and no overallFallback URL, nothing to do');
            }

        }
    };

    /** @expose */
    window.AppRedirect = AppRedirect;
    window.isAndroid = isAndroid;
    window.isIOS = isIOS;
})();