webpackJsonp([1],{

/***/ "6sO2":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var upload_1 = __webpack_require__("cQcD");
exports.upload = upload_1.upload;
var chunkUpload_1 = __webpack_require__("hfOd");
exports.chunkUpload = chunkUpload_1.chunkUpload;
var handleClick_1 = __webpack_require__("ZG0H");
exports.handleClick = handleClick_1.handleClick;
var handlePaste_1 = __webpack_require__("lRq6");
exports.handlePaste = handlePaste_1.handlePaste;
var handleDrop_1 = __webpack_require__("UNZf");
exports.handleDrop = handleDrop_1.handleDrop;


/***/ }),

/***/ "9MNP":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Observable_1 = __webpack_require__("rCTf");
__webpack_require__("1Nls");
__webpack_require__("+pb+");
exports.post = function (_a) {
    var url = _a.url, body = _a.body, headers = _a.headers, progressSubscriber = _a.progressSubscriber;
    return Observable_1.Observable.ajax({
        url: url,
        body: body,
        headers: headers,
        method: 'POST',
        crossDomain: true,
        progressSubscriber: progressSubscriber
    })
        .map(function (r) { return r.response; });
};


/***/ }),

/***/ "Kojj":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
__webpack_require__("TnOd");
__webpack_require__("gbb9");
var chai = __webpack_require__("tyws");
var expect = chai.expect;
var Suite = Mocha.Suite;
var Test = Mocha.Test;
mocha.setup('bdd');
var Observable_1 = __webpack_require__("rCTf");
__webpack_require__("E7Yq");
__webpack_require__("fICK");
__webpack_require__("AGQa");
__webpack_require__("EnA3");
__webpack_require__("JPC0");
__webpack_require__("HcJ8");
__webpack_require__("hzF8");
__webpack_require__("wUn1");
__webpack_require__("6Yye");
var src_1 = __webpack_require__("6sO2");
var preventDefault = function (e) {
    if (e.target.nodeName === 'INPUT' && e.target.type === 'file') {
        return;
    }
    e.preventDefault();
};
window.addEventListener('dragenter', preventDefault);
window.addEventListener('drop', preventDefault);
window.addEventListener('dragover', preventDefault);
var hostInput = document.getElementById('host');
hostInput.value = window.localStorage.getItem('hostInput') || 'http://striker.project.ci';
hostInput.onkeydown = function (e) {
    window.localStorage.setItem('hostInput', e.target.value);
};
var authInput = document.getElementById('auth');
authInput.value = window.localStorage.getItem('authInput') || '';
authInput.onkeydown = function (e) {
    window.localStorage.setItem('authInput', e.target.value);
};
var getUploadConfig = function () {
    var host = hostInput.value;
    var auth = authInput.value;
    return {
        headers: {
            Authorization: auth
        },
        getUploadUrl: function () {
            return host + "/upload";
        },
        getChunkStartUrl: function () {
            return host + "/upload/chunk";
        },
        getChunkUrl: function (fileMeta, i) {
            return host + "/upload/chunk/" + fileMeta.fileKey + "?chunk=" + (i + 1) + "&chunks=" + fileMeta.chunks;
        },
        getChunkFinishUrl: function (fileMeta) {
            return host + "/upload/chunk/" + fileMeta.fileKey;
        }
    };
};
var handleUpload = function (files$) {
    files$.mergeAll().mergeMap(function (file) {
        console.info('file:', file);
        var suite = Suite.create(mocha.suite, file.name);
        suite.addTest(new Test('should be blob', function () {
            expect(file).to.be.instanceof(Blob);
        }));
        var list = document.getElementById('list');
        var li = document.createElement('li');
        var $name = document.createElement('h1');
        $name.innerText = file.name;
        var $abort = document.createElement('button');
        $abort.textContent = 'Abort';
        var $pause = document.createElement('button');
        $pause.textContent = 'Pause';
        var $resume = document.createElement('button');
        $resume.textContent = 'Resume';
        var $retry = document.createElement('button');
        $retry.textContent = 'Retry';
        var $progress = document.createElement('progress');
        $progress.setAttribute('value', '0');
        $progress.setAttribute('max', '1');
        li.appendChild($name);
        list.appendChild(li);
        var uploadFn = /^image/.test(file.type) ? src_1.upload : src_1.chunkUpload;
        var _a = uploadFn(file, getUploadConfig()), abort = _a.abort, pause = _a.pause, resume = _a.resume, retry = _a.retry, upload$ = _a.upload$;
        if (abort) {
            li.appendChild($abort);
            Observable_1.Observable.fromEvent($abort, 'click').subscribe(abort);
        }
        if (pause) {
            li.appendChild($pause);
            Observable_1.Observable.fromEvent($pause, 'click').subscribe(pause);
        }
        if (resume) {
            li.appendChild($resume);
            Observable_1.Observable.fromEvent($resume, 'click').subscribe(resume);
        }
        if (retry) {
            li.appendChild($retry);
            Observable_1.Observable.fromEvent($retry, 'click').subscribe(retry);
        }
        li.appendChild($progress);
        return upload$
            .do(function (_a) {
            var action = _a.action, payload = _a.payload;
            switch (action) {
                case 'upload/pausable':
                    $pause.setAttribute('style', payload ? 'visibility: visible' : 'visibility: hidden');
                    $resume.setAttribute('style', !payload ? 'visibility: visible' : 'visibility: hidden');
                    break;
                case 'upload/abortable':
                    $abort.setAttribute('style', payload ? 'visibility: visible' : 'visibility: hidden');
                    break;
                case 'upload/retryable':
                    $retry.setAttribute('style', payload ? 'visibility: visible' : 'visibility: hidden');
                    break;
                case 'upload/start':
                    if (uploadFn === src_1.upload) {
                        break;
                    }
                    var startFileMeta_1 = payload;
                    console.info('start: ', startFileMeta_1);
                    suite.addTest(new Test('should have start fileMeta', function () {
                        expect(startFileMeta_1).to.have.property('chunkSize').that.is.a('number');
                        expect(startFileMeta_1).to.have.property('chunks').that.is.a('number');
                        expect(startFileMeta_1).to.have.property('created').that.is.a('string');
                        expect(startFileMeta_1).to.have.property('downloadUrl').that.is.a('string');
                        expect(startFileMeta_1).to.have.property('fileCategory').that.is.a('string');
                        expect(startFileMeta_1).to.have.property('fileKey').that.is.a('string');
                        expect(startFileMeta_1).to.have.property('fileName').that.is.a('string');
                        expect(startFileMeta_1).to.have.property('fileSize').that.is.a('number');
                        expect(startFileMeta_1).to.have.property('fileType').that.is.a('string');
                        expect(startFileMeta_1).to.have.property('mimeType').that.is.a('string');
                        expect(startFileMeta_1).to.have.property('previewUrl').that.is.a('string');
                        expect(startFileMeta_1).to.have.property('thumbnailUrl').that.is.a('string');
                        expect(startFileMeta_1).to.have.property('uploadedChunks')
                            .that.is.an('array')
                            .that.have.lengthOf(0);
                    }));
                    break;
                case 'upload/progress':
                    var p_1 = payload;
                    $progress.value = p_1;
                    suite.addTest(new Test('should progress with percentage ' + p_1, function () {
                        expect(p_1).to.be.a('number');
                        expect(p_1).to.be.at.least(0);
                        expect(p_1).to.be.at.most(1);
                    }));
                    break;
                case 'upload/finish':
                    var finishFileMeta_1 = payload;
                    console.info('finish: ', finishFileMeta_1);
                    suite.addTest(new Test('check response data', function () {
                        expect(finishFileMeta_1.fileName).to.equal(file.name);
                    }));
                    suite.addTest(new Test('should have finish finishFileMeta', function () {
                        if (uploadFn === src_1.chunkUpload) {
                            expect(finishFileMeta_1).to.have.property('chunkSize').that.is.a('number');
                            expect(finishFileMeta_1).to.have.property('chunks').that.is.a('number');
                            expect(finishFileMeta_1).to.have.property('uploadedChunks')
                                .that.is.an('array')
                                .that.have.lengthOf(finishFileMeta_1.chunks);
                        }
                        expect(finishFileMeta_1).to.have.property('downloadUrl').that.is.a('string');
                        expect(finishFileMeta_1).to.have.property('fileCategory').that.is.a('string');
                        expect(finishFileMeta_1).to.have.property('fileKey').that.is.a('string');
                        expect(finishFileMeta_1).to.have.property('fileName').that.is.a('string');
                        expect(finishFileMeta_1).to.have.property('fileSize').that.is.a('number');
                        expect(finishFileMeta_1).to.have.property('fileType').that.is.a('string');
                        expect(finishFileMeta_1).to.have.property('mimeType').that.is.a('string');
                        expect(finishFileMeta_1).to.have.property('thumbnailUrl').that.is.a('string');
                    }));
                    break;
                case 'upload/start':
                    console.error(payload);
                    break;
                default:
                    break;
            }
        })
            .catch(function (e) {
            suite.addTest(new Test('should catch error with status ' + e.status, function () {
                expect(e.status).to.be.a('number');
                expect(e.status).to.be.at.least(400);
            }));
            return Observable_1.Observable.empty();
        });
    })
        .catch(function (_, caught) {
        return caught;
    })
        .subscribe(console.log.bind(console, 'final output: '));
};
handleUpload(src_1.handleClick(document.getElementById('click1')));
handleUpload(src_1.handleClick(document.getElementById('click2'), {
    multiple: true,
    accept: 'image/*'
}));
handleUpload(src_1.handleClick(document.getElementById('click3'), {
    directory: true
}));
handleUpload(src_1.handlePaste(document.getElementById('paste')));
handleUpload(src_1.handleDrop(document.getElementById('drop1'), {
    onDrop: console.log.bind(console, 'on drop 1'),
    onHover: console.log.bind(console, 'on hover 1')
}));
handleUpload(src_1.handleDrop(document.getElementById('drop2'), {
    directory: true,
    onDrop: console.log.bind(console, 'on drop 2'),
    onHover: console.log.bind(console, 'on hover 2')
}));
var testButton = document.getElementById('test');
Observable_1.Observable.fromEvent(testButton, 'click').take(1).subscribe(function () {
    var mochaDiv = document.createElement('div');
    mochaDiv.id = 'mocha';
    document.body.appendChild(mochaDiv);
    mocha.checkLeaks();
    mocha.run();
    testButton.remove();
});


