import Homey from 'homey';
import TydomController from '../../tydom/controller';
import { Categories } from '../../tydom/typings';

class ThermostatDriver extends Homey.Driver {
  private api!: TydomController;

  async onInit() {
    this.api = await TydomController.getInstance();
    this.log('ThermostatDriver has been initialized');
    return Promise.resolve();
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return this.api.getDevices(Categories.THERMOSTAT);
  }
}

module.exports = ThermostatDriver;
