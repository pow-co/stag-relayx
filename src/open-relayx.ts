
import BigNumber from 'bignumber.js'

import * as bitcore from 'bsv'
import { RunUtxo, run } from './run';

import * as blockchair from './blockchair'

interface NewSend {
    amount: number;
    to: string;
    currency: string;
    opReturn?: string[]
}

interface NewPost {
    opReturn?: string[]
}

interface SendResult {
    txid: string;
    txhex: string;
}

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
  

class Relayone {

    send(newSend: NewSend): Promise<SendResult> {

    }

    post(opReturn: string[]): Promise<SendResult> {

    }

    async buildPayment(paymentRequest: any) {

        let { instructions } = paymentRequest
        
        const unspent = await  wallet.listUnspent()
        
        let privatekey = new bitcore.PrivateKey(wallet.privatekey)
    
        var tx, totalInput, totalOutput = 0;
    
        const unspent = await Promise.all(wallet.unspent.map(async (utxo: Utxo) => {
    
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
    
          log.error('buildPayment', error)
        }
    
        totalInput = wallet.unspent.reduce((sum: BigNumber, input: any) => {
    
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

interface Utxo {
    txid: string;
    vout: number;
    value: number;
    scriptPubKey: string;
}

export async function listUnspent(address: string): Promise<Utxo[]> {

    const utxos: RunUtxo[]  = await run.blockchain.utxos(address)
  
    return utxos.map(utxo => {
      return {
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.satoshis,
        scriptPubKey: utxo.script
      }
    })
  
  }
  
export const relayone = new Relayone()