/***/ }),

/***/ "UNZf":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Observable_1 = __webpack_require__("rCTf");
var FileAPI = __webpack_require__("6C8E");
__webpack_require__("EnA3");
var createDropFolderInput = function (input, container) {
    container.style.position = 'relative';
    input.type = 'file';
    input.multiple = true;
    input.webkitdirectory = true;
    input.value = null;
    input.style.position = 'absolute';
    input.style.opacity = '0';
    input.style.left = '0px';
    input.style.top = '0px';
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.zIndex = 10000;
    input.onclick = null;
    container.appendChild(input);
};
var getFiles = function (e) {
    var entries = FileAPI.getFiles(e);
    var files = entries.filter(function (file) {
        return !(!file.type && ((file.size % 4096) === 0 && (file.size <= 102400)));
    });
    return files;
};
exports.handleDrop = function (dropElement, options) {
    if (options === void 0) { options = {}; }
    var onDrop = options.onDrop || (function () { });
    var onHover = options.onHover || (function () { });
    var count = 0;
    return Observable_1.Observable.create(function (obs) {
        dropElement.ondragover = function (e) {
            e.preventDefault();
        };
        var dragleave = function (cb) { return function (e) {
            count -= 1;
            if (count !== 0) {
                return;
            }
            e.preventDefault();
            onHover(dropElement, false);
            count = 0;
            if (cb) {
                cb();
            }
        }; };
        dropElement.ondragenter = function (enterEvent) {
            count += 1;
            if (count - 1 >= 1) {
                return;
            }
            onHover(dropElement, true);
            enterEvent.preventDefault();
            if (options.directory) {
                var dropFolderInput = document.createElement('input');
                createDropFolderInput(dropFolderInput, dropElement);
                var changed_1 = false;
                dropFolderInput.onchange = function (e) {
                    changed_1 = true;
                    var files = getFiles(e);
                    obs.next(files);
                };
                dropElement.ondrop = function (e) {
                    var files = getFiles(e);
                    if (files.length) {
                        obs.next(files);
                        e.preventDefault();
                    }
                    setTimeout(function () {
                        if (!changed_1 && files.length === 0) {
                            obs.next([]);
                        }
                    }, 300);
                };
            }
            else {
                dropElement.ondragleave = dragleave(null);
                dropElement.ondrop = function (e) {
                    var files = getFiles(e);
                    if (files.length) {
                        obs.next(files);
                        e.preventDefault();
                    }
                };
            }
        };
    })
        .do(function () {
        count = 0;
        onDrop(dropElement);
        onHover(dropElement, false);
    });
};


