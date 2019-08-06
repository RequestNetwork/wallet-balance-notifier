const axios = require("axios").default;
const web3Utils = require("web3-utils");
const { google } = require("googleapis");

const spreadsheetId = process.env.SPREADSHEET_ID;

const getWallets = async () => {
  const auth = await google.auth.getClient({
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/devstorage.read_only"
    ]
  });
  const sheets = google.sheets({ version: "v4", auth });
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A2:E100"
  });

  if (result.data.values) {
    return result.data.values.map(r => ({
      name: r[0],
      address: r[1],
      threshold: Number(r[2]),
      network: r[3],
      webhookUrl: r[4]
    }));
  } else {
    return [];
  }
};

const sendAlert = async (
  text,
  { name, address, balance, network, webhookUrl }
) => {
  const baseUrl =
    network.toLowerCase() === "rinkeby"
      ? "https://rinkeby.etherscan.io"
      : "https://etherscan.io";
  await axios.post(webhookUrl, {
    attachments: [
      {
        text,
        fields: [
          {
            title: "Wallet",
            value: `<${baseUrl}/address/${address}|${name}>`,
            short: true
          },
          {
            title: "Balance",
            value: `${balance} ETH`,
            short: true
          },
	  {
	    title: "Network",
	    value: network,
	    short: true
	  }
	],
        color: "danger"
      }
    ]
  });
};

const getClient = network => {
  const apiUrl =
    network.toLowerCase() === "rinkeby"
      ? "https://api-rinkeby.etherscan.io"
      : "https://api.etherscan.io";

  const client = axios.create({
    baseURL: apiUrl
  });
  return client;
};

const processWallet = async wallet => {
  const { name, address, threshold, network } = wallet;
  const api = getClient(network);
  const response = await api.get("/api", {
    params: {
      module: "account",
      action: "balance",
      address
    }
  });

  const balance = Number(web3Utils.fromWei(response.data.result)).toFixed(3);
  console.log({
    balance,
    threshold
  });
  if (balance < threshold) {
    console.error(`low balance on wallet ${name} (${address}): ${balance}`);
    sendAlert(`:alert: Low balance on wallet ${name}`, {
      ...wallet,
      balance
    });
  } else {
    console.log(`balance on wallet ${name} (${address}): ${balance}`);
  }
};

const main = async () => {
  const wallets = await getWallets();
  for (const wallet of wallets) {
    processWallet(wallet);
  }
};

exports.main = main;
