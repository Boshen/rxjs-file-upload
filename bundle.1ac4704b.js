webpackJsonp([1],{

/***/ "2HJH":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var userAgent = window.navigator.userAgent;
var safari = /safari\//i.test(userAgent);
exports.removeDirectory = function (file) {
    return !(!file.type && (safari || (file.size % 4096) === 0 && file.size <= 102400));
};
exports.createAction = function (action) { return function (payload) { return ({ action: "upload/" + action, payload: payload }); }; };


/***/ }),

/***/ "6sO2":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__("cQcD"));
__export(__webpack_require__("hfOd"));
__export(__webpack_require__("ZG0H"));
__export(__webpack_require__("lRq6"));
__export(__webpack_require__("UNZf"));
__export(__webpack_require__("2HJH"));


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
__webpack_require__("UNGF");
__webpack_require__("UyzR");
__webpack_require__("jvbR");
var scanFiles = function (entry) {
    if (entry.isFile) {
        return Observable_1.Observable.create(function (observer) {
            entry.file(function (file) {
                observer.next({ file: file, entry: entry });
                observer.complete();
            });
        });
    }
    else if (entry.isDirectory) {
        return Observable_1.Observable.create(function (observer) {
            entry.createReader().readEntries(function (entries) {
                if (entries.length === 0) {
                    observer.complete();
                }
                else {
                    observer.next(Observable_1.Observable.from(entries).concatMap(scanFiles));
                    observer.complete();
                }
            });
        }).switch();
    }
};
exports.handleDrop = function (dropElement, options) {
    if (options === void 0) { options = {}; }
    var onDrop = options.onDrop || (function () { });
    var onHover = options.onHover || (function () { });
    return Observable_1.Observable.create(function (obs) {
        var enterCount = 0;
        dropElement.ondragenter = function (e) {
            console.log(e);
            enterCount += 1;
            e.preventDefault();
            onHover(dropElement, true);
        };
        dropElement.ondragleave = function (e) {
            console.log(e);
            enterCount -= 1;
            if (enterCount === 0) {
                e.preventDefault();
                onHover(dropElement, false);
            }
        };
        dropElement.ondragover = function (e) {
            console.log(e);
            e.preventDefault();
        };
        dropElement.ondrop = function (e) {
            console.log(e);
            onHover(dropElement, false);
            var items = e.dataTransfer.items;
            var files = e.dataTransfer.files;
            console.log(e, files, items);
            e.preventDefault();
            console.log(e, files, items);
        };
    });
};


/***/ }),

