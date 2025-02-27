const {
    address,
    createSolanaRpc,
    generateKeyPair,
    isAddress,
    createTransactionMessage,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
    getAddressFromPublicKey,
    signTransaction,
    getComputeUnitEstimateForTransactionMessageFactory
} = require('@solana/web3.js');
const { pipe } = require('@solana/functional');

const EventEmitter = require('events');
const bs58 = require('bs58');

// Proxies
const NONCE_ACCOUNT_LENGTH = 0;


class SolRPC {

  /**
   * Constructs a new instance of the SolRPC class.
   * 
   * @param {Object} config - The configuration object containing the connection details.
   * @param {string} config.protocol - The network protocol (e.g., 'http', 'https', 'wss').
   * @param {string} config.host - The host URL or IP address.
   * @param {number} [config.port] - The port number (optional).
   * @param {string} config.account - The account to use for transactions.
   */
  constructor(config) {
    this.config = config;
    this.rpc = this.initRpcConnection(this.config);
    this.rpcSubscriptions = this.initRpcSubscriptions(this.config);
    this.emitter = new EventEmitter();
    this.web3 = Web3;
    // configuration for retrieving versioned blocks and transactions
    this._versionedConfig = {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    };
  }

  /**
   * Creates and returns a new Web3 Connection instance configured with the specified connection settings.
   * The connection is set to return data that has been confirmed by the cluster.
   * 
   * @param {Object} connectionConfig - The configuration object containing the connection details.
   * @param {string} connectionConfig.protocol - The network protocol (e.g., 'http', 'https', 'wss').
   * @param {string} connectionConfig.host - The host URL or IP address.
   * @param {number} [connectionConfig.port] - The port number (optional).
   * @throws {Error} If the protocol is not specified or is invalid.
   * @returns {import('@solana/web3.js').Rpc<import('@solana/web3.js').SolanaRpcApi>}
   */
  initRpcConnection(connectionConfig) {
    const { protocol, host, port } = connectionConfig;
    if (!protocol || !['wss', 'http', 'https'].includes(protocol.toLowerCase())) {
      throw new Error('Please provide a valid protocol');
    }
    const connectionString = port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
    const rpc = createSolanaRpc(connectionString);
    return rpc;
  }

  initRpcSubscriptions(connectionConfig) {
    throw new Error('Not implemented');
  }

  async executeRpcRequest() {}

  async executeSubscription() {}

  getConnection() {
    return this.rpc;
  }
  
  // NEW IMPLEMENTATIONS SECTION
  async getBalance({ address }) {
    if (!this.validateAddress({ address })) {
      return null;
    }
    return await this.rpc.getBalance(this.toAddress(address)).send();
  }

  async sendToAddress(input) {
    try {

    } catch (err) {
        throw err;
    }
  }

  // New space sandbox
  /**
   * 
   * @param {Object} input 
   * @param {0 | 'legacy'} input.version
   * @param {import('@solana/web3.js').Address} input.feePayerAddress
   * @param {import('@solana/web3.js').Blockhash} input.recentBlockhash
   */
  #createTransactionMessageWithFeePayerAndLifetime(input) {
      try {
        const { version, feePayerAddress, recentBlockhash } = input;
    
        const transactionMessage = pipe(
            createTransactionMessage({ version }),
            tx => setTransactionMessageFeePayer(feePayerAddress, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(recentBlockhash, tx)
        );
        return transactionMessage;        
    } catch (err) {
        throw err;
    }
  }

