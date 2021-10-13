module.exports = function (config) {
  config.set({
    frameworks: ['mocha', 'karma-typescript'],

    plugins: ['karma-mocha', 'karma-typescript', 'karma-chrome-launcher'],

    browsers: ['ChromeHeadless'],

    preprocessors: {
      '**/*.ts': ['karma-typescript'],
    },

    files: ['test/*.spec.ts', 'test/util.ts', 'src/*.ts'],

    reporters: ['karma-typescript', 'dots'],

    client: {
      captureConsole: true,
      mocha: {
        bail: true,
      },
    },

    browserConsoleLogOptions: {
      terminal: true,
      level: '',
    },

    karmaTypescriptConfig: {
      compilerOptions: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        lib: ['dom'],
        moduleResolution: 'node',
        module: 'commonjs',
        target: 'es5',
      },
    },
  })
}
