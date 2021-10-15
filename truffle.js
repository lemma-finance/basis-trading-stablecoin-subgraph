require('babel-register');
require('babel-polyfill');
const HDWalletProvider = require('truffle-hdwallet-provider');
require("dotenv").config();

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
    },
    ropsten: {
      provider: function () {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://ropsten.infura.io/v3/${process.env.ROPSTEN_INFURA_API_KEY}`
        );
      },
      network_id: '3',
      skipDryRun: true,
    },
    arbRinkeby: {
      provider: function () {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://arbitrum-rinkeby.infura.io/v3/${process.env.ROPSTEN_INFURA_API_KEY}`
        );
      },
      network_id: '421611',
      skipDryRun: true,
    },
  },
  compilers: {
    solc: {
      version: '0.4.25'    // Fetch exact version from solc-bin (default: truffle's version)
    }
  }
};
