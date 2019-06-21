import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import { ReplaySubject } from 'rxjs/ReplaySubject'
import { Subscriber } from 'rxjs/Subscriber'
import { Observer } from 'rxjs/Observer'

import { post } from './post'
import { createAction } from './util'

export interface FileMeta {
  chunkSize: number
  chunks: number
  created: string
  downloadUrl: string
  fileCategory: string
  fileKey: string
  fileMD5: string
  fileName: string
  fileSize: number
  fileType: string
  lastUpdated: string
  mimeType: string
  previewUrl: string
  storage: string
  thumbnailUrl: string
  uploadedChunks: number[]
  token: {
    userId: string
    exp: number
    storage: string
  }
}

export interface UploadChunksConfig {
  headers?: {}
  autoStart?: boolean
  getChunkStartUrl: () => string
  getChunkUrl: (fileMeta: FileMeta, index: number) => string
  getChunkFinishUrl: (fileMeta: FileMeta) => string
}

export interface ChunkStatus {
  index: string
  completed: boolean
}

export interface ChunkProgress {
  index: number
  loaded: number
}

export interface ChunkScan {
  completes: {[index: string]: boolean}
  errors: {[index: string]: boolean}
}

export const sliceFile = (file: File, chunks: number, chunkSize: number): Blob[] => {
  const result: Blob[] = []
  for (let i = 0; i < chunks; i ++) {
    const startSize = i * chunkSize
    const endSize = i === chunks - 1 ? startSize + (file.size - startSize) : (i + 1) * chunkSize
    const slice = file.slice(startSize, endSize)
    result.push(slice)
  }
  return result
}

export const startChunkUpload = (file: File, config: UploadChunksConfig) => {
  let cache: null | FileMeta = null
  return Observable.defer(() => cache ? Observable.of(cache) : post({
    url: config.getChunkStartUrl(),
    body: {
      fileName: file.name,
      fileSize: file.size,
      lastUpdated: file.lastModifiedDate
    },
    headers: {
      ...config.headers,
      'Content-Type': 'application/json'
    }
  }).do((fileMeta: FileMeta) => cache = fileMeta))
}

export const finishChunkUpload = (fileMeta: FileMeta, config: UploadChunksConfig) => {
  return post({
    url: config.getChunkFinishUrl(fileMeta),
    headers: {
      ...config.headers,
      'Content-Type': 'application/json'
    }
  })
}

export const uploadAllChunks = (
  chunks: Blob[],
  fileMeta: FileMeta,
  progressSubject: Subject<ChunkProgress>,
  config: UploadChunksConfig
) => {

  const chunkRequests$: Array<Observable<ChunkStatus>> = chunks.map((chunk, index) => {
    let completed = false
    return Observable.defer(() => {
      if (completed) {
        return Observable.empty()
      }
      return post({
        url: config.getChunkUrl(fileMeta, index),
        body: chunk,
        headers: {
          ...config.headers,
          'Content-Type': 'application/octet-stream'
        },
        progressSubscriber: Subscriber.create((pe: ProgressEvent) => {
          progressSubject.next({ index, loaded: pe.loaded })
        }, () => {})
      })
        .do(() => completed = true)
        .map(() => ({ index, completed: true }))
        .catch(() => Observable.of({ index, completed: false }))
    })
  })

  return Observable.from(chunkRequests$)
    .mergeAll(3)
    .mergeScan((acc: ChunkScan, cs: ChunkStatus) => {
      acc[cs.completed ? 'completes' : 'errors'][cs.index] = true
      const errorsCount = Object.keys(acc.errors).length
      if (errorsCount) {
        acc.errors = {}
        return Observable.throw(new Error('Multiple_Chunk_Upload_Error'))
      } else {
        return Observable.of(acc)
      }
    }, { completes: {}, errors: {} })
    .single((acc) => {
      return Object.keys(acc.completes).length === chunks.length
    })
}

export const createChunkUploadSubjects = () => {
  return {
    startSubject: new ReplaySubject(1),
    retrySubject: new Subject<boolean>(),
    abortSubject: new ReplaySubject(1),
    progressSubject: new Subject<ChunkProgress>(),
    controlSubject: new Subject<boolean>(),
    errorSubject: new Subject<boolean>()
  }
}

