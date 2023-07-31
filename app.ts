import { open } from 'inspector';
import assert from 'assert';
import { App } from 'homey';
import TydomController from './tydom/controller';
import { DefaultLogger } from './tydom/util';

open(9229, '0.0.0.0');

// TODO: Fix this hack
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.DEBUG = 'tydom-client';

class TydomApp extends App {
  private controller!: TydomController;
  async onInit() {
    this.log('Delta Dore Tydom 1.0 has been initialized');

    // TODO: Replace these with your actual Tydom credentials
    const hostname = '1.2.3.4';
    const username = 'mac'; // TODO: Read from mDNS
    const password = 'pw';
    const logger = new DefaultLogger(this.log, this.error, true);

    // eslint-disable-next-line
    this.controller = TydomController.createInstance(logger,{
      settings: {},
      debug: true,
      username,
      password,
      hostname,
    });

    assert(this.controller);
    await this.controller.connect();
    await this.controller.scan();
  }

  async onUninit() {
    this.log('Stopping app');
    this.controller.disconnect();
    return Promise.resolve();
  }
}

module.exports = TydomApp;
