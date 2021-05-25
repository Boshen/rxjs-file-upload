import { PartialObserver } from 'rxjs'
import { ajax } from 'rxjs/ajax'
import { map } from 'rxjs/operators'

export interface PostConfig {
  url: string
  body?: {}
  headers?: {}
  progressSubscriber?: PartialObserver<ProgressEvent>
}

export const post = ({ url, body, headers, progressSubscriber }: PostConfig) => {
  return ajax({
    url,
    body,
    headers,
    method: 'POST',
    crossDomain: true,
    progressSubscriber,
  }).pipe(map((r) => r.response))
}
