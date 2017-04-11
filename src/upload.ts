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

interface UploadConfig {
  headers?: {}
  getUploadUrl: () => string
}

export const createControlSubjects = () => {
  return {
    retrySubject: new Subject<boolean>(),
    abortSubject: new Subject<void>()
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

  const { retrySubject, abortSubject } = controlSubjects

  const cleanUp = () => {
    retrySubject.complete()
    abortSubject.complete()
    retrySubject.unsubscribe()
    abortSubject.unsubscribe()
  }

  const post$ = Observable.never().multicast(
    () => new Subject(),
    (subject) => subject
      .map((pe: ProgressEvent) => createAction('progress')(pe.loaded / pe.total))
      .merge(post({
        url: `${config.getUploadUrl()}?fileName=${file.name}`,
        body: createFormData(file),
        headers: {
          ...config.headers,
        },
        progressSubscriber: <any>subject // tslint:disable-line
      })
      .map((response) => ({ ...response, fileName: file.name }))
      .map(createAction('finish')))
  )
    .retryWhen((e$) => {
      return e$
        .do(() => retrySubject.next(false))
        .switchMap(() => retrySubject.filter((b) => b))
    })

  const upload$ = Observable.concat(
    Observable.of(createAction('retryable')(false)),
    Observable.of(createAction('start')(null)),
    post$,
  )
    .takeUntil(abortSubject)
    .do(null, cleanUp, cleanUp)
    .merge(retrySubject.map((b) => createAction('retryable')(!b)))

  return {
    retry: () => { if (!retrySubject.closed) { retrySubject.next(true) } },
    abort: () => { if (!abortSubject.closed) { abortSubject.next() } },

    upload$
  }
}