/***/ }),

/***/ "ZG0H":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Observable_1 = __webpack_require__("rCTf");
var FileAPI = __webpack_require__("6C8E");
__webpack_require__("E7Yq");
__webpack_require__("tuHt");
var globalInputButton;
exports.handleClick = function (clickElement, config) {
    if (config === void 0) { config = {}; }
    if (!globalInputButton) {
        globalInputButton = document.createElement('input');
        globalInputButton.type = 'file';
    }
    var file$ = Observable_1.Observable.create(function (obs) {
        globalInputButton.accept = config.accept || '';
        globalInputButton.multiple = config.directory || config.multiple || false;
        globalInputButton.webkitdirectory = config.directory || false;
        globalInputButton.value = null;
        globalInputButton.onchange = function (e) {
            obs.next(FileAPI.getFiles(e));
            obs.complete();
        };
        globalInputButton.click();
        return function () {
            globalInputButton.value = null;
        };
    });
    return Observable_1.Observable.fromEvent(clickElement, 'click')
        .switchMapTo(file$);
};


/***/ }),

/***/ "cQcD":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = __webpack_require__("TToO");
var Observable_1 = __webpack_require__("rCTf");
var Subject_1 = __webpack_require__("EEr4");
__webpack_require__("9WjZ");
__webpack_require__("1ZrL");
__webpack_require__("1APj");
__webpack_require__("EnA3");
__webpack_require__("EGMK");
__webpack_require__("j7ye");
__webpack_require__("10Gq");
__webpack_require__("T3fU");
var post_1 = __webpack_require__("9MNP");
exports.createControlSubjects = function () {
    return {
        startSubject: new Subject_1.Subject(),
        retrySubject: new Subject_1.Subject(),
        abortSubject: new Subject_1.Subject(),
        errorSubject: new Subject_1.Subject()
    };
};
var createAction = function (action) { return function (payload) { return ({ action: "upload/" + action, payload: payload }); }; };
var createFormData = function (file) {
    var formData = new FormData();
    var keys = ['name', 'type', 'size', 'lastModifiedDate'];
    keys.forEach(function (key) { return formData.append(key, file[key]); });
    formData.append('file', file, file.name);
    return formData;
};
exports.upload = function (file, config, controlSubjects) {
    if (controlSubjects === void 0) { controlSubjects = exports.createControlSubjects(); }
    var startSubject = controlSubjects.startSubject, retrySubject = controlSubjects.retrySubject, abortSubject = controlSubjects.abortSubject, errorSubject = controlSubjects.errorSubject;
    var cleanUp = function () {
        retrySubject.complete();
        retrySubject.unsubscribe();
        abortSubject.complete();
        abortSubject.unsubscribe();
        startSubject.complete();
        startSubject.unsubscribe();
        errorSubject.complete();
        errorSubject.unsubscribe();
    };
    var post$ = Observable_1.Observable.never().multicast(function () { return new Subject_1.Subject(); }, function (subject) { return subject
        .map(function (pe) { return createAction('progress')(pe.loaded / pe.total); })
        .merge(post_1.post({
        url: config.getUploadUrl(),
        body: createFormData(file),
        headers: tslib_1.__assign({}, config.headers),
        progressSubscriber: subject
    })
        .map(createAction('finish'))); })
        .retryWhen(function (e$) {
        return e$
            .do(function (e) {
            retrySubject.next(false);
            errorSubject.next(e);
        })
            .switchMap(function () { return retrySubject.filter(function (b) { return b; }); });
    });
    var upload$ = Observable_1.Observable.concat(startSubject, Observable_1.Observable.of(createAction('retryable')(false)), Observable_1.Observable.of(createAction('start')(null)), post$)
        .takeUntil(abortSubject)
        .do(function () { }, cleanUp, cleanUp)
        .merge(errorSubject.map(function (e) { return createAction('error')(e); }))
        .merge(retrySubject.map(function (b) { return createAction('retryable')(!b); }));
    var start = function () {
        if (!startSubject.closed) {
            startSubject.next();
            startSubject.complete();
        }
    };
    if (config.autoStart === undefined ? true : config.autoStart) {
        start();
    }
    return {
        retry: function () { if (!retrySubject.closed) {
            retrySubject.next(true);
        } },
        abort: function () { if (!abortSubject.closed) {
            abortSubject.next();
        } },
        start: start,
        upload$: upload$
    };
};


