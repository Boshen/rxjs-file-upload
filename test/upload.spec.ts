const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
chai.use(sinonChai)
const expect = chai.expect

import { upload } from '../src/upload'

import { createMockFile } from './util'

describe('upload', () => {

  const baseurl = '/upload'
  const config = {
    getUploadUrl: () => baseurl
  }
  const fileMeta = {
  }
  const file = createMockFile('test.txt', 'x')
  const url = baseurl

  let server: any

  beforeEach(() => {
    server = sinon.fakeServer.create()
      server.respondWith('POST', url, [200, {}, JSON.stringify(fileMeta)])
  })

  afterEach(() => {
    server.restore()
  })

  it('should upload to url', () => {
    const { upload$ } = upload(file, config)
    upload$.subscribe()

    server.respond()

    expect(server.requests.length).to.equal(1)
    const request = server.requests[0]

    expect(request.url).to.equal(url)
    expect(request.method).to.equal('POST')
    expect(request.status).to.equal(200)
  })

})
