/* eslint-disable no-use-before-define */
type UnknownObject = Record<string, unknown>;

export type TydomAccessoryContext<T extends UnknownObject = UnknownObject, U extends UnknownObject = UnknownObject> = {
  accessoryId: string;
  category: Categories;
  deviceId: number;
  endpointId: number;
  group?: TydomConfigGroup;
  manufacturer?: string;
  metadata: TydomMetaElement[];
  model?: string;
  name: string;
  serialNumber?: string;
  settings: T;
  state: U;
};

export type TydomAccessoryUpdateContext = Pick<
  TydomAccessoryContext,
  "category" | "deviceId" | "endpointId" | "accessoryId"
>;

export type TydomConfigEndpoint = {
  id_endpoint: number;
  id_device: number;
  picto: string;
  name: string;
  first_usage: string;
  last_usage: string;
};

export type TydomConfigGroup = {
  picto: string;
  name: string;
  group_all: boolean;
  usage: string;
  id: number;
};

export type TydomConfigResponse = {
  endpoints: TydomConfigEndpoint[];
  groups: TydomConfigGroup[];
};

export type TydomGroupsResponse = {
  groups: Array<{id: number; devices: Array<{id: number; endpoints: Array<{id: number}>}>}>;
};

export type TydomMetaElement = {
  enum_values?: string[];
  max?: number;
  min?: number;
  name: string;
  permission: "r" | "w" | "rw";
  step?: number;
  type: "boolean" | "string" | "numeric";
  unit?: "boolean" | "%";
};

export type TydomMetaEndpoint = {
  id: number;
  error: number;
  metadata: TydomMetaElement[];
};

export type TydomMetaResponse = Array<{
  id: number;
  endpoints: TydomMetaEndpoint[];
}>;

export type AnyTydomDataValue = string | number | boolean;

export type TydomDataElement<K = string, V = AnyTydomDataValue> = {
  name: K;
  validity: "expired" | "upToDate";
  value: V;
};

export type TydomEndpointDataResponse = {error: number; data: TydomDataElement[]};
export type TydomEndpointData = TydomDataElement[];
export type TydomDeviceThermostatAuthorization = "STOP" | "HEATING";
export type TydomDeviceThermostatHvacMode = "NORMAL" | "STOP" | "ANTI_FROST";
export type TydomDeviceThermostatThermicLevel = "ECO" | "MODERATO" | "MEDIO" | "COMFORT" | "STOP" | "ANTI_FROST";

export type TydomDeviceThermostatData = [
  TydomDataElement<"authorization", TydomDeviceThermostatAuthorization>,
  TydomDataElement<"setpoint", number>,
  TydomDataElement<"thermicLevel", TydomDeviceThermostatThermicLevel>,
  TydomDataElement<"hvacMode", TydomDeviceThermostatHvacMode>,
  TydomDataElement<"timeDelay", number>,
  TydomDataElement<"temperature", number>,
  TydomDataElement<"tempoOn", boolean>,
  TydomDataElement<"antifrostOn", boolean>,
  TydomDataElement<"loadSheddingOn", boolean>,
  TydomDataElement<"openingDetected", boolean>,
  TydomDataElement<"presenceDetected", boolean>,
  TydomDataElement<"absence", boolean>,
  TydomDataElement<"productionDefect", boolean>,
  TydomDataElement<"batteryCmdDefect", boolean>,
  TydomDataElement<"tempSensorDefect", boolean>,
  TydomDataElement<"tempSensorShortCut", boolean>,
  TydomDataElement<"tempSensorOpenCirc", boolean>,
  TydomDataElement<"boostOn", boolean>
];

export type TydomDeviceShutterData = [
  TydomDataElement<"battDefect", boolean>,
  TydomDataElement<"intrusion", boolean>,
  TydomDataElement<"obstacleDefect", boolean>,
  TydomDataElement<"onFavPos", boolean>,
  TydomDataElement<"position", number>,
  TydomDataElement<"thermicDefect", boolean>
];

export type TydomDeviceSecuritySystemAlarmState = "OFF" | "DELAYED" | "ON" | "QUIET";
export type TydomDeviceSecuritySystemAlarmMode = "OFF" | "ON" | "TEST" | "ZONE" | "MAINTENANCE";
export type TydomDeviceSecuritySystemZoneState = "UNUSED" | "ON" | "OFF";