  #createType0TransactionMessage() {
    const transactionMessage = createTransactionMessage({ version: 0 });
    return transactionMessage;
  }

  #createTypeLegacyTransactionMessage() {
    const transactionMessage = createTransactionMessage({ version: 'legacy' });
    return transactionMessage;
  }

  async signTransactionMessage(transactionMessage) {
      try {
        // Stub feePayer
        const feePayer = await generateKeyPair();
        const feePayerAddress = await getAddressFromPublicKey(feePayer.publicKey);
    
        const recentBlockhash = await this.#getLatestBlockhash();
    
        const transactionMessageWithFeePayerAndLifetime = this.#createTransactionMessageWithFeePayerAndLifetime({ feePayerAddress, recentBlockhash: recentBlockhash.blockhash });
        const signedTransaction = await signTransaction([feePayer], transactionMessageWithFeePayerAndLifetime);
        return signedTransaction;
    } catch (err) {
        throw err;
    }
  }

  async #getLatestBlockhash() {
    try {
        const recentBlockhash = (await this.rpc.getLatestBlockhash().send()).value;
        return recentBlockhash;
    } catch (err) {
        throw err;
    }
  }

  /**
   * STUBBED
   */
  async estimateFee() {
    return 5000;
  }

  async estimateTransactionFee(transactionMessage) {
    const getComputeUnitEstimateForTransactionMessage = getComputeUnitEstimateForTransactionMessageFactory({ rpc: this.rpc });
    const computeUnitsEstimate = await getComputeUnitEstimateForTransactionMessage(transactionMessage);
    return computeUnitsEstimate;
  }

  async getBestBlockHash() {
    const tip = await this.getTip();
    return tip?.hash || null;
  }
  async getTip() {
      try {
        const slot = await this.rpc.getSlot({ commitment: 'confirmed' }).send();
        const block = await this.rpc.getBlock(slot, this._versionedConfig).send();
        return { height: slot, hash: block.blockhash };
    } catch (err) {
        throw err;
    }
  }
  // END NEW IMPLEMENTATIONS SECTION

  /**
   * Retrieves the balance of the specified address.
   * 
   * @param {Object} params - The parameters for retrieving the balance.
   * @param {string} params.address - The public key of the address to check the balance for.
   * @returns {Promise<number|null>} The balance of the specified address in lamports.
   */


  /**
   * Sends a specified amount of lamports to a given address, either through a versioned or legacy transaction.
   * 
   * @param {Object} params - The parameters for the transaction.
   * @param {string} params.address - The public key of the recipient.
   * @param {number} params.amount - The amount of lamports to send.
   * @param {Object} params.fromAccountKeypair - The keypair of the sender.
   * @param {string} params.nonceAddress - The public key of the nonce account (optional).
   * @param {string} [params.txType='legacy'] - The type of transaction ('legacy' or '0' for versioned).
   * @param {boolean} [params.priority=false] - Whether to add a priority fee to the transaction.
   * @returns {Promise<string>} The transaction hash.
   * @throws {Error} If the transaction confirmation returns an error.
   */
  async sendToAddress({ address, amount, fromAccountKeypair, nonceAddress, txType = 'legacy', priority }) {
    try {
      if (!(fromAccountKeypair instanceof Web3.Keypair)) {
        throw new Error('Invalid Solana Keypair object');
      }

      const fromAccount = fromAccountKeypair.publicKey;
      address = new Web3.PublicKey(address);
      const block = await this.getTip();
      let transaction;
      let sendParams;

      if (txType == 0) {
        // versioned tx
        transaction = await this._createTransferTxType0({ address, amount, fromAccount, block, nonceAddress });
        sendParams = [transaction, { maxRetries: 5 }];
      } else {
        // legacy
        transaction = await this._createTransferTxTypeLegacy({ address, amount, fromAccount, block, nonceAddress });
        sendParams = [transaction, [fromAccountKeypair], { maxRetries: 5 }];
      }
      if (priority) {
        transaction = await this.addPriorityFee({ transaction });
      }
      if (txType == 0) {
        transaction.sign([fromAccountKeypair]);
      }
      const txid = await this.connection.sendTransaction(...sendParams);
      return txid;
    } catch (err) {
      this.emitter.emit(`Failure sending a type ${txType} transaction to address ${address}`, err);
      throw err;
    }
  }

  async _createTransferTxType0({ address, amount, fromAccount, block, nonceAddress }) {
    let recentBlockhash = block.hash;
    if (nonceAddress) {
      const nonceAccount = new Web3.PublicKey(nonceAddress);
      const nonceAccountInfo = await this.connection.getNonce(nonceAccount);
      recentBlockhash = nonceAccountInfo.nonce;
    }
    const instructions = [
      Web3.SystemProgram.transfer({
        fromPubkey: fromAccount,
        toPubkey: address,
        lamports: BigInt(amount)
      })
    ];
    const message = new Web3.TransactionMessage({
      payerKey: fromAccount,
      recentBlockhash,
      instructions
    }).compileToV0Message();
    return new Web3.VersionedTransaction(message);
  }

  async _createTransferTxTypeLegacy({ address, amount, fromAccount, block, nonceAddress }) {
    let initParams = {
      blockhash: block.hash,
      feePayer: fromAccount,
      lastValidBlockHeight: block.height + 1000 // block height 24 hours away
    };
    if (nonceAddress) {
      const nonceAccount = new Web3.PublicKey(nonceAddress);
      const nonceAccountInfo = await this.connection.getNonce(nonceAccount);
      initParams = {
        blockhash: nonceAccountInfo.nonce,
        feePayer: fromAccount,
        minContextSlot: block.height,
        nonceInfo: {
          nonce: nonceAccountInfo.nonce,
          nonceInstruction: Web3.SystemProgram.nonceAdvance({
            noncePubkey: nonceAccount,
            authorizedPubkey: fromAccount
          })
        }
      };
    }

    return new Web3.Transaction(initParams).add(Web3.SystemProgram.transfer({
      fromPubkey: fromAccount,
      toPubkey: address,
      lamports: BigInt(amount)
    }));
  }

  async createNonceAccount(senderKeypair, nonceAccountKeypair) {
    if (!(senderKeypair instanceof Web3.Keypair)) {
      throw new Error('Invalid Solana Keypair: Sender');
    }
    if (!(nonceAccountKeypair instanceof Web3.Keypair)) {
      throw new Error('Invalid Solana Keypair: Nonce Account ');
    }
    // const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    const { value } = await this.rpc.getLatestBlockhash().send();
    const { blockhash, lastValidBlockHeight } = value;

    const minRentLamports = await this.rpc.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH).send();

    const nonceAccountTransaction = new Web3.Transaction({
      feePayer: senderKeypair.publicKey,
      recentBlockhash: blockhash,
      lastValidBlockHeight
    }).add(
      Web3.SystemProgram.createAccount({
        fromPubkey: senderKeypair.publicKey,
        newAccountPubkey: nonceAccountKeypair.publicKey,
        lamports: minimumRent,
        space: Web3.NONCE_ACCOUNT_LENGTH,
        programId: Web3.SystemProgram.programId,
      }),
      Web3.SystemProgram.nonceInitialize({
        noncePubkey: nonceAccountKeypair.publicKey,
        authorizedPubkey: senderKeypair.publicKey,
      })
    );
    try {
      return await Web3.sendAndConfirmTransaction(this.connection, nonceAccountTransaction, [senderKeypair, nonceAccountKeypair]);
    } catch (err) {
      this.emitter.emit('Failure to create a nonce account', err);
      throw err;
    }
  }

  /**
   * Estimates the transaction fee either based on a raw transaction or by calculating the average fee
   * over a specified number of blocks.
   * 
   * @param {Object} options - The options for fee estimation.
   * @param {number} [options.nBlocks=10] - The number of recent blocks to consider for average fee calculation.
   * @param {string} [options.rawTx] - The raw transaction data for direct fee estimation.
   * @returns {Promise<number>} The estimated fee in lamports.
   * @throws Will throw an error on raw tx estimation if the fee estimation fails or tx cannot be decoded.
   */
  async estimateFee({ nBlocks = 10, rawTx }) {
    if (rawTx) {
      // Recommended. Directly estimate fee based on the provided raw transaction size.
      return await this.estimateTransactionFee({ rawTx });
    }

    // Fee can be a caclculeted by (Number of Signatures × Lamports per Signature)
    // Calculate the average lamports per signature over the past n blocks
    const samples = await this.connection.getRecentPerformanceSamples(nBlocks);
    let totalFees = 0;
    let totalBlocks = 0;
    const minFee = 5000; // Set a minimum fee per signature in lamports
    for (const sample of samples) {
      const { blockhash } = await this.getBlock({ height: sample.slot });
      if (blockhash) {
        const feeCalculator = await this.connection.getFeeCalculatorForBlockhash(blockhash, 'confirmed');
        if (feeCalculator && feeCalculator.value) {
          totalFees += feeCalculator.value.lamportsPerSignature;
          totalBlocks++;
        }
      }
    }
    // Return the average fee or the minimum fee if no blocks were processed
    return totalBlocks > 0 ? (totalFees / totalBlocks) : minFee;
  }

  /**
   * Estimates the transaction fee based on the provided raw transaction data.
   * 
   * @param {Object} options - The options for fee estimation.
   * @param {string} options.rawTx - The raw transaction data for direct fee estimation.
   * @returns {Promise<number>} The estimated fee in lamports.
   * @throws Will throw an error if the fee estimation fails or tx cannot be decoded.
   */
  async estimateTransactionFee({ rawTx }) {
    const tx = this.decodeRawTransaction({ rawTx });
    if (!tx) {
      throw new Error('Could not decode provided raw transaction');
    }
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.message.recentBlockhash = blockhash;
    // Estimate the fee
    const feeCalculator = await this.connection.getFeeForMessage(tx.message);

    if (!feeCalculator || !feeCalculator.value) {
      throw new Error('Failed to estimate transaction fee');
    }

    return feeCalculator.value;
  }

  /**
   * Estimates the maximum priority fee based on recent transaction fees and a specified percentile.
   * This function retrieves recent prioritization fees and calculates the fee at the given percentile.
   * The fee is the per-compute-unit fee paid by at least one successfully landed transaction
   * 
   * @param {Object} config - Configuration options for retrieving prioritization fees.
   * @param {number} [percentile=25] - The percentile (0-100) of fees to consider for maximum priority fee estimation.
   * @returns {Promise<number|null>} The estimated maximum priority fee or null if no fees are available.
   */
  async estimateMaxPriorityFee({ config, percentile = 25 }) {
    const recentFees = await this.connection.getRecentPrioritizationFees(config);
    if (!recentFees || recentFees.length === 0) {
      return null;
    }
    const priorityFees = recentFees
      .map(fee => fee.prioritizationFee)
      .filter(x => Number(x) > 0)
      .sort((a, b) => a - b);
    if (!priorityFees || priorityFees.length === 0) {
      return 0;
    }
    const feeIdx = Math.floor(priorityFees.length * (percentile / 100)) - Math.floor(percentile / 100);
    return priorityFees[feeIdx];
  }

  /**
   * Adds a priority fee to the given transaction based on recent prioritization fees.
   * This function modifies the compute unit limit and sets the compute unit price for the transaction.
   * 
   * @param {Object} params - Parameters for adding priority fee.
   * @param {Web3.VersionedTransaction} params.transaction - The transaction to which the priority fee will be added.
   * @param {number} [params.unitLimit=300] - The compute unit limit to set for the transaction.
   * @param {Object} params.config - Configuration options for retrieving prioritization fees.
   * @returns {Promise<Web3.VersionedTransaction>} The modified transaction with the added priority fee.
   * @throws Will throw an error if adding the priority fee fails for reasons other than 'Method not found'.
   */
  async addPriorityFee({ transaction, unitLimit = 300, config }) {
    try {
      const priorityFee = await this.estimateMaxPriorityFee({ config });
      const modifyComputeUnits = Web3.ComputeBudgetProgram.setComputeUnitLimit({ units: unitLimit });
      const addPriorityFee = Web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee });
      transaction = transaction
        .add(modifyComputeUnits)
        .add(addPriorityFee);
    } catch (err) {
      if (err && err.message !== 'failed to get recent prioritization fees: Method not found') {
        this.emitter.emit('failure', err);
        throw err;
      }
      console.warn('Priority fee\'s are not supported by this cluster', err);
    }
    return transaction;
  }



  /**
   * Retrieves a transaction by its transaction ID.
   * 
   * @param {Object} params - Parameters for retrieving the transaction.
   * @param {string} params.txid - The transaction ID of the transaction to retrieve.
   * @returns {Promise<Web3.VersionedTransactionResponse|null>} The transaction object if found, otherwise null.
   */
  async getTransaction({ txid }) {
    if (!txid || !this.isBase58(txid)) {
      return null;
    }
    const tx = await this.rpc.getTransaction(txid, this._versionedConfig).send();
    if (!tx) {
      return null;
    }
    return tx;
  }

  /**
   * Get all transactions for an account
   * @param {Object} params - Parameters for retrieving transactions.
   * @param {string} params.address - Account address to get transactions for.
   * @returns {Promise<Array<Web3.VersionedTransactionResponse>|null>} A promise that resolves to an array of transactions.
   */
  async getTransactions({ address: addressInput }) {
    if (!this.validateAddress({ address: addressInput })) {
      return null;
    }
    const address = this.toAddress(addressInput);
    const txids = (await this.rpc.getSignaturesForAddress(address).send()).map(el => el.signature);
    // const transactions = await this.rpc.getParsedTransactions(txids);
    const transactions = [];

    // Fetch transaction details for each signature
    for (const txid of txids) {
      try {
        const tx = await this.rpc.getTransaction(txid, this._versionedConfig).send();
        if (tx) {
          transactions.push(tx);
        }
      } catch (err) {
        this.emitter.emit('failure', err);
      }
    }
    return transactions;
  }

  /**
   * Retrieves the count of confirmed transactions for a given account address.
   * Note: Returned data is affected by the nodes retention period. Non-archival nodes will not return full count.
   * 
   * @param {Object} params - Parameters for retrieving the transaction count.
   * @param {string} params.address - The account address to get the transaction count for.
   * @returns {Promise<number|null>} A promise that resolves to the number of confirmed transactions.
   */
  async getTransactionCount({ addressInput }) {
    if (!this.validateAddress({ address: addressInput })) {
      return null;
    }
    const address = this.toAddress(addressInput);
    let signatures = await this.rpc.getSignaturesForAddress(address).send();
    let result = signatures.length;
    while (signatures.length === 1000) {
      const beforeSignature = signatures[signatures.length - 1].signature;
      const nextBatch = await this.rpc.getSignaturesForAddress(address, { before: beforeSignature }).send();
      signatures = nextBatch;
      result += signatures.length;
    }

    return result;
  }

  /**
   * Retrieves and serializes a raw transaction by its transaction ID.
   * 
   * @param {Object} params - Parameters for retrieving the raw transaction.
   * @param {string} params.txid - The transaction ID of the transaction to retrieve.
   * @returns {Promise<string|null>} A promise that resolves to the raw transaction as a base64 string or null if not found.
   */
  async getRawTransaction({ txid }) {
    if (!txid || !this.isBase58(txid)) {
      return null;
    }
    const tx = await this.connection.getTransaction(txid, this._versionedConfig);
    if (!tx || !tx.transaction || !tx.transaction.signatures) {
      return null;
    }
    const signatures = tx.transaction.signatures.map(sig => bs58.decode(sig));
    const vTx = new Web3.VersionedTransaction(tx.transaction.message, signatures);
    return this.toBuffer(vTx.serialize()).toString('base64');
  }

  /**
   * Decodes a raw transaction.
   * 
   * @param {Object} params - Parameters for decoding the raw transaction.
   * @param {Uint8Array|string} params.rawTx - The raw transaction to be decoded.
   * @returns {Web3.VersionedTransaction|null} The decoded transaction or null if the input is invalid.
   */
  decodeRawTransaction({ rawTx }) {
    if (rawTx && typeof rawTx === 'string') {
      rawTx = this.base64ToUint8Array(rawTx);
    }
    if (!(rawTx instanceof Uint8Array)) {
      return null;
    }
    return Web3.VersionedTransaction.deserialize(rawTx);
  }

  /**
   * Sends a raw transaction to the network.
   * 
   * @param {Object} params - Parameters for sending the raw transaction.
   * @param {Uint8Array} params.rawTx - The raw transaction to be sent.
   * @returns {Promise<string|null>} A promise that resolves to the transaction ID or null if the transaction is invalid.
   */
  async sendRawTransaction({ rawTx }) {
    const transaction = this.decodeRawTransaction({ rawTx });
    if (!transaction) {
      return null;
    }
    return await this.connection.sendRawTransaction(transaction.serialize());
  }

  /**
   * Retrieves a block by its height or hash.
   * 
   * @param {Object} params - Parameters for retrieving the block.
   * @param {string} [params.hash] - The hash of the block to retrieve.
   * @param {number} [params.height] - The height of the block to retrieve.
   * @returns {Promise<Web3.BlockResponse|null>} A promise that resolves to the block object or null if not found.
   * @throws {Error} If hash is provided instead of height.
   */
  async getBlock({ hash, slot }) {
    if (!Number.isInteger(slot)) {
        return null;
    }
    if (hash) {
      throw new Error('Hash is not supported. Provide a height instead');
    }
    return await this.rpc.getBlock(slot, this._versionedConfig).send();
  }

  /**
   * Get the number of confirmations for a given transaction ID.
   * 
   * @param {Object} params - The parameters for the function.
   * @param {string} params.txid - The transaction ID to get confirmations for.
   * @returns {Promise<number|null>} - The number of confirmations or null if not available.
   */
  async getConfirmations({ txid }) {
    if (!txid || !this.isBase58(txid)) {
      return null;
    }
    const status = (await this.rpc.getSignatureStatuses([txid]).send())?.value?.[0];
    if (status?.confirmations) {
      return status.confirmations;
    }
    const latestSlot = await this.rpc.getSlot({ commitment: 'confirmed' }).send();
    if (status && latestSlot) {
      return latestSlot - status.slot;
    }
    const tx = await this.rpc.getTransaction(txid, this._versionedConfig).send();
    if (latestSlot && tx?.slot) {
      return latestSlot - tx.slot;
    }
    return null;
  }

  getTxOutputInfo() {
    return null;
  }

  /**
   * Validates a given address.
   * 
   * @param {Object} params - The parameters for the function.
   * @param {string} params.address - The address to validate.
   * @returns {boolean} - Returns true if the address is valid, otherwise false.
   */
  validateAddress({ address }) {
    try {
      return isAddress(address);
    } catch (error) {
      return false;
    }
  }

  getAccountInfo() {
    return {};
  }

  /**
   * Retrieves the version information from the Solana node.
   * 
   * @returns {Promise<Web3.Version>} - The version information of the Solana node.
   */
  async getServerInfo() {
    return await this.rpc.getVersion().send();
  }

  /**
   * Checks if the given address is a valid Solana address.
   * 
   * @param {string} address - The address to validate.
   * @returns {boolean} True if the address is valid, false otherwise.
   */
  isValidAddress(address) {
    return this.validateAddress({ address })
  }

  /**
   * Checks if the given string is a valid Base58 encoded string.
   * 
   * @param {string} str - The string to check.
   * @returns {boolean} True if the string is valid Base58, false otherwise.
   */
  isBase58(str) {
    try {
      bs58.decode(str);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Converts the given address to a Solana Web3 PublicKey instance.
   * 
   * @param {string} addressToConvert - The address to convert.
   * @returns {import('@solana/web3.js').Address<string>}
   */
  toAddress(addressToConvert) {
    return address(addressToConvert);
  }

  /**
   * Converts the given input to a Buffer instance.
   * 
   * @param {Array|Uint8Array|Buffer} arr - The input to convert.
   * @returns {Buffer} The converted Buffer instance.
   */
  toBuffer(arr) {
    if (Buffer.isBuffer(arr)) {
      return arr;
    } else if (arr instanceof Uint8Array) {
      return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
    } else {
      return Buffer.from(arr);
    }
  }

  /**
   * Converts a base64 encoded string to a Uint8Array.
   * 
   * @param {string} str - The base64 encoded string to convert.
   * @returns {Uint8Array} The converted Uint8Array.
   */
  base64ToUint8Array(str) {
    // Decode the base64 string to a Buffer
    const buffer = Buffer.from(str, 'base64');
    // Convert the Buffer to a Uint8Array
    const uint8Array = new Uint8Array(buffer);
    return uint8Array;
  }

  /**
   * Converts a Uint8Array to a base64 encoded string.
   * 
   * @param {Array} arr - The Uint8Array to convert.
   * @returns {string} The converted base64 encoded string .
   */
  uint8ArrayToBase64(arr) {
    return this.toBuffer(arr).toString('base64');
  }
}

module.exports = SolRPC;