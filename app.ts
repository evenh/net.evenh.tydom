import {open} from "inspector";
open(9229, "0.0.0.0");

import assert from "assert";
import Homey from "homey";
import TydomController from "./tydom/controller";
import {Categories, TydomAccessoryContext} from "./tydom/typings";

// TODO: Fix this hack
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
process.env.DEBUG = "tydom-client";

module.exports = class TydomApp extends Homey.App {
  private controller!: TydomController
  private cleanupAccessoriesIds: Set<string> = new Set();

  async onInit() {
    this.log("Delta Dore Tydom 1.0 has been initialized");

    const username = "mac"; // TODO: Read from mDNS
    const password = "pw";
    // TODO: Replace these with your actual Tydom credentials
    const hostname = "10.14.20.139";
    // eslint-disable-next-line
    this.controller = new TydomController(this.log, {
      settings: {},
      debug: true,
      username: username,
      password: password,
      hostname: hostname
    });

    return this.didFinishLaunching();
  }
  private async didFinishLaunching() {
    assert(this.controller);
    await this.controller.connect();
    await this.controller.scan();
  }

  public getDevices(category: Categories) {
    return this.controller.getDevicesForCategory(category).map(v => {
      return {
        name: v?.name,
        data: {
          id: v?.accessoryId
        }
      };
    });
  }

  async onUninit() {
    this.log("Stopping app");
    this.controller.disconnect();
    return Promise.resolve();
  }
};
