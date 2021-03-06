const DeviceParser = require('./DeviceParser');
const AccessoryParser = require('./AccessoryParser');
const moment = require('moment');
const inherits = require('util').inherits;
var Accessory, Service, Characteristic, PlatformAccessory;

class ContactSensorParser extends DeviceParser {
    constructor(platform) {
        super(platform);
		       PlatformAccessory = platform.PlatformAccessory;
				Accessory = platform.Accessory;
				Service = platform.Service;
				Characteristic = platform.Characteristic;
        
       /// /////////////////////////////////////////////////////////////////////////
       // OpenDuration Characteristic
       /// ///////////////////////////////////////////////////////////////////////// 
       Characteristic.OpenDuration = function() {
         Characteristic.call(this, 'Open Duration', 'E863F118-079E-48FF-8F27-9C2605A29F52');
         this.setProps({
           format: Characteristic.Formats.UINT32,
           unit: Characteristic.Units.SECONDS,
           perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
         });
         this.value = this.getDefaultValue();
       };
       inherits(Characteristic.OpenDuration, Characteristic);
       Characteristic.OpenDuration.UUID = 'E863F118-079E-48FF-8F27-9C2605A29F52';  
              
       /// /////////////////////////////////////////////////////////////////////////
       // ClosedDuration Characteristic
       /// ///////////////////////////////////////////////////////////////////////// 
       Characteristic.ClosedDuration = function() {
         Characteristic.call(this, 'Closed Duration', 'E863F119-079E-48FF-8F27-9C2605A29F52');
         this.setProps({
           format: Characteristic.Formats.UINT32,
           unit: Characteristic.Units.SECONDS,
           perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY, Characteristic.Perms.WRITE]
         });
         this.value = this.getDefaultValue();
       };
       inherits(Characteristic.ClosedDuration, Characteristic);
       Characteristic.ClosedDuration.UUID = 'E863F119-079E-48FF-8F27-9C2605A29F52';  
       
       /// /////////////////////////////////////////////////////////////////////////
       // LastActivation Characteristic
       /// ///////////////////////////////////////////////////////////////////////// 
       Characteristic.LastActivation = function() {
         Characteristic.call(this, 'Last Activation', 'E863F11A-079E-48FF-8F27-9C2605A29F52');
         this.setProps({
           format: Characteristic.Formats.UINT32,
           unit: Characteristic.Units.SECONDS,
           perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
         });
         this.value = this.getDefaultValue();
       };
       inherits(Characteristic.LastActivation, Characteristic);
       Characteristic.LastActivation.UUID = 'E863F11A-079E-48FF-8F27-9C2605A29F52';  
    }
    
    getAccessoriesParserInfo() {
        return {
            'ContactSensor_ContactSensor': ContactSensorContactSensorParser
        }
    }
}
ContactSensorParser.modelName = ['magnet', 'sensor_magnet'];
module.exports = ContactSensorParser;

class ContactSensorContactSensorParser extends AccessoryParser {
    constructor(platform, accessoryType) {
        super(platform, accessoryType)
    }
    
    getAccessoryCategory(deviceSid) {
        return this.Accessory.Categories.SENSOR;
    }
    
    getAccessoryInformation(deviceSid) {
        return {
            'Manufacturer': 'Aqara',
            'Model': 'Contact Sensor',
            'SerialNumber': deviceSid
        };
    }

    getServices(jsonObj, accessoryName) {
        var that = this;
        var result = [];
        
        var service = new that.Service.ContactSensor(accessoryName);
        service.getCharacteristic(that.Characteristic.ContactSensorState);
        service.addCharacteristic(that.Characteristic.OpenDuration);
        service.getCharacteristic(that.Characteristic.OpenDuration);
        service.addCharacteristic(that.Characteristic.ClosedDuration);
        service.getCharacteristic(that.Characteristic.ClosedDuration);
        service.addCharacteristic(that.Characteristic.LastActivation);
        service.getCharacteristic(that.Characteristic.LastActivation);
		result.push(service);
        
        var batteryService  = new that.Service.BatteryService(accessoryName);
        batteryService.getCharacteristic(that.Characteristic.StatusLowBattery);
        batteryService.getCharacteristic(that.Characteristic.BatteryLevel);
        batteryService.getCharacteristic(that.Characteristic.ChargingState);
        result.push(batteryService);
        
        return result;
    }
    
