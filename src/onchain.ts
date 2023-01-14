
import * as bsv from 'bsv'

import { Actor } from './actor'

import { v4 as uuid } from 'uuid'

const axios = require('axios')

interface OnchainPostParams {
  app: string;
  type: string;
  content: any;
}

interface OnchainPostResult {
  txid: string;
  txhex: string;
  // @ts-ignore
  tx: bsv.Transaction;
  txo: any;
}

export async function post(params: OnchainPostParams) {

    // @ts-ignore
  return onchain(window.relayone).post(params)

}

export async function findOne(params: any) {
// @ts-ignore
  return onchain(window.relayone).findOne(params)

}

export async function findAll(params: any) {
// @ts-ignore
  return onchain(window.relayone).findAll(params)

}

interface FindOrCreate {
  where: FindOne;
  defaults: OnchainPostParams;
}

export async function findOrCreate(params: FindOrCreate) {
    // @ts-ignore
  return onchain(window.relayone).findOrCreate(params)

}

interface FindOne {
  app?: string;
  type?: string;
  content?: any;
  author?: string;
}

interface FindAll {
  app?: string;
  type?: string;
  content?: any;
  author?: string;
  limit?: number;
  offset?: number;
}

const onchain = (relayone: any) => {


  async function findOne(params: FindOne) {

      const where: any = {}

      if (params.app) { where['app'] = params.app }

      if (params.author) { where['author'] = params.author }

      if (params.type) { where['type'] = params.type }

      if (params.content) {

        Object.keys(params.content).forEach(key => {

          where[key] = params.content[key]

        })

        //delete params.content

      }

      const query = new URLSearchParams(where).toString()

      const url = `https://onchain.sv/api/v1/search/events`

      //const url = `http://localhost:5200/api/v1/search/events`

      console.log('SEARCH URL', url)

      const { data } = await axios.post(url, params)

      const [event] = data.events

      if (!event) {

        return
      }

      return event

    }

    interface Where {
        app?: string;
        author?: string;
        type?: string;
        content?: any;
    }

    async function findAll(params: FindAll): Promise<any[]> {

      const where: Where | any = {}

      if (params.app) { where['app'] = params.app }

      if (params.author) { where['author'] = params.author }

      if (params.type) { where['type'] = params.type }

      if (params.content) {

        Object.keys(params.content).forEach(key => {

          where[key] = params.content[key]

        })

        delete params.content

      }

      const query = Object.keys(where).reduce((query, key) => {
        return `${query}&${key}=${where[key]}`
      }, '?')

      //const url = `https://onchain.sv/api/v1/search/events`
      const url = `http://localhost:5200/api/v1/search/events`

      const { data } = await axios.post(url, params)

      return data.events

    }

    async  function post (params: OnchainPostParams) {

        console.log('POST', params)

      const actor = new Actor({
        relayone
      })

      console.log('actor', actor)


      const message = {
        app: params.app,
        type: params.type,
        content: params.content,
        //nonce: ''
      }

      console.log('actor.publishMessage', message)

      const result: any = await actor.publishMessage(message)

      console.log('relayone.send.result', result)

      try {

        await axios.get(`https://onchain.sv/api/v1/events/${result.txid}`)

        console.log('published to onchain.sv', result)

      } catch(error) {

        console.error('failed to publish to onchain.sv', error)

        return { result }

      }

      return {
        result
      }

    }

    async function findOrCreate(params: FindOrCreate) {

      var isNew = true

      var result = await findOne(params.where)

      if (result) {

        return [result, false]
      }

      if (!result) {

        await post(Object.assign(params.where, params.defaults))

        result = await findOne(params.where)

      }

      if (!result) {

        throw new Error('Failed To Find Or Create')

      }

      return [result, isNew]

    }

  return {

    findOne,

    findOrCreate,

    post,

    findAll

  }

}

export default onchain