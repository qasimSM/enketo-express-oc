module.exports = (grunt) => {
    const eslintInclude = [
        './*.md',
        '{.github,app,tutorials}/**/*.md',
        '**/*.js',
        '!.nyc_output',
        '!**/node_modules/**',
        '!test/client/forms/forms.js',
        '!public/js/build/*',
        '!docs/**',
        '!test-coverage/**',
        '!**/redirect-IE.js',
    ];
    const path = require('path');
    const nodeSass = require('node-sass');
    const pkg = require('./package');
    const ie11Bundles = pkg.entries.map((file) =>
        file.replace('/src/', '/build/')
    );

    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);

    let serverRootHooks;

    grunt.config.init({
        concurrent: {
            develop: {
                tasks: ['nodemon', 'watch'],
                options: {
                    logConcurrentOutput: true,
                },
            },
        },
        nodemon: {
            dev: {
                script: 'app.js',
                options: {
                    watch: ['app', 'config'],
                    // nodeArgs: [ '--debug' ],
                    env: {
                        NODE_ENV: 'development',
                        DEBUG: '*, -express:*, -send, -compression, -body-parser:*, -puppeteer:*',
                    },
                },
            },
        },
        sass: {
            options: {
                implementation: nodeSass,
            },
            compile: {
                cwd: 'app/views/styles',
                dest: 'public/css',
                expand: true,
                outputStyle: 'compressed',
                src: '**/*.scss',
                ext: '.css',
                flatten: true,
                extDot: 'last',
            },
        },
        watch: {
            sass: {
                files: ['app/views/styles/**/*.scss', 'widget/**/*.scss'],
                tasks: ['shell:clean-css', 'sass'],
                options: {
                    spawn: false,
                    livereload: true,
                },
            },
            jade: {
                files: ['app/views/**/*.pug'],
                options: {
                    spawn: false,
                    livereload: true,
                },
            },
            language: {
                files: [
                    'app/views/**/*.pug',
                    'app/controllers/**/*.js',
                    'app/models/**/*.js',
                    'public/js/src/**/*.js',
                ],
                tasks: ['shell:clean-locales', 'shell:translation', 'i18next'],
            },
            js: {
                files: ['public/js/src/**/*.js', 'widget/**/*.js'],
                tasks: ['shell:clean-js', 'js'],
                options: {
                    spawn: false,
                    livereload: true,
                },
            },
            mochaTest: {
                files: ['app/**/*.js', 'test/server/**/*.js'],
                tasks: ['test-server:all'],
                options: {
                    atBegin: true,
                },
            },
        },
        shell: {
            'polyfill-ie11': {
                command: [
                    'mkdir -p public/js/build && curl "https://polyfill.io/v3/polyfill.min.js?ua=ie%2F11.0.0&features=es2015%2Ces2016%2Ces2017%2Ces2018%2Cdefault-3.6%2Cfetch%2CNodeList.prototype.forEach" -o "public/js/build/ie11-polyfill.min.js"',
                    'cp -f node_modules/enketo-core/src/js/obscure-ie11-polyfills.js public/js/build/obscure-ie11-polyfills.js',
                    'cp -f node_modules/css.escape/css.escape.js public/js/build/css.escape.js',
                ].join('&&'),
            },
            'clean-css': {
                command: 'rm -f public/css/*',
            },
            'clean-locales': {
                command:
                    'find locales -name "translation-combined.json" -delete && rm -fr locales/??',
            },
            'clean-js': {
                command: 'rm -f public/js/build/* && rm -f public/js/*.js',
            },
            'clean-temp-ie11-js': {
                command:
                    'rm -f public/js/build/*ie11-browserify.js public/js/build/*ie11-babel.js public/js/build/*ie11-src.js',
            },
            translation: {
                command:
                    'echo "No automatic translation key generation at the moment."',
                // Does not work correctly yet for TError() calls and probably not for pug files either.
                // npx i18next -c ./i18next-parser.config.js
            },
            'rollup-ie11': {
                command: 'npx rollup --config rollup-ie11.config.js',
            },
            'babel-ie11': {
                command: ie11Bundles
                    .map((bundle) => bundle.replace('.js', '-ie11-src.js'))
                    .map(
                        (bundle) =>
                            `npx babel ${bundle} --config-file ./babel-ie11.config.js --out-file ${bundle.replace(
                                '-ie11-src.',
                                '-ie11-babel.'
                            )}`
                    )
                    .join('&&'),
            },
            'browserify-ie11': {
                command: ie11Bundles
                    .map((bundle) => bundle.replace('.js', '-ie11-babel.js'))
                    .map(
                        (bundle) =>
                            `npx browserify node_modules/enketo-core/src/js/workarounds-ie11.js ${bundle} -o ${bundle.replace(
                                '-ie11-babel.',
                                '-ie11-browserify.'
                            )}`
                    )
                    .join('&&'),
            },
            build: {
                command: 'node ./scripts/build.js',
            },
            nyc: {
                command:
                    'nyc --reporter html --reporter text-summary --reporter json --reporter lcov --report-dir ./test-coverage/server --include "app/**/*.js" grunt test-server:all',
            },
        },
        eslint: {
            check: {
                src: eslintInclude,
            },
            fix: {
                options: {
                    fix: true,
                },
                src: eslintInclude,
            },
        },
        // test server JS
        mochaTest: {
            all: {
                options: {
                    reporter: 'dot',

                    /**
                     * Note: `grunt-mocha-test` passes `options` directly to
                     * Mocha's programmable API rather than as CLI options.
                     * For whatever reason, this means that `require` doesn't
                     * allow registering root hooks as "Root Hooks".
                     *
                     * @see {@link https://mochajs.org/#root-hook-plugins}
                     *
                     * This is a workaround to pass the hooks directly.
                     */
                    get rootHooks() {
                        return serverRootHooks;
                    },
                },
                src: ['test/server/**/*.spec.js'],
            },
            account: {
                src: ['test/server/account-*.spec.js'],

                get rootHooks() {
                    return serverRootHooks;
                },
            },
        },
        // test client JS
        karma: {
            options: {
                singleRun: true,
                configFile: 'test/client/config/karma.conf.js',
                customLaunchers: {
                    ChromeHeadlessDebug: {
                        base: 'ChromeHeadless',
                        flags: ['--no-sandbox', '--remote-debugging-port=9333'],
                    },
                },
            },
            headless: {
                browsers: ['ChromeHeadless'],
            },
            browsers: {
                browsers: [
                    'Chrome',
                    'ChromeCanary',
                    'Firefox',
                    'Opera' /* ,'Safari' */,
                ],
            },
            watch: {
                browsers: ['ChromeHeadlessDebug'],
                options: {
                    autoWatch: true,
                    client: {
                        mocha: {
                            timeout: Number.MAX_SAFE_INTEGER,
                        },
                    },
                    reporters: ['dots'],
                    singleRun: false,
                },
            },
        },
        // IE11 only
        terser: {
            options: {
                // https://github.com/enketo/enketo-express/issues/72
                keep_classnames: true,
            },
            all: {
                files: ie11Bundles
                    .map((bundle) =>
                        bundle.replace('.js', '-ie11-browserify.js')
                    )
                    .map((bundle) => [
                        bundle.replace('-ie11-browserify.js', '-ie11.js'),
                        [bundle],
                    ])
                    .reduce((o, [key, value]) => {
                        o[key] = value;

                        return o;
                    }, {}),
            },
        },
        env: {
            develop: {
                NODE_ENV: 'develop',
            },
            test: {
                NODE_ENV: 'test',
            },
            production: {
                NODE_ENV: 'production',
            },
        },
        i18next: {
            locales: {
                cwd: 'locales/src/',
                expand: true,
                src: ['*/'],
                include: [
                    '**/translation.json',
                    '**/translation-additions.json',
                ],
                rename(dest, src) {
                    return `${dest + src}translation-combined.json`;
                },
                dest: 'locales/build/',
            },
        },
        replace: {
            // https://github.com/OpenClinica/enketo-express-oc/issues/426
            // widget.name is not working properly on IE 11 win 10
            'widgets-controller-ie11': {
                src: ['public/js/build/*-ie11-browserify.js'],
                overwrite: true,
                replacements: [
                    {
                        from: 'Widget.name',
                        to: 'Widget.selector',
                    },
                    {
                        from: 'have a name',
                        to: 'have a selector',
                    },
                ],
            },
        },
    });

    grunt.registerTask('test-server:all', function testServerAll() {
        const done = this.async();

        import('./test/server/shared/root-hooks.mjs').then(
            ({ default: rootHooks }) => {
                serverRootHooks = rootHooks;

                grunt.task.run('mochaTest:all');
                done();
            }
        );
    });

    grunt.registerTask('test-server:account', function testServerAccount() {
        const done = this.async();

        import('./test/server/shared/root-hooks.mjs').then(
            ({ default: rootHooks }) => {
                serverRootHooks = rootHooks;

                grunt.task.run('mochaTest:account');
                done();
            }
        );
    });

    grunt.registerTask('transforms', 'Creating forms.js', function () {
        const forms = {};
        const done = this.async();
        const formsJsPath = 'test/client/forms/forms.js';
        const xformsPaths = grunt.file.expand({}, 'test/client/forms/*.xml');
        const transformer = require('enketo-transformer');
        grunt.log.write('Transforming XForms ');
        xformsPaths
            .reduce(
                (prevPromise, filePath) =>
                    prevPromise.then(() => {
                        const xformStr = grunt.file.read(filePath);
                        grunt.log.write('.');

                        return transformer
                            .transform({
                                xform: xformStr,
                                openclinica: true,
                            })
                            .then((result) => {
                                forms[
                                    filePath.substring(
                                        filePath.lastIndexOf('/') + 1
                                    )
                                ] = {
                                    html_form: result.form,
                                    xml_model: result.model,
                                };
                            });
                    }),
                Promise.resolve()
            )
            .then(() => {
                grunt.file.write(
                    formsJsPath,
                    `export default ${JSON.stringify(forms, null, 4)};`
                );
                done();
            });
    });

    grunt.registerTask('widgets', 'generate widget reference files', () => {
        const WIDGETS_JS_LOC = 'public/js/build/';
        const WIDGETS_JS = `${WIDGETS_JS_LOC}widgets.js`;
        const WIDGETS_SASS_LOC = 'app/views/styles/component/';
        const WIDGETS_SASS = `${WIDGETS_SASS_LOC}_widgets.scss`;
        const PRE =
            '// This file is automatically generated with `grunt widgets`\n\n';
        const { widgets } = require('./app/models/config-model').server;
        const coreWidgets = require('./public/js/src/module/core-widgets');
        const paths = Object.keys(widgets).map(
            (key) => coreWidgets[widgets[key]] || widgets[key]
        );
        let num = 0;
        let content = `${
            PRE +
            paths
                .map((p) => {
                    if (grunt.file.exists(WIDGETS_JS_LOC, `${p}.js`)) {
                        num++;

                        return `import w${num} from '${p}';`;
                    }
                    return `//${p} not found`;
                })
                .join('\n')
        }\n\nexport default [${[...Array(num).keys()]
            .map((n) => `w${n + 1}`)
            .join(', ')}];`;
        grunt.file.write(WIDGETS_JS, content);
        grunt.log.writeln(`File ${WIDGETS_JS} created`);
        content = `${
            PRE +
            paths
                .map((p) => {
                    p = path.join('../', p);

                    return grunt.file.exists(WIDGETS_SASS_LOC, `${p}.scss`)
                        ? `@import "${p}"`
                        : `//${p} not found`;
                })
                .join(';\n')
        };`;
        grunt.file.write(WIDGETS_SASS, content);
        grunt.log.writeln(`File ${WIDGETS_SASS} created`);
    });

    grunt.registerTask('default', [
        'clean',
        'locales',
        'widgets',
        'sass',
        'js',
    ]);
    grunt.registerTask('clean', [
        'shell:clean-js',
        'shell:clean-css',
        'shell:clean-locales',
    ]);
    grunt.registerTask('locales', ['i18next']);
    grunt.registerTask('js', ['widgets', 'shell:build']);
    grunt.registerTask('js-ie11', [
        'shell:rollup-ie11',
        'shell:polyfill-ie11',
        'shell:babel-ie11',
        'shell:browserify-ie11',
        'replace:widgets-controller-ie11',
    ]);
    grunt.registerTask('build-ie11', [
        'js-ie11',
        'terser',
        'shell:clean-temp-ie11-js',
    ]);
    grunt.registerTask('test', [
        'env:test',
        'transforms',
        'js',
        'sass',
        'shell:nyc',
        'karma:headless',
        'eslint:check',
    ]);
    grunt.registerTask('test-browser', ['env:test', 'sass', 'karma:browsers']);
    grunt.registerTask('test-watch-client', ['env:test', 'karma:watch']);
    grunt.registerTask('test-watch-server', ['env:test', 'watch:mochaTest']);
    grunt.registerTask('develop', [
        'env:develop',
        'i18next',
        'js',
        'sass',
        'concurrent:develop',
    ]);
    grunt.registerTask('develop-ie11', [
        'env:develop',
        'i18next',
        'js-ie11',
        'sass',
        'concurrent:develop',
    ]);
    grunt.registerTask('test-and-build', [
        'env:test',
        'test-server:all',
        'karma:headless',
        'env:production',
        'default',
    ]);
};
