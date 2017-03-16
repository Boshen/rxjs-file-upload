import { Subject } from 'rxjs/Subject'
import { Subscriber } from 'rxjs/Subscriber'

import { post } from './post'

const noop = (..._: any[]) => {}

interface RequestConfig {
  headers?: Object
  body?: any
  onCreate?: () => void
  onProgress?: (pe: ProgressEvent) => void
  onSuccess?: (response?: any) => void
  onError?: (error?: any) => void
}

interface UploadConfig extends RequestConfig {
  getUploadUrl: () => string
}

export const upload = (config: UploadConfig) => {
  const {
    body,
    onCreate = noop,
    onProgress = noop,
    onSuccess = noop,
    onError = noop
  } = config

  const progressSubscriber = Subscriber.create(
    onProgress,
    noop
  )

  const retry$ = new Subject()

  onCreate()

  const subscription = post({
    url: config.getUploadUrl(),
    body,
    headers: config.headers,
    isStream: true,
    progressSubscriber
  })
    .do(null, (e) => {
      onError(e)
    })
    .retryWhen(() => {
      return retry$
    })
    .subscribe(
      (response) => {
        onSuccess(response)
      }
    )

  const abort = () => {
    subscription.unsubscribe()
  }

  const retry = () => {
    retry$.next()
  }

  return {
    abort,
    retry
  }
}
