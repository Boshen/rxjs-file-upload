import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import { ReplaySubject } from 'rxjs/ReplaySubject'
import { Subscriber } from 'rxjs/Subscriber'

import { post } from './post'
import { createAction } from './util'

export interface UploadConfig {
  headers?: {}
  autoStart?: boolean
  getUploadUrl: () => string
}

export const createUploadSubjects = () => {
  return {
    startSubject: new ReplaySubject(1),
    retrySubject: new Subject<boolean>(),
    abortSubject: new Subject(),
    progressSubject: new Subject<number>(),
    errorSubject: new Subject<boolean>()
  }
}

const createFormData = (file: File) => {
  const formData = new FormData()
  const keys = ['name', 'type', 'size', 'lastModifiedDate']
  keys.forEach((key: string) => formData.append(key, file[key]))
  formData.append('file', file, file.name)
  return formData
}

export const upload = (file: File, config: UploadConfig, controlSubjects = createUploadSubjects()) => {

  const { startSubject, retrySubject, abortSubject, progressSubject, errorSubject } = controlSubjects

  const cleanUp = () => {
    retrySubject.complete()
    retrySubject.unsubscribe()
    abortSubject.complete()
    abortSubject.unsubscribe()
    startSubject.complete()
    startSubject.unsubscribe()
    progressSubject.complete()
    progressSubject.unsubscribe()
    errorSubject.complete()
    errorSubject.unsubscribe()
  }

  const post$ = post({
    url: config.getUploadUrl(),
    body: createFormData(file),
    headers: {
      ...config.headers,
    },
    progressSubscriber: Subscriber.create((pe: ProgressEvent) => {
      progressSubject.next(pe.loaded / pe.total)
    }, () => {})
  })
  .map(createAction('finish'))
  .retryWhen((e$) => {
    return e$
      .do((e) => {
        retrySubject.next(false)
        errorSubject.next(e)
      })
      .switchMap(() => retrySubject.filter((b) => b))
  })

  const upload$ = Observable.concat(
    startSubject.take(1).map(createAction('start')),
    Observable.of(createAction('retryable')(false)),
    post$
  )
    .takeUntil(abortSubject)
    .do(() => {}, cleanUp, cleanUp)
    .merge(progressSubject.map(createAction('progress')))
    .merge(errorSubject.map((e) => createAction('error')(e)))
    .merge(retrySubject.map((b) => createAction('retryable')(!b)))

  const start = () => {
    if (!startSubject.closed) {
      startSubject.next({})
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
