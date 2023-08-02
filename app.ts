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
  private debug = true;
  async onInit() {
    this.log('Delta Dore Tydom 1.0 has been initialized');

    if (this.debug) {
      try {
        // eslint-disable-next-line global-require,@typescript-eslint/no-var-requires
        require('inspector').waitForDebugger();
      } catch (error) {
        // eslint-disable-next-line global-require,@typescript-eslint/no-var-requires
        require('inspector').open(9229, '0.0.0.0', true);
      }
    }
    // TODO: Replace these with your actual Tydom credentials
    const hostname = '1.2.3.4';
    const username = 'mac'; // TODO: Read from mDNS
    const password = 'pw';
    const logger = new DefaultLogger(this.log, this.error, true);
    const logger = new DefaultLogger(this.log, this.error, this.debug);

    // eslint-disable-next-line
    this.controller = TydomController.createInstance(logger,{
      settings: {},
      debug: this.debug,
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
