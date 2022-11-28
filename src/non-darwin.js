'use strict';
const bluetooth = require("../lib/node-bluetooth");
const device = new bluetooth.DeviceINQ();

/**
 * Bluetooth adapter
 * @param {string} address Bluetooth Address
 * @param {string} channel Bluetooth channel
 * @constructor
 */
function Bluetooth(address, channel) {
  this.address = address;
  this.channel = Number(channel);
  this.connection = null;
  return this;
};

/**
 * Returns an array of all available bluetooth devices with a serial port
 * @return {Promise<{address:string;name:string;services:Array<{channel:string;name:string;}>}>} Device objects with address, name, services: {channel, name}[]
 */
Bluetooth.findPrinters = function () {
  return new Promise(accept => {
    device.listPairedDevices(accept);
  });
};

/**
 * Open connection to bluetooth device
 * @param {(err: any)=>void} callback
 */
Bluetooth.prototype.open = function (callback) {
  bluetooth.connect(this.address, this.channel, (err, conn) => {
    if (err) {
      callback && callback(err);
      return;
    }
    this.connection = conn;
    callback && callback();
  });
  return this;
};

/**
 * Close bluetooth connection
 * @param {(err: any)=>void} callback
 */
Bluetooth.prototype.close = function (callback) {
  if (!this.connection) {
    callback && callback();
    return;
  }
  this.connection.close((err) => {
    if (err) {
      callback && callback(err);
      return;
    }
    callback && callback();
  });
  return this;
};

/**
 * Write data to the printer
 * @param {Buffer} data
 * @param {(err: any)=>void} callback
 */
Bluetooth.prototype.write = function (data, callback) {
  if (this.connection === null) {
    callback && callback(new Error('Call open() before writing data'));
    return;
  }
  this.connection.write(data, () => {
    callback && callback();
  });
  return this;
};

module.exports = Bluetooth;
