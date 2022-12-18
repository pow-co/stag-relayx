
import * as bsv from 'bsv-2'

import * as uuid from 'uuid'

interface NewMessage {
  app: string;
  type: string;
  content: any;
  nonce?: string;
}

interface SocialMessage  {
  app: string;
  content: string;
  author?: string;
  contentType?: string;
}

interface BlockchainMessage extends NewMessage {
  txid: string;
  vout: number;
  script: string;
  author?: string;
}

interface ActorParams {
  purse: string;
  owner: string;
}

export const authorIdentityPrefix = '15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva';

export class Actor {

  relayone: any;

  constructor({relayone}: {relayone: any}) {
    this.relayone = relayone;
  }

  get identity() {
    return ''
    
  }

  async publishOpReturn(opReturn: string[]): Promise<any> {


  }

  async publishMessage(newMessage: NewMessage, sign: boolean = false): Promise<BlockchainMessage> {

      newMessage.nonce = newMessage.nonce || uuid.v4()

      const payloadToSign = JSON.stringify(Object.assign(newMessage.content, {
        _app: newMessage.app,
        _type: newMessage.type,
        _nonce: newMessage.nonce
      }))

      console.log("PAYLOAD TO SIGN", payloadToSign)

      let signature = ''

      const send = {
        to: 'johngalt@relayx.io',
        amount: 0.001,
        currency: 'BSV',
        opReturn: [
            'onchain.sv',
            newMessage.app,
            newMessage.type,
            payloadToSign,
            "|",
            authorIdentityPrefix,
            "BITCOIN_ECDSA",
            this.identity,
            signature,
            '0x05' // signed index #5 "payloadToSign"
          ]
      }

      console.log("relayone.send", send)

      return this.relayone.send(send)

  }

  socialMessage(newMessage: SocialMessage): Promise<BlockchainMessage> {

    const defaultContentType = 'text/markdown'

    const contentType = newMessage.contentType || 'text/markdown'

    return new Promise(async (resolve, reject) => {

      const payloadToSign = newMessage.content

      let address = new bsv.Address().fromString(this.identity)

        var signature = ''

      return this.publishOpReturn([
        'B',
        newMessage.app,
        payloadToSign,
        "|",
        authorIdentityPrefix,
        "BITCOIN_ECDSA",
        this.identity,
        signature,
        '0x05' // signed index #5 "payloadToSign"
      ])

      let verified = bsv.Bsm.verify(Buffer.from(payloadToSign, 'utf8'), signature, address)

      if (!verified) {
        throw new Error('SIGNATURE NOT VERIFIED')
      }

    })

  }

}
