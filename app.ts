import { createClient } from "tydom-client";
import Homey from "homey";
import TydomController from "./tydom/controller";

// TODO: Fix this hack
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
process.env.DEBUG = "tydom-client";

module.exports = class TydomApp extends Homey.App {
  tydom!: TydomController

  async onInit() {
    this.log("Delta Dore Tydom 1.0 has been initialized");

    // Replace these with your actual Tydom credentials
    const username = "mac"; // TODO: Read from mDNS
    const password = "pw";
    const hostname = "10.14.20.139";
    this.tydom = new TydomController({ username, password, hostname });

    return Promise.resolve();
  }

  async onUninit() {
    this.log("Stopping app");
    this.tydom.disconnect();
    return Promise.resolve();
  }
};
