import { Device } from 'homey';
import _ from 'lodash';
import TydomController from '../../tydom/controller';
import { TydomDataElement } from '../../tydom/typings';

class Thermostat extends Device {
  api!: TydomController;

  async onInit() {
    this.api = await TydomController.getInstance();

    this.registerCapabilityListener('target_temperature', async (value) => {
      await this.setTargetTemperature(value);
    });

    this.registerCapabilityListener('onoff', async (value) => {
      await this.setThermostatState(value);
    });

    // Receive out-of-band level changes, e.g. performed with physical controls.
    this.api.subscribeTo(
      this.getData().id,
      async (update: TydomDataElement) => {
        super.log(`update: ${JSON.stringify(update)}`);
        await this.onTydomStateChange(update);
      },
    );

    this.log('Thermostat has been initialized');
  }

  // Clean up OOB level changes.
  async onUninit() {
    this.api.removeSubscription(this.getData().id);
  }

  private async setTargetTemperature(value: number) {
    const { endpointId, deviceId } = this.getData();
    await this.api
      .updateThermostatTemperature(deviceId, endpointId, value)
      .then(async () => {
        await this.updateTargetTemperatureUiValue(value);
      });
  }

  private async setThermostatState(value: boolean) {
    const { endpointId, deviceId } = this.getData();
    await this.api
      .updateThermostatState(deviceId, endpointId, value)
      .then(async () => {
        await this.setCapabilityValue('onoff', value);
      });
  }

  private async updateTargetTemperatureUiValue(newValue: number) {
    // TODO: Determine if on
    await this.setCapabilityValue(
      'target_temperature',
      roundToOneDecimal(newValue),
    ).catch((err) => this.error(err));
  }

  // Receive out-of-band level changes, e.g. performed with physical controls.
  private async onTydomStateChange(newRemoteState: TydomDataElement) {
    if (newRemoteState.validity === 'expired') return Promise.resolve();

    switch (newRemoteState.name) {
      // Actual temperature reading
      case 'temperature':
        // modify current temperature
        await this.setCapabilityValue(
          'measure_temperature',
          <number>newRemoteState.value,
        );
        break;
      // Desired temperature
      case 'setpoint':
        if (newRemoteState.value !== null) {
          await this.setCapabilityValue(
            'target_temperature',
            roundToOneDecimal(<number>newRemoteState.value),
          );
        }
        break;
      case 'hvacMode':
        if (newRemoteState.value !== null) {
          const stringValue = <string>newRemoteState.value;
          const isOn = stringValue !== 'STOP';
          await this.setCapabilityValue('onoff', isOn);
        }
        break;
      default:
        return Promise.resolve();
    }

    return Promise.resolve();
  }

  async onAdded() {
    this.log('Thermostat has been added');
  }

  async onSettings({oldSettings: {}, newSettings: {}, changedKeys: {}}): Promise<void> {
    this.log('Thermostat settings where changed');
  }

  async onRenamed(name: string) {
    this.log(`Thermostat was renamed to ${name}`);
  }

  async onDeleted() {
    this.log('Thermostat has been deleted');
  }
}

function roundToOneDecimal(n: number) {
  return _.round(n, 1);
}

module.exports = Thermostat;
