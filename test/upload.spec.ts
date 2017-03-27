// const chai = require('chai')
// const sinon = require('sinon')
// const sinonChai = require('sinon-chai')
// chai.use(sinonChai)
// const expect = chai.expect

// import { upload } from '../src/upload'

// describe.skip('upload', () => {

  // const url = '/upload'
  // const config = {
    // getUploadUrl: () => url
  // }

  // let server: any

  // beforeEach(() => {
    // server = sinon.fakeServer.create()
  // })

  // afterEach(() => {
    // server.restore()
  // })

  // it('should upload to url', () => {
    // const response = { response: 'response' }
    // const headers = { Authorization: 'token' }
    // const onSuccess = sinon.spy()

    // server.respondWith('POST', url, [
      // 200,
      // { "Content-Type": "application/json" },
      // JSON.stringify(response)
    // ])

    // upload({ ...config, headers, onSuccess })

    // server.respond()

    // expect(server.requests.length).to.equal(1)
    // const request = server.requests[0]

    // expect(request.url).to.equal(url)
    // expect(request.method).to.equal('POST')
    // expect(JSON.stringify(request.requestHeaders)).to.equal(JSON.stringify({
      // 'Content-Type': 'application/octet-stream;charset=utf-8',
      // ...headers
    // }))
    // expect(onSuccess).to.be.calledOnce
    // expect(onSuccess).to.be.calledWith(response)
  // })

  // it('should call onCreate before ajax call', () => {
    // const onSuccess = sinon.spy()
    // const onCreate = sinon.spy()
    // server.respondWith('POST', url, [200, {}, ''])

    // upload({ ...config, onCreate, onSuccess })
    // expect(onCreate).to.be.called
    // server.respond()
    // expect(onSuccess).to.be.called
  // })

  // it('should call onProgress while in progress', () => {
    // const progress = {
      // total: 100,
      // loaded: 20
    // }
    // const onProgress = sinon.spy()

    // upload({ ...config, onProgress })

    // server.requests[0].upload.onprogress(progress)
    // server.respond()

    // expect(onProgress).to.be.calledWith(progress)
  // })

  // it('should call onError when error', () => {
    // const onError = sinon.spy()
    // const onSuccess = sinon.spy()

    // upload({ ...config, onSuccess, onError })

    // server.respond()

    // expect(onSuccess).not.to.be.called
    // expect(onError).to.be.called
  // })

  // it('should be able to abort', () => {
    // const onSuccess = sinon.spy()
    // const onError = sinon.spy()
    // const { abort } = upload({ ...config, onSuccess, onError })
    // abort()
    // server.respond()
    // expect(onSuccess).not.to.be.called
    // expect(onError).not.to.be.called
  // })

  // it('should be able to retry after error', () => {
    // const onSuccess = sinon.spy()
    // const onError = sinon.spy()

    // const { abort, retry } = upload({ ...config, onSuccess, onError })

    // server.respond()

    // expect(server.requests.length).to.equal(1)
    // expect(server.requests[0].readyState).to.equal(4)
    // expect(onSuccess).not.to.be.called
    // expect(onError).to.be.calledOnce

    // retry()

    // server.respond()

    // expect(server.requests.length).to.equal(2)
    // expect(server.requests[0].readyState).to.equal(4)
    // expect(server.requests[1].readyState).to.equal(4)
    // expect(onSuccess).not.to.be.called
    // expect(onError).to.be.calledTwice
  // })

// })
