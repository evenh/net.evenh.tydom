import { Categories, ControllerUpdatePayload, TydomAccessoryUpdateContext, TydomDeviceDataUpdateBody } from "./typings";
import { SimpleClass } from "homey";
import { TydomClientOptions } from "tydom-client/lib/client";
import { TydomHttpMessage, TydomResponse } from "tydom-client/lib/utils/tydom";
import TydomClient, { createClient } from "tydom-client";

export default class TydomController extends SimpleClass {
  private apiClient!: TydomClient
  private hostname: string
  private username: string
  private debugMode = true;

  private devices: Map<string, Categories> = new Map();
  private state: Map<string, unknown> = new Map();

  constructor(options: TydomClientOptions) {
    super();

    this.hostname = options.hostname || "mediation.tydom.com";
    this.username = options.username;

    this.apiClient = createClient(options);
    this.connect();

    this.apiClient.on("connect", () => {
      this.log(`Successfully connected to Tydom hostname=${this.hostname} with username=${this.username}`);
    });
    this.apiClient.on("connect", () => {
      this.log(`Disconnected from Tydom hostname=${this.hostname}`);
    });
    this.apiClient.on("message", (message: TydomHttpMessage) => {
      try {
        this.handleMessage(message);
      } catch (err) {
        this.log(`Encountered an uncaught error while processing message=${JSON.stringify(message)}`);
      }
    });
  }

  private getUniqueId(deviceId: number, endpointId: number): string {
    return deviceId === endpointId ? `${deviceId}` : `${deviceId}:${endpointId}`;
  }
  private getAccessoryId(deviceId: number, endpointId: number): string {
    return `tydom:${this.username.slice(6)}:accessories:${this.getUniqueId(deviceId, endpointId)}`;
  }

  // Perform the connection and validation logic
  private connect() {
    this.apiClient.connect()
      .then(() => this.apiClient.get("/ping"))
      .catch(err => {
        this.log(`Failed to connect to Tydom hostname=${this.hostname} with username="${this.username}"`);
        throw err;
      });
  }

  // Every message from Tydom gets checked here
  private handleMessage(message: TydomHttpMessage): void {
    const {uri, method, body} = message;
    const isDeviceUpdate = uri === "/devices/data" && method === "PUT";
    if (isDeviceUpdate) {
      this.handleDeviceDataUpdate(body, "data");
      return;
    }
    const isDeviceCommandUpdate = uri === "/devices/cdata" && method === "PUT";
    if (isDeviceCommandUpdate) {
      this.handleDeviceDataUpdate(body, "cdata");
      return;
    }
    this.debug(`Unknown message from Tydom client:\n${message.toString()}`);
  }

  private handleDeviceDataUpdate(body: TydomResponse, type: "data" | "cdata"): void {
    if (!Array.isArray(body)) {
      this.debug("Unsupported non-array device update", body);
      return;
    }

    (body as TydomDeviceDataUpdateBody).forEach(device => {
      const {id: deviceId, endpoints} = device;
      for (const endpoint of endpoints) {
        const {id: endpointId, data, cdata} = endpoint;
        const updates = type === "data" ? data : cdata;
        const uniqueId = this.getUniqueId(deviceId, endpointId);
        if (!this.devices.has(uniqueId)) {
          this.debug(`←PUT:ignored for device id=${deviceId} and endpointId=${endpointId}`);
          return;
        }
        const category = this.devices.get(uniqueId) ?? Categories.OTHER;
        const accessoryId = this.getAccessoryId(deviceId, endpointId);
        this.debug(`←PUT:update for deviceId=${deviceId} and endpointId=${endpointId}, updates:\n`, updates);
        const context: TydomAccessoryUpdateContext = {
          category,
          deviceId,
          endpointId,
          accessoryId
        };
        this.emit("update", {
          type,
          updates,
          context
        } as ControllerUpdatePayload);
      }
    });
  }

  public debug(...args: any[]) {
    if (this.debugMode) {
      this.log("[DEBUG]", args);
    }
  }

  public disconnect() {
    this.debug("Terminating connection to gateway");
    this.apiClient.close();
  }
}
