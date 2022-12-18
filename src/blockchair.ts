
import axios from 'axios'

import { v4 as uuid } from 'uuid'

import { Balance } from './wallet'

const key = ''

const currencies: any = {
  'BCH': 'bitcoin-cash',
  'BSV': 'bitcoin-sv',
  'BTC': 'bitcoin',
  'DASH': 'dash',
  'LTC': 'litecoin',
  'DOGE': 'dogecoin'
}

export class BlockchairApiError extends Error {}

export async function getAddress(coin: string, address: string) {

  const trace = uuid()

  try {

    const { data } = await axios.get(`https://api.blockchair.com/${coin.toLowerCase()}/dashboards/address/${address}`)

    return data

  } catch(err: any) {

    const error = new BlockchairApiError(err.message)

    throw error

  }

}

export async function getBalance(asset: string, address: string): Promise<Balance> {

  try {


    const currency = currencies[asset]

    const url = `https://api.blockchair.com/${currency}/dashboards/address/${address}?key=${key}`

    const response = await axios.get(url)

    const { data } = response

    const { balance: value, balance_usd: value_usd } = data['data'][address]['address']

    const utxos = data['data'][address]['utxo']

    return { asset, address, value: parseFloat(value), value_usd: parseFloat(value_usd.toFixed(2)) }

  } catch(err: any) {

    const error = new BlockchairApiError(err.message)

    throw error
  }

}

export interface BlockchairUtxo {
  block_id: number;
  transaction_hash: string;
  index: number;
  value: number;
}

interface Utxo {
  txid: string;
  vout: number;
  value: number;
}

export async function listUnspent(asset: string, address: string): Promise<Utxo[]> {

  try {

    const currency = currencies[asset]

    const { data } = await axios.get(`https://api.blockchair.com/${currency}/dashboards/address/${address}?key=${key}`)

    const utxos: BlockchairUtxo[] = data['data'][address]['utxo']

    return utxos.map(utxo => {
      return {
        txid: utxo.transaction_hash,
        vout: utxo.index,
        value: utxo.value
      }
    })


  } catch(err: any) {

    const error = new BlockchairApiError(err.message)

    throw error
  }

}

export async function getRawTx(asset: string, txid: string): Promise<any> {

  try {

    const currency = currencies[asset]

    const { data } = await axios.get(`https://api.blockchair.com/${currency}/raw/transaction/${txid}?key=${key}`)

    return data['data'][txid]['decoded_raw_transaction']

  } catch(err: any) {

    const error = new BlockchairApiError(err.message)

    throw error
  }

}