export const chunkUpload = (file: File, config: UploadChunksConfig, controlSubjects = createChunkUploadSubjects()) => {

  const { startSubject, retrySubject, abortSubject, progressSubject, controlSubject, errorSubject } = controlSubjects

  const cleanUp = () => {
    retrySubject.complete()
    retrySubject.unsubscribe()
    abortSubject.complete()
    abortSubject.unsubscribe()
    controlSubject.complete()
    controlSubject.unsubscribe()
    progressSubject.complete()
    progressSubject.unsubscribe()
    startSubject.complete()
    startSubject.unsubscribe()
    errorSubject.complete()
    errorSubject.unsubscribe()
  }

  const [ pause$, resume$ ] = controlSubject.distinctUntilChanged().partition((b) => b)

  const start$ = startChunkUpload(file, config)

  const chunks$ = start$
    .concatMap((fileMeta: FileMeta) => {
      const chunks = sliceFile(file, fileMeta.chunks, fileMeta.chunkSize)
      return uploadAllChunks(chunks, fileMeta, progressSubject, config)
        .takeUntil(pause$)
        .repeatWhen(() => resume$)
    })
    .take(1)

  const progress$ = progressSubject
    .scan((acc: { [index: number]: number }, cp: ChunkProgress) => {
      acc[cp.index] = cp.loaded
      return acc
    }, {})
    .combineLatest(start$)
    .map(([acc, fileMeta]) => {
      return Object.keys(acc).reduce((t, i: string) => t + acc[i], 0) / fileMeta.fileSize
    })
    .distinctUntilChanged((x, y) => x > y)
    .map(createAction('progress'))
    .merge(pause$.concatMap(() => Observable.of(
      createAction('pausable')(false)
    )))
    .merge(resume$.concatMap(() => Observable.of(
      createAction('pausable')(true),
    )))
    .takeUntil(chunks$)

  const finish$ = start$
    .concatMap((fileMeta) => {
      return finishChunkUpload(fileMeta, config)
    })

  const upload$ = Observable.create((observer: Observer<{ action: string, payload: {} }>) => {
    const abortSubs = abortSubject.take(1).concatMap(() => Observable.of(
      createAction('pausable')(false),
      createAction('retryable')(false)
    )).subscribe((action) => {
      observer.next(action)
      observer.complete()
    })

    const subs = Observable.concat(
      startSubject.take(1).map(createAction('start')),
      Observable.of(createAction('pausable')(true)),
      Observable.of(createAction('retryable')(false)),

      start$.map(createAction('chunkstart')),
      progress$,
      finish$.map(createAction('finish')),

      Observable.of(createAction('pausable')(false)),
      Observable.of(createAction('retryable')(false))
    )
      .retryWhen((e$) => {
        return e$
          .do((e) => {
            errorSubject.next(e)
            retrySubject.next(false)
          })
          .switchMap((e: Error) => {
            if (e.message === 'Multiple_Chunk_Upload_Error') {
              return retrySubject.filter((b) => b)
            } else {
              return Observable.throw(e)
            }
          })
      })
      .takeUntil(abortSubject)
      .do(() => { }, cleanUp, cleanUp)
      .merge(errorSubject.map((e) => createAction('error')(e)))
      .merge(retrySubject.map((b) => createAction('retryable')(!b)))
      .subscribe(observer)

    return () => {
      subs.unsubscribe()
      abortSubs.unsubscribe()
    }
  })

  const start = () => {
    if (!startSubject.closed) {
      startSubject.next({})
    }
  }

  if (config.autoStart === undefined ? true : config.autoStart) {
    start()
  }

  return {
    pause: () => { if (!controlSubject.closed) { controlSubject.next(true) } },
    resume: () => { if (!controlSubject.closed) { controlSubject.next(false) } },
    retry: () => { if (!retrySubject.closed) { retrySubject.next(true) } },
    abort: () => { if (!abortSubject.closed) { abortSubject.next(true) } },
    start,

    upload$
  }
}
