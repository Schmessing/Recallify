export default function OCRAPITesting() {
    //console.log("hi");
    const ocrSpace = require('ocr-space-api-wrapper');

    const res1 = ocrSpace('http://dl.a9t9.com/ocrbenchmark/eng.png', { apiKey: 'K85413674888957'});

    console.log('Remote File Result: ', res1);
}
