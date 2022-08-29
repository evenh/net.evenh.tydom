import Homey from "homey";

module.exports = class TydomApp extends Homey.App {

  async onInit() {
    this.log("Delta Dore Tydom 1.0 has been initialized");
    return Promise.resolve();
  }

};
