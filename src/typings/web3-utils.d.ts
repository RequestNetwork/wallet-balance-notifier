declare module "web3-utils" {
  type Unit =
    | "noether"
    | "wei"
    | "kwei"
    | "Kwei"
    | "babbage"
    | "femtoether"
    | "mwei"
    | "Mwei"
    | "lovelace"
    | "picoether"
    | "gwei"
    | "Gwei"
    | "shannon"
    | "nanoether"
    | "nano"
    | "szabo"
    | "microether"
    | "micro"
    | "finney"
    | "milliether"
    | "milli"
    | "ether"
    | "kether"
    | "grand"
    | "mether"
    | "gether"
    | "tether";
  /* @method fromWei
   * @param {Number|String} number can be a number, number string or a HEX of a decimal
   * @param {String} unit the unit to convert to, default ether
   * @return {String|Object} When given a BN object it returns one as well, otherwise a number
   */
  function fromWei(number: string | number, unit: Unit): string;
}
