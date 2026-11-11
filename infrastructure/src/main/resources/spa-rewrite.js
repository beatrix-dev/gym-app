// CloudFront Function (viewer request, JS 2.0): serve index.html for SPA routes, i.e. any URI whose last segment has no ".".
function handler(event) {
    var request = event.request;
    var lastSegment = request.uri.substring(request.uri.lastIndexOf('/') + 1);
    if (lastSegment.indexOf('.') === -1) {
        request.uri = '/index.html';
    }
    return request;
}
