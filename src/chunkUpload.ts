import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import { Subscriber } from 'rxjs/Subscriber'

import 'rxjs/add/observable/defer'
import 'rxjs/add/observable/dom/ajax'
import 'rxjs/add/observable/empty'
import 'rxjs/add/observable/from'
import 'rxjs/add/observable/of'
import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/mapTo'
import 'rxjs/add/operator/mergeAll'
import 'rxjs/add/operator/mergeMap'
import 'rxjs/add/operator/repeatWhen'
import 'rxjs/add/operator/retryWhen'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/takeLast'
import 'rxjs/add/operator/takeUntil'
import 'rxjs/add/operator/single'

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
  headers?: Object
  body?: any
  onCreate?: () => void
  onProgress?: (progress: number) => void
  onSuccess?: (response?: any) => void
  onError?: (error?: any) => void
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

const noop = (..._: any[]) => {}

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
  return post(config.getChunkStartUrl(), {
    fileMD5: new Date().toString(),
    fileName: file['name'],
    fileSize: file['size'],
    lastUpdated: file['lastModifiedDate']
  }, config.headers)
}

export const finishChunkUpload = (fileMeta: FileMeta, config: UploadChunksConfig) => {
  const finishUrl = config.getChunkFinishUrl(fileMeta)
  return post(finishUrl, null, config.headers)
}

export const chunkUpload = (file: Blob, config: UploadChunksConfig) => {
  const pause$ = new Subject()
  const resume$ = new Subject()
  const retry$ = new Subject()
  const abort$ = new Subject()

  const upload$ = startChunkUpload(file, config)
    .concatMap((fileMeta: FileMeta) => {
      const blobs = sliceFile(file, fileMeta.chunks, fileMeta.chunkSize)
      return uploadAllChunks(blobs, fileMeta, config)
        .takeUntil(pause$)
        .repeatWhen(() => resume$)
        .mapTo(fileMeta)
    })
    .concatMap((fileMeta: FileMeta) => {
      return finishChunkUpload(fileMeta, config)
    })
    .retryWhen(() => retry$)
    .takeUntil(abort$)

  const start = () => { upload$.subscribe() }
  const pause = () => { pause$.next() }
  const resume = () => { resume$.next() }
  const retry = () => { retry$.next() }
  const abort = () => { abort$.next() }

  return {
    start,
    pause,
    resume,
    retry,
    abort
  }
}

export const uploadAllChunks = (
  chunks: Blob[],
  fileMeta: FileMeta,
  config: UploadChunksConfig
) => {
  const {
    body,
    onCreate = noop,
    onProgress = noop,
    onSuccess = noop,
    onError = noop,
  } = config

  let totalLoaded = 0

  const chunkRequests$ = chunks.map((chunk, i) => {
    const chunkUrl = config.getChunkUrl(fileMeta, i)
    let lastLoaded = 0
    const innerProgressSubscriber = Subscriber.create((pe: any) => {
      const loaded = pe.loaded
      totalLoaded += (loaded - lastLoaded)
      onProgress(totalLoaded / fileMeta.fileSize)
      lastLoaded = loaded
    } , noop)
    let completed = false
    return Observable.defer(() => {
      return completed ? Observable.empty() : post(chunkUrl, chunk, {
          ...config.headers,
          ...{ 'Content-Type': 'application/octet-stream;charset=utf-8' }
        },
        innerProgressSubscriber
      )
        .do(() => completed = true)
        .map(() => ({ completed: true, index: i }))
        .catch(() => Observable.of({ completed: false, index: i }))
    })
  })

  return Observable.from(chunkRequests$)
    .mergeAll(3)
    .scan((acc, x: ChunkStatus) => {
      acc[x.completed ? 'completes' : 'errors'][x.index] = true
      const errorsCount = Object.keys(acc.errors).length
      if (errorsCount >= Math.min(chunks.length, 3)) {
        acc.errors = {}
        throw new Error()
      }
      return acc
    }, { completes: {}, errors: {} })
    .single((acc) => {
      return Object.keys(acc.completes).length === chunks.length
    })
}
