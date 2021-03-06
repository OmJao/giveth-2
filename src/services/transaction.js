import { ethers } from 'ethers'
import Web3 from 'web3'
import getSigner from './ethersSigner'

export async function send(
  toAddress,
  subtotal,
  fromOwnProvider,
  isLoggedIn,
  sendTransaction,
  provider,
  txCallbacks
) {
  try {
    const transaction = {
      to: toAddress,
      value: ethers.utils.parseEther(subtotal.toString())
    }
    let hash

    if (fromOwnProvider && isLoggedIn) {
      const regularTransaction = await sendTransaction(transaction, txCallbacks)
      hash = regularTransaction?.transactionHash
    } else {
      const signer = getSigner(provider)
      const signerTransaction = await sendTransaction(
        transaction,
        txCallbacks,
        signer
      )

      hash = signerTransaction?.hash
    }
    if (!hash) throw new Error('Transaction failed')

    return hash
  } catch (error) {
    throw new Error(error?.message || error)
  }
}

export function notify(hash) {
  if (process.env.GATSBY_NETWORK === 'ropsten') return

  notify.config({ desktopPosition: 'topRight' })
  const { emitter } = notify.hash(hash)

  emitter.on('txPool', transaction => {
    return {
      // message: `Your transaction is pending, click <a href="https://rinkeby.etherscan.io/tx/${transaction.hash}" rel="noopener noreferrer" target="_blank">here</a> for more info.`,
      // or you could use onclick for when someone clicks on the notification itself
      onclick: () => window.open(`https://etherscan.io/tx/${transaction.hash}`)
    }
  })

  emitter.on('txSent', console.log)
  emitter.on('txConfirmed', console.log)
  emitter.on('txSpeedUp', console.log)
  emitter.on('txCancel', console.log)
  emitter.on('txFailed', console.log)

  emitter.on('all', event => {
    console.log('ALLLLLLL', event)
  })
}

export async function getHashInfo(txHash) {
  try {
    const web3 = new Web3(process.env.GATSBY_ETHEREUM_NODE)
    const txInfo = await web3.eth.getTransaction(txHash)
    console.log({ txInfo })
    return txInfo
  } catch (error) {
    console.log({ error })
    throw new Error(error)
  }
}

export async function confirmEtherTransaction(
  transactionHash,
  callbackFunction,
  count = 0
) {
  const web3 = new Web3(process.env.GATSBY_ETHEREUM_NODE)
  const MAX_INTENTS = 20 // one every second
  web3.eth.getTransactionReceipt(transactionHash, function (err, receipt) {
    if (err) {
      throw Error(err)
    }

    if (receipt !== null) {
      // Transaction went through
      if (callbackFunction) {
        callbackFunction({ ...receipt, tooSlow: false })
      }
    } else if (count >= MAX_INTENTS) {
      callbackFunction({ tooSlow: true })
    } else {
      // Try again in 1 second
      setTimeout(function () {
        confirmEtherTransaction(transactionHash, callbackFunction, ++count)
      }, 1000)
    }
  })
}
