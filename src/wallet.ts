
import BigNumber from 'bignumber.js'

import { Client } from './client'

import * as blockchair from './blockchair'

import * as bitcore from 'bsv'

export class UnsufficientFundsError extends Error {
  currency: string;
  address: string;
  paymentRequest: any;
  balance: number;
  required: number;

  constructor({
    currency,
    address,
    paymentRequest,
    balance,
    required
  }: {
    currency: string,
    address: string,
    paymentRequest: any,
    balance: number,
    required: number})
  {
    super()

    this.currency = currency;
    this.address = address;
    this.balance = balance;
    this.required = required;
    this.paymentRequest = paymentRequest

    this.message = `Insufficient ${currency} Balance of ${balance} in ${address}: ${required} required`
  }

}

var assets = require('require-all')({
  dirname  :  __dirname + '/assets',
  recursive: true,
  filter      :  /(.+)\.ts$/,
  map: (name: string) => name.toUpperCase()
});

import { convertBalance } from './balance'

export interface Utxo {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey?: string;
}

interface PaymentTx {
  tx_hex: string;
  tx_hash?: string;
  tx_key?: string;
}

export interface Balance {
  asset: string;
  address: string;
  value: number;
  value_usd?: number;
  errors?: Error[];
}

interface LoadCard {
  asset: string;
  privatekey: string;
  hdprivatekey?: string;
  address?: string;
  mnemonic?: string;
}

export class Wallet {
  cards: Card[]

  constructor(params: {
    cards: Card[]
  }) {
    this.cards = params.cards
  }

  static async load(cards: LoadCard[]): Promise<Wallet> {

    return new Wallet({ cards: cards.map((card: LoadCard) => new Card(card)) })

  }

  async balances(): Promise<(Balance | null)[]> {

    let balances = await Promise.all(this.cards.map(async card => {

      //if (card.asset === 'DOGE') { return }
 
      try {

        let balance = await card.balance()

        return balance

      } catch(error) {

        console.error('balances.error', error)

        return null

      }

    }))

    return balances.filter((balance: any) => balance !== null)

  }


  async payUri(uri: string, asset:string, {transmit}:{transmit: boolean}={transmit:true}): Promise<PaymentTx> {

    let client = new Client(uri)

    let paymentRequest = await client.selectPaymentOption({
      chain: asset,
      currency: asset
    })

    var payment;

    var options: any;

    payment = await this.buildPayment(paymentRequest, asset)

    if (!transmit) return payment;

    try {
      
      let result = await client.transmitPayment(paymentRequest, payment, options)

    } catch(error) {

      throw error

    }

    return payment

  }

  asset(asset: string) {

    return this.cards.filter(card => card.asset === asset)[0]
  }


  async buildPayment(paymentRequest: any, asset: string = 'BSV') {

    let { instructions } = paymentRequest

    let wallet = this.asset(asset)

    await wallet.listUnspent()

    let privatekey = new bitcore.PrivateKey(wallet.privatekey)

    var tx, totalInput, totalOutput = 0;

    const unspent = await Promise.all(wallet.unspent.map(async utxo => {

      if (utxo.scriptPubKey) {
        return utxo
      }

      const raw_transaction = await blockchair.getRawTx(wallet.asset, utxo.txid)

      return Object.assign(utxo, {
        scriptPubKey: raw_transaction['vout'][utxo.vout].scriptPubKey.hex,
      })
    }))

    try {

      const coins = unspent.map(utxo => {

        const result = {
          txId: utxo.txid,
          outputIndex: utxo.vout,
          satoshis: utxo.value,
          scriptPubKey: utxo.scriptPubKey
        }

        return result
      })

      tx = new bitcore.Transaction()
        .from(coins)
        .change(wallet.address)

    } catch(error) {

      console.error('buildPayment', error)
    }

    totalInput = wallet.unspent.reduce((sum, input) => {

      let satoshis = new BigNumber(input.value).times(100000000).toNumber()

      return sum.plus(satoshis)

    }, new BigNumber(0)).toNumber()

    for (let output of instructions[0].outputs) {

      // TODO: Support Script Instead of Address

      if (output.address) {

        let address = bitcore.Address.fromString(output.address)

        let script = bitcore.Script.fromAddress(address)

        tx.addOutput(
          bitcore.Transaction.Output({
            satoshis: output.amount,
            script: script.toHex()
          })
        )

        totalOutput += output.amount

      } else if (output.script) {

        let script = bitcore.Script(output.script)

        tx.addOutput(
          bitcore.Transaction.Output({
            satoshis: output.amount,
            script: script.toHex()
          })
        )

        totalOutput += output.amount

      }

    }

    if (totalInput < totalOutput) {

      console.debug('InsufficientFunds', {
        currency: wallet.asset,
        totalInput,
        totalOutput
      })

      throw new Error(`Insufficient ${wallet.asset} funds to pay invoice`)
    }

    if (totalOutput > totalInput) {

      throw new UnsufficientFundsError({
        currency: wallet.asset,
        address: wallet.address,
        paymentRequest,
        balance: totalInput,
        required: totalOutput
      })

    }

    tx.sign(privatekey)

    return tx.toString('hex')

  }

}

