'use strict';
const noble = require("@abandonware/noble");

/**
 * @type {Map<string,import("@abandonware/noble").Peripheral>} 
 */
const discoveredPeripheral = new Map();
let stopScanningTimer = null;

noble.on("discover", peripheral => {
  discoveredPeripheral.set(peripheral.uuid, peripheral);
});

function scanFor10s() {
  // Scan for the next 10s
  noble.startScanningAsync();
  clearTimeout(stopScanningTimer);
  stopScanningTimer = setTimeout(() => {
    noble.stopScanningAsync();
  }, 10000);
}

/**
 * Bluetooth adapter
 * @param {string} address Bluetooth Address
 * @param {string} channel Bluetooth channel
 * @constructor
 */
function Bluetooth(address, channel) {
  this.address = address;
  this.channel = channel;

  /** @type {import("@abandonware/noble").Peripheral} */
  this.peripheral = null;
  /** @type {import("@abandonware/noble").Characteristic} */
  this.characteristic = null;

  return this;
};

/**
 * Returns an array of all available bluetooth devices with a serial port
 * @return {Promise<{address:string;name:string;services:Array<{channel:string;name:string;}>}>} Device objects with address, name, services: {channel, name}[]
 */
Bluetooth.findPrinters = async function () {
  scanFor10s();
  return new Promise(accept => {
    setTimeout(() => {
      accept([...discoveredPeripheral].map(([, peripheral]) => {
        return {
          name: peripheral.advertisement.localName,
          address: peripheral.uuid,
          services: peripheral.services.map(service => {
            return service.characteristics.filter(characteristic => {
              return characteristic.properties.includes("write");
            }).map(characteristic => {
              return {
                name: characteristic.name || "SPP",
                channel: characteristic.uuid
              }
            }).flat()
          })
        }
      }))
    }, 10000);
  })
};

/**
 * Open connection to bluetooth device
 * @param callback
 */
Bluetooth.prototype.open = async function (callback) {
  if (!discoveredPeripheral.has(this.address)) {
    const start = new Date();
    scanFor10s();
    while (new Date() - start < 10000) {
      await new Promise((accept) => setTimeout(accept, 1000));
      if (discoveredPeripheral.has(this.address)) {
        break;
      }
    }
  }

  if (!discoveredPeripheral.has(this.address)) {
    callback && callback(new Error("Device cannot be found"));
    return;
  }

  const peripheral = discoveredPeripheral.get(this.address);
  peripheral.connect((err) => {
    if (err) {
      callback && callback(err);
      return;
    }
    peripheral.discoverAllServicesAndCharacteristics((err, services, characteristics) => {
      if (err) {
        callback && callback(err);
        return;
      }
      const characteristic = characteristics.find(characteristic => characteristic.uuid == this.channel);
      if (!characteristics) {
        callback && callback(new Error("Channel cannot be found"));
        return;
      }
      this.characteristic = characteristic;
      this.peripheral = peripheral;
      callback && callback();
    });
  });
};

/**
 * Close bluetooth connection
 * @param callback
 */
Bluetooth.prototype.close = function (callback) {
  if (!this.peripheral) {
    callback && callback();
    return;
  }

  this.peripheral.disconnect((err) => {
    callback && callback(err);
    if (err) return;
    this.peripheral = null;
    this.characteristic = null;
  });
};

/**
 * Write data to the printer
 * @param data
 * @param callback
 */
Bluetooth.prototype.write = function (data, callback) {
  if (!this.characteristic) {
    callback && callback(new Error("Please open() the device first before writing"));
    return;
  }

  this.characteristic.write(data, true, callback);
};

scanFor10s();
module.exports = Bluetooth;
