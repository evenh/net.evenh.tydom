import Homey, {DiscoveryResultMAC, DiscoveryResultMDNSSD, DiscoveryResultSSDP} from "homey";

module.exports = class TydomApp extends Homey.App {

  async onInit() {
    this.log("Delta Dore Tydom 1.0 has been initialized");

    const discoveryStrategy = this.homey.discovery.getStrategy("tydom1");

    // Use the discovery results that were already found
    const initialDiscoveryResults: { [p: string]: DiscoveryResultMDNSSD | DiscoveryResultSSDP | DiscoveryResultMAC } = discoveryStrategy.getDiscoveryResults();
    for (const discoveryResult of Object.values(initialDiscoveryResults)) {
      this.handleDiscoveryResult(discoveryResult);
    }
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    this.log(`Total discovered devices: ${Object.values(initialDiscoveryResults)}`);

    return Promise.resolve();
  }


  handleDiscoveryResult(discoveryResult: DiscoveryResultMDNSSD | DiscoveryResultSSDP | DiscoveryResultMAC) {
    this.log("Got result:", discoveryResult);
  }

};
