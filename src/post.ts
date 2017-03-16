import { Observable } from 'rxjs/Observable'
import { Subscriber } from 'rxjs/Subscriber'
import { AjaxRequest, AjaxResponse } from 'rxjs/observable/dom/AjaxObservable'

import 'rxjs/add/observable/dom/ajax'
import 'rxjs/add/operator/map'

interface PostConfig {
  url: string
  body?: {}
  headers?: {}
  isStream?: boolean
  progressSubscriber?: AjaxRequest['progressSubscriber']
}

export const post = ({
  url,
  body,
  headers,
  isStream = false,
  progressSubscriber
}: PostConfig) => {
  return Observable.ajax({
    url,
    body,
    headers: {
      'Content-Type': isStream ? 'application/octet-stream' : 'application/json',
      ...headers
    },
    method: 'POST',
    crossDomain: true,
    progressSubscriber
  })
  .map((r: AjaxResponse) => r.response)
}