    parserAccessories(jsonObj) {
        var that = this;
        var deviceSid = jsonObj['sid'];
        var uuid = that.getAccessoryUUID(deviceSid);
        var accessory = that.platform.AccessoryUtil.getByUUID(uuid);
        if(accessory) {
            var service = accessory.getService(that.Service.ContactSensor);
            var contactSensorStateCharacteristic = service.getCharacteristic(that.Characteristic.ContactSensorState);
            if(!service.testCharacteristic(that.Characteristic.OpenDuration))service.addCharacteristic(that.Characteristic.OpenDuration);
            if(!service.testCharacteristic(that.Characteristic.ClosedDuration))service.addCharacteristic(that.Characteristic.ClosedDuration);
            if(!service.testCharacteristic(that.Characteristic.LastActivation))service.addCharacteristic(that.Characteristic.LastActivation);
            service.getCharacteristic(that.Characteristic.LastActivation);
            service.getCharacteristic(that.Characteristic.OpenDuration);
            service.getCharacteristic(that.Characteristic.ClosedDuration);            
			var value = that.getContactSensorStateCharacteristicValue(jsonObj, null);
            if(null != value) {
				let totallength = accessory.context.loggingService.history.length - 1; 
	            let latestTime = accessory.context.loggingService.history[totallength].time;
	            let latestStatus = accessory.context.loggingService.history[totallength].status;
	            let lastActivation = 0;
	            let contactDetected = 0;
	            if(value){
		           contactDetected = 0;
		           lastActivation = latestTime - accessory.context.loggingService.getInitialTime();
	            } else {
		           contactDetected = 1;
		           lastActivation = moment().unix();
	            }
	            service.getCharacteristic(that.Characteristic.LastActivation).updateValue(lastActivation);
				contactSensorStateCharacteristic.updateValue(value ? that.Characteristic.ContactSensorState.CONTACT_DETECTED : that.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
				if(contactDetected != latestStatus){
                  accessory.context.loggingService.addEntry({
                    time: moment().unix(),
                    status: contactDetected
                  });
                }
            }
            
            if(that.platform.ConfigUtil.getAccessorySyncValue(deviceSid, that.accessoryType)) {
                if (contactSensorStateCharacteristic.listeners('get').length == 0) {
                    contactSensorStateCharacteristic.on("get", function(callback) {
                        var command = '{"cmd":"read", "sid":"' + deviceSid + '"}';
                        that.platform.sendReadCommand(deviceSid, command).then(result => {
                            var value = that.getContactSensorStateCharacteristicValue(result, null);
                            if(null != value) {
                                callback(null, value ? that.Characteristic.ContactSensorState.CONTACT_DETECTED : that.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
                            } else {
                                callback(new Error('get value fail: ' + result));
                            }
                        }).catch(function(err) {
                            that.platform.log.error(err);
                            callback(err);
                        });
                    });
                }
            }
            
            that.parserBatteryService(accessory, jsonObj);
        }
    }
    
    getContactSensorStateCharacteristicValue(jsonObj, defaultValue) {
        var value = null;
        var proto_version_prefix = this.platform.getProtoVersionPrefixByProtoVersion(this.platform.getDeviceProtoVersionBySid(jsonObj['sid']));
        if(1 == proto_version_prefix) {
            value = this.getValueFrJsonObjData1(jsonObj, 'status');
        } else if(2 == proto_version_prefix) {
            value = this.getValueFrJsonObjData2(jsonObj, 'window_status');
        } else {
        }
        
        return (null != value) ? (value === 'close') : defaultValue;
    }
}
