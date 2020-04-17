import { GoogleSheet } from "gsheet-object";
import axios from "axios";
import * as web3Utils from "web3-utils";

interface IWalletAlertConfig {
  name: string;
  address: string;
  threshold: string;
  network: string;
  slackHook: string;
}

const sendAlert = async (
  text: any,
  {
    name,
    address,
    balance,
    network,
    slackHook,
  }: IWalletAlertConfig & { balance: string }
) => {
  const baseUrl =
    network.toLowerCase() === "rinkeby"
      ? "https://rinkeby.etherscan.io"
      : "https://etherscan.io";
  await axios.post(slackHook, {
    attachments: [
      {
        text,
        fields: [
          {
            title: "Wallet",
            value: `<${baseUrl}/address/${address}|${name}>`,
            short: true,
          },
          {
            title: "Balance",
            value: `${balance} ETH`,
            short: true,
          },
          {
            title: "Network",
            value: network,
            short: true,
          },
        ],
        color: "danger",
      },
    ],
  });
};

const getClient = (network: string) => {
  const apiUrl =
    network.toLowerCase() === "rinkeby"
      ? "https://api-rinkeby.etherscan.io"
      : "https://api.etherscan.io";
  const client = axios.create({
    baseURL: apiUrl,
  });
  return client;
};

const processWallet = async (wallet: IWalletAlertConfig) => {
  const { name, address, threshold, network } = wallet;
  const api = getClient(network);
  const apikey = process.env.ETHERSCAN_API_KEY;
  const response = await api.get("/api", {
    params: {
      module: "account",
      action: "balance",
      address,
      apikey,
    },
  });

  if (response.data.status === "0") {
    throw new Error(response.data.result);
  }

  const balance = Number(
    web3Utils.fromWei(response.data.result, "ether")
  ).toFixed(3);
  console.log({
    balance,
    threshold,
  });
  if (balance < threshold) {
    console.error(`low balance on wallet ${name} (${address}): ${balance}`);
    sendAlert(`:alert: Low balance on wallet ${name}`, {
      ...wallet,
      balance,
    });
  } else {
    console.log(`balance on wallet ${name} (${address}): ${balance}`);
  }
};

export const main = async () => {
  const sheet = await GoogleSheet.load<IWalletAlertConfig>("WalletAlerts");
  const wallets = await sheet.getData();

  for (const wallet of wallets) {
    await processWallet(wallet);
  }

  if (process.env.HEALTHCHECK_URL) {
    await axios.post(process.env.HEALTHCHECK_URL);
  }
};