export type TydomDeviceSecuritySystemData = [
  TydomDataElement<"alarmState", "OFF" | "DELAYED" | "ON" | "QUIET">,
  TydomDataElement<"alarmMode", TydomDeviceSecuritySystemAlarmMode>,
  TydomDataElement<"alarmTechnical", boolean>,
  TydomDataElement<"alarmSOS", boolean>,
  TydomDataElement<"unitAutoProtect", boolean>,
  TydomDataElement<"unitBatteryDefect", boolean>,
  TydomDataElement<"unackedEvent", boolean>,
  TydomDataElement<"systAutoProtect", boolean>,
  TydomDataElement<"systBatteryDefect", boolean>,
  TydomDataElement<"systSupervisionDefect", boolean>,
  TydomDataElement<"systOpenIssue", boolean>,
  TydomDataElement<"systSectorDefect", boolean>,
  TydomDataElement<"systTechnicalDefect", boolean>,
  TydomDataElement<"videoLinkDefect", boolean>,
  TydomDataElement<"remoteSurveyDefect", boolean>,
  TydomDataElement<"simDefect", boolean>,
  TydomDataElement<"networkDefect", boolean>,
  TydomDataElement<"inactiveProduct", boolean>,
  TydomDataElement<"liveCheckRunning", boolean>,
  TydomDataElement<"zone1State", TydomDeviceSecuritySystemZoneState>,
  TydomDataElement<"zone2State", TydomDeviceSecuritySystemZoneState>,
  TydomDataElement<"zone3State", TydomDeviceSecuritySystemZoneState>,
  TydomDataElement<"zone4State", TydomDeviceSecuritySystemZoneState>,
  TydomDataElement<"zone5State", TydomDeviceSecuritySystemZoneState>,
  TydomDataElement<"zone6State", TydomDeviceSecuritySystemZoneState>,
  TydomDataElement<"zone7State", TydomDeviceSecuritySystemZoneState>,
  TydomDataElement<"zone8State", TydomDeviceSecuritySystemZoneState>,
  TydomDataElement<"outTemperature", number>,
  TydomDataElement<"gsmLevel", number>,
  TydomDataElement<"kernelUpToDate", boolean>,
  TydomDataElement<"irv1State", "AVAILABLE" | "UNAVAILABLE" | "LOCKED">,
  TydomDataElement<"irv2State", "AVAILABLE" | "UNAVAILABLE" | "LOCKED">,
  TydomDataElement<"irv3State", "AVAILABLE" | "UNAVAILABLE" | "LOCKED">,
  TydomDataElement<"irv4State", "AVAILABLE" | "UNAVAILABLE" | "LOCKED">
];

export type TydomDeviceDataUpdateBody = {
  id: number;
  endpoints: {id: number; error: number; data: Record<string, unknown>[]; cdata: Record<string, unknown>[]}[];
}[];

export type SecuritySystemProduct = {
  typeShort: string;
  typeLong: string;
  id: number;
  nameStd: string;
  nameCustom?: string;
  number?: number;
};

export type SecuritySystemLabelCommandResultZone = {
  id: number;
  nameStd?: string;
  nameCustom?: string;
};

export type SecuritySystemLabelCommandResult = {
  zones: SecuritySystemLabelCommandResultZone[];
  products: SecuritySystemProduct[];
};

export type SecuritySystemHistoOpenIssuesCommandResult = {
  step: number;
  nbElemTot: number;
  index: number;
  product?: SecuritySystemProduct;
};

export type SecuritySystemAlarmEvent = {
  name:
    | "arret"
    | "preAlarm"
    | "arretZone"
    | "marcheZone"
    | "marcheTotale"
    | "refusMiseEnMarche"
    | "preavisMarcheAuto"
    | "alarmIntrusion"
    | "passageEnMaintenance";
  date: string;
  zones: Array<{id: number; nameStd: string}>;
  product?: SecuritySystemProduct;
};

// Custom types
export type TydomAccessoryUpdateType = "data" | "cdata";

export type ControllerUpdatePayload = {
  type: TydomAccessoryUpdateType;
  category: Categories;
  updates: Record<string, unknown>[];
  context: TydomAccessoryContext;
};

// Extends PlatformConfig
export type TydomPlatformConfig = {
  hostname: string;
  username: string;
  password: string;
  settings: Record<string, {name?: string; category?: Categories}>;
  debug?: boolean;
  includedDevices?: string[];
  includedCategories?: string[];
  excludedDevices?: string[];
  excludedCategories?: string[];
  refreshInterval?: number;
};


// TODO: Fix this type
// https://apps-sdk-v3.developer.homey.app/tutorial-device-classes.html
export const enum Categories {
  // noinspection JSUnusedGlobalSymbols
  OTHER = 1,
  BRIDGE = 2,
  FAN = 3,
  GARAGE_DOOR_OPENER = 4,
  LIGHTBULB = 5,
  DOOR_LOCK = 6,
  OUTLET = 7,
  SWITCH = 8,
  THERMOSTAT = 9,
  SENSOR = 10,
  ALARM_SYSTEM = 11,
  SECURITY_SYSTEM = 11, // Added to conform to HAP naming
  DOOR = 12,
  WINDOW = 13,
  WINDOW_COVERING = 14,
  PROGRAMMABLE_SWITCH = 15,
  RANGE_EXTENDER = 16,
  CAMERA = 17,
  IP_CAMERA = 17, // Added to conform to HAP naming
  VIDEO_DOORBELL = 18,
  AIR_PURIFIER = 19,
  AIR_HEATER = 20,
  AIR_CONDITIONER = 21,
  AIR_HUMIDIFIER = 22,
  AIR_DEHUMIDIFIER = 23,
  APPLE_TV = 24,
  HOMEPOD = 25,
  SPEAKER = 26,
  AIRPORT = 27,
  SPRINKLER = 28,
  FAUCET = 29,
  SHOWER_HEAD = 30,
  TELEVISION = 31,
  TARGET_CONTROLLER = 32, // Remote Control
  ROUTER = 33,
  AUDIO_RECEIVER = 34,
  TV_SET_TOP_BOX = 35,
  TV_STREAMING_STICK = 36,
}
