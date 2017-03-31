import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import { Subscriber } from 'rxjs/Subscriber'

import 'rxjs/add/observable/concat'
import 'rxjs/add/observable/defer'
import 'rxjs/add/observable/empty'
import 'rxjs/add/observable/from'
import 'rxjs/add/observable/of'
import 'rxjs/add/observable/throw'

import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/combineLatest'
import 'rxjs/add/operator/concatMap'
import 'rxjs/add/operator/distinctUntilChanged'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/merge'
import 'rxjs/add/operator/mergeAll'
import 'rxjs/add/operator/mergeScan'
import 'rxjs/add/operator/partition'
import 'rxjs/add/operator/repeatWhen'
import 'rxjs/add/operator/retryWhen'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/single'
import 'rxjs/add/operator/switchMap'
import 'rxjs/add/operator/take'
import 'rxjs/add/operator/takeUntil'

import { post } from './post'

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

interface UploadChunksConfig {
  headers?: {}
  getChunkStartUrl: () => string
  getChunkUrl: (fileMeta: FileMeta, index: number) => string
  getChunkFinishUrl: (fileMeta: FileMeta) => string
}

interface ChunkStatus {
  index: string
  completed: boolean
}

interface ChunkProgress {
  index: number
  loaded: number
}

interface ChunkScan {
  completes: {[index: number]: boolean}
  errors: {[index: number]: boolean}
}

export const sliceFile = (file: Blob, chunks: number, chunkSize: number): Blob[] => {
  const result: Blob[] = []
  for (let i = 0; i < chunks; i ++) {
    const startSize = i * chunkSize
    const endSize = i === chunks - 1 ? startSize + (file.size - startSize) : (i + 1) * chunkSize
    const slice = file.slice(startSize, endSize)
    result.push(slice)
  }
  return result
}

export const startChunkUpload = (file: Blob, config: UploadChunksConfig) => {
  let cache = null
  return Observable.defer(() => cache ? Observable.of(cache) : post({
    url: config.getChunkStartUrl(),
    body: {
      fileName: file['name'], // tslint:disable-line
      fileSize: file['size'], // tslint:disable-line
      lastUpdated: file['lastModifiedDate'] // tslint:disable-line
    },
    headers: config.headers
  }).do((fileMeta: FileMeta) => cache = fileMeta))
}

export const finishChunkUpload = (fileMeta: FileMeta, config: UploadChunksConfig) => {
  return post({
    url: config.getChunkFinishUrl(fileMeta),
    headers: config.headers
  })
}

export const maxErrorsToRetry = (chunks: number) => {
  return chunks > 3 ? 3 : 1
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
        headers: config.headers,
        isStream: true,
        progressSubscriber: Subscriber.create((pe: ProgressEvent) => {
          progressSubject.next({ index, loaded: pe.loaded })
        }, () => {}) // tslint:disable-line
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
      if (errorsCount >= maxErrorsToRetry(chunks.length)) {
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

export const createControlSubjects = () => {
  return {
    retrySubject: new Subject<boolean>(),
    abortSubject: new Subject<void>(),
    progressSubject: new Subject<ChunkProgress>(),
    controlSubject: new Subject<boolean>()
  }
}

const createAction = (action: string) => (payload) => ({ action, payload })

export const chunkUpload = (file: Blob, config: UploadChunksConfig, controlSubjects = createControlSubjects()) => {

  const { retrySubject, abortSubject, progressSubject, controlSubject } = controlSubjects

  const cleanUp = () => {
    retrySubject.unsubscribe()
    abortSubject.unsubscribe()
    progressSubject.unsubscribe()
    controlSubject.unsubscribe()
  }

  const [ pause$, resume$ ] = controlSubject.distinctUntilChanged().partition((b) => b)

  const start$ = startChunkUpload(file, config)

  const chunks$ = start$
    .concatMap((fileMeta: FileMeta) => {
      const chunks = sliceFile(file, fileMeta.chunks, fileMeta.chunkSize)
      return uploadAllChunks(chunks, fileMeta, progressSubject, config)
        .takeUntil(pause$)
        .repeatWhen(() => resume$)
        .retryWhen((e$) => {
          return e$
            .do(() => retrySubject.next(false))
            .switchMap((e: Error) => {
              if (e.message === 'Multiple_Chunk_Upload_Error') {
                return retrySubject.filter((b) => b)
              } else {
                return Observable.throw(e)
              }
            })
        })
    })
    .take(1)

  const progress$ = progressSubject
    .scan((acc: {[index: number]: number}, cp: ChunkProgress) => {
      acc[cp.index] = cp.loaded
      return acc
    }, {})
    .combineLatest(start$)
    .map(([acc, fileMeta]) => {
      return Object.keys(acc).reduce((t, i) => t + acc[i], 0) / fileMeta.fileSize
    })
    .distinctUntilChanged((x, y) => x > y)
    .map(createAction('upload/progress'))
    .merge(pause$.concatMap(() => Observable.of(
      createAction('upload/pausable')(false)
    )))
    .merge(resume$.concatMap(() => Observable.of(
      createAction('upload/pausable')(true),
    )))
    .takeUntil(chunks$)

  const finish$ = start$
    .concatMap((fileMeta) => {
      return finishChunkUpload(fileMeta, config)
    })

  const upload$ = Observable.concat(
    Observable.of(createAction('upload/pausable')(true)),
    Observable.of(createAction('upload/retryable')(false)),

    start$.map(createAction('upload/start')),
    progress$,
    finish$.map(createAction('upload/finish')),

    Observable.of(createAction('upload/pausable')(false)),
    Observable.of(createAction('upload/retryable')(false))
  )
    .takeUntil(abortSubject)
    .do(null, cleanUp, cleanUp)
    .merge(retrySubject.map((b) => createAction('upload/retryable')(!b)))
    .merge(abortSubject.concatMap(() => Observable.of(
      createAction('upload/pausable')(false),
      createAction('upload/retryable')(false)
    )))

  return {
    pause: () => { if (!controlSubject.closed) { controlSubject.next(true) } },
    resume: () => { if (!controlSubject.closed) { controlSubject.next(false) } },
    retry: () => { if (!retrySubject.closed) { retrySubject.next(true) } },
    abort: () => { if (!abortSubject.closed) { abortSubject.next() } },

    upload$
  }
}
