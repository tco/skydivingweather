
var url = require("url");

function formatFmiUrl(options) {
    options.query.request = "getFeature";
    return url.format({
        protocol: "http",
        pathname: "/fmi-apikey/" + options.apikey + "/wfs",
        hostname: "data.fmi.fi",
        query: options.query
    });
}

module.exports = formatFmiUrl;
