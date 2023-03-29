import { isFinite } from "lodash";
import { TydomDataElement } from "../../tydom/typings";
import Homey from "homey";

class Light extends Homey.Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.registerMultipleCapabilityListener(["onoff", "dim"], async({ onoff, dim }) => {
      if (dim > 0 && onoff === false) {
        this.log("Wants to turn off");
        // await DeviceApi.setOnOffAsync(false); // turn off
      }
      else if (dim <= 0 && onoff === true) {
        this.log("Wants to turn on");
        // await DeviceApi.setOnOffAsync(true); // turn on
      }
      else {
        // eslint-disable-next-line
        this.log(`dim=${dim}, onoff=${onoff}`);
        // await DeviceApi.setOnOffAndDimAsync({ onoff, dim }); // turn on or off and set dim level in one command
      }
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
    // @ts-ignore
    this.homey.app.subscribeTo(this.getData().id, async(update: TydomDataElement) => {
      await this.onTydomStateChange(update);
    });

    this.log("Light has been initialized");
    return Promise.resolve();
  }

  async onTydomStateChange(newRemoteState: TydomDataElement) {
    if (newRemoteState.validity === "expired") {
      return Promise.resolve();
    }

    // Check if the new value is a number
    if (isFinite(newRemoteState.value)) {
      const isOn = newRemoteState.value > 0;
      const dimValue = <number>newRemoteState.value / 100;

      await this.setCapabilityValue("onoff", isOn).catch(err => this.error(err));
      await this.setCapabilityValue("dim", dimValue).catch(err => this.error(err));
    }

    return Promise.resolve();
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log("Light has been added");
    return Promise.resolve();
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  // eslint-disable-next-line no-empty-pattern
  async onSettings({ oldSettings: {}, newSettings: {}, changedKeys: {} }): Promise<string | void> {
    this.log("Light settings where changed");
    return Promise.resolve();
  }

  async onRenamed(name: string) {
    this.log(`Light was renamed to ${name}`);
    return Promise.resolve();
  }

  async onDeleted() {
    this.log("Light has been deleted");
    return Promise.resolve();
  }

  private logId() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/restrict-template-expressions
    return `name=${this.getData().name} tydomId=${this.getData().id}`;
  }
}

module.exports = Light;
