import XPathJS from 'enketo-xpathjs';
import extendXPath from 'enketo-xpath-extensions-oc';

/**
 * @function xpath-evaluator-binding
 */
export default function () {
    const evaluator = new XPathJS.XPathEvaluator();

    extendXPath(XPathJS);

    XPathJS.bindDomLevel3XPath(this.xml, {
        window: {
            JsXPathException: true,
            JsXPathExpression: true,
            JsXPathNSResolver: true,
            JsXPathResult: true,
            JsXPathNamespace: true,
        },
        document: {
            jsCreateExpression(...args) {
                return evaluator.createExpression(...args);
            },
            jsCreateNSResolver(...args) {
                return evaluator.createNSResolver(...args);
            },
            jsEvaluate(...args) {
                return evaluator.evaluate(...args);
            },
        },
    });
}
