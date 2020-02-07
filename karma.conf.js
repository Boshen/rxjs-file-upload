module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'karma-typescript', 'es6-shim'],

    browsers: ['PhantomJS'],

    preprocessors: {
      '**/*.ts': ['karma-typescript']
    },

    files: [
      'test/*.spec.ts',
      'test/util.ts',
      'src/*.ts'
    ],

    reporters: ['dots'],

    client: {
      captureConsole: true,
      mocha: {
        bail: true
      }
    },

    browserConsoleLogOptions: {
      terminal: true,
      level: ''
    },

    karmaTypescriptConfig: {
      compilerOptions: {
        allowSyntheticDefaultImports: true,
        declaration: false,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        module: 'commonjs',
        moduleResolution: 'node',
        newLine: 'LF',
        noImplicitReturns: true,
        noImplicitThis: true,
        noUnusedLocals: false,
        noUnusedParameters: true,
        outDir: 'dist',
        removeComments: true,
        rootDir: './',
        sourceMap: true,
        suppressImplicitAnyIndexErrors: true,
        target: 'es5'
      }
    }
  });
};
