const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const builtins = require('rollup-plugin-node-builtins');
const globals = require('rollup-plugin-node-globals');
const alias = require('rollup-plugin-alias');
const path = require('path');
const pkg = require('./package');

const aliases = Object.entries(pkg.browser).reduce((arr, cur) => {
    // IE11 mod
    const alias =
        cur[0] === 'enketo/xpath-evaluator-binding'
            ? './public/js/src/module/xpath-evaluator-binding-ie11'
            : cur[1];
    arr.push({
        find: cur[0],
        replacement: path.join(__dirname, alias),
    });

    return arr;
}, []);

const plugins = [
    alias({
        entries: aliases,
    }),
    resolve({
        browser: true, // Default: false
        preferBuiltins: true, // Explicit due to bug https://github.com/rollup/rollup-plugin-node-resolve/issues/196
    }),
    commonjs({
        include: 'node_modules/**', // Default: undefined
        sourceMap: false, // Default: true
    }),
    builtins(),
    globals(),
];

const onwarn = (warning) => {
    // Silence circular dependency warning for jszip and rollup-plugin-node-builtins
    if (
        warning.code === 'CIRCULAR_DEPENDENCY' &&
        (warning.importer.indexOf('node_modules/jszip/') !== -1 ||
            warning.importer.indexOf(
                'node_modules/rollup-plugin-node-builtins/'
            ) !== -1)
    ) {
        return;
    }

    console.warn(`(!) ${warning.message}`);
};

const ie11Bundles = pkg.entries.map((file) => file.replace('/src/', '/build/'));

const configs = ie11Bundles.map((entryFile, i) => ({
    input: entryFile,
    output: {
        // IE11 mod
        file: ie11Bundles[i].replace('.js', '-ie11-src.js'),
        format: 'iife',
    },
    plugins,
    onwarn,
}));

module.exports = configs;
