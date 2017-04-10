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

const createAction = (action: string) => (payload) => ({ action, payload })

export const upload = (file: File, config: UploadConfig, controlSubjects = createControlSubjects()) => {

  const { retrySubject, abortSubject } = controlSubjects

  const cleanUp = () => {
    retrySubject.unsubscribe()
    abortSubject.unsubscribe()
  }

  const post$ = Observable.never().multicast(
    () => new Subject(),
    (subject) => subject
      .map((pe: ProgressEvent) => createAction('upload/progress')(pe.loaded / pe.total))
      .merge(post({
        url: `${config.getUploadUrl()}/?fileName=${file.name}`,
        body: file,
        headers: {
          ...config.headers,
          'Content-Type': 'application/octet-stream'
        },
        progressSubscriber: <any>subject // tslint:disable-line
      })
      .map((response) => ({ ...response, fileName: file.name }))
      .map(createAction('upload/finish')))
  )
    .retryWhen((e$) => {
      return e$
        .do(() => retrySubject.next(false))
        .switchMap(() => retrySubject.filter((b) => b))
    })

  const upload$ = Observable.concat(
    Observable.of(createAction('upload/retryable')(false)),
    Observable.of(createAction('upload/start')(null)),
    post$,
  )
    .merge(retrySubject.map((b) => createAction('upload/retryable')(!b)))
    .do(null, cleanUp, cleanUp)
    .takeUntil(abortSubject)

  return {
    retry: () => { if (!retrySubject.closed) { retrySubject.next(true) } },
    abort: () => { if (!abortSubject.closed) { abortSubject.next() } },

    upload$
  }
}
