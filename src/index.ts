import { GoogleSheet } from "gsheet-object";
import axios from "axios";
import * as web3Utils from "web3-utils";

interface IWalletAlertConfig {
  name: string;
  address: string;
  threshold: string;
  network: string;
  slackHook: string;
  balance: string;
  delta: string;
}

const urls: Record<string, string> = {
  rinkeby: "https://api-rinkeby.etherscan.io",
  mainnet: "https://api.etherscan.io",
  xdai: "https://blockscout.com/xdai/mainnet/api",
};
const explorerUrls: Record<string, string> = {
  rinkeby: "https://rinkeby.etherscan.io",
  mainnet: "https://etherscan.io",
  xdai: "https://blockscout.com/xdai/mainnet",
};

const currencies: Record<string, string> = {
  rinkeby: "ETH-rinkeby",
  mainnet: "ETH",
  xdai: "xDAI",
};

const sendAlert = async (
  text: any,
  { name, address, balance, network, slackHook }: IWalletAlertConfig
) => {
  const baseUrl = explorerUrls[network.toLowerCase()];
  const currency = currencies[network.toLowerCase()];

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
            value: `${balance} ${currency}`,
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
  const baseURL = urls[network.toLowerCase()] || urls.mainnet;
  const client = axios.create({
    baseURL,
    params: baseURL.includes("etherscan")
      ? { apiKey: process.env.ETHERSCAN_API_KEY }
      : {},
  });
  return client;
};

export const getAlertLevel = (
  balance: number,
  threshold: number,
  delta: number,
  currentBalance?: number
): "error" | "ok" | "skip" => {
  if (balance >= threshold) {
    return "ok";
  }
  if (currentBalance && currentBalance - balance < delta) {
    return "skip";
  }
  return "error";
};

const processWallet = async (wallet: IWalletAlertConfig) => {
  const {
    name,
    address,
    threshold,
    network,
    balance: currentBalance,
    delta: deltaStr,
  } = wallet;
  const api = getClient(network);
  console.log(api.defaults.params);
  const response = await api.get("/api", {
    params: {
      module: "account",
      action: "balance",
      address,
      ...api.defaults.params,
    },
  });

  if (response.data.status === "0") {
    throw new Error(response.data.result);
  }

  const delta = Number(deltaStr) || 1;
  const newBalance = Number(web3Utils.fromWei(response.data.result, "ether"));

  const result = {
    ...wallet,
    balance: newBalance.toFixed(3),
  };
  const alertLevel = getAlertLevel(
    newBalance,
    Number(threshold),
    delta,
    Number(currentBalance)
  );
  if (alertLevel === "skip") {
    console.warn(
      `low balance on wallet ${name} (${address}): ${result.balance}. Skipping alert and balance update.`
    );
    return null;
  }
  if (alertLevel === "error") {
    console.warn(
      `low balance on wallet ${name} (${address}): ${result.balance}.`
    );
    sendAlert(`:alert: Low balance on wallet ${name}`, result);
  } else {
    console.log(`balance on wallet ${name} (${address}): ${newBalance}`);
  }
  return result;
};

export const main = async () => {
  const sheet = await GoogleSheet.load<IWalletAlertConfig>("WalletAlerts");
  const wallets = await sheet.getData();

  for (const wallet of wallets) {
    const result = await processWallet(wallet);
    if (result) {
      console.log(`updating ${result.name} to ${result.balance}`);
      await sheet.update(wallet._row, "balance", result.balance);
    }
  }

  if (process.env.HEALTHCHECK_URL) {
    await axios.post(process.env.HEALTHCHECK_URL);
  }
};
