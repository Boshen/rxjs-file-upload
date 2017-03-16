import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import { Subscriber } from 'rxjs/Subscriber'

import 'rxjs/add/observable/defer'
import 'rxjs/add/observable/empty'
import 'rxjs/add/observable/from'
import 'rxjs/add/observable/of'
import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/distinctUntilChanged'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/mapTo'
import 'rxjs/add/operator/mergeAll'
import 'rxjs/add/operator/mergeScan'
import 'rxjs/add/operator/repeatWhen'
import 'rxjs/add/operator/retryWhen'
import 'rxjs/add/operator/single'
import 'rxjs/add/operator/takeUntil'
import 'rxjs/add/operator/take'
import 'rxjs/add/operator/combineLatest'
import 'rxjs/add/operator/scan'

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

interface RequestConfig {
  headers?: {}
  body?: {}
  onProgress?: (progress: number) => void
}

interface UploadChunksConfig extends RequestConfig {
  getChunkStartUrl: () => string
  getChunkUrl: (fileMeta: FileMeta, index: number) => string
  getChunkFinishUrl: (fileMeta: FileMeta) => string
}

interface ChunkStatus {
  completed: boolean
  index: string
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
  return post({
    url: config.getChunkStartUrl(),
    body: {
      fileMD5: new Date().toString(),
      fileName: file['name'], // tslint:disable-line
      fileSize: file['size'], // tslint:disable-line
      lastUpdated: file['lastModifiedDate'] // tslint:disable-line
    },
    headers: config.headers
  })
}

export const finishChunkUpload = (fileMeta: FileMeta, config: UploadChunksConfig) => {
  const finishUrl = config.getChunkFinishUrl(fileMeta)
  return post({
    url: finishUrl,
    headers: config.headers
  })
}

interface ChunkProgress {
  i: number
  loaded: number
}

export const uploadAllChunks = (
  chunks: Blob[],
  fileMeta: FileMeta,
  progressSubject: Subject<ChunkProgress>,
  config: UploadChunksConfig
) => {

  const chunkRequests$ = chunks.map((chunk, i) => {
    let completed = fileMeta.uploadedChunks.indexOf(i) >= 0
    return Observable.defer(() => {
      if (completed) {
        return Observable.empty()
      }
      return post({
        url: config.getChunkUrl(fileMeta, i),
        body: chunk,
        headers: config.headers,
        isStream: true,
        progressSubscriber: Subscriber.create((pe: ProgressEvent) => {
          progressSubject.next({ i, loaded: pe.loaded })
        }, () => {}) // tslint:disable-line
      })
        .do(() => completed = true)
        .map(() => ({ completed: true, index: i }))
        .catch(() => Observable.of({ completed: false, index: i }))
    })
  })

  return Observable.from(chunkRequests$)
    .mergeAll(3)
    .mergeScan((acc, x: ChunkStatus) => {
      acc[x.completed ? 'completes' : 'errors'][x.index] = true
      const errorsCount = Object.keys(acc.errors).length
      if (errorsCount >= (chunks.length > 3 ? 3 : 1)) {
        acc.errors = {}
        return Observable.throw('Multiple Chunk Halt Error')
      } else {
        return Observable.of(acc)
      }
    }, { completes: {}, errors: {} })
    .single((acc) => {
      return Object.keys(acc.completes).length === chunks.length
    })
}

export const chunkUpload = (file: Blob, config: UploadChunksConfig) => {
  const completeSubject = new Subject<FileMeta>()
  const complete$ = completeSubject.take(1)

  const createSubject = new Subject<FileMeta>()
  const retrySubject = new Subject<void>()
  const abortSubject = new Subject<void>()
  const progressSubject = new Subject<ChunkProgress>()

  const controlSubject = new Subject<boolean>()
  const control$ = controlSubject.distinctUntilChanged()
  const pause$ = control$.filter((b) => b).takeUntil(complete$)
  const resume$ = control$.filter((b) => !b).takeUntil(complete$)

  const create$ = createSubject.take(1)
  const abort$ = abortSubject.take(1)
  const retry$ = retrySubject.takeUntil(complete$)

  const upload$ = startChunkUpload(file, config)
    .do(createSubject.next.bind(createSubject))
    .concatMap((fileMeta: FileMeta) => {
      const chunks = sliceFile(file, fileMeta.chunks, fileMeta.chunkSize)
      return uploadAllChunks(chunks, fileMeta, progressSubject, config)
        .takeUntil(pause$)
        .repeatWhen(() => resume$)
        .mapTo(fileMeta)
    })
    .concatMap((fileMeta: FileMeta) => {
      return finishChunkUpload(fileMeta, config)
    })
    .retryWhen(() => retrySubject)
    .takeUntil(abortSubject)

  const start = () => {
    upload$.subscribe(
      completeSubject.next.bind(completeSubject),
      console.error.bind(console)
    )
  }
  const pause = () => { controlSubject.next(true) }
  const resume = () => { controlSubject.next(false) }
  const retry = () => { retrySubject.next() }
  const abort = () => { abortSubject.next() }

  const progress$ = progressSubject
    .scan((acc, chunkProgress: ChunkProgress) => {
      acc[chunkProgress.i] = chunkProgress.loaded
      return acc
    }, {})
    .combineLatest(create$)
    .map(([acc, fileMeta]) => {
      return Object.keys(acc).reduce((t, i) => t + acc[i], 0) / fileMeta.fileSize
    })
    .distinctUntilChanged((x, y) => x > y)
    .takeUntil(complete$)

  return {
    start,
    pause,
    resume,
    retry,
    abort,

    create$,
    progress$,
    complete$
  }
}
