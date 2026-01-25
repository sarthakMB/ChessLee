export default function (req, res, next) { 
    console.log("Request: =================================================================== ",req.method, req.url);
    next();
}