/***/ "ZG0H":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Observable_1 = __webpack_require__("rCTf");
__webpack_require__("E7Yq");
__webpack_require__("+pb+");
__webpack_require__("tuHt");
var util_1 = __webpack_require__("2HJH");
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
        globalInputButton.onchange = function () {
            var files = Array.prototype.slice.call(globalInputButton.files);
            files.forEach(function (file) {
                file.path = file.webkitRelativePath;
            });
            obs.next(files);
            obs.complete();
        };
        globalInputButton.click();
        return function () {
            globalInputButton.value = null;
        };
    })
        .map(function (files) { return files.filter(util_1.removeDirectory); });
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
var ReplaySubject_1 = __webpack_require__("MQMf");
var Subscriber_1 = __webpack_require__("mmVS");
__webpack_require__("9WjZ");
__webpack_require__("1ZrL");
__webpack_require__("1APj");
__webpack_require__("EnA3");
__webpack_require__("EGMK");
__webpack_require__("j7ye");
__webpack_require__("10Gq");
__webpack_require__("T3fU");
var post_1 = __webpack_require__("9MNP");
var util_1 = __webpack_require__("2HJH");
exports.createUploadSubjects = function () {
    return {
        startSubject: new ReplaySubject_1.ReplaySubject(1),
        retrySubject: new Subject_1.Subject(),
        abortSubject: new Subject_1.Subject(),
        progressSubject: new Subject_1.Subject(),
        errorSubject: new Subject_1.Subject()
    };
};
var createFormData = function (file) {
    var formData = new FormData();
    var keys = ['name', 'type', 'size', 'lastModifiedDate'];
    keys.forEach(function (key) { return formData.append(key, file[key]); });
    formData.append('file', file, file.name);
    return formData;
};
exports.upload = function (file, config, controlSubjects) {
    if (controlSubjects === void 0) { controlSubjects = exports.createUploadSubjects(); }
    var startSubject = controlSubjects.startSubject, retrySubject = controlSubjects.retrySubject, abortSubject = controlSubjects.abortSubject, progressSubject = controlSubjects.progressSubject, errorSubject = controlSubjects.errorSubject;
    var cleanUp = function () {
        retrySubject.complete();
        retrySubject.unsubscribe();
        abortSubject.complete();
        abortSubject.unsubscribe();
        startSubject.complete();
        startSubject.unsubscribe();
        progressSubject.complete();
        progressSubject.unsubscribe();
        errorSubject.complete();
        errorSubject.unsubscribe();
    };
    var post$ = post_1.post({
        url: config.getUploadUrl(),
        body: createFormData(file),
        headers: tslib_1.__assign({}, config.headers),
        progressSubscriber: Subscriber_1.Subscriber.create(function (pe) {
            progressSubject.next(pe.loaded / pe.total);
        }, function () { })
    })
        .map(util_1.createAction('finish'))
        .retryWhen(function (e$) {
        return e$
            .do(function (e) {
            retrySubject.next(false);
            errorSubject.next(e);
        })
            .switchMap(function () { return retrySubject.filter(function (b) { return b; }); });
    });
    var upload$ = Observable_1.Observable.concat(startSubject.take(1).map(util_1.createAction('start')), Observable_1.Observable.of(util_1.createAction('retryable')(false)), post$)
        .takeUntil(abortSubject)
        .do(function () { }, cleanUp, cleanUp)
        .merge(progressSubject.map(util_1.createAction('progress')))
        .merge(errorSubject.map(function (e) { return util_1.createAction('error')(e); }))
        .merge(retrySubject.map(function (b) { return util_1.createAction('retryable')(!b); }));
    var start = function () {
        if (!startSubject.closed) {
            startSubject.next({});
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
var ReplaySubject_1 = __webpack_require__("MQMf");
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
var util_1 = __webpack_require__("2HJH");
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
exports.createChunkUploadSubjects = function () {
    return {
        startSubject: new ReplaySubject_1.ReplaySubject(1),
        retrySubject: new Subject_1.Subject(),
        abortSubject: new Subject_1.Subject(),
        progressSubject: new Subject_1.Subject(),
        controlSubject: new Subject_1.Subject(),
        errorSubject: new Subject_1.Subject()
    };
};
exports.chunkUpload = function (file, config, controlSubjects) {
    if (controlSubjects === void 0) { controlSubjects = exports.createChunkUploadSubjects(); }
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
        .map(util_1.createAction('progress'))
        .merge(pause$.concatMap(function () { return Observable_1.Observable.of(util_1.createAction('pausable')(false)); }))
        .merge(resume$.concatMap(function () { return Observable_1.Observable.of(util_1.createAction('pausable')(true)); }))
        .takeUntil(chunks$);
    var finish$ = start$
        .concatMap(function (fileMeta) {
        return exports.finishChunkUpload(fileMeta, config);
    });
    var upload$ = Observable_1.Observable.concat(startSubject.take(1).map(util_1.createAction('start')), Observable_1.Observable.of(util_1.createAction('pausable')(true)), Observable_1.Observable.of(util_1.createAction('retryable')(false)), start$.map(util_1.createAction('chunkstart')), progress$, finish$.map(util_1.createAction('finish')), Observable_1.Observable.of(util_1.createAction('pausable')(false)), Observable_1.Observable.of(util_1.createAction('retryable')(false)))
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
        .merge(errorSubject.map(function (e) { return util_1.createAction('error')(e); }))
        .merge(retrySubject.map(function (b) { return util_1.createAction('retryable')(!b); }))
        .merge(abortSubject.concatMap(function () { return Observable_1.Observable.of(util_1.createAction('pausable')(false), util_1.createAction('retryable')(false)); }));
    var start = function () {
        if (!startSubject.closed) {
            startSubject.next({});
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