interface RPC {
  listUnspent?(address: string, trace?: string): Promise<Utxo[]>;
  getBalance?(address: any): Promise<number>;
}

export class Card {

  asset: string;
  privatekey: string;
  address: string;
  unspent: Utxo[];

  constructor(params: {
    asset: string,
    privatekey: string,
    mnemonic?: string;
    hdprivatekey?: string;
  }) {
    this.unspent = []
    this.asset = params.asset
    this.privatekey = params.privatekey

    this.address = new bitcore.PrivateKey(this.privatekey).toAddress().toString();
    
  }
  
  async getUnspent() {

    const blockchairUnspent = await blockchair.listUnspent(this.asset, this.address)

    this.unspent = blockchairUnspent
  }

  async listUnspent(): Promise<Utxo[]> {

      try {

        this.unspent = await blockchair.listUnspent(this.asset, this.address)


      } catch(error: any) {

        error.asset = this.asset
        error.address = this.address

        console.error('blockchair.listUnspent.error', error)

      }

    return this.unspent

  }

  async balance(): Promise<Balance> {

    const asset = this.asset

    var value: any;

    const errors: any = []


      try {

        if (this.address){ 

            value = await blockchair.getBalance('BSV', this.address)
        }

        

      } catch(error: any) {

        errors.push(error)

        error.asset = this.asset
        error.address = this.address

        console.error('blockchair.getBalance.error', error)

      }
      
    const { amount: value_usd } = await convertBalance({
      currency: this.asset,
      amount: this.asset === 'XMR' ? value : value / 100000000
    }, 'USD')

    try {

      this.unspent = await this.listUnspent()

      if (!value) {

        value = this.unspent.reduce((sum, output) => {

          return sum.plus(output.value)
    
        }, new BigNumber(0)).toNumber()

      }

      if (errors.length > 0 && !value) {

        value = false
      }

      return {
        asset: this.asset,
        value: value,
        value_usd,
        address: this.address,
        errors
      }

    } catch(error) {

      return {
        asset: this.asset,
        value: value,
        value_usd,
        address: this.address,
        errors
      }

    }


  }

}

const bsv = require('bsv')

const { Bip39 } = require('bsv-2')

export function fromBackupSeedPhrase(mnemonic: string): Wallet{

  const seed = Bip39.fromString(mnemonic).toSeed().toString('hex')

  const hdPrivateKey = bsv.HDPrivateKey.fromSeed(seed)

  const bsvKey     = hdPrivateKey.deriveChild(`m/44'/236'/0'/0/0`).privateKey

  const changeKey  = hdPrivateKey.deriveChild(`m/44'/236'/0'/1/0`).privateKey

  const runKey     = hdPrivateKey.deriveChild(`m/44'/236'/0'/2/0`).privateKey

  const cancelKey  = hdPrivateKey.deriveChild(`m/44'/236'/0'/3/0`).privateKey

  const paymailKey = hdPrivateKey.deriveChild(`m/0'/236'/0'/0/0`).privateKey

  return new Wallet({
    cards: [
      new Card({
        asset: 'BSV',
        privatekey: bsvKey,
        mnemonic,
        hdprivatekey: hdPrivateKey.toString()
      })
    ]
  })

}

export async function loadWallet(loadCards?: LoadCard[]) {

  let cards: Card[] = []

  if (loadCards) {

    for (let loadCard of loadCards) {

      cards.push(new Card(loadCard))

    }
    
  } else {



  }

  return new Wallet({ cards })

}