/***/ }),

/***/ "hfOd":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = __webpack_require__("TToO");
var Observable_1 = __webpack_require__("rCTf");
var Subject_1 = __webpack_require__("EEr4");
var Subscriber_1 = __webpack_require__("mmVS");
__webpack_require__("1ZrL");
__webpack_require__("zO2v");
__webpack_require__("AGQa");
__webpack_require__("S35O");
__webpack_require__("1APj");
__webpack_require__("h0qH");
__webpack_require__("6Yye");
__webpack_require__("qp8k");
__webpack_require__("jvbR");
__webpack_require__("q3ik");
__webpack_require__("EnA3");
__webpack_require__("wUn1");
__webpack_require__("EGMK");
__webpack_require__("JPC0");
__webpack_require__("SGWz");
__webpack_require__("adqA");
__webpack_require__("y6Vm");
__webpack_require__("10Gq");
__webpack_require__("zJQZ");
__webpack_require__("JQ6u");
__webpack_require__("uCY4");
__webpack_require__("hzF8");
__webpack_require__("T3fU");
var post_1 = __webpack_require__("9MNP");
exports.sliceFile = function (file, chunks, chunkSize) {
    var result = [];
    for (var i = 0; i < chunks; i++) {
        var startSize = i * chunkSize;
        var endSize = i === chunks - 1 ? startSize + (file.size - startSize) : (i + 1) * chunkSize;
        var slice = file.slice(startSize, endSize);
        result.push(slice);
    }
    return result;
};
exports.startChunkUpload = function (file, config) {
    var cache = null;
    return Observable_1.Observable.defer(function () { return cache ? Observable_1.Observable.of(cache) : post_1.post({
        url: config.getChunkStartUrl(),
        body: {
            fileName: file['name'],
            fileSize: file['size'],
            lastUpdated: file['lastModifiedDate']
        },
        headers: tslib_1.__assign({}, config.headers, { 'Content-Type': 'application/json' })
    }).do(function (fileMeta) { return cache = fileMeta; }); });
};
exports.finishChunkUpload = function (fileMeta, config) {
    return post_1.post({
        url: config.getChunkFinishUrl(fileMeta),
        headers: tslib_1.__assign({}, config.headers, { 'Content-Type': 'application/json' })
    });
};
exports.uploadAllChunks = function (chunks, fileMeta, progressSubject, config) {
    var chunkRequests$ = chunks.map(function (chunk, index) {
        var completed = false;
        return Observable_1.Observable.defer(function () {
            if (completed) {
                return Observable_1.Observable.empty();
            }
            return post_1.post({
                url: config.getChunkUrl(fileMeta, index),
                body: chunk,
                headers: tslib_1.__assign({}, config.headers, { 'Content-Type': 'application/octet-stream' }),
                progressSubscriber: Subscriber_1.Subscriber.create(function (pe) {
                    progressSubject.next({ index: index, loaded: pe.loaded });
                }, function () { })
            })
                .do(function () { return completed = true; })
                .map(function () { return ({ index: index, completed: true }); })
                .catch(function () { return Observable_1.Observable.of({ index: index, completed: false }); });
        });
    });
    return Observable_1.Observable.from(chunkRequests$)
        .mergeAll(3)
        .mergeScan(function (acc, cs) {
        acc[cs.completed ? 'completes' : 'errors'][cs.index] = true;
        var errorsCount = Object.keys(acc.errors).length;
        if (errorsCount) {
            acc.errors = {};
            return Observable_1.Observable.throw(new Error('Multiple_Chunk_Upload_Error'));
        }
        else {
            return Observable_1.Observable.of(acc);
        }
    }, { completes: {}, errors: {} })
        .single(function (acc) {
        return Object.keys(acc.completes).length === chunks.length;
    });
};
exports.createControlSubjects = function () {
    return {
        startSubject: new Subject_1.Subject(),
        retrySubject: new Subject_1.Subject(),
        abortSubject: new Subject_1.Subject(),
        progressSubject: new Subject_1.Subject(),
        controlSubject: new Subject_1.Subject(),
        errorSubject: new Subject_1.Subject()
    };
};
var createAction = function (action) { return function (payload) { return ({ action: "upload/" + action, payload: payload }); }; };
exports.chunkUpload = function (file, config, controlSubjects) {
    if (controlSubjects === void 0) { controlSubjects = exports.createControlSubjects(); }
    var startSubject = controlSubjects.startSubject, retrySubject = controlSubjects.retrySubject, abortSubject = controlSubjects.abortSubject, progressSubject = controlSubjects.progressSubject, controlSubject = controlSubjects.controlSubject, errorSubject = controlSubjects.errorSubject;
    var cleanUp = function () {
        retrySubject.complete();
        retrySubject.unsubscribe();
        abortSubject.complete();
        abortSubject.unsubscribe();
        controlSubject.complete();
        controlSubject.unsubscribe();
        progressSubject.complete();
        progressSubject.unsubscribe();
        startSubject.complete();
        startSubject.unsubscribe();
        errorSubject.complete();
        errorSubject.unsubscribe();
    };
    var _a = controlSubject.distinctUntilChanged().partition(function (b) { return b; }), pause$ = _a[0], resume$ = _a[1];
    var start$ = exports.startChunkUpload(file, config);
    var chunks$ = start$
        .concatMap(function (fileMeta) {
        var chunks = exports.sliceFile(file, fileMeta.chunks, fileMeta.chunkSize);
        return exports.uploadAllChunks(chunks, fileMeta, progressSubject, config)
            .takeUntil(pause$)
            .repeatWhen(function () { return resume$; });
    })
        .take(1);
    var progress$ = progressSubject
        .scan(function (acc, cp) {
        acc[cp.index] = cp.loaded;
        return acc;
    }, {})
        .combineLatest(start$)
        .map(function (_a) {
        var acc = _a[0], fileMeta = _a[1];
        return Object.keys(acc).reduce(function (t, i) { return t + acc[i]; }, 0) / fileMeta.fileSize;
    })
        .distinctUntilChanged(function (x, y) { return x > y; })
        .map(createAction('progress'))
        .merge(pause$.concatMap(function () { return Observable_1.Observable.of(createAction('pausable')(false)); }))
        .merge(resume$.concatMap(function () { return Observable_1.Observable.of(createAction('pausable')(true)); }))
        .takeUntil(chunks$);
    var finish$ = start$
        .concatMap(function (fileMeta) {
        return exports.finishChunkUpload(fileMeta, config);
    });
    var upload$ = Observable_1.Observable.concat(startSubject, Observable_1.Observable.of(createAction('pausable')(true)), Observable_1.Observable.of(createAction('retryable')(false)), start$.map(createAction('start')), progress$, finish$.map(createAction('finish')), Observable_1.Observable.of(createAction('pausable')(false)), Observable_1.Observable.of(createAction('retryable')(false)))
        .retryWhen(function (e$) {
        return e$
            .do(function (e) {
            errorSubject.next(e);
            retrySubject.next(false);
        })
            .switchMap(function (e) {
            if (e.message === 'Multiple_Chunk_Upload_Error') {
                return retrySubject.filter(function (b) { return b; });
            }
            else {
                return Observable_1.Observable.throw(e);
            }
        });
    })
        .takeUntil(abortSubject)
        .do(function () { }, cleanUp, cleanUp)
        .merge(errorSubject.map(function (e) { return createAction('error')(e); }))
        .merge(retrySubject.map(function (b) { return createAction('retryable')(!b); }))
        .merge(abortSubject.concatMap(function () { return Observable_1.Observable.of(createAction('pausable')(false), createAction('retryable')(false)); }));
    var start = function () {
        if (!startSubject.closed) {
            startSubject.next();
            startSubject.complete();
        }
    };
    if (config.autoStart === undefined ? true : config.autoStart) {
        start();
    }
    return {
        pause: function () { if (!controlSubject.closed) {
            controlSubject.next(true);
        } },
        resume: function () { if (!controlSubject.closed) {
            controlSubject.next(false);
        } },
        retry: function () { if (!retrySubject.closed) {
            retrySubject.next(true);
        } },
        abort: function () { if (!abortSubject.closed) {
            abortSubject.next();
        } },
        start: start,
        upload$: upload$
    };
};


/***/ }),

/***/ "lRq6":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Observable_1 = __webpack_require__("rCTf");
__webpack_require__("E7Yq");
__webpack_require__("+pb+");
var uid = 0;
var image = 'image/png';
exports.handlePaste = function (pasteElement) {
    return Observable_1.Observable.fromEvent(pasteElement, 'paste')
        .map(function (e) {
        var items = e.clipboardData.items;
        var files = [];
        if (items) {
            for (var i = 0; i < items.length; i++) {
                var blob = items[i].getAsFile();
                if (blob && ({}.toString.call(blob) === '[object Blob]')) {
                    var file = void 0;
                    var name_1 = "Screenshot-" + uid++ + ".png";
                    try {
                        file = new File([blob], name_1, { type: image });
                    }
                    catch (_) {
                        file = blob;
                        file.lastModifiedDate = new Date();
                        file.name = name_1;
                        file.type = image;
                    }
                    files.push(file);
                }
            }
        }
        if (files.length) {
            e.preventDefault();
        }
        return files;
    });
};


/***/ })

},["Kojj"]);