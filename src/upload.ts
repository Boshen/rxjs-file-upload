import { Subject, ReplaySubject, of, concat } from 'rxjs'
import { filter, takeUntil, tap, mergeWith, map, take, retryWhen, switchMap } from 'rxjs/operators'

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
    abortSubject: new Subject<void>(),
    progressSubject: new Subject<number>(),
    errorSubject: new Subject<boolean>(),
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
    progressSubscriber: {
      next(pe: ProgressEvent) {
        progressSubject.next(pe.loaded / pe.total)
      },
    },
  }).pipe(
    map(createAction('finish')),
    retryWhen((e$) => {
      return e$.pipe(
        tap((e) => {
          retrySubject.next(false)
          errorSubject.next(e)
        }),
        switchMap(() => retrySubject.pipe(filter((b) => b)))
      )
    })
  )

  const upload$ = concat(
    startSubject.pipe(take(1), map(createAction('start'))),
    of(createAction('retryable')(false)),
    post$
  ).pipe(
    takeUntil(abortSubject),
    tap({ error: cleanUp, complete: cleanUp }),
    mergeWith(progressSubject.pipe(map(createAction('progress')))),
    mergeWith(errorSubject.pipe(map((e) => createAction('error')(e)))),
    mergeWith(retrySubject.pipe(map((b) => createAction('retryable')(!b))))
  )

  const start = () => {
    if (!startSubject.closed) {
      startSubject.next({})
    }
  }

  if (config.autoStart === undefined ? true : config.autoStart) {
    start()
  }

  return {
    retry: () => {
      if (!retrySubject.closed) {
        retrySubject.next(true)
      }
    },
    abort: () => {
      if (!abortSubject.closed) {
        abortSubject.next()
      }
    },
    start,

    upload$,
  }
}
