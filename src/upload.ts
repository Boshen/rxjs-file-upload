import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'

import 'rxjs/add/observable/never'
import 'rxjs/add/observable/concat'
import 'rxjs/add/observable/of'

import 'rxjs/add/operator/do'
import 'rxjs/add/operator/merge'
import 'rxjs/add/operator/multicast'
import 'rxjs/add/operator/retryWhen'
import 'rxjs/add/operator/takeUntil'

import { post } from './post'

export interface UploadConfig {
  headers?: {}
  autoStart?: boolean
  getUploadUrl: () => string
}

export const createControlSubjects = () => {
  return {
    startSubject: new Subject<void>(),
    retrySubject: new Subject<boolean>(),
    abortSubject: new Subject<void>(),
    errorSubject: new Subject<boolean>()
  }
}

const createAction = (action: string) => (payload) => ({ action: `upload/${action}`, payload })

const createFormData = (file: File) => {
  const formData = new FormData()
  const keys = ['name', 'type', 'size', 'lastModifiedDate']
  keys.forEach((key) => formData.append(key, file[key]))
  formData.append('file', file, file.name)
  return formData
}

export const upload = (file: File, config: UploadConfig, controlSubjects = createControlSubjects()) => {

  const { startSubject, retrySubject, abortSubject, errorSubject } = controlSubjects

  const cleanUp = () => {
    retrySubject.complete()
    retrySubject.unsubscribe()
    abortSubject.complete()
    abortSubject.unsubscribe()
    startSubject.complete()
    startSubject.unsubscribe()
    errorSubject.complete()
    errorSubject.unsubscribe()
  }

  const post$ = Observable.never().multicast(
    () => new Subject(),
    (subject) => subject
      .map((pe: ProgressEvent) => createAction('progress')(pe.loaded / pe.total))
      .merge(post({
        url: config.getUploadUrl(),
        body: createFormData(file),
        headers: {
          ...config.headers,
        },
        progressSubscriber: <any>subject // tslint:disable-line
      })
      .map(createAction('finish')))
  )
    .retryWhen((e$) => {
      return e$
        .do((e) => {
          retrySubject.next(false)
          errorSubject.next(e)
        })
        .switchMap(() => retrySubject.filter((b) => b))
    })

  const upload$ = Observable.concat(
    startSubject,
    Observable.of(createAction('retryable')(false)),
    Observable.of(createAction('start')(null)),
    post$,
  )
    .takeUntil(abortSubject)
    .do(() => {}, cleanUp, cleanUp) // tslint:disable-line
    .merge(errorSubject.map((e) => createAction('error')(e)))
    .merge(retrySubject.map((b) => createAction('retryable')(!b)))

  const start = () => {
    if (!startSubject.closed) {
      startSubject.next()
      startSubject.complete()
    }
  }

  if (config.autoStart === undefined ? true : config.autoStart) {
    start()
  }

  return {
    retry: () => { if (!retrySubject.closed) { retrySubject.next(true) } },
    abort: () => { if (!abortSubject.closed) { abortSubject.next() } },
    start,

    upload$
  }
